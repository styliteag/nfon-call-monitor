import { useState } from "react";
import type { CallRecord, CallStatus, PfContact } from "../../../shared/types";
import { CallStatusBadge } from "./CallStatusBadge";
import { formatTime, formatDate, formatDuration, formatPhone, getStandort, type KopfnummerEntry } from "../lib/formatters";

const arrowColor: Record<CallStatus, string> = {
  ringing: "text-yellow-800 dark:text-yellow-300",
  active: "text-blue-800 dark:text-blue-300",
  answered: "text-green-800 dark:text-green-300",
  missed: "text-red-600 dark:text-red-400",
  busy: "text-orange-800 dark:text-orange-300",
  rejected: "text-red-600 dark:text-red-400",
};

interface Props {
  calls: CallRecord[];
  total: number;
  page: number;
  pageSize: number;
  loading: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  kopfnummern?: string[];
  kopfnummernMap?: KopfnummerEntry[];
  pfContacts?: Record<string, PfContact>;
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
      className="inline-flex items-center ml-1 text-gray-300 hover:text-gray-500 dark:text-gray-600 dark:hover:text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity"
      title="Nummer kopieren"
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

function PhoneWithPf({ number, kopfnummern, kopfnummernMap, pfContacts, className }: {
  number: string;
  kopfnummern?: string[];
  kopfnummernMap?: KopfnummerEntry[];
  pfContacts?: Record<string, PfContact>;
  className?: string;
}) {
  const formatted = formatPhone(number, kopfnummern, kopfnummernMap);
  const contact = pfContacts?.[number];
  const isExternal = formatted === number; // not matched by kopfnummern
  const standort = getStandort(number, kopfnummernMap);

  const displayNum = contact?.formatted || displayNumber(number);

  const dragProps = {
    draggable: true,
    onDragStart: (e: React.DragEvent) => {
      e.dataTransfer.setData("text/plain", number);
      e.dataTransfer.effectAllowed = "copy";
    },
  };

  // Internal number matched by kopfnummer: show "ZBens 20" instead of just "20"
  if (!isExternal && standort) {
    return (
      <span className={`group whitespace-nowrap cursor-grab ${className ?? ""}`} title={displayNum} {...dragProps}>
        <span className="text-green-600 dark:text-green-400 font-sans">{standort}</span>-{formatted}
        <CopyButton text={displayNum} />
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
        <span className="text-gray-400 ml-1">{displayNum}</span>
        <CopyButton text={displayNum} />
      </span>
    );
  }

  return (
    <span className={`group whitespace-nowrap cursor-grab ${className ?? ""}`} title={displayNum} {...dragProps}>
      {formatted === number ? displayNum : formatted}
      <CopyButton text={displayNum} />
    </span>
  );
}

const PAGE_SIZE_OPTIONS = [5, 10, 20, 30, 50, 100];

export function CallHistoryTable({ calls, total, page, pageSize, loading, onPageChange, onPageSizeChange, kopfnummern, kopfnummernMap, pfContacts }: Props) {
  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="flex-1 overflow-auto">
      <div className="flex items-center justify-between px-4 py-2">
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {total} Anrufe gesamt
        </span>
        <div className="flex items-center gap-2">
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-gray-200 px-2 py-1"
          >
            {PAGE_SIZE_OPTIONS.map((n) => (
              <option key={n} value={n}>{n} pro Seite</option>
            ))}
          </select>
          {totalPages > 1 && (
            <>
              <button
                onClick={() => onPageChange(page - 1)}
                disabled={page <= 1}
                className="px-3 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                Zurück
              </button>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => onPageChange(page + 1)}
                disabled={page >= totalPages}
                className="px-3 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                Weiter
              </button>
            </>
          )}
        </div>
      </div>
      <table className="w-full text-sm table-fixed">
        <colgroup>
          <col className="w-[120px]" />
          <col className="w-[140px]" />
          <col className="w-[180px]" />
          <col className="w-[80px]" />
          <col />
        </colgroup>
        <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
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
            <tr>
              <td colSpan={5} className="text-center py-8 text-gray-400">
                Lade...
              </td>
            </tr>
          ) : calls.length === 0 ? (
            <tr>
              <td colSpan={5} className="text-center py-8 text-gray-400">
                Keine Anrufe gefunden
              </td>
            </tr>
          ) : (
            calls.map((call) => (
              <tr
                key={`${call.id}-${call.extension}`}
                className={`hover:bg-gray-50 dark:hover:bg-gray-800 ${
                  call.status === "ringing" ? "bg-yellow-50 dark:bg-yellow-900/20 animate-pulse" : ""
                }`}
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
                  <div className="font-medium dark:text-gray-200 truncate">{call.extensionName || call.extension}</div>
                  <div className="text-xs text-gray-400">{call.extension}</div>
                </td>
                <td className="px-3 py-1.5 whitespace-nowrap">
                  <CallStatusBadge status={call.status} />
                  {call.endReason && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300 ml-1">{call.endReason}</span>
                  )}
                </td>
                <td className="px-3 py-1.5 font-mono dark:text-gray-300">{formatDuration(call.duration)}</td>
                <td className="px-3 py-1.5 font-mono dark:text-gray-300">
                  <div className="grid grid-cols-[320px_auto_1fr] items-center gap-1">
                    <PhoneWithPf number={call.caller} kopfnummern={kopfnummern} kopfnummernMap={kopfnummernMap} pfContacts={pfContacts} className="truncate text-right" />
                    <span className={`${arrowColor[call.status] ?? "text-gray-800 dark:text-gray-300"} text-2xl font-black leading-none`} title={call.direction === "inbound" ? "Eingehend" : "Ausgehend"}>&#8594;</span>
                    <PhoneWithPf number={call.callee} kopfnummern={kopfnummern} kopfnummernMap={kopfnummernMap} pfContacts={pfContacts} className="truncate" />
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

    </div>
  );
}
