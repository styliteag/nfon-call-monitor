import { useState, useEffect } from "react";
import type { ExtensionInfo, PfContact } from "../../../shared/types";

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

export function ExtensionCards({ extensions, pfContacts }: Props) {
  const now = useTimer(extensions);

  if (extensions.length === 0) return null;

  const sorted = [...extensions].sort((a, b) => Number(a.extensionNumber) - Number(b.extensionNumber));

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2 px-4 py-3">
      {sorted.map((ext) => {
        const partner = callPartner(ext);
        return (
          <div
            key={ext.uuid}
            className={`rounded-lg border-2 px-3 py-2 text-center ${cardBorder(ext)}`}
          >
            <div className="flex items-center justify-between">
              <div className="font-mono text-sm font-bold dark:text-gray-100">{ext.extensionNumber}</div>
              <div className="flex items-center gap-1">
                <span
                  className={`inline-block w-2 h-2 rounded-full ${lineDotColor(ext.line)}`}
                  title={`Line: ${lineLabel(ext.line)}`}
                />
                <span
                  className={`inline-block w-2 h-2 rounded-full ${presenceDotColor(ext.presence)}`}
                  title={`Presence: ${presenceLabel(ext.presence)}`}
                />
              </div>
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400 truncate text-left">{ext.name}</div>

            {partner ? (
              <div className="mt-1 text-xs">
                <div className="flex items-center gap-1 justify-center">
                  <span title={ext.currentCallDirection === "inbound" ? "Eingehend" : "Ausgehend"}>
                    {ext.currentCallDirection === "inbound" ? "↙" : "↗"}
                  </span>
                  <span className="font-mono truncate" title={partner}>
                    {pfContacts?.[partner]?.name ? (
                      <span className="text-blue-600 dark:text-blue-400 font-sans">{pfContacts[partner].name}</span>
                    ) : partner}
                  </span>
                </div>
                {ext.currentCallStartTime && (
                  <div className="font-mono text-red-600 dark:text-red-400">
                    {ext.currentCallStatus === "ringing" ? "Klingelt…" : formatElapsed(ext.currentCallStartTime, now)}
                  </div>
                )}
              </div>
            ) : ext.lastStateChange ? (
              <div className="mt-1 text-[10px] text-gray-400 dark:text-gray-500" title={new Date(ext.lastStateChange).toLocaleString("de-DE")}>
                {relativeTime(ext.lastStateChange)}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
