import { useEffect, useRef, useState, useCallback } from "react";
import type { Call } from "../../../shared/types";
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

    function targetExtension(c: Call): { ext: string; name: string } {
      if (myExtension) {
        const myLeg = c.legs.find((l) => l.extension === myExtension);
        if (myLeg) return { ext: myLeg.extension, name: myLeg.extensionName || myLeg.extension };
      }
      const first = c.legs[0];
      return { ext: first?.extension ?? "", name: first?.extensionName || first?.extension || "" };
    }

    function isMyCall(c: Call): boolean {
      if (!myExtension) return true;
      return c.legs.some((l) => l.extension === myExtension);
    }

    const offNew = on("call:new", (call: unknown) => {
      const c = call as Call;
      if (c.direction !== "inbound" || c.status !== "ringing") return;
      if (!isMyCall(c)) return;
      if (notifiedRef.current.has(c.id)) return;
      notifiedRef.current.add(c.id);

      const caller = c.caller || "Unbekannt";
      const target = targetExtension(c);
      new Notification("Eingehender Anruf", {
        body: `${caller} → ${target.name}`,
        tag: c.id,
        // @ts-expect-error renotify is a valid Notification option but missing from TS types
        renotify: false,
      });
    });

    const offUpdated = on("call:updated", (call: unknown) => {
      const c = call as Call;
      if (c.status !== "missed") return;
      if (!isMyCall(c)) return;

      const caller = c.caller || "Unbekannt";
      const target = targetExtension(c);
      new Notification("Verpasster Anruf", {
        body: `${caller} → ${target.name}`,
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
