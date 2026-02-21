import { useState, useEffect, useCallback } from "react";
import type { ExtensionInfo, PfContact } from "../../../shared/types";
import { initiateCall } from "../lib/api";

interface Props {
  extensions: ExtensionInfo[];
  pfContacts?: Record<string, PfContact>;
}

function isOnline(presence: string): boolean {
  return presence === "available" || presence === "online";
}

function cardBorder(ext: ExtensionInfo): string {
  if (ext.currentCallId) return "border-red-400 bg-red-50 dark:bg-red-900/30 dark:border-red-600";
  if (ext.line === "idle") return "border-green-400 bg-green-50 dark:bg-green-900/30 dark:border-green-600";
  return "border-gray-300 bg-gray-50 dark:border-gray-600 dark:bg-gray-800";
}

function presenceDotColor(presence: string): string {
  if (isOnline(presence)) return "bg-green-500";
  return "bg-gray-400";
}

function lineDotColor(line: string): string {
  switch (line) {
    case "busy":
      return "bg-red-500";
    case "ringing":
      return "bg-yellow-500";
    case "idle":
      return "bg-green-500";
    default:
      return "bg-gray-400";
  }
}

function presenceLabel(presence: string): string {
  if (isOnline(presence)) return "Verfügbar";
  return "Offline";
}

const USER_STATUS_LABELS: Record<string, string> = {
  online: "Online",
  offline: "Offline",
  mittagspause: "Mittagspause",
  homeoffice: "Homeoffice",
  office: "Office",
};

const USER_STATUS_COLORS: Record<string, string> = {
  online: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300",
  offline: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400",
  mittagspause: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300",
  homeoffice: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
  office: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300",
};

function lineLabel(line: string): string {
  switch (line) {
    case "idle": return "Frei";
    case "busy": return "Besetzt";
    case "ringing": return "Klingelt";
    case "offline": return "Offline";
    default: return line;
  }
}

function callPartner(ext: ExtensionInfo): string | undefined {
  if (!ext.currentCallId) return undefined;
  return ext.currentCallDirection === "inbound" ? ext.currentCaller : ext.currentCallee;
}

function formatElapsed(startIso: string, now: number): string {
  const elapsed = Math.max(0, Math.floor((now - new Date(startIso).getTime()) / 1000));
  const m = Math.floor(elapsed / 60);
  const s = elapsed % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function relativeTime(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return "gerade";
  if (diff < 3600) return `${Math.floor(diff / 60)} Min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} Std`;
  return `${Math.floor(diff / 86400)} T`;
}

function useTimer(extensions: ExtensionInfo[]): number {
  const hasActiveCalls = extensions.some((e) => e.currentCallStartTime);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!hasActiveCalls) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [hasActiveCalls]);

  return now;
}

function ExtensionCard({ ext, now, pfContacts }: { ext: ExtensionInfo; now: number; pfContacts?: Record<string, PfContact> }) {
  const [dragOver, setDragOver] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  const showFeedback = useCallback((type: "success" | "error", text: string) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 2500);
  }, []);

  const executeCall = useCallback(async (target: string) => {
    setPending(null);
    try {
      await initiateCall(ext.extensionNumber, target);
      showFeedback("success", `Anruf an ${target}`);
    } catch (err: any) {
      showFeedback("error", err.message || "Fehler");
    }
  }, [ext.extensionNumber, showFeedback]);

  const requestCall = useCallback((target: string) => {
    setPending(target);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const target = e.dataTransfer.getData("text/plain").trim();
    if (target) requestCall(target);
  }, [requestCall]);

  const handleClipboard = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      const target = text.trim();
      if (!target) {
        showFeedback("error", "Zwischenablage leer");
        return;
      }
      requestCall(target);
    } catch {
      showFeedback("error", "Zwischenablage nicht verfügbar");
    }
  }, [requestCall, showFeedback]);

  const partner = callPartner(ext);

  const borderClass = dragOver
    ? "border-blue-500 border-dashed bg-blue-50 dark:bg-blue-900/30"
    : cardBorder(ext);

  return (
    <div
      className={`rounded-lg border-2 px-3 py-2 text-center relative ${borderClass} transition-colors`}
      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; setDragOver(true); }}
      onDragEnter={() => setDragOver(true)}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      <div className="flex items-center justify-between">
        <div className="font-mono text-sm font-bold dark:text-gray-100">{ext.extensionNumber}</div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleClipboard}
            className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 p-0.5 rounded transition-colors"
            title="Zwischenablage anrufen"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
              <path d="M2 3a1 1 0 0 1 1-1h1.172a3 3 0 0 1 2.12.879l.83.828A1 1 0 0 0 7.828 4H14a1 1 0 0 1 1 1v1a1 1 0 1 1-2 0V5H7.828a3 3 0 0 1-2.12-.879l-.83-.828A1 1 0 0 0 4.172 3H3v12h4a1 1 0 1 1 0 2H3a2 2 0 0 1-2-2V4a1 1 0 0 1 1-1Z" />
              <path d="M13.5 8a2.5 2.5 0 0 0-2.5 2.5V13h-1.5a.5.5 0 0 0-.354.854l3 3a.5.5 0 0 0 .708 0l3-3A.5.5 0 0 0 16.5 13H15v-2.5A2.5 2.5 0 0 0 13.5 8Z" />
            </svg>
          </button>
          <span
            className={`inline-block w-2 h-2 rounded-full ${lineDotColor(ext.line)}`}
            title={`Line: ${lineLabel(ext.line)}`}
          />
          <span
            className={`inline-block w-2 h-2 rounded-full ${presenceDotColor(ext.presence)}`}
            title={`Presence: ${presenceLabel(ext.presence)}`}
          />
          <span
            className={`inline-block w-2 h-2 rounded-full ${ext.agentLoggedIn ? "bg-blue-500" : "bg-gray-400"}`}
            title={`Agent: ${ext.agentLoggedIn ? "Angemeldet" : "Abgemeldet"}`}
          />
        </div>
      </div>
      <div className="text-xs text-gray-600 dark:text-gray-400 truncate text-left">{ext.name}</div>
      {ext.userStatus && (
        <div className="flex items-center gap-1 mt-0.5">
          <span className={`inline-block px-1.5 py-0 rounded text-[10px] font-medium ${USER_STATUS_COLORS[ext.userStatus] || USER_STATUS_COLORS.offline}`}>
            {USER_STATUS_LABELS[ext.userStatus] || ext.userStatus}
          </span>
          {ext.userMessage && (
            <span className="text-[10px] text-gray-500 dark:text-gray-400 truncate">{ext.userMessage}</span>
          )}
        </div>
      )}

      {partner ? (
        <div className="mt-1 text-xs">
          <div className="flex items-center gap-1 justify-center">
            <span title={ext.currentCallDirection === "inbound" ? "Eingehend" : "Ausgehend"}>
              {ext.currentCallDirection === "inbound" ? "\u2199" : "\u2197"}
            </span>
            <span className="truncate" title={partner}>
              {pfContacts?.[partner]?.name ? (<>
                <span className="text-blue-600 dark:text-blue-400">{pfContacts[partner].name}</span>
                {pfContacts[partner].formatted && (
                  <span className="font-mono text-gray-400 dark:text-gray-500 text-[10px]"> {pfContacts[partner].formatted}</span>
                )}
              </>) : <span className="font-mono">{partner}</span>}
            </span>
          </div>
          {ext.currentCallStartTime && (
            <div className="font-mono text-red-600 dark:text-red-400">
              {ext.currentCallStatus === "ringing" ? "Klingelt\u2026" : formatElapsed(ext.currentCallStartTime, now)}
            </div>
          )}
        </div>
      ) : ext.lastStateChange ? (
        <div className="mt-1 text-[10px] text-gray-400 dark:text-gray-500" title={new Date(ext.lastStateChange).toLocaleString("de-DE")}>
          {relativeTime(ext.lastStateChange)}
        </div>
      ) : null}

      {pending && (
        <div className="absolute inset-0 flex flex-col items-center justify-center rounded-lg bg-blue-100/95 dark:bg-blue-900/95 text-xs p-2 z-10">
          <div className="text-blue-800 dark:text-blue-200 font-medium truncate w-full text-center mb-1">
            {pending} anrufen?
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => executeCall(pending)}
              className="px-2 py-0.5 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
            >
              Ja
            </button>
            <button
              onClick={() => setPending(null)}
              className="px-2 py-0.5 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded text-xs hover:bg-gray-400"
            >
              Nein
            </button>
          </div>
        </div>
      )}

      {feedback && !pending && (
        <div className={`absolute inset-0 flex items-center justify-center rounded-lg text-xs font-medium ${
          feedback.type === "success"
            ? "bg-green-100/90 text-green-800 dark:bg-green-900/90 dark:text-green-200"
            : "bg-red-100/90 text-red-800 dark:bg-red-900/90 dark:text-red-200"
        }`}>
          {feedback.text}
        </div>
      )}
    </div>
  );
}

export function ExtensionCards({ extensions, pfContacts }: Props) {
  const now = useTimer(extensions);

  if (extensions.length === 0) return null;

  const sorted = [...extensions].sort((a, b) => Number(a.extensionNumber) - Number(b.extensionNumber));

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2 px-4 py-3">
      {sorted.map((ext) => (
        <ExtensionCard key={ext.uuid} ext={ext} now={now} pfContacts={pfContacts} />
      ))}
    </div>
  );
}
