import type { CallsQuery } from "../../../shared/types";
import type { ExtensionInfo } from "../../../shared/types";

const PAGE_SIZE_OPTIONS = [5, 10, 20, 30, 50, 100];

interface Props {
  filters: CallsQuery;
  extensions: ExtensionInfo[];
  onFilterChange: (filters: Partial<CallsQuery>) => void;
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

const selectClass = "rounded border border-gray-300 dark:border-gray-600 px-1.5 py-1 text-xs bg-white dark:bg-gray-700 dark:text-gray-200";

export function Filters({ filters, extensions, onFilterChange, total, page, pageSize, onPageChange, onPageSizeChange }: Props) {
  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="flex flex-wrap items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
      <input
        type="search"
        value={filters.search || ""}
        onChange={(e) => onFilterChange({ search: e.target.value || undefined })}
        placeholder="Nummer oder Name suchen…"
        className={selectClass + " min-w-[180px]"}
      />

      <select
        value={filters.extension || ""}
        onChange={(e) => onFilterChange({ extension: e.target.value || undefined })}
        className={selectClass}
      >
        <option value="">Alle Extensions</option>
        {extensions.map((ext) => (
          <option key={ext.uuid} value={ext.extensionNumber}>
            {ext.extensionNumber} - {ext.name}
          </option>
        ))}
      </select>

      <select
        value={filters.status || ""}
        onChange={(e) => onFilterChange({ status: e.target.value || undefined })}
        className={selectClass}
      >
        <option value="">Alle Status</option>
        <option value="answered">Angenommen</option>
        <option value="missed">Verpasst</option>
        <option value="missedOnly">Echt verpasst</option>
        <option value="busy">Besetzt</option>
        <option value="rejected">Abgelehnt</option>
      </select>

      <select
        value={filters.direction || ""}
        onChange={(e) => onFilterChange({ direction: e.target.value || undefined })}
        className={selectClass}
      >
        <option value="">Alle Richtungen</option>
        <option value="inbound">Eingehend</option>
        <option value="outbound">Ausgehend</option>
      </select>

      <input
        type="date"
        value={filters.dateFrom?.split("T")[0] || ""}
        onChange={(e) =>
          onFilterChange({ dateFrom: e.target.value ? `${e.target.value}T00:00:00` : undefined })
        }
        className={selectClass}
        placeholder="Von"
      />

      <input
        type="date"
        value={filters.dateTo?.split("T")[0] || ""}
        onChange={(e) =>
          onFilterChange({ dateTo: e.target.value ? `${e.target.value}T23:59:59` : undefined })
        }
        className={selectClass}
        placeholder="Bis"
      />

      <div className="flex items-center gap-1.5 ml-auto">
        <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">{total}</span>
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="rounded border border-gray-300 dark:border-gray-600 px-1 py-1 text-xs bg-white dark:bg-gray-700 dark:text-gray-200"
        >
          {PAGE_SIZE_OPTIONS.map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
        {totalPages > 1 && (
          <>
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="p-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-400 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-600"
              title="Vorherige Seite"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5"><path fillRule="evenodd" d="M11.03 3.97a.75.75 0 0 1 0 1.06L7.56 8.5l3.47 3.47a.75.75 0 1 1-1.06 1.06l-4-4a.75.75 0 0 1 0-1.06l4-4a.75.75 0 0 1 1.06 0z" clipRule="evenodd" /></svg>
            </button>
            <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">{page}/{totalPages}</span>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="p-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-400 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-600"
              title="Nächste Seite"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5"><path fillRule="evenodd" d="M4.97 3.97a.75.75 0 0 1 1.06 0l4 4a.75.75 0 0 1 0 1.06l-4 4a.75.75 0 0 1-1.06-1.06L8.44 8.5 4.97 5.03a.75.75 0 0 1 0-1.06z" clipRule="evenodd" /></svg>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
