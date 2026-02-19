import type { CallRecord } from "../../../shared/types";
import { CallStatusBadge } from "./CallStatusBadge";
import { formatTime, formatDate, formatDuration, formatPhone } from "../lib/formatters";

interface Props {
  calls: CallRecord[];
  total: number;
  page: number;
  loading: boolean;
  onPageChange: (page: number) => void;
}

export function CallHistoryTable({ calls, total, page, loading, onPageChange }: Props) {
  const pageSize = 50;
  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="flex-1 overflow-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 sticky top-0">
          <tr className="text-left text-gray-500 text-xs uppercase">
            <th className="px-4 py-2">Zeit</th>
            <th className="px-4 py-2">Richtung</th>
            <th className="px-4 py-2">Anrufer</th>
            <th className="px-4 py-2">Angerufen</th>
            <th className="px-4 py-2">Extension</th>
            <th className="px-4 py-2">Status</th>
            <th className="px-4 py-2">Dauer</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {loading && calls.length === 0 ? (
            <tr>
              <td colSpan={7} className="text-center py-8 text-gray-400">
                Lade...
              </td>
            </tr>
          ) : calls.length === 0 ? (
            <tr>
              <td colSpan={7} className="text-center py-8 text-gray-400">
                Keine Anrufe gefunden
              </td>
            </tr>
          ) : (
            calls.map((call) => (
              <tr
                key={`${call.id}-${call.extension}`}
                className={`hover:bg-gray-50 ${
                  call.status === "ringing" ? "bg-yellow-50 animate-pulse" : ""
                }`}
              >
                <td className="px-4 py-2 whitespace-nowrap">
                  <div>{formatTime(call.startTime)}</div>
                  <div className="text-xs text-gray-400">{formatDate(call.startTime)}</div>
                </td>
                <td className="px-4 py-2">
                  {call.direction === "inbound" ? (
                    <span className="text-blue-600" title="Eingehend">&#8592;</span>
                  ) : (
                    <span className="text-green-600" title="Ausgehend">&#8594;</span>
                  )}
                </td>
                <td className="px-4 py-2 font-mono text-xs">{formatPhone(call.caller)}</td>
                <td className="px-4 py-2 font-mono text-xs">{formatPhone(call.callee)}</td>
                <td className="px-4 py-2">
                  <div className="font-medium">{call.extensionName || call.extension}</div>
                  <div className="text-xs text-gray-400">{call.extension}</div>
                </td>
                <td className="px-4 py-2">
                  <CallStatusBadge status={call.status} />
                </td>
                <td className="px-4 py-2 font-mono">{formatDuration(call.duration)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
          <span className="text-sm text-gray-500">
            {total} Anrufe gesamt
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="px-3 py-1 text-sm rounded border border-gray-300 bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Zurück
            </button>
            <span className="px-3 py-1 text-sm text-gray-600">
              Seite {page} / {totalPages}
            </span>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="px-3 py-1 text-sm rounded border border-gray-300 bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Weiter
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
