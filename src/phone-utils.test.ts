import { describe, it, expect } from "vitest";
import { normalizePhone, phonesMatch, classifyPhone, isGermanLandline, lookupCity, formatPhoneNice, formatInternational } from "./phone-utils.js";

describe("normalizePhone", () => {
  it("strips spaces, hyphens, parentheses, slashes, dots", () => {
    expect(normalizePhone("0170-123 45 67")).toBe("01701234567");
    expect(normalizePhone("(06251) 55505")).toBe("0625155505");
    expect(normalizePhone("06251/555.05")).toBe("0625155505");
  });

  it("converts +49 prefix to 0", () => {
    expect(normalizePhone("+49 170 1234567")).toBe("01701234567");
    expect(normalizePhone("+496251555")).toBe("06251555");
  });

  it("converts 0049 prefix to 0", () => {
    expect(normalizePhone("004962515550")).toBe("062515550");
    expect(normalizePhone("00491701234567")).toBe("01701234567");
  });

  it("converts bare 49 prefix to 0 (when long enough)", () => {
    expect(normalizePhone("496251555")).toBe("06251555");
    expect(normalizePhone("491701234567")).toBe("01701234567");
  });

  it("does NOT convert bare 49 prefix when too short", () => {
    // "49123" is only 5 chars — could be a real short number, not a country code
    expect(normalizePhone("49123")).toBe("49123");
  });

  it("leaves already-normalized numbers unchanged", () => {
    expect(normalizePhone("0625155505")).toBe("0625155505");
    expect(normalizePhone("01701234567")).toBe("01701234567");
  });
});

describe("phonesMatch", () => {
  it("matches identical numbers", () => {
    expect(phonesMatch("0625155505", "0625155505")).toBe(true);
  });

  it("matches with different formatting", () => {
    expect(phonesMatch("+49 6251 55505", "0625155505")).toBe(true);
    expect(phonesMatch("0049-6251-55505", "06251/55505")).toBe(true);
  });

  it("matches suffix (kopfnummer handling)", () => {
    // One number has a longer prefix — suffix matching should work
    expect(phonesMatch("0625155505", "625155505")).toBe(true);
  });

  it("still matches identical numbers even if short (exact equality)", () => {
    expect(phonesMatch("12345", "12345")).toBe(true);
  });

  it("rejects suffix matches with fewer than 6 digits overlap", () => {
    // Suffix matching requires at least 6 digits; exact equality still works
    expect(phonesMatch("0123", "990123")).toBe(false);
    expect(phonesMatch("12345", "9912345")).toBe(false);
  });

  it("rejects different numbers", () => {
    expect(phonesMatch("0625155505", "0625199999")).toBe(false);
    expect(phonesMatch("01701234567", "01711234567")).toBe(false);
  });
});

describe("classifyPhone", () => {
  it("classifies mobile numbers", () => {
    expect(classifyPhone("01701234567")).toBe("mobile");
    expect(classifyPhone("01511234567")).toBe("mobile");
    expect(classifyPhone("01601234567")).toBe("mobile");
    expect(classifyPhone("01791234567")).toBe("mobile");
  });

  it("classifies special numbers", () => {
    expect(classifyPhone("08001234567")).toBe("special");
    expect(classifyPhone("01801123456")).toBe("special");
    expect(classifyPhone("09001234567")).toBe("special");
    expect(classifyPhone("01371234567")).toBe("special");
  });

  it("classifies landline numbers", () => {
    expect(classifyPhone("0625155505")).toBe("landline");
    expect(classifyPhone("06930000")).toBe("landline");
    expect(classifyPhone("03012345678")).toBe("landline");
  });

  it("returns unknown for non-0 prefix", () => {
    expect(classifyPhone("12345678")).toBe("unknown");
    expect(classifyPhone("5551234")).toBe("unknown");
  });
});

describe("isGermanLandline", () => {
  it("returns true for landline numbers", () => {
    expect(isGermanLandline("0625155505")).toBe(true);
  });

  it("returns false for mobile numbers", () => {
    expect(isGermanLandline("01701234567")).toBe(false);
  });

  it("returns false for special numbers", () => {
    expect(isGermanLandline("08001234567")).toBe(false);
  });
});

describe("lookupCity", () => {
  it("finds city for known area codes", () => {
    // 6251 = Heppenheim
    const city = lookupCity("0625155505");
    expect(city).toBeTruthy();
    expect(typeof city).toBe("string");
  });

  it("finds city for major cities", () => {
    // 69 = Frankfurt, 30 = Berlin, 89 = München
    expect(lookupCity("06930000")).toBeTruthy();
    expect(lookupCity("03012345")).toBeTruthy();
    expect(lookupCity("08912345")).toBeTruthy();
  });

  it("returns null for non-0 prefix", () => {
    expect(lookupCity("12345678")).toBeNull();
  });
});

describe("formatPhoneNice", () => {
  it("formats landline numbers with area code", () => {
    const result = formatPhoneNice("0625155505");
    expect(result).toBe("+49 6251 55505");
  });

  it("formats mobile numbers", () => {
    const result = formatPhoneNice("01701234567");
    expect(result).toBe("+49 170 1234567");
  });

  it("formats from international prefix", () => {
    expect(formatPhoneNice("+496251555")).toBe("+49 6251 555");
    expect(formatPhoneNice("00496251555")).toBe("+49 6251 555");
  });

  it("returns null for non-German numbers", () => {
    expect(formatPhoneNice("12345678")).toBeNull();
  });
});

describe("formatInternational", () => {
  it("formats US numbers", () => {
    const result = formatInternational("12125550100");
    expect(result).not.toBeNull();
    expect(result!.formatted).toBe("+1 212 555 0100");
    expect(result!.label).toContain("Vereinigte Staaten");
  });

  it("formats Swiss numbers", () => {
    const result = formatInternational("41441234567");
    expect(result).not.toBeNull();
    expect(result!.formatted).toMatch(/^\+41/);
    expect(result!.label).toContain("Schweiz");
  });

  it("formats Austrian numbers", () => {
    const result = formatInternational("4312345678");
    expect(result).not.toBeNull();
    expect(result!.formatted).toMatch(/^\+43/);
    expect(result!.label).toContain("Österreich");
  });

  it("formats UK numbers", () => {
    const result = formatInternational("442071234567");
    expect(result).not.toBeNull();
    expect(result!.formatted).toMatch(/^\+44/);
    expect(result!.label).toMatch(/Vereinigtes Königreich|Großbritannien/);
  });

  it("formats French numbers", () => {
    const result = formatInternational("33123456789");
    expect(result).not.toBeNull();
    expect(result!.formatted).toMatch(/^\+33/);
    expect(result!.label).toContain("Frankreich");
  });

  it("includes phone type in label when detectable", () => {
    // US mobile number
    const result = formatInternational("12025551234");
    expect(result).not.toBeNull();
    // Type detection depends on libphonenumber-js/max metadata
    expect(result!.label).toBeTruthy();
  });

  it("returns null for German numbers (49 prefix)", () => {
    expect(formatInternational("4962515550")).toBeNull();
  });

  it("returns null for German numbers (+49 prefix)", () => {
    expect(formatInternational("+496251555")).toBeNull();
  });

  it("returns null for German numbers (0049 prefix)", () => {
    expect(formatInternational("00496251555")).toBeNull();
  });

  it("returns null for invalid/unparseable numbers", () => {
    expect(formatInternational("123")).toBeNull();
    expect(formatInternational("abc")).toBeNull();
  });

  it("handles + prefix in input", () => {
    const result = formatInternational("+12125550100");
    expect(result).not.toBeNull();
    expect(result!.formatted).toBe("+1 212 555 0100");
  });

  it("handles 00 prefix in input", () => {
    const result = formatInternational("0012125550100");
    expect(result).not.toBeNull();
    expect(result!.formatted).toBe("+1 212 555 0100");
  });
});
