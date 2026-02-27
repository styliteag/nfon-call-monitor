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
      const result = lookupPhone("01701234567");
      expect(result).not.toBeNull();
      expect(result!.city).toBe("Mobil");
      expect(result!.formatted).toBe("+49 170 1234567");
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
        { raw: "+49 170 1234567", contact: { name: "Max Mobil", contactId: 2 } },
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
      const result = lookupPhone("01701234567");
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
        { raw: "0170123456", contact: { name: "Mobil Contact", contactId: 20 } },
      ]);
      const result = lookupPhone("01701234567");
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

    it("does NOT fuzzy match if Kopfnummer too short", () => {
      // Subscriber "8" vs "89" → common prefix "8" (1 digit) < 2 → no match
      _testClearCache();
      _testSetCache([
        { raw: "062518", contact: { name: "Very Short", contactId: 41 } },
      ]);
      const result = lookupPhone("0625189");
      expect(result!.name).not.toBe("Very Short");
      expect(result!.fuzzy).toBeUndefined();
      expect(result!.city).toBe("Bensheim");
    });

    it("fuzzy matches when Kopfnummer is long enough", () => {
      _testClearCache();
      _testSetCache([
        { raw: "0625182", contact: { name: "Long Enough", contactId: 42 } },
      ]);
      // Subscriber "82" vs "823" → Kopfnummer "82" (2 digits), ext "" vs "3"
      const result = lookupPhone("06251823");
      expect(result!.name).toBe("Long Enough");
      expect(result!.fuzzy).toBe(1);
    });

    it("matches Zentrale (ending 0) to Durchwahl", () => {
      _testClearCache();
      _testSetCache([
        { raw: "0625182750", contact: { name: "Firma Zentrale", contactId: 50 } },
      ]);
      // CRM has Zentrale (ext "0"), call from Durchwahl 5
      const result = lookupPhone("0625182755");
      expect(result!.name).toBe("Firma Zentrale");
      expect(result!.fuzzy).toBe(1);
    });

    it("matches Durchwahl to Zentrale (reverse)", () => {
      _testClearCache();
      _testSetCache([
        { raw: "0625182753", contact: { name: "Firma DW3", contactId: 51 } },
      ]);
      // CRM has Durchwahl 3, call from Zentrale
      const result = lookupPhone("0625182750");
      expect(result!.name).toBe("Firma DW3");
      expect(result!.fuzzy).toBe(1);
    });

    it("matches two different Durchwahlen of same Kopfnummer", () => {
      _testClearCache();
      _testSetCache([
        { raw: "0625182755", contact: { name: "Firma DW5", contactId: 52 } },
      ]);
      // CRM has Durchwahl 5, call from Durchwahl 8
      const result = lookupPhone("0625182758");
      expect(result!.name).toBe("Firma DW5");
      expect(result!.fuzzy).toBe(1);
    });

    it("matches multi-digit Durchwahl to Zentrale", () => {
      _testClearCache();
      _testSetCache([
        { raw: "0625182750", contact: { name: "Firma Zentrale", contactId: 53 } },
      ]);
      // CRM has Zentrale, call from Durchwahl 123 (3 digits)
      const result = lookupPhone("06251827123");
      expect(result!.name).toBe("Firma Zentrale");
      expect(result!.fuzzy).toBe(3);
    });

    it("prefers Zentrale match over arbitrary extension match", () => {
      _testClearCache();
      _testSetCache([
        { raw: "0625182758", contact: { name: "Firma DW8", contactId: 54 } },
        { raw: "0625182750", contact: { name: "Firma Zentrale", contactId: 55 } },
      ]);
      // Both match Durchwahl 5, but Zentrale match should be preferred
      const result = lookupPhone("0625182755");
      expect(result!.name).toBe("Firma Zentrale");
      expect(result!.fuzzy).toBe(1);
    });

    it("does NOT fuzzy match across different area codes", () => {
      _testClearCache();
      _testSetCache([
        { raw: "0621182755", contact: { name: "Firma Mannheim", contactId: 60 } },
      ]);
      // Same subscriber digits but different Vorwahl (6211 vs 6251)
      const result = lookupPhone("0625182755");
      expect(result!.name).not.toBe("Firma Mannheim");
    });
  });

  describe("international numbers", () => {
    it("returns formatted international number with country label", () => {
      const result = lookupPhone("14089434100");
      expect(result).not.toBeNull();
      expect(result!.formatted).toBe("+1 408 943 4100");
      expect(result!.city).toContain("Vereinigte Staaten");
      expect(result!.name).toContain("Vereinigte Staaten");
      expect(result!.contactId).toBe(0);
    });

    it("returns Swiss number with country label", () => {
      const result = lookupPhone("41441234567");
      expect(result).not.toBeNull();
      expect(result!.city).toContain("Schweiz");
    });

    it("prefers PF contact name over international label", () => {
      _testSetCache([
        { raw: "+14089434100", contact: { name: "Apple Inc.", contactId: 99 } },
      ]);
      const result = lookupPhone("14089434100");
      expect(result).not.toBeNull();
      expect(result!.name).toBe("Apple Inc.");
      expect(result!.contactId).toBe(99);
      expect(result!.formatted).toBe("+1 408 943 4100");
    });

    it("does not interfere with German numbers", () => {
      const result = lookupPhone("0625182755");
      expect(result).not.toBeNull();
      expect(result!.city).toBe("Bensheim");
    });
  });

  describe("lookupPhones batch", () => {
    it("returns results for multiple numbers", () => {
      const result = lookupPhones(["0625182755", "01701234567", ""]);
      expect(Object.keys(result)).toHaveLength(2);
      expect(result["0625182755"]).toBeDefined();
      expect(result["01701234567"]).toBeDefined();
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
