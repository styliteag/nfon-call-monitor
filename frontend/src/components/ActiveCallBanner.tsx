import type { CallRecord, PfContact } from "../../../shared/types";
import { formatPhone, getStandort, type KopfnummerEntry } from "../lib/formatters";

interface Props {
  calls: CallRecord[];
  kopfnummern?: string[];
  kopfnummernMap?: KopfnummerEntry[];
  pfContacts?: Record<string, PfContact>;
}

export function ActiveCallBanner({ calls, kopfnummern, kopfnummernMap, pfContacts }: Props) {
  const ringing = calls.filter((c) => c.status === "ringing");

  if (ringing.length === 0) return null;

  return (
    <div className="bg-yellow-50 dark:bg-yellow-900/30 border-b border-yellow-200 dark:border-yellow-700 px-4 py-3">
      {ringing.map((call) => (
        <div key={`${call.id}-${call.extension}`} className="flex items-center gap-2 animate-pulse">
          <span className="text-yellow-600 dark:text-yellow-400 text-lg">&#9889;</span>
          <span className="text-yellow-800 dark:text-yellow-200 font-medium">
            {call.direction === "inbound" ? "Eingehender" : "Ausgehender"} Anruf:{" "}
            {pfContacts?.[call.caller]?.name ? (
              <span className="font-bold">{pfContacts[call.caller].name}</span>
            ) : (
              formatPhone(call.caller, kopfnummern)
            )} &rarr; {call.extensionName || call.extension}
            {(() => {
              const standort = getStandort(call.direction === "inbound" ? call.callee : call.caller, kopfnummernMap);
              return standort ? <span className="ml-2 text-yellow-600 dark:text-yellow-400 text-sm">({standort})</span> : null;
            })()}
          </span>
        </div>
      ))}
    </div>
  );
}
