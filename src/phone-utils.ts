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
  else if (s.startsWith("49") && s.length > 10) s = "0" + s.slice(2);
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
