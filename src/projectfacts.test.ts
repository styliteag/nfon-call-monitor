import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { lookupPhone, lookupPhones, _testSetCache, _testClearCache } from "./projectfacts.js";

describe("lookupPhone", () => {
  afterEach(() => {
    _testClearCache();
  });

  describe("without projectfacts cache (fallback behavior)", () => {
    it("returns null for empty input", () => {
      expect(lookupPhone("")).toBeNull();
    });

    it("returns city for German landline", () => {
      const result = lookupPhone("0625182755");
      expect(result).not.toBeNull();
      expect(result!.city).toBe("Bensheim");
      expect(result!.formatted).toBe("+49 6251 82755");
      expect(result!.contactId).toBe(0);
    });

    it("returns Mobil for mobile numbers", () => {
      const result = lookupPhone("01705664234");
      expect(result).not.toBeNull();
      expect(result!.city).toBe("Mobil");
      expect(result!.formatted).toBe("+49 170 5664234");
    });

    it("returns Sonderrufnummer for special numbers", () => {
      const result = lookupPhone("08001234567");
      expect(result).not.toBeNull();
      expect(result!.city).toBe("Sonderrufnummer");
    });
  });

  describe("exact match", () => {
    beforeEach(() => {
      _testSetCache([
        { raw: "0625182755", contact: { name: "Firma ABC", contactId: 1 } },
        { raw: "+49 170 5664234", contact: { name: "Max Mobil", contactId: 2 } },
      ]);
    });

    it("finds exact match for landline", () => {
      const result = lookupPhone("0625182755");
      expect(result!.name).toBe("Firma ABC");
      expect(result!.contactId).toBe(1);
      expect(result!.fuzzy).toBeUndefined();
    });

    it("finds exact match with different formatting", () => {
      const result = lookupPhone("+49 6251 82755");
      expect(result!.name).toBe("Firma ABC");
      expect(result!.fuzzy).toBeUndefined();
    });

    it("finds exact match for mobile", () => {
      const result = lookupPhone("01705664234");
      expect(result!.name).toBe("Max Mobil");
      expect(result!.fuzzy).toBeUndefined();
    });

    it("exact match takes priority over fuzzy", () => {
      // Add another entry that would fuzzy-match
      _testSetCache([
        { raw: "0625182755", contact: { name: "Exact Match", contactId: 1 } },
        { raw: "062518275", contact: { name: "Fuzzy Match", contactId: 2 } },
      ]);
      const result = lookupPhone("0625182755");
      expect(result!.name).toBe("Exact Match");
      expect(result!.fuzzy).toBeUndefined();
    });
  });

  describe("fuzzy match", () => {
    beforeEach(() => {
      _testSetCache([
        { raw: "062518275", contact: { name: "Firma Kurz", contactId: 10 } },
      ]);
    });

    it("matches when input has 1 extra trailing digit", () => {
      // Input: 0625182755, cache: 062518275 → input with 1 digit removed matches
      const result = lookupPhone("0625182755");
      expect(result!.name).toBe("Firma Kurz");
      expect(result!.fuzzy).toBe(1);
    });

    it("matches when input has 2 extra trailing digits", () => {
      const result = lookupPhone("06251827512");
      expect(result!.name).toBe("Firma Kurz");
      expect(result!.fuzzy).toBe(2);
    });

    it("matches when input has 3 extra trailing digits", () => {
      const result = lookupPhone("062518275123");
      expect(result!.name).toBe("Firma Kurz");
      expect(result!.fuzzy).toBe(3);
    });

    it("does NOT fuzzy match beyond 3 digits", () => {
      // 4 extra digits — should NOT match
      const result = lookupPhone("0625182751234");
      expect(result!.name).not.toBe("Firma Kurz");
      // Should fall back to city
      expect(result!.city).toBe("Bensheim");
    });

    it("matches when cache entry has extra trailing digits (reverse direction)", () => {
      _testSetCache([
        { raw: "06251827551", contact: { name: "Firma Lang", contactId: 11 } },
      ]);
      // Input is shorter, cache entry is longer → pf entry shortened matches input
      const result = lookupPhone("0625182755");
      expect(result!.name).toBe("Firma Lang");
      expect(result!.fuzzy).toBe(1);
    });

    it("does NOT fuzzy match mobile numbers", () => {
      _testSetCache([
        { raw: "0170566423", contact: { name: "Mobil Contact", contactId: 20 } },
      ]);
      const result = lookupPhone("01705664234");
      // Should NOT find the mobile contact via fuzzy
      expect(result!.name).not.toBe("Mobil Contact");
      expect(result!.city).toBe("Mobil");
    });

    it("does NOT fuzzy match special numbers", () => {
      _testSetCache([
        { raw: "0800123456", contact: { name: "Hotline", contactId: 30 } },
      ]);
      const result = lookupPhone("08001234567");
      expect(result!.name).not.toBe("Hotline");
    });

    it("preserves city and formatted in fuzzy results", () => {
      const result = lookupPhone("0625182755");
      expect(result!.city).toBe("Bensheim");
      expect(result!.formatted).toBe("+49 6251 82755");
      expect(result!.fuzzy).toBe(1);
    });

    it("does NOT fuzzy match if result would be too short", () => {
      // The guard is: normalized.length <= remove + 6 → skip
      // So for remove=1, need length > 7 (at least 8 chars)
      // A 7-char input like "0625189" can't fuzzy match at all
      _testClearCache();
      _testSetCache([
        { raw: "062518", contact: { name: "Very Short", contactId: 41 } },
      ]);
      const result = lookupPhone("0625189"); // 7 chars — too short for remove=1
      expect(result!.name).not.toBe("Very Short");
      expect(result!.fuzzy).toBeUndefined();
      // Falls back to city
      expect(result!.city).toBe("Bensheim");
    });

    it("fuzzy matches when input is long enough", () => {
      _testClearCache();
      _testSetCache([
        { raw: "0625182", contact: { name: "Long Enough", contactId: 42 } },
      ]);
      // Input "06251823" = 8 chars. remove=1 → "0625182" (7 chars) > 7 ✓
      const result = lookupPhone("06251823");
      expect(result!.name).toBe("Long Enough");
      expect(result!.fuzzy).toBe(1);
    });
  });

  describe("lookupPhones batch", () => {
    it("returns results for multiple numbers", () => {
      const result = lookupPhones(["0625182755", "01705664234", ""]);
      expect(Object.keys(result)).toHaveLength(2);
      expect(result["0625182755"]).toBeDefined();
      expect(result["01705664234"]).toBeDefined();
    });

    it("skips empty strings", () => {
      const result = lookupPhones(["", "", ""]);
      expect(Object.keys(result)).toHaveLength(0);
    });

    it("includes fuzzy matches in batch results", () => {
      _testSetCache([
        { raw: "062518275", contact: { name: "Batch Fuzzy", contactId: 50 } },
      ]);
      const result = lookupPhones(["0625182755"]);
      expect(result["0625182755"].name).toBe("Batch Fuzzy");
      expect(result["0625182755"].fuzzy).toBe(1);
    });
  });
});
