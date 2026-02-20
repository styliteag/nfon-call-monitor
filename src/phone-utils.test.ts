import { describe, it, expect } from "vitest";
import { normalizePhone, phonesMatch, classifyPhone, isGermanLandline, lookupCity, formatPhoneNice } from "./phone-utils.js";

describe("normalizePhone", () => {
  it("strips spaces, hyphens, parentheses, slashes, dots", () => {
    expect(normalizePhone("0170-566 42 34")).toBe("01705664234");
    expect(normalizePhone("(06251) 82755")).toBe("0625182755");
    expect(normalizePhone("06251/827.55")).toBe("0625182755");
  });

  it("converts +49 prefix to 0", () => {
    expect(normalizePhone("+49 170 5664234")).toBe("01705664234");
    expect(normalizePhone("+496251555")).toBe("06251555");
  });

  it("converts 0049 prefix to 0", () => {
    expect(normalizePhone("004962518275")).toBe("062518275");
    expect(normalizePhone("00491705664234")).toBe("01705664234");
  });

  it("converts bare 49 prefix to 0 (when long enough)", () => {
    expect(normalizePhone("496251555")).toBe("06251555");
    expect(normalizePhone("491705664234")).toBe("01705664234");
  });

  it("does NOT convert bare 49 prefix when too short", () => {
    // "49123" is only 5 chars — could be a real short number, not a country code
    expect(normalizePhone("49123")).toBe("49123");
  });

  it("leaves already-normalized numbers unchanged", () => {
    expect(normalizePhone("0625182755")).toBe("0625182755");
    expect(normalizePhone("01705664234")).toBe("01705664234");
  });
});

describe("phonesMatch", () => {
  it("matches identical numbers", () => {
    expect(phonesMatch("0625182755", "0625182755")).toBe(true);
  });

  it("matches with different formatting", () => {
    expect(phonesMatch("+49 6251 82755", "0625182755")).toBe(true);
    expect(phonesMatch("0049-6251-82755", "06251/82755")).toBe(true);
  });

  it("matches suffix (kopfnummer handling)", () => {
    // One number has a longer prefix — suffix matching should work
    expect(phonesMatch("0625182755", "625182755")).toBe(true);
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
    expect(phonesMatch("0625182755", "0625199999")).toBe(false);
    expect(phonesMatch("01705664234", "01711234567")).toBe(false);
  });
});

describe("classifyPhone", () => {
  it("classifies mobile numbers", () => {
    expect(classifyPhone("01705664234")).toBe("mobile");
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
    expect(classifyPhone("0625182755")).toBe("landline");
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
    expect(isGermanLandline("0625182755")).toBe(true);
  });

  it("returns false for mobile numbers", () => {
    expect(isGermanLandline("01705664234")).toBe(false);
  });

  it("returns false for special numbers", () => {
    expect(isGermanLandline("08001234567")).toBe(false);
  });
});

describe("lookupCity", () => {
  it("finds city for known area codes", () => {
    // 6251 = Heppenheim
    const city = lookupCity("0625182755");
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
    const result = formatPhoneNice("0625182755");
    expect(result).toBe("+49 6251 82755");
  });

  it("formats mobile numbers", () => {
    const result = formatPhoneNice("01705664234");
    expect(result).toBe("+49 170 5664234");
  });

  it("formats from international prefix", () => {
    expect(formatPhoneNice("+496251555")).toBe("+49 6251 555");
    expect(formatPhoneNice("00496251555")).toBe("+49 6251 555");
  });

  it("returns null for non-German numbers", () => {
    expect(formatPhoneNice("12345678")).toBeNull();
  });
});
