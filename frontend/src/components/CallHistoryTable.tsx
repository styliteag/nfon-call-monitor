import type { CallRecord } from "../../../shared/types";
import { CallStatusBadge } from "./CallStatusBadge";
import { formatTime, formatDate, formatDuration, formatPhone, type KopfnummerEntry } from "../lib/formatters";

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
}

const PAGE_SIZE_OPTIONS = [5, 10, 20, 30, 50, 100];

export function CallHistoryTable({ calls, total, page, pageSize, loading, onPageChange, onPageSizeChange, kopfnummern, kopfnummernMap }: Props) {
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
      <table className="w-full text-sm">
        <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
          <tr className="text-left text-gray-500 dark:text-gray-400 text-xs uppercase">
            <th className="px-4 py-2">Zeit</th>
            <th className="px-4 py-2">Extension</th>
            <th className="px-4 py-2">Status</th>
            <th className="px-4 py-2">Verbindung</th>
            <th className="px-4 py-2">Dauer</th>
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
                <td className="px-4 py-2 whitespace-nowrap">
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
                <td className="px-4 py-2">
                  <div className="font-medium dark:text-gray-200">{call.extensionName || call.extension}</div>
                  <div className="text-xs text-gray-400">{call.extension}</div>
                </td>
                <td className="px-4 py-2">
                  <CallStatusBadge status={call.status} />
                  {call.endReason && (
                    <span className="text-[10px] text-gray-400 ml-1">{call.endReason}</span>
                  )}
                </td>
                <td className="px-4 py-2 font-mono text-xs dark:text-gray-300 whitespace-nowrap">
                  <span title={call.caller}>{formatPhone(call.caller, kopfnummern, kopfnummernMap)}</span>
                  {call.direction === "inbound" ? (
                    <span className="text-blue-600 dark:text-blue-400 mx-2" title="Eingehend">&#8592;</span>
                  ) : (
                    <span className="text-green-600 dark:text-green-400 mx-2" title="Ausgehend">&#8594;</span>
                  )}
                  <span title={call.callee}>{formatPhone(call.callee, kopfnummern, kopfnummernMap)}</span>
                </td>
                <td className="px-4 py-2 font-mono dark:text-gray-300">{formatDuration(call.duration)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

    </div>
  );
}
