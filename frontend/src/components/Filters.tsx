import type { CallsQuery } from "../../../shared/types";
import type { ExtensionInfo } from "../../../shared/types";

interface Props {
  filters: CallsQuery;
  extensions: ExtensionInfo[];
  onFilterChange: (filters: Partial<CallsQuery>) => void;
}

const selectClass = "rounded border border-gray-300 dark:border-gray-600 px-2 py-1 text-sm bg-white dark:bg-gray-700 dark:text-gray-200";

export function Filters({ filters, extensions, onFilterChange }: Props) {
  return (
    <div className="flex flex-wrap gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
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
    </div>
  );
}
