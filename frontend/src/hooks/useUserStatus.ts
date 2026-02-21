import { useState, useCallback, useEffect } from "react";
import { setExtensionStatus } from "../lib/api";
import type { ExtensionInfo } from "../../../shared/types";

export type UserStatusValue = "none" | "online" | "offline" | "mittagspause" | "homeoffice" | "office";

export function useUserStatus(myExtension: string | null, extensions: ExtensionInfo[]) {
  const [status, setStatus] = useState<UserStatusValue>("none");
  const [message, setMessage] = useState("");

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
    try {
      await setExtensionStatus(myExtension, newStatus, newMessage);
    } catch (err) {
      console.error("Fehler beim Setzen des Status:", err);
    }
  }, [myExtension]);

  return { status, message, update };
}
