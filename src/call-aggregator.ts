import { EventEmitter } from "events";
import type { NfonCallEvent, CallRecord, CallStatus } from "../shared/types.js";
import { upsertCall } from "./db.js";

// In-memory map of active calls: key = "uuid:extension"
const activeCalls = new Map<string, CallRecord>();

// Extension name lookup: extension number → name
const extensionNames = new Map<string, string>();

export const callEvents = new EventEmitter();

export function setExtensionNames(names: Map<string, string>): void {
  for (const [ext, name] of names) {
    extensionNames.set(ext, name);
  }
}

function callKey(uuid: string, extension: string): string {
  return `${uuid}:${extension}`;
}

function resolveEndStatus(error?: string): CallStatus {
  switch (error) {
    case "busy":
      return "busy";
    case "reject":
      return "rejected";
    case "timeout":
    case "cancel":
    default:
      return "missed";
  }
}

export function processEvent(event: NfonCallEvent): void {
  const key = callKey(event.uuid, event.extension);
  const now = new Date().toISOString();

  let record = activeCalls.get(key);
  const isNew = !record;
  const prevStatus = record?.status;

  if (!record) {
    record = {
      id: event.uuid,
      caller: event.caller,
      callee: event.callee,
      extension: event.extension,
      extensionName: extensionNames.get(event.extension) || event.extension,
      direction: event.direction,
      startTime: now,
      status: "ringing",
    };
  }

  // Update caller/callee if available (might arrive with later events)
  if (event.caller) record.caller = event.caller;
  if (event.callee) record.callee = event.callee;

  switch (event.state) {
    case "start":
    case "dial":
    case "ring":
      record.status = "ringing";
      break;

    case "answer":
    case "bridge":
      record.status = "active";
      if (!record.answerTime) {
        record.answerTime = now;
      }
      // Cancel ringing on all other extensions for the same call (group call)
      for (const [otherKey, otherRecord] of activeCalls) {
        if (otherRecord.id === event.uuid && otherRecord.extension !== event.extension && otherRecord.status === "ringing") {
          console.log(`[Calls] Group cancel: ${otherRecord.extensionName}(${otherRecord.extension}) was ringing, now missed (answered by ${event.extension})`);
          otherRecord.status = "missed";
          otherRecord.endTime = now;
          otherRecord.endReason = "cancel";
          activeCalls.delete(otherKey);
          upsertCall(otherRecord);
          callEvents.emit("call:updated", otherRecord);
        }
      }
      break;

    case "hangup":
    case "end":
      record.endTime = now;
      if (record.answerTime) {
        record.status = "answered";
        record.duration = Math.round(
          (new Date(record.endTime).getTime() - new Date(record.answerTime).getTime()) / 1000
        );
      } else {
        record.status = resolveEndStatus(event.error);
      }
      record.endReason = event.error;
      activeCalls.delete(key);
      break;
  }

  if (event.state !== "hangup" && event.state !== "end") {
    activeCalls.set(key, record);
  }

  console.log(`[Calls] ${isNew ? "NEW" : "UPD"} ${record.extensionName}(${record.extension}) uuid=${record.id.substring(0, 8)}.. ${prevStatus || "-"} → ${record.status} [active=${activeCalls.size}]`);

  // Persist to database
  upsertCall(record);

  // Emit events for Socket.IO
  if (isNew) {
    callEvents.emit("call:new", record);
  } else {
    callEvents.emit("call:updated", record);
  }
}

// Clean up stale active calls that have been ringing/active for too long without an end event
const STALE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

export function cleanStaleCalls(): void {
  const now = Date.now();
  let cleaned = 0;

  for (const [key, record] of activeCalls) {
    const age = now - new Date(record.startTime).getTime();
    if (age > STALE_TIMEOUT_MS) {
      console.log(`[Calls] STALE cleanup: ${record.extensionName}(${record.extension}) uuid=${record.id.substring(0, 8)}.. status=${record.status} age=${Math.round(age / 1000)}s`);
      record.endTime = new Date().toISOString();
      if (record.answerTime) {
        record.status = "answered";
        record.duration = Math.round(
          (new Date(record.endTime).getTime() - new Date(record.answerTime).getTime()) / 1000
        );
      } else {
        record.status = "missed";
      }
      record.endReason = "stale";
      activeCalls.delete(key);
      upsertCall(record);
      callEvents.emit("call:updated", record);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    console.log(`[Calls] Cleaned ${cleaned} stale call(s). Active: ${activeCalls.size}`);
  }
}

export function getActiveCallsList(): CallRecord[] {
  return Array.from(activeCalls.values());
}
