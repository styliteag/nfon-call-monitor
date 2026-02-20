import { EventEmitter } from "events";
import { login, startAutoRefresh, stopAutoRefresh } from "./auth.js";
import { getExtensions, getLineStates, getCallEventStream } from "./api.js";
import { processEvent, setExtensionNames, getActiveCallForExtension } from "./call-aggregator.js";
import type { NfonCallEvent, ExtensionInfo } from "../shared/types.js";

const RECONNECT_DELAY = 5000;
const debug = () => (process.env.LOG || "").toLowerCase() === "debug";

// Adaptive polling tiers based on time since last event
const POLL_TIER_HOT     =  3_000;  // event < 30s ago  → poll every 3s
const POLL_TIER_WARM    = 15_000;  // event < 5min ago  → poll every 15s
const POLL_TIER_COOL    = 30_000;  // event < 1hr ago   → poll every 30s
const POLL_TIER_IDLE    = 60_000;  // no recent events  → poll every 60s

export const connectorEvents = new EventEmitter();

let extensions: ExtensionInfo[] = [];
let running = false;
let sseConnected = false;
let presenceTimer: ReturnType<typeof setTimeout> | null = null;
let lastEventTime = 0;

export async function start(): Promise<void> {
  running = true;
  await login();
  startAutoRefresh();

  await loadExtensions();
  startPresencePolling();
  connectSSE();
}

export function stop(): void {
  running = false;
  stopAutoRefresh();
  if (presenceTimer) {
    clearTimeout(presenceTimer);
    presenceTimer = null;
  }
}

export function getExtensionList(): ExtensionInfo[] {
  return extensions.map((ext) => {
    const call = getActiveCallForExtension(ext.extensionNumber);
    if (call) {
      return {
        ...ext,
        currentCallId: call.id,
        currentCaller: call.caller,
        currentCallee: call.callee,
        currentCallDirection: call.direction,
        currentCallStartTime: call.answerTime || call.startTime,
        currentCallStatus: call.status,
      };
    }
    return ext;
  });
}

export function isNfonConnected(): boolean {
  return sseConnected;
}

async function loadExtensions(): Promise<void> {
  try {
    const exts = await getExtensions();
    const states = await getLineStates();

    const stateMap = new Map<string, { presence: string; line: string; updated: string }>();
    for (const s of states) {
      stateMap.set(s.extension, { presence: s.presence, line: s.line, updated: s.updated });
    }

    const nameMap = new Map<string, string>();

    extensions = exts.map((ext) => {
      nameMap.set(ext.extension_number, ext.name);
      const state = stateMap.get(ext.extension_number);
      return {
        uuid: ext.uuid,
        extensionNumber: ext.extension_number,
        name: ext.name,
        presence: state?.presence || "offline",
        line: state?.line || "offline",
        lastStateChange: state?.updated,
      };
    });

    setExtensionNames(nameMap);
    connectorEvents.emit("extensions:updated", extensions);
    console.log(`[Connector] ${extensions.length} Extensions geladen.`);
  } catch (err) {
    console.error("[Connector] Fehler beim Laden der Extensions:", err);
  }
}

function getAdaptiveInterval(): number {
  const elapsed = Date.now() - lastEventTime;
  if (elapsed < 30_000)       return POLL_TIER_HOT;   // 3s
  if (elapsed < 5 * 60_000)   return POLL_TIER_WARM;  // 15s
  if (elapsed < 60 * 60_000)  return POLL_TIER_COOL;  // 30s
  return POLL_TIER_IDLE;                               // 60s
}

function scheduleNextPoll(): void {
  if (!running) return;
  const interval = getAdaptiveInterval();
  if (debug()) console.log(`[Presence] Next poll in ${interval / 1000}s`);
  presenceTimer = setTimeout(pollPresence, interval);
}

async function pollPresence(): Promise<void> {
  try {
    const states = await getLineStates();
    const stateMap = new Map<string, { presence: string; line: string; updated: string }>();
    for (const s of states) {
      stateMap.set(s.extension, { presence: s.presence, line: s.line, updated: s.updated });
    }

    let changed = false;
    for (const ext of extensions) {
      const state = stateMap.get(ext.extensionNumber);
      const newPresence = state?.presence || "offline";
      const newLine = state?.line || "offline";
      const newUpdated = state?.updated;
      const presenceChanged = ext.presence !== newPresence || ext.line !== newLine;
      if (presenceChanged) {
        if (debug()) console.log(`[Presence] ${ext.extensionNumber} (${ext.name}): presence=${ext.presence}→${newPresence} line=${ext.line}→${newLine}`);
        ext.presence = newPresence;
        ext.line = newLine;
        changed = true;
      }
      if (ext.lastStateChange !== newUpdated) {
        ext.lastStateChange = newUpdated;
      }
    }

    if (changed) {
      lastEventTime = Date.now();
      connectorEvents.emit("extensions:updated", extensions);
    } else if (debug()) {
      console.log("[Presence] Poll: keine Änderungen");
    }
  } catch (err) {
    console.error("[Connector] Fehler beim Presence-Poll:", err);
  }

  scheduleNextPoll();
}

function startPresencePolling(): void {
  scheduleNextPoll();
}

async function connectSSE(): Promise<void> {
  while (running) {
    try {
      console.log("[Connector] Verbinde SSE-Stream...");
      const res = await getCallEventStream();

      if (!res.body) {
        throw new Error("Kein Response-Body");
      }

      sseConnected = true;
      connectorEvents.emit("sse:connected");
      console.log("[Connector] SSE-Stream verbunden.");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (running) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed === ":") continue;
          if (trimmed.startsWith("event:")) continue;

          const jsonStr = trimmed.startsWith("data:")
            ? trimmed.slice(5).trim()
            : trimmed;

          try {
            const event = JSON.parse(jsonStr) as NfonCallEvent;
            if (debug()) {
              console.log(`[SSE] RAW:`, JSON.stringify(event));
            }
            console.log(`[SSE] uuid=${event.uuid} state=${event.state} ext=${event.extension} dir=${event.direction} caller=${event.caller} callee=${event.callee}${event.error ? ` error=${event.error}` : ""}`);
            lastEventTime = Date.now();
            processEvent(event);
          } catch {
            // Non-JSON line, skip
            if (jsonStr) console.log(`[SSE] non-JSON: ${jsonStr.substring(0, 200)}`);
          }
        }
      }

      console.log("[Connector] SSE-Stream geschlossen.");
    } catch (err) {
      sseConnected = false;
      console.error("[Connector] SSE-Fehler:", err);
      connectorEvents.emit("sse:disconnected");
    }

    if (running) {
      console.log(`[Connector] Reconnect in ${RECONNECT_DELAY / 1000}s...`);
      await new Promise((resolve) => setTimeout(resolve, RECONNECT_DELAY));
    }
  }
}
