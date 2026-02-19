import type { CallRecord } from "../../../shared/types";
import { formatPhone } from "../lib/formatters";

interface Props {
  calls: CallRecord[];
  kopfnummern?: string[];
}

export function ActiveCallBanner({ calls, kopfnummern }: Props) {
  const ringing = calls.filter((c) => c.status === "ringing");

  if (ringing.length === 0) return null;

  return (
    <div className="bg-yellow-50 dark:bg-yellow-900/30 border-b border-yellow-200 dark:border-yellow-700 px-4 py-3">
      {ringing.map((call) => (
        <div key={`${call.id}-${call.extension}`} className="flex items-center gap-2 animate-pulse">
          <span className="text-yellow-600 dark:text-yellow-400 text-lg">&#9889;</span>
          <span className="text-yellow-800 dark:text-yellow-200 font-medium">
            {call.direction === "inbound" ? "Eingehender" : "Ausgehender"} Anruf:{" "}
            {formatPhone(call.caller, kopfnummern)} &rarr; {call.extensionName || call.extension}
          </span>
        </div>
      ))}
    </div>
  );
}
