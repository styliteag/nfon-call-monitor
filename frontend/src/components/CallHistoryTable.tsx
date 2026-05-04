import { useState } from "react";
import type { Call, CallStatus, ExtensionInfo, PfContact } from "../../../shared/types";
import { CallStatusBadge } from "./CallStatusBadge";
import { formatTime, formatDate, formatDuration, formatPhone, getStandort, type KopfnummerEntry } from "../lib/formatters";

const arrowColor: Record<CallStatus, string> = {
  ringing: "text-yellow-800 dark:text-yellow-300",
  active: "text-blue-800 dark:text-blue-300",
  answered: "text-green-800 dark:text-green-300",
  missed: "text-red-600 dark:text-red-400",
  busy: "text-orange-800 dark:text-orange-300",
  rejected: "text-red-600 dark:text-red-400",
  system: "text-gray-500 dark:text-gray-400",
};

interface Props {
  calls: Call[];
  loading: boolean;
  kopfnummern?: string[];
  kopfnummernMap?: KopfnummerEntry[];
  pfContacts?: Record<string, PfContact>;
  extensions?: ExtensionInfo[];
  specialNumbers?: Record<string, string>;
}

function displayNumber(num: string): string {
  if (num.length > 8 && !num.startsWith("0") && !num.startsWith("+")) return "+" + num;
  return num;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="inline-flex items-center mr-1 text-gray-300 hover:text-gray-500 dark:text-gray-600 dark:hover:text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-blue-500"
      title="Nummer kopieren"
      aria-label="Nummer kopieren"
      onClick={(e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? (
        <svg className="w-3.5 h-3.5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
      ) : (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
      )}
    </button>
  );
}

function PhoneWithPf({ number, kopfnummern, kopfnummernMap, pfContacts, extensions, specialNumbers, className }: {
  number: string;
  kopfnummern?: string[];
  kopfnummernMap?: KopfnummerEntry[];
  pfContacts?: Record<string, PfContact>;
  extensions?: ExtensionInfo[];
  specialNumbers?: Record<string, string>;
  className?: string;
}) {
  const formatted = formatPhone(number, kopfnummern);
  const contact = pfContacts?.[number];
  const isExternal = formatted === number; // not matched by kopfnummern
  const standort = getStandort(number, kopfnummernMap);

  // Resolve internal extension numbers to names
  const extMatch = extensions?.find((e) => e.extensionNumber === number);

  const displayNum = contact?.formatted || displayNumber(number);

  const dragProps = {
    draggable: true,
    onDragStart: (e: React.DragEvent) => {
      e.dataTransfer.setData("text/plain", number);
      e.dataTransfer.effectAllowed = "copy";
    },
  };

  // Special number from config: show "Primär *55", "Agent On *87", etc.
  const specialLabel = specialNumbers?.[number];
  if (specialLabel) {
    return (
      <span className={`group whitespace-nowrap ${className ?? ""}`}>
        <span className="text-purple-600 dark:text-purple-400 font-sans">{specialLabel}</span>
        <span className="text-gray-400 ml-1">{number}</span>
      </span>
    );
  }

  // Internal extension number: show "Name (intern)" e.g. "Michael Seifert (intern)"
  if (extMatch) {
    return (
      <span className={`group whitespace-nowrap cursor-grab ${className ?? ""}`} title={`Extension ${number}`} {...dragProps}>
        <span className="text-green-600 dark:text-green-400 font-sans">{extMatch.name}</span>
        <span className="text-gray-400 dark:text-gray-500 font-sans text-xs ml-1">(intern)</span>
        <span className="text-gray-400 ml-1">{number}</span>
      </span>
    );
  }

  // Internal number matched by kopfnummer: show extension name if available, otherwise "Z-20"
  if (!isExternal && standort) {
    // Durchwahl "0" = Zentrale (hunt group)
    if (formatted === "0") {
      return (
        <span className={`group whitespace-nowrap ${className ?? ""}`} title={displayNum} {...dragProps}>
          <span className="text-green-600 dark:text-green-400 font-sans">{standort}</span>-<span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300 font-sans">Zentrale</span>
        </span>
      );
    }
    const extByDurchwahl = extensions?.find((e) => e.extensionNumber === formatted);
    if (extByDurchwahl) {
      return (
        <span className={`group whitespace-nowrap cursor-grab ${className ?? ""}`} title={`Extension ${formatted}`} {...dragProps}>
          <span className="text-green-600 dark:text-green-400 font-sans">{extByDurchwahl.name}</span>
          <span className="text-gray-400 dark:text-gray-500 font-sans text-xs ml-1">(intern)</span>
          <span className="text-gray-400 ml-1">{formatted}</span>
        </span>
      );
    }
    return (
      <span className={`group whitespace-nowrap cursor-grab ${className ?? ""}`} title={displayNum} {...dragProps}>
        <span className="text-green-600 dark:text-green-400 font-sans">{standort}</span>-<CopyButton text={displayNum} />{formatted}
      </span>
    );
  }

  if (contact?.name && isExternal) {
    const fuzzyMarker = contact.fuzzy ? "?".repeat(contact.fuzzy) : "";
    const isCityOnly = !!contact.city && contact.name === contact.city;
    const hasPfName = contact.contactId > 0;
    const nameColor = isCityOnly
      ? "text-amber-600 dark:text-amber-400 font-sans italic"
      : "text-blue-600 dark:text-blue-400 font-sans font-medium";
    const showCity = hasPfName && contact.city && contact.name !== contact.city;

    return (
      <span className={`group whitespace-nowrap cursor-grab ${className ?? ""}`} title={displayNum} {...dragProps}>
        <span className={nameColor}>{contact.name}{fuzzyMarker}</span>
        {showCity && <span className="text-amber-600 dark:text-amber-400 font-sans italic ml-1">({contact.city})</span>}
        <CopyButton text={displayNum} /><span className="text-gray-400">{displayNum}</span>
      </span>
    );
  }

  return (
    <span className={`group whitespace-nowrap cursor-grab ${className ?? ""}`} title={displayNum} {...dragProps}>
      <CopyButton text={displayNum} />
      {formatted === number ? displayNum : formatted}
    </span>

  );
}

function isHuntGroup(call: Call): boolean {
  return (
    call.legs.length > 1 &&
    call.direction === "inbound" &&
    call.status !== "system" &&
    !call.transferredFrom
  );
}

// Resolve the dialed target into a human-readable label using the
// KOPFNUMMERN config (prefix → site name): "MZ-Zentrale" for *-0 of a
// known site, "MZ-20" for a direct extension dial, or "Zentrale" / "DW 20"
// as fallback when the site name is not configured.
interface DialedTarget {
  label: string;
  standort?: string;
  durchwahl: string;
}
function dialedTargetLabel(callee: string, kopfnummern?: string[], kopfnummernMap?: KopfnummerEntry[]): DialedTarget | undefined {
  if (!callee || !kopfnummern) return undefined;
  const prefix = kopfnummern.find((p) => callee.startsWith(p));
  if (!prefix) return undefined;
  const dw = callee.slice(prefix.length);
  if (!dw) return undefined;
  const standort = kopfnummernMap?.find((e) => e.nr === prefix)?.name;
  if (dw === "0") {
    return { label: standort ? `${standort}-0` : "Zentrale", standort, durchwahl: dw };
  }
  return { label: standort ? `${standort}-${dw}` : `DW ${dw}`, standort, durchwahl: dw };
}

function DialedBadge({ target, callee }: { target: DialedTarget; callee: string }) {
  const isZentrale = target.durchwahl === "0";
  const cls = isZentrale
    ? "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300"
    : "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200";
  const fullNumber = callee.startsWith("+") ? callee : `+${callee}`;
  return (
    <span
      className={`group/dial relative inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium ${cls} font-sans shrink-0`}
      title={`Gewählt: ${fullNumber}`}
    >
      {target.label}
      <span className="pointer-events-none invisible opacity-0 group-hover/dial:visible group-hover/dial:opacity-100 transition-opacity absolute z-30 left-1/2 -translate-x-1/2 top-full mt-1 whitespace-nowrap text-[11px] bg-gray-900 text-gray-100 dark:bg-gray-700 px-2 py-1 rounded shadow-lg font-mono">
        Gewählt: {fullNumber}
      </span>
    </span>
  );
}

export function CallHistoryTable({ calls, loading, kopfnummern, kopfnummernMap, pfContacts, extensions, specialNumbers, hideScrollbar }: Props & { hideScrollbar?: boolean }) {
  return (
    <div className={hideScrollbar ? "flex-1 min-h-0 overflow-auto scrollbar-hide" : "overflow-auto"}>
      <table className="w-full text-sm table-fixed">
        <colgroup>
          <col className="w-[120px]" />
          <col className="w-[140px]" />
          <col className="w-[180px]" />
          <col className="w-[80px]" />
          <col />
        </colgroup>
        <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0 z-10">
          <tr className="text-left text-gray-500 dark:text-gray-400 text-xs uppercase">
            <th className="px-3 py-2">Zeit</th>
            <th className="px-3 py-2">Extension</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2">Dauer</th>
            <th className="px-3 py-2">Verbindung</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
          {loading && calls.length === 0 ? (
            <>
              {Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-3 py-1.5"><div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" /><div className="h-3 w-12 bg-gray-100 dark:bg-gray-800 rounded animate-pulse mt-1" /></td>
                  <td className="px-3 py-1.5"><div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" /><div className="h-3 w-10 bg-gray-100 dark:bg-gray-800 rounded animate-pulse mt-1" /></td>
                  <td className="px-3 py-1.5"><div className="h-5 w-20 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" /></td>
                  <td className="px-3 py-1.5"><div className="h-4 w-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" /></td>
                  <td className="px-3 py-1.5"><div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded animate-pulse" /></td>
                </tr>
              ))}
            </>
          ) : calls.length === 0 ? (
            <tr>
              <td colSpan={5} className="text-center py-8 text-gray-400">
                Keine Anrufe gefunden
              </td>
            </tr>
          ) : (
            calls.map((call) => {
              if (isHuntGroup(call)) {
                const isRinging = call.legs.some((l) => l.status === "ringing");
                const ringerLabels = call.legs.map((l) => l.extensionName || l.extension);
                const others = call.answeredBy
                  ? call.legs.filter((l) => l.extension !== call.answeredBy).map((l) => l.extensionName || l.extension)
                  : [];
                const huntBadge = (() => {
                  const target = dialedTargetLabel(call.callee, kopfnummern, kopfnummernMap);
                  if (!target) return null;
                  return <DialedBadge target={target} callee={call.callee} />;
                })();
                return (
                  <tr
                    key={call.id}
                    className={`hover:bg-gray-50 dark:hover:bg-gray-800 ${isRinging ? "bg-yellow-50 dark:bg-yellow-900/20 animate-pulse" : ""}`}
                  >
                    <td className="px-3 py-1.5 whitespace-nowrap align-top">
                      <div className="dark:text-gray-200">
                        {formatTime(call.startTime)}
                        {call.answerTime && (
                          <span className="text-xs text-gray-400 ml-1" title={`Angenommen: ${formatTime(call.answerTime)}`}>
                            +{Math.round((new Date(call.answerTime).getTime() - new Date(call.startTime).getTime()) / 1000)}s
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400">{formatDate(call.startTime)}</div>
                    </td>
                    <td className="px-3 py-1.5 truncate align-top">
                      {call.answeredBy ? (
                        <>
                          <div className="font-medium dark:text-gray-200 truncate">{call.answeredByName || call.answeredBy}</div>
                          <div className="text-xs text-gray-400">{call.answeredBy} · von {call.legs.length}</div>
                        </>
                      ) : (
                        (() => {
                          const target = dialedTargetLabel(call.callee, kopfnummern, kopfnummernMap);
                          const fullNumber = call.callee ? (call.callee.startsWith("+") ? call.callee : `+${call.callee}`) : "";
                          return (
                            <>
                              <div
                                className="font-medium text-indigo-700 dark:text-indigo-300 truncate"
                                title={fullNumber ? `Gewählt: ${fullNumber}` : undefined}
                              >
                                {target?.label ?? "Gruppe"}
                              </div>
                              <div className="text-xs text-gray-400">{call.legs.length} klingelten</div>
                            </>
                          );
                        })()
                      )}
                    </td>
                    <td className="px-3 py-1.5 whitespace-nowrap align-top">
                      <CallStatusBadge status={call.status} direction={call.direction} isTransfer={false} endReason={call.endReason} />
                    </td>
                    <td className="px-3 py-1.5 font-mono dark:text-gray-300 align-top">{formatDuration(call.duration)}</td>
                    <td className="px-3 py-1.5 font-mono dark:text-gray-300 align-top">
                      <div className="grid grid-cols-[minmax(100px,1fr)_auto_minmax(100px,1fr)] items-center gap-1">
                        <PhoneWithPf number={call.caller} kopfnummern={kopfnummern} kopfnummernMap={kopfnummernMap} pfContacts={pfContacts} extensions={extensions} specialNumbers={specialNumbers} className="truncate text-right" />
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`w-5 h-5 shrink-0 ${arrowColor[call.status] ?? "text-gray-800 dark:text-gray-300"}`} aria-label="Eingehend"><path fillRule="evenodd" d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z" clipRule="evenodd" /></svg>
                        <div className="flex items-center gap-1 min-w-0">{huntBadge}</div>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-sans truncate" title={ringerLabels.join(", ")}>
                        {call.answeredBy ? (
                          <>
                            <span className="text-gray-400">↳ angenommen von </span>
                            <span className="text-green-600 dark:text-green-400 font-medium">{call.answeredByName || call.answeredBy}</span>
                            {others.length > 0 && (
                              <span className="text-gray-400"> · klingelte auch: {others.join(", ")}</span>
                            )}
                          </>
                        ) : (
                          <>
                            <span className="text-gray-400">klingelte bei: </span>
                            <span className="text-gray-600 dark:text-gray-300">{ringerLabels.join(", ")}</span>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              }
              const leg = call.legs.find((l) => l.status === "answered" || l.status === "active")
                ?? call.legs.find((l) => l.transferredFrom)
                ?? call.legs[0];
              return call.status === "system" ? (
                <tr key={call.id} className="bg-gray-50 dark:bg-gray-800/50">
                  <td className="px-3 py-1.5 whitespace-nowrap">
                    <div className="dark:text-gray-200">{formatTime(call.startTime)}</div>
                    <div className="text-xs text-gray-400">{formatDate(call.startTime)}</div>
                  </td>
                  <td colSpan={4} className="px-3 py-1.5">
                    <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                      <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M12 3a9 9 0 110 18 9 9 0 010-18z" />
                      </svg>
                      <span className="text-xs">{call.endReason}</span>
                      <span className="text-xs text-gray-400 ml-auto">{formatDuration(call.duration)}</span>
                    </div>
                  </td>
                </tr>
              ) : (
              <tr
                key={call.id}
                className={`hover:bg-gray-50 dark:hover:bg-gray-800 ${
                  call.status === "ringing" ? "bg-yellow-50 dark:bg-yellow-900/20 animate-pulse" : ""
                } ${call.transferredFrom ? "border-l-2 border-l-purple-500 dark:border-l-purple-400" : ""}`}
              >
                <td className="px-3 py-1.5 whitespace-nowrap">
                  <div className="dark:text-gray-200">
                    {formatTime(call.startTime)}
                    {call.answerTime && (
                      <span className="text-xs text-gray-400 ml-1" title={`Angenommen: ${formatTime(call.answerTime)}`}>
                        +{Math.round((new Date(call.answerTime).getTime() - new Date(call.startTime).getTime()) / 1000)}s
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-400">{formatDate(call.startTime)}</div>
                </td>
                <td className="px-3 py-1.5 truncate">
                  <div className="font-medium dark:text-gray-200 truncate">{leg.extensionName || leg.extension}</div>
                  <div className="text-xs text-gray-400">{leg.extension}</div>
                </td>
                <td className="px-3 py-1.5 whitespace-nowrap">
                  <CallStatusBadge status={call.status} direction={call.direction} isTransfer={!!call.transferredFrom} endReason={call.endReason} />
                  {call.endReason && call.endReason !== "voicemail" && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300 ml-1">{call.endReason}</span>
                  )}
                </td>
                <td className="px-3 py-1.5 font-mono dark:text-gray-300">{formatDuration(call.duration)}</td>
                <td className="px-3 py-1.5 font-mono dark:text-gray-300">
                  <div className="grid grid-cols-[minmax(100px,1fr)_auto_minmax(100px,1fr)] items-center gap-1">
                    <PhoneWithPf number={call.direction === "outbound" ? leg.extension : call.caller} kopfnummern={kopfnummern} kopfnummernMap={kopfnummernMap} pfContacts={pfContacts} extensions={extensions} specialNumbers={specialNumbers} className="truncate text-right" />
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`w-5 h-5 shrink-0 ${arrowColor[call.status] ?? "text-gray-800 dark:text-gray-300"}`} aria-label={call.direction === "inbound" ? "Eingehend" : "Ausgehend"}><path fillRule="evenodd" d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z" clipRule="evenodd" /></svg>
                    <div className="flex items-center gap-1 min-w-0">
                      {(() => {
                        if (call.direction !== "inbound") return null;
                        const target = dialedTargetLabel(call.callee, kopfnummern, kopfnummernMap);
                        if (!target) return null;
                        const isZentrale = target.durchwahl === "0";
                        if (!isZentrale && target.durchwahl === leg.extension) return null;
                        return <DialedBadge target={target} callee={call.callee} />;
                      })()}
                      <PhoneWithPf number={call.direction === "inbound" ? leg.extension : call.callee} kopfnummern={kopfnummern} kopfnummernMap={kopfnummernMap} pfContacts={pfContacts} extensions={extensions} specialNumbers={specialNumbers} className="truncate" />
                    </div>
                  </div>
                  {call.transferredFrom && (
                    <div className="text-xs text-purple-600 dark:text-purple-400 mt-0.5 font-sans">
                      {call.direction === "outbound"
                        ? <>&#8618; Weiterleitung an <span className="font-medium">{call.callee}</span></>
                        : <>&#8617; Weiterleitung von {call.transferredFromName || call.transferredFrom}
                          <span className="text-gray-400 ml-1">({call.transferredFrom})</span></>
                      }
                      {call.originalCaller && (
                        <span className="text-gray-400 ml-1">
                          &mdash; Anrufer: <PhoneWithPf number={call.originalCaller} kopfnummern={kopfnummern} kopfnummernMap={kopfnummernMap} pfContacts={pfContacts} extensions={extensions} specialNumbers={specialNumbers} className="inline" />
                        </span>
                      )}
                    </div>
                  )}
                </td>
              </tr>
              );
            })
          )}
        </tbody>
      </table>

    </div>
  );
}
