import { useState, useEffect, useRef } from "react";
import type { CrmContact } from "../../../shared/types";
import { lookupCrmContacts } from "../lib/api";

export function useCrmContacts(numbers: string[]): Record<string, CrmContact> {
  const [contacts, setContacts] = useState<Record<string, CrmContact>>({});
  const cacheRef = useRef<Record<string, CrmContact | null>>({});

  useEffect(() => {
    const unknown = numbers.filter((n) => n && !(n in cacheRef.current));
    if (unknown.length === 0) return;

    lookupCrmContacts(unknown).then((result) => {
      for (const n of unknown) {
        cacheRef.current[n] = result[n] ?? null;
      }
      // Only include actual contacts (not null sentinels)
      const filtered: Record<string, CrmContact> = {};
      for (const [k, v] of Object.entries(cacheRef.current)) {
        if (v) filtered[k] = v;
      }
      setContacts(filtered);
    });
  }, [numbers.join(",")]);

  return contacts;
}
