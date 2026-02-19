import type { CallRecord } from "../../../shared/types";
import { formatPhone } from "../lib/formatters";

interface Props {
  calls: CallRecord[];
}

export function ActiveCallBanner({ calls }: Props) {
  const ringing = calls.filter((c) => c.status === "ringing");

  if (ringing.length === 0) return null;

  return (
    <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-3">
      {ringing.map((call) => (
        <div key={`${call.id}-${call.extension}`} className="flex items-center gap-2 animate-pulse">
          <span className="text-yellow-600 text-lg">&#9889;</span>
          <span className="text-yellow-800 font-medium">
            {call.direction === "inbound" ? "Eingehender" : "Ausgehender"} Anruf:{" "}
            {formatPhone(call.caller)} &rarr; {call.extensionName || call.extension}
          </span>
        </div>
      ))}
    </div>
  );
}
