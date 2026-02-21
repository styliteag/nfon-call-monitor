import { useEffect, useRef, useState, useCallback } from "react";
import type { CallRecord } from "../../../shared/types";
import { useSocket } from "./useSocket";

export function useNotifications(myExtension: string | null) {
  const { on } = useSocket();
  const [enabled, setEnabled] = useState(() => {
    if (typeof Notification === "undefined") return false;
    return Notification.permission === "granted" && localStorage.getItem("notifications") !== "off";
  });
  // Track call IDs we've already notified about to avoid duplicates
  const notifiedRef = useRef(new Set<string>());

  const toggle = useCallback(() => {
    if (!enabled) {
      if (typeof Notification === "undefined") return;
      if (Notification.permission === "granted") {
        localStorage.setItem("notifications", "on");
        setEnabled(true);
      } else if (Notification.permission !== "denied") {
        Notification.requestPermission().then((perm) => {
          if (perm === "granted") {
            localStorage.setItem("notifications", "on");
            setEnabled(true);
          }
        });
      }
    } else {
      localStorage.setItem("notifications", "off");
      setEnabled(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    function isMyCall(c: CallRecord): boolean {
      if (!myExtension) return true; // no extension set → show all
      return c.extension === myExtension;
    }

    const offNew = on("call:new", (call: unknown) => {
      const c = call as CallRecord;
      if (c.direction !== "inbound" || c.status !== "ringing") return;
      if (!isMyCall(c)) return;
      const key = `${c.id}-${c.extension}`;
      if (notifiedRef.current.has(key)) return;
      notifiedRef.current.add(key);

      const caller = c.caller || "Unbekannt";
      const ext = c.extensionName || c.extension;
      new Notification("Eingehender Anruf", {
        body: `${caller} → ${ext}`,
        tag: c.id,
        renotify: false,
      });
    });

    const offUpdated = on("call:updated", (call: unknown) => {
      const c = call as CallRecord;
      if (c.status !== "missed") return;
      if (!isMyCall(c)) return;

      const caller = c.caller || "Unbekannt";
      const ext = c.extensionName || c.extension;
      new Notification("Verpasster Anruf", {
        body: `${caller} → ${ext}`,
        tag: `missed-${c.id}`,
      });
    });

    return () => {
      offNew();
      offUpdated();
    };
  }, [enabled, on, myExtension]);

  // Cleanup old notification IDs periodically
  useEffect(() => {
    const interval = setInterval(() => {
      if (notifiedRef.current.size > 500) {
        notifiedRef.current.clear();
      }
    }, 300_000);
    return () => clearInterval(interval);
  }, []);

  return { enabled, toggle, supported: typeof Notification !== "undefined" };
}
