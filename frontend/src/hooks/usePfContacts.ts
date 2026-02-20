import { useState, useEffect, useRef } from "react";
import type { PfContact } from "../../../shared/types";
import { lookupPfContacts } from "../lib/api";

export function usePfContacts(numbers: string[]): Record<string, PfContact> {
  const [contacts, setContacts] = useState<Record<string, PfContact>>({});
  const cacheRef = useRef<Record<string, PfContact | null>>({});

  useEffect(() => {
    const unknown = numbers.filter((n) => n && !(n in cacheRef.current));
    if (unknown.length === 0) return;

    lookupPfContacts(unknown).then((result) => {
      for (const n of unknown) {
        cacheRef.current[n] = result[n] ?? null;
      }
      // Only include actual contacts (not null sentinels)
      const filtered: Record<string, PfContact> = {};
      for (const [k, v] of Object.entries(cacheRef.current)) {
        if (v) filtered[k] = v;
      }
      setContacts(filtered);
    });
  }, [numbers.join(",")]);

  return contacts;
}
