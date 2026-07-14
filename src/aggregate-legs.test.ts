import { describe, it, expect } from "vitest";
import type { CallLeg } from "../shared/types.js";

// Re-export aggregateLegs for testing without requiring a DB connection.
// We import it directly from db.ts; the function is pure (no DB access).
import { aggregateLegs } from "./db.js";

function leg(overrides: Partial<CallLeg>): CallLeg {
  return {
    id: "uuid-1",
    caller: "493083790689",
    callee: "496131327020",
    extension: "20",
    extensionName: "Wim Bonis",
    direction: "inbound",
    startTime: "2026-05-04T10:25:08.000Z",
    status: "ringing",
    ...overrides,
  };
}

describe("aggregateLegs", () => {
  it("throws on empty input", () => {
    expect(() => aggregateLegs([])).toThrow();
  });

  it("returns the single leg as-is when only one leg exists", () => {
    const single = leg({ status: "answered", duration: 42, answerTime: "2026-05-04T10:25:10.000Z" });
    const call = aggregateLegs([single]);
    expect(call.legs).toHaveLength(1);
    expect(call.status).toBe("answered");
    expect(call.duration).toBe(42);
    expect(call.answeredBy).toBe("20");
  });

  it("aggregates a fully-missed hunt-group as missed", () => {
    const legs: CallLeg[] = [
      leg({ extension: "20", status: "missed", endReason: "cancel", endTime: "2026-05-04T10:25:12.000Z" }),
      leg({ extension: "40", status: "missed", endReason: "cancel", endTime: "2026-05-04T10:25:12.100Z" }),
      leg({ extension: "10", status: "missed", endReason: "cancel", endTime: "2026-05-04T10:25:12.200Z" }),
    ];
    const call = aggregateLegs(legs);
    expect(call.status).toBe("missed");
    expect(call.legs).toHaveLength(3);
    expect(call.answeredBy).toBeUndefined();
    expect(call.endTime).toBe("2026-05-04T10:25:12.200Z");
  });

  it("picks answerer when one leg answered and others were cancelled", () => {
    const legs: CallLeg[] = [
      leg({ extension: "20", status: "missed", endReason: "cancel" }),
      leg({ extension: "40", status: "answered", duration: 30, answerTime: "2026-05-04T10:25:10.000Z", extensionName: "Matteo Keller" }),
      leg({ extension: "10", status: "missed", endReason: "cancel" }),
    ];
    const call = aggregateLegs(legs);
    expect(call.status).toBe("answered");
    expect(call.answeredBy).toBe("40");
    expect(call.answeredByName).toBe("Matteo Keller");
    expect(call.duration).toBe(30);
    expect(call.answerTime).toBe("2026-05-04T10:25:10.000Z");
  });

  it("treats any ringing leg as ringing call (in-flight hunt-group)", () => {
    const legs: CallLeg[] = [
      leg({ extension: "20", status: "ringing" }),
      leg({ extension: "40", status: "ringing" }),
    ];
    expect(aggregateLegs(legs).status).toBe("ringing");
  });

  it("treats active leg as active call", () => {
    const legs: CallLeg[] = [
      leg({ extension: "20", status: "missed" }),
      leg({ extension: "40", status: "active", answerTime: "2026-05-04T10:25:10.000Z" }),
    ];
    expect(aggregateLegs(legs).status).toBe("active");
  });

  it("preserves busy status only when every leg was busy", () => {
    const allBusy = [leg({ extension: "20", status: "busy" }), leg({ extension: "40", status: "busy" })];
    expect(aggregateLegs(allBusy).status).toBe("busy");

    const mixed = [leg({ extension: "20", status: "busy" }), leg({ extension: "40", status: "missed" })];
    expect(aggregateLegs(mixed).status).toBe("missed");
  });

  it("surfaces transfer metadata when one leg has it", () => {
    const legs: CallLeg[] = [
      leg({ extension: "20", status: "answered", transferredFrom: "30", transferredFromName: "Andre Keller", originalCaller: "493012345678" }),
    ];
    const call = aggregateLegs(legs);
    expect(call.transferredFrom).toBe("30");
    expect(call.transferredFromName).toBe("Andre Keller");
    expect(call.originalCaller).toBe("493012345678");
  });

  it("anchors a same-uuid sequential transfer on the transferrer and exposes transferredTo", () => {
    // Manfred(30) answered, then forwarded the caller to Robin(54) on the same
    // NFON uuid. The transferring extension is itself an answered leg.
    const legs: CallLeg[] = [
      leg({ extension: "30", extensionName: "Manfred Klein", status: "answered", duration: 45, startTime: "2026-07-01T12:28:36.000Z", answerTime: "2026-07-01T12:28:45.000Z", endTime: "2026-07-01T12:29:30.000Z" }),
      leg({ extension: "54", extensionName: "Robin Will", status: "answered", duration: 20, startTime: "2026-07-01T12:29:30.000Z", answerTime: "2026-07-01T12:29:40.000Z", transferredFrom: "30", transferredFromName: "Manfred Klein", originalCaller: "4961313861172" }),
    ];
    const call = aggregateLegs(legs);
    expect(call.status).toBe("answered");
    expect(call.answeredBy).toBe("30");          // transferrer anchors the row
    expect(call.duration).toBe(45);
    expect(call.transferredFrom).toBeUndefined(); // no recipient-anchored "von"
    expect(call.transferredTo).toBe("54");
    expect(call.transferredToName).toBe("Robin Will");
    expect(call.originalCaller).toBe("4961313861172"); // surfaced to link back to the original caller
  });

  it("names the recipient (not the transferrer) when an outbound self-marker leg shares the uuid", () => {
    // Real case 983lv4b8: Michael(52) answered a hunt call, then forwarded the
    // external caller to Wim(20) on the same uuid. Michael's outbound dial leg
    // carries the outbound-transfer self-marker (transferredFrom === own ext);
    // Wim's inbound leg is the genuine recipient (transferredFrom = 52). Both
    // start at the same instant, so the leg finder must pick Wim, not Michael.
    const legs: CallLeg[] = [
      leg({ extension: "52", extensionName: "Michael Seifert", direction: "outbound", caller: "52", callee: "20", status: "answered", duration: 15, startTime: "2026-07-14T09:03:29.000Z", answerTime: "2026-07-14T09:03:38.000Z", transferredFrom: "52", transferredFromName: "Michael Seifert" }),
      leg({ extension: "20", extensionName: "Wim Bonis", direction: "inbound", caller: "4915757344532", callee: "20", status: "answered", duration: 458, startTime: "2026-07-14T09:03:29.000Z", answerTime: "2026-07-14T09:03:38.000Z", transferredFrom: "52", transferredFromName: "Michael Seifert", originalCaller: "4915757344532" }),
    ];
    const call = aggregateLegs(legs);
    expect(call.transferredTo).toBe("20");
    expect(call.transferredToName).toBe("Wim Bonis");
    expect(call.transferredFrom).toBeUndefined();
    expect(call.originalCaller).toBe("4915757344532"); // link back to the original external caller
  });

  it("keeps an outbound-transfer self-marker leg out of the transferredTo path", () => {
    // A standalone answered outbound transfer (transferredFrom === own ext) must
    // keep its recipient-perspective "Weiterleitung an {callee}" rendering and
    // never surface a self-referential transferredTo.
    const legs: CallLeg[] = [
      leg({ extension: "52", extensionName: "Michael Seifert", direction: "outbound", caller: "52", callee: "20", status: "answered", duration: 15, answerTime: "2026-07-14T09:03:38.000Z", transferredFrom: "52", transferredFromName: "Michael Seifert", originalCaller: "4915757344532" }),
    ];
    const call = aggregateLegs(legs);
    expect(call.transferredTo).toBeUndefined();
    expect(call.transferredFrom).toBe("52");
  });

  it("keeps recipient-anchored transfer when the source is not a leg (cross-uuid)", () => {
    const legs: CallLeg[] = [
      leg({ extension: "20", status: "answered", transferredFrom: "30", transferredFromName: "Andre Keller", originalCaller: "493012345678" }),
    ];
    const call = aggregateLegs(legs);
    expect(call.transferredFrom).toBe("30");
    expect(call.transferredTo).toBeUndefined();
    expect(call.originalCaller).toBe("493012345678");
  });

  it("uses the earliest leg startTime for the call startTime", () => {
    const legs: CallLeg[] = [
      leg({ extension: "20", startTime: "2026-05-04T10:25:08.500Z", status: "missed" }),
      leg({ extension: "40", startTime: "2026-05-04T10:25:08.000Z", status: "missed" }),
      leg({ extension: "10", startTime: "2026-05-04T10:25:08.300Z", status: "missed" }),
    ];
    expect(aggregateLegs(legs).startTime).toBe("2026-05-04T10:25:08.000Z");
  });
});
