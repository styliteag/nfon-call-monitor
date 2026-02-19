import { useState, useEffect } from "react";
import type { ExtensionInfo } from "../../../shared/types";
import { fetchExtensions } from "../lib/api";
import { useSocket } from "./useSocket";

export function useExtensions() {
  const { on } = useSocket();
  const [extensions, setExtensions] = useState<ExtensionInfo[]>([]);
  const [loading, setLoading] = useState(true);

  // Initial load
  useEffect(() => {
    fetchExtensions()
      .then(setExtensions)
      .catch((err) => console.error("Fehler beim Laden der Extensions:", err))
      .finally(() => setLoading(false));
  }, []);

  // Live updates
  useEffect(() => {
    const off = on("extensions", (exts: unknown) => {
      setExtensions(exts as ExtensionInfo[]);
    });
    return off;
  }, [on]);

  return { extensions, loading };
}
