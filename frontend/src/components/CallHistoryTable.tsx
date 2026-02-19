import type { CallRecord, CallStatus, CrmContact } from "../../../shared/types";
import { CallStatusBadge } from "./CallStatusBadge";
import { formatTime, formatDate, formatDuration, formatPhone, type KopfnummerEntry } from "../lib/formatters";

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
  crmContacts?: Record<string, CrmContact>;
}

function PhoneWithCrm({ number, kopfnummern, kopfnummernMap, crmContacts, className }: {
  number: string;
  kopfnummern?: string[];
  kopfnummernMap?: KopfnummerEntry[];
  crmContacts?: Record<string, CrmContact>;
  className?: string;
}) {
  const formatted = formatPhone(number, kopfnummern, kopfnummernMap);
  const contact = crmContacts?.[number];
  const isExternal = formatted === number; // not matched by kopfnummern

  if (contact?.name && isExternal) {
    return (
      <span className={`whitespace-nowrap ${className ?? ""}`} title={number}>
        <span className="text-blue-600 dark:text-blue-400 font-sans font-medium">{contact.name}</span>
        <span className="text-gray-400 ml-1">{number}</span>
      </span>
    );
  }

  return <span className={`whitespace-nowrap ${className ?? ""}`} title={number}>{formatted}</span>;
}

const PAGE_SIZE_OPTIONS = [5, 10, 20, 30, 50, 100];

export function CallHistoryTable({ calls, total, page, pageSize, loading, onPageChange, onPageSizeChange, kopfnummern, kopfnummernMap, crmContacts }: Props) {
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
          <col className="w-[120px]" />
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
                  <div className="grid grid-cols-[200px_auto_1fr] items-center gap-1">
                    <PhoneWithCrm number={call.caller} kopfnummern={kopfnummern} kopfnummernMap={kopfnummernMap} crmContacts={crmContacts} className="truncate text-right" />
                    <span className={`${arrowColor[call.status] ?? "text-gray-800 dark:text-gray-300"} text-2xl font-black leading-none`} title={call.direction === "inbound" ? "Eingehend" : "Ausgehend"}>&#8594;</span>
                    <PhoneWithCrm number={call.callee} kopfnummern={kopfnummern} kopfnummernMap={kopfnummernMap} crmContacts={crmContacts} className="truncate" />
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
