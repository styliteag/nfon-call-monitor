import { normalizePhone, phonesMatch, isGermanLandline, classifyPhone, lookupCity, formatPhoneNice } from "./phone-utils.js";
import type { PfContact } from "../shared/types.js";

interface PhoneEntry {
  normalized: string;
  raw: string;
  contact: PfContact;
}

let phoneCache: PhoneEntry[] = [];
let cacheReady = false;
const REFRESH_INTERVAL = 15 * 60 * 1000; // 15 minutes
const PHONE_TYPES = ["TEL", "TEL_VOICE", "TEL_MOBILE"];
const PAGE_SIZE = 200;
const CONCURRENCY = 10;
const MAX_FUZZY_DIGITS = 3;

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
    console.log(`[pf] Found ${allItems.length} phone entries, fetching details...`);

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
    console.log(`[pf] Loaded ${phoneCache.length} phone entries from projectfacts`);
  } catch (err) {
    console.warn("[pf] Failed to load phone cache:", err);
  }
}

/** Try exact match against cache */
function exactLookup(rawNumber: string): PfContact | null {
  for (const entry of phoneCache) {
    if (phonesMatch(rawNumber, entry.raw)) {
      return { ...entry.contact };
    }
  }
  return null;
}

/**
 * Fuzzy match: try removing 1-3 digits from the end of both the input number
 * and the projectfacts entries to find a match. Only for German landline numbers.
 */
function fuzzyLookup(rawNumber: string): PfContact | null {
  const normalized = normalizePhone(rawNumber);
  if (!isGermanLandline(normalized)) return null;

  for (let remove = 1; remove <= MAX_FUZZY_DIGITS; remove++) {
    if (normalized.length <= remove + 6) continue; // keep at least 6 digits
    const shortened = normalized.slice(0, -remove);

    for (const entry of phoneCache) {
      // Also shorten the pf number by up to `remove` digits
      const entryNorm = entry.normalized;
      if (!isGermanLandline(entryNorm)) continue;

      // Check: shortened input matches full pf entry
      if (phonesMatch(shortened, entryNorm)) {
        return { ...entry.contact, fuzzy: remove };
      }
      // Check: full input matches shortened pf entry
      if (entryNorm.length > remove + 6) {
        const entryShortened = entryNorm.slice(0, -remove);
        if (phonesMatch(normalized, entryShortened)) {
          return { ...entry.contact, fuzzy: remove };
        }
      }
    }
  }
  return null;
}

export function lookupPhone(rawNumber: string): PfContact | null {
  if (!rawNumber) return null;

  const formatted = formatPhoneNice(rawNumber) ?? undefined;
  const normalized = normalizePhone(rawNumber);
  const phoneType = classifyPhone(normalized);
  const city = phoneType === "landline" ? lookupCity(normalized) ?? undefined
    : phoneType === "mobile" ? "Mobil"
    : phoneType === "special" ? "Sonderrufnummer"
    : undefined;

  // 1. Exact projectfacts match (only if cache loaded)
  if (cacheReady) {
    const exact = exactLookup(rawNumber);
    if (exact) return { ...exact, formatted, city };

    // 2. Fuzzy projectfacts match (German landline only)
    const fuzzy = fuzzyLookup(rawNumber);
    if (fuzzy) return { ...fuzzy, formatted, city };
  }

  // 3. Fallback label (always works)
  if (city) return { name: city, contactId: 0, city, formatted };

  // 4. At least return formatted number if we have one
  if (formatted) return { name: "", contactId: 0, formatted };

  return null;
}

export function lookupPhones(numbers: string[]): Record<string, PfContact> {
  const result: Record<string, PfContact> = {};
  for (const num of numbers) {
    if (!num) continue;
    const contact = lookupPhone(num);
    if (contact) result[num] = contact;
  }
  return result;
}

/** @internal Test helper — inject entries into the phone cache */
export function _testSetCache(entries: { raw: string; contact: PfContact }[]): void {
  phoneCache = entries.map((e) => ({
    normalized: normalizePhone(e.raw),
    raw: e.raw,
    contact: e.contact,
  }));
  cacheReady = true;
}

/** @internal Test helper — clear the phone cache */
export function _testClearCache(): void {
  phoneCache = [];
  cacheReady = false;
}

export async function initPfCache(): Promise<void> {
  if (!isConfigured()) {
    console.log("[pf] projectfacts not configured, skipping");
    return;
  }
  console.log("[pf] Loading phone cache from projectfacts...");
  await loadPhoneCache();
  setInterval(loadPhoneCache, REFRESH_INTERVAL);
}
