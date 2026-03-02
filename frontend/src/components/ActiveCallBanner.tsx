import { createPortal } from "react-dom";
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

  return createPortal(
    <div className="fixed top-4 left-4 z-50 flex flex-col gap-2 max-w-sm">
      {ringing.map((call) => (
        <div
          key={`${call.id}-${call.extension}`}
          className="bg-yellow-50 dark:bg-yellow-900/50 border border-yellow-300 dark:border-yellow-600 rounded-lg shadow-lg px-4 py-3 animate-pulse"
        >
          <div className="flex items-center gap-2">
            <span className="text-yellow-600 dark:text-yellow-400 text-lg">&#9889;</span>
            <span className="text-yellow-800 dark:text-yellow-200 font-medium text-sm">
              {call.transferredFrom
                ? <>Weiterleitung von {call.transferredFromName || call.transferredFrom}{call.originalCaller ? <> (Anrufer: {pfContacts?.[call.originalCaller]?.name || formatPhone(call.originalCaller, kopfnummern)})</> : ""}:</>
                : <>{call.direction === "inbound" ? "Eingehender" : "Ausgehender"} Anruf:</>
              }{" "}
              {call.direction === "inbound" ? (
                <>
                  <span
                    draggable
                    onDragStart={(e) => { e.dataTransfer.setData("text/plain", call.caller); e.dataTransfer.effectAllowed = "copy"; }}
                    className="cursor-grab"
                  >
                    {pfContacts?.[call.caller]?.name ? (
                      <span className="font-bold">{pfContacts[call.caller].name}</span>
                    ) : (
                      formatPhone(call.caller, kopfnummern)
                    )}
                  </span> &rarr; {call.extensionName || call.extension}
                </>
              ) : (
                <>
                  {call.extensionName || call.extension} &rarr;{" "}
                  <span
                    draggable
                    onDragStart={(e) => { e.dataTransfer.setData("text/plain", call.callee); e.dataTransfer.effectAllowed = "copy"; }}
                    className="cursor-grab"
                  >
                    {pfContacts?.[call.callee]?.name ? (
                      <span className="font-bold">{pfContacts[call.callee].name}</span>
                    ) : (
                      formatPhone(call.callee, kopfnummern)
                    )}
                  </span>
                </>
              )}
              {(() => {
                const standort = getStandort(call.direction === "inbound" ? call.callee : call.caller, kopfnummernMap);
                return standort ? <span className="ml-2 text-yellow-600 dark:text-yellow-400 text-xs">({standort})</span> : null;
              })()}
            </span>
          </div>
        </div>
      ))}
    </div>,
    document.body
  );
}
