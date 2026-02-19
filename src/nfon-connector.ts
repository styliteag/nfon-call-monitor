import { EventEmitter } from "events";
import { login, startAutoRefresh, stopAutoRefresh } from "./auth.js";
import { getExtensions, getLineStates, getCallEventStream } from "./api.js";
import { processEvent, setExtensionNames } from "./call-aggregator.js";
import type { NfonCallEvent, ExtensionInfo } from "../shared/types.js";

const RECONNECT_DELAY = 5000;
const PRESENCE_POLL_INTERVAL = 30000;

export const connectorEvents = new EventEmitter();

let extensions: ExtensionInfo[] = [];
let running = false;
let presenceTimer: ReturnType<typeof setInterval> | null = null;

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
    clearInterval(presenceTimer);
    presenceTimer = null;
  }
}

export function getExtensionList(): ExtensionInfo[] {
  return extensions;
}

async function loadExtensions(): Promise<void> {
  try {
    const exts = await getExtensions();
    const states = await getLineStates();

    const stateMap = new Map<string, string>();
    for (const s of states) {
      stateMap.set(s.extension, s.presence);
    }

    const nameMap = new Map<string, string>();

    extensions = exts.map((ext) => {
      nameMap.set(ext.extension_number, ext.name);
      return {
        uuid: ext.uuid,
        extensionNumber: ext.extension_number,
        name: ext.name,
        presence: stateMap.get(ext.extension_number) || "offline",
      };
    });

    setExtensionNames(nameMap);
    connectorEvents.emit("extensions:updated", extensions);
    console.log(`[Connector] ${extensions.length} Extensions geladen.`);
  } catch (err) {
    console.error("[Connector] Fehler beim Laden der Extensions:", err);
  }
}

function startPresencePolling(): void {
  presenceTimer = setInterval(async () => {
    try {
      const states = await getLineStates();
      const stateMap = new Map<string, string>();
      for (const s of states) {
        stateMap.set(s.extension, s.presence);
      }

      let changed = false;
      for (const ext of extensions) {
        const newPresence = stateMap.get(ext.extensionNumber) || "offline";
        if (ext.presence !== newPresence) {
          ext.presence = newPresence;
          changed = true;
        }
      }

      if (changed) {
        connectorEvents.emit("extensions:updated", extensions);
      }
    } catch (err) {
      console.error("[Connector] Fehler beim Presence-Poll:", err);
    }
  }, PRESENCE_POLL_INTERVAL);
}

async function connectSSE(): Promise<void> {
  while (running) {
    try {
      console.log("[Connector] Verbinde SSE-Stream...");
      const res = await getCallEventStream();

      if (!res.body) {
        throw new Error("Kein Response-Body");
      }

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
            processEvent(event);
          } catch {
            // Non-JSON line, skip
          }
        }
      }

      console.log("[Connector] SSE-Stream geschlossen.");
    } catch (err) {
      console.error("[Connector] SSE-Fehler:", err);
      connectorEvents.emit("sse:disconnected");
    }

    if (running) {
      console.log(`[Connector] Reconnect in ${RECONNECT_DELAY / 1000}s...`);
      await new Promise((resolve) => setTimeout(resolve, RECONNECT_DELAY));
    }
  }
}
