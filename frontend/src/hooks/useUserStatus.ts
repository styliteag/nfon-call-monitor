import { useState, useCallback, useEffect, useRef } from "react";
import { setExtensionStatus } from "../lib/api";
import type { ExtensionInfo } from "../../../shared/types";

export type UserStatusValue = "none" | "online" | "offline" | "mittagspause" | "homeoffice" | "office";

export function useUserStatus(myExtension: string | null, extensions: ExtensionInfo[]) {
  const [status, setStatus] = useState<UserStatusValue>("none");
  const [message, setMessage] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Sync from server state when extension changes or extensions update
  useEffect(() => {
    if (!myExtension) return;
    const ext = extensions.find((e) => e.extensionNumber === myExtension);
    if (ext?.userStatus) {
      setStatus(ext.userStatus as UserStatusValue);
      setMessage(ext.userMessage || "");
    }
  }, [myExtension, extensions]);

  const update = useCallback(async (newStatus: UserStatusValue, newMessage: string) => {
    if (!myExtension) return;
    setStatus(newStatus);
    setMessage(newMessage);

    // Debounce API calls for message changes (typing), send immediately for status changes
    clearTimeout(debounceRef.current);
    const send = async () => {
      try {
        await setExtensionStatus(myExtension, newStatus, newMessage);
      } catch (err) {
        console.error("Fehler beim Setzen des Status:", err);
      }
    };

    if (newStatus !== status) {
      await send();
    } else {
      debounceRef.current = setTimeout(send, 500);
    }
  }, [myExtension, status]);

  // Cleanup debounce on unmount
  useEffect(() => () => clearTimeout(debounceRef.current), []);

  return { status, message, update };
}
