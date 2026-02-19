import { normalizePhone, phonesMatch } from "./phone-utils.js";

export interface CrmContact {
  name: string;
  contactId: number;
}

interface PhoneEntry {
  normalized: string;
  raw: string;
  contact: CrmContact;
}

let phoneCache: PhoneEntry[] = [];
let cacheReady = false;
const REFRESH_INTERVAL = 15 * 60 * 1000; // 15 minutes
const PHONE_TYPES = ["TEL", "TEL_VOICE", "TEL_MOBILE"];
const PAGE_SIZE = 200;
const CONCURRENCY = 10;

function isConfigured(): boolean {
  return !!(process.env.PF_API_BASE_URL && process.env.PF_API_DEVICE_ID && process.env.PF_API_TOKEN);
}

function getAuthHeader(): string {
  const cred = `${process.env.PF_API_DEVICE_ID}:${process.env.PF_API_TOKEN}`;
  return "Basic " + Buffer.from(cred).toString("base64");
}

async function apiFetch<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, {
      headers: { Authorization: getAuthHeader(), Accept: "application/json" },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/** Run async tasks with limited concurrency */
async function pMap<T, R>(items: T[], fn: (item: T) => Promise<R>, concurrency: number): Promise<R[]> {
  const results: R[] = [];
  let i = 0;
  async function next(): Promise<void> {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await fn(items[idx]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => next()));
  return results;
}

interface ListItem {
  caption: string; // phone number
  href: string;    // detail URL
  value: number;
}

interface ContactFieldDetail {
  value: string;
  contact: {
    caption: string;
    value: number;
  };
}

/** Fetch all contactfield list items (captions only) for a phone type */
async function fetchListItems(type: string): Promise<ListItem[]> {
  const baseUrl = process.env.PF_API_BASE_URL!;
  const items: ListItem[] = [];
  let offset = 0;

  while (true) {
    const url = `${baseUrl}/api/contactfield;offset=${offset};limit=${PAGE_SIZE}?type=${type}`;
    const data = await apiFetch<{ size: number; items: ListItem[] | null }>(url);
    if (!data) break;

    const page = data.items || [];
    items.push(...page);

    if (page.length < PAGE_SIZE || items.length >= data.size) break;
    offset += PAGE_SIZE;
  }

  return items;
}

async function loadPhoneCache(): Promise<void> {
  if (!isConfigured()) return;

  try {
    // Step 1: Collect all phone contactfield list items (fast, paginated)
    const allItems: ListItem[] = [];
    for (const type of PHONE_TYPES) {
      const items = await fetchListItems(type);
      allItems.push(...items);
    }
    console.log(`[CRM] Found ${allItems.length} phone entries, fetching details...`);

    // Step 2: Fetch details with concurrency limit to get contact info
    const entries = await pMap(allItems, async (item): Promise<PhoneEntry | null> => {
      const detail = await apiFetch<ContactFieldDetail>(item.href);
      if (!detail?.value || !detail?.contact) return null;
      return {
        normalized: normalizePhone(detail.value),
        raw: detail.value,
        contact: {
          name: detail.contact.caption,
          contactId: detail.contact.value,
        },
      };
    }, CONCURRENCY);

    phoneCache = entries.filter((e): e is PhoneEntry => e !== null);
    cacheReady = true;
    console.log(`[CRM] Loaded ${phoneCache.length} phone entries from projectfacts`);
  } catch (err) {
    console.warn("[CRM] Failed to load phone cache:", err);
  }
}

export function lookupPhone(rawNumber: string): CrmContact | null {
  if (!cacheReady || !rawNumber) return null;
  for (const entry of phoneCache) {
    if (phonesMatch(rawNumber, entry.raw)) {
      return entry.contact;
    }
  }
  return null;
}

export function lookupPhones(numbers: string[]): Record<string, CrmContact> {
  const result: Record<string, CrmContact> = {};
  if (!cacheReady) return result;
  for (const num of numbers) {
    if (!num) continue;
    const contact = lookupPhone(num);
    if (contact) result[num] = contact;
  }
  return result;
}

export async function initCrmCache(): Promise<void> {
  if (!isConfigured()) {
    console.log("[CRM] projectfacts not configured, skipping");
    return;
  }
  console.log("[CRM] Loading phone cache from projectfacts...");
  await loadPhoneCache();
  setInterval(loadPhoneCache, REFRESH_INTERVAL);
}
