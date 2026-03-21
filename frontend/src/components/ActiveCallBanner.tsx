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
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-yellow-600 dark:text-yellow-400 shrink-0" aria-hidden="true">
                <path fillRule="evenodd" d="M2 3.5A1.5 1.5 0 013.5 2h1.148a1.5 1.5 0 011.465 1.175l.716 3.223a1.5 1.5 0 01-1.052 1.767l-.933.267c-.41.117-.643.555-.48.95a11.542 11.542 0 006.254 6.254c.395.163.833-.07.95-.48l.267-.933a1.5 1.5 0 011.767-1.052l3.223.716A1.5 1.5 0 0118 15.352V16.5a1.5 1.5 0 01-1.5 1.5H15c-1.149 0-2.263-.15-3.326-.43A13.022 13.022 0 012.43 8.326 13.019 13.019 0 012 5V3.5z" clipRule="evenodd" />
              </svg>
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
