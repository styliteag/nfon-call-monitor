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

  // Persist to database
  upsertCall(record);

  // Emit events for Socket.IO
  if (isNew) {
    callEvents.emit("call:new", record);
  } else {
    callEvents.emit("call:updated", record);
  }
}

export function getActiveCallsList(): CallRecord[] {
  return Array.from(activeCalls.values());
}
