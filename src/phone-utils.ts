import { readFileSync } from "fs";
import { join } from "path";
const AREA_CODES: Record<string, string> = JSON.parse(
  readFileSync(join(__dirname, "german-area-codes.json"), "utf-8")
);

/**
 * Normalize a phone number to digits only, converting German country codes.
 * Examples:
 *   "+49 170-5664234"  → "01705664234"
 *   "0049625182755"    → "0625182755"
 *   "49625182755"      → "0625182755"
 *   "0170-5664234"     → "01705664234"
 */
export function normalizePhone(raw: string): string {
  let s = raw.replace(/[\s\-\(\)\/\.]/g, "");
  if (s.startsWith("+")) s = "00" + s.slice(1);
  if (s.startsWith("0049")) s = "0" + s.slice(4);
  else if (s.startsWith("49") && s.length > 6) s = "0" + s.slice(2);
  return s;
}

/**
 * Check if two phone numbers match after normalization.
 * Uses suffix matching to handle cases where one number has
 * a longer prefix (e.g., kopfnummer) than the other.
 */
export function phonesMatch(a: string, b: string): boolean {
  const na = normalizePhone(a);
  const nb = normalizePhone(b);
  if (na === nb) return true;
  // Require at least 6 digits overlap to avoid false positives
  const minLen = Math.min(na.length, nb.length);
  if (minLen < 6) return false;
  return na.endsWith(nb) || nb.endsWith(na);
}

// German mobile prefixes (without leading 0): 150-159, 160-163, 170-179
const DEFAULT_MOBILE_PREFIXES = "150,151,152,155,156,157,159,160,161,162,163,170,171,172,173,174,175,176,177,178,179";
// German special number prefixes (without leading 0): 800, 180x, 137, 138, 700, 900, 118x
const DEFAULT_SPECIAL_PREFIXES = "800,1801,1802,1803,1804,1805,1806,137,138,700,900,1180,1181,1182,1183,1184,1185,1186,1187,1188,1189,32";

function getPrefixList(envKey: string, defaults: string): string[] {
  const raw = process.env[envKey] || defaults;
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

/** Classify a normalized German number */
export type PhoneType = "landline" | "mobile" | "special" | "unknown";

export function classifyPhone(normalized: string): PhoneType {
  if (!normalized.startsWith("0")) return "unknown";
  const withoutZero = normalized.slice(1);

  const mobilePrefixes = getPrefixList("MOBILE_PREFIXES", DEFAULT_MOBILE_PREFIXES);
  for (const p of mobilePrefixes) {
    if (withoutZero.startsWith(p)) return "mobile";
  }

  const specialPrefixes = getPrefixList("SPECIAL_PREFIXES", DEFAULT_SPECIAL_PREFIXES);
  for (const p of specialPrefixes) {
    if (withoutZero.startsWith(p)) return "special";
  }

  return "landline";
}

export function isGermanLandline(normalized: string): boolean {
  return classifyPhone(normalized) === "landline";
}

/**
 * Look up the city name for a German phone number based on area code.
 * Tries matching from longest possible area code (5 digits) down to shortest (2 digits).
 * The normalized number should start with "0".
 */
export function lookupCity(normalized: string): string | null {
  if (!normalized.startsWith("0")) return null;
  const withoutZero = normalized.slice(1);

  // Area codes are 2-5 digits (without leading 0)
  for (let len = 5; len >= 2; len--) {
    const prefix = withoutZero.slice(0, len);
    if (AREA_CODES[prefix]) return AREA_CODES[prefix];
  }
  return null;
}

/**
 * Find the area code length (without leading 0) for a normalized number.
 */
function findAreaCodeLen(withoutZero: string): number | null {
  for (let len = 5; len >= 2; len--) {
    if (AREA_CODES[withoutZero.slice(0, len)]) return len;
  }
  return null;
}

/**
 * Format a raw phone number nicely, e.g.:
 *   "496251555"     → "+49 6251 555"
 *   "491705664234"  → "+49 170 5664234"
 *   "4962551607"    → "+49 6255 1607"
 */
export function formatPhoneNice(raw: string): string | null {
  const normalized = normalizePhone(raw);
  if (!normalized.startsWith("0")) return null;
  const withoutZero = normalized.slice(1);

  const phoneType = classifyPhone(normalized);

  if (phoneType === "mobile") {
    const mobilePrefixes = getPrefixList("MOBILE_PREFIXES", DEFAULT_MOBILE_PREFIXES);
    for (const p of mobilePrefixes) {
      if (withoutZero.startsWith(p)) {
        return `+49 ${p} ${withoutZero.slice(p.length)}`;
      }
    }
  }

  if (phoneType === "special") {
    const specialPrefixes = getPrefixList("SPECIAL_PREFIXES", DEFAULT_SPECIAL_PREFIXES);
    for (const p of specialPrefixes) {
      if (withoutZero.startsWith(p)) {
        return `+49 ${p} ${withoutZero.slice(p.length)}`;
      }
    }
  }

  if (phoneType === "landline") {
    const acLen = findAreaCodeLen(withoutZero);
    if (acLen) {
      const areaCode = withoutZero.slice(0, acLen);
      const subscriber = withoutZero.slice(acLen);
      return `+49 ${areaCode} ${subscriber}`;
    }
  }

  // Fallback: just add +49
  return `+49 ${withoutZero}`;
}
