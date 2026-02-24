import { useState, useEffect, useRef, useCallback } from "react";
import type { CrmContactResult } from "../../../shared/types";
import { searchCrmContacts, initiateCall } from "../lib/api";

interface Props {
  myExtension: string | null;
  pfActive: boolean;
}

export function CrmSearch({ myExtension, pfActive }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CrmContactResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const doSearch = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      setSearched(false);
      setOpen(false);
      return;
    }
    setLoading(true);
    try {
      const res = await searchCrmContacts(q);
      setResults(res);
      setSearched(true);
      setOpen(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    clearTimeout(timerRef.current);
    if (query.length < 2) {
      setResults([]);
      setSearched(false);
      setOpen(false);
      return;
    }
    timerRef.current = setTimeout(() => doSearch(query), 300);
    return () => clearTimeout(timerRef.current);
  }, [query, doSearch]);

  // Close on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  function handleCopy(number: string) {
    navigator.clipboard.writeText(number);
    setCopied(number);
    setTimeout(() => setCopied(null), 1500);
  }

  async function handleCall(number: string) {
    if (!myExtension) return;
    try {
      await initiateCall(myExtension, number);
    } catch {
      // ignore — call initiation errors handled elsewhere
    }
  }

  if (!pfActive) return null;

  return (
    <div ref={containerRef} className="relative">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => { if (searched && results.length > 0) setOpen(true); }}
        placeholder="CRM-Kontakt suchen…"
        className="rounded border border-gray-300 dark:border-gray-600 px-2 py-1 text-sm bg-white dark:bg-gray-700 dark:text-gray-200 w-48 placeholder-gray-400 dark:placeholder-gray-500"
      />
      {loading && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2">
          <div className="w-3.5 h-3.5 border-2 border-gray-300 dark:border-gray-500 border-t-blue-500 rounded-full animate-spin" />
        </div>
      )}
      {open && (
        <div className="absolute top-full left-0 mt-1 w-80 max-h-96 overflow-y-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg z-50">
          {results.length === 0 && searched && (
            <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">Keine Ergebnisse</div>
          )}
          {results.map((contact) => (
            <div key={contact.contactId} className="border-b border-gray-100 dark:border-gray-700 last:border-b-0">
              <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 truncate">
                {contact.name}
              </div>
              {contact.phones.map((phone) => (
                <div
                  key={phone.raw}
                  className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-700 group"
                >
                  <span
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/plain", phone.raw);
                      e.dataTransfer.effectAllowed = "copy";
                    }}
                    className="flex-1 text-sm text-gray-800 dark:text-gray-200 cursor-grab truncate"
                    title={`${phone.formatted || phone.raw}${phone.city ? ` (${phone.city})` : ""} — Drag auf Extension-Card zum Anrufen`}
                  >
                    {phone.formatted || phone.raw}
                    {phone.city && <span className="ml-1 text-xs text-gray-400 dark:text-gray-500">({phone.city})</span>}
                  </span>
                  <button
                    onClick={() => handleCopy(phone.formatted || phone.raw)}
                    className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Nummer kopieren"
                  >
                    {copied === (phone.formatted || phone.raw) ? (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-green-500">
                        <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                        <path d="M7 3.5A1.5 1.5 0 018.5 2h3.879a1.5 1.5 0 011.06.44l3.122 3.12A1.5 1.5 0 0117 6.622V12.5a1.5 1.5 0 01-1.5 1.5h-1v-3.379a3 3 0 00-.879-2.121L10.5 5.379A3 3 0 008.379 4.5H7v-1z" />
                        <path d="M4.5 6A1.5 1.5 0 003 7.5v9A1.5 1.5 0 004.5 18h7a1.5 1.5 0 001.5-1.5v-5.879a1.5 1.5 0 00-.44-1.06L9.44 6.439A1.5 1.5 0 008.378 6H4.5z" />
                      </svg>
                    )}
                  </button>
                  {myExtension && (
                    <button
                      onClick={() => handleCall(phone.raw)}
                      className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-400 hover:text-green-600 dark:hover:text-green-400 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Anrufen"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                        <path fillRule="evenodd" d="M2 3.5A1.5 1.5 0 013.5 2h1.148a1.5 1.5 0 011.465 1.175l.716 3.223a1.5 1.5 0 01-1.052 1.767l-.933.267c-.41.117-.643.555-.48.95a11.542 11.542 0 006.254 6.254c.395.163.833-.07.95-.48l.267-.933a1.5 1.5 0 011.767-1.052l3.223.716A1.5 1.5 0 0118 15.352V16.5a1.5 1.5 0 01-1.5 1.5H15c-1.149 0-2.263-.15-3.326-.43A13.022 13.022 0 012.43 8.326 13.019 13.019 0 012 5V3.5z" clipRule="evenodd" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
