import { useEffect, useRef, useState } from "react";
import { fetchVersion } from "../lib/api";

const CHECK_INTERVAL = 60_000; // 60 seconds

export function useVersionCheck() {
  const initialVersion = useRef<string | null>(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    // Capture initial version
    fetchVersion()
      .then(({ version }) => {
        initialVersion.current = version;
      })
      .catch(() => {});

    const interval = setInterval(async () => {
      if (!initialVersion.current) return;
      try {
        const { version } = await fetchVersion();
        if (version && version !== initialVersion.current) {
          setUpdateAvailable(true);
        }
      } catch {
        // Server might be restarting, ignore
      }
    }, CHECK_INTERVAL);

    return () => clearInterval(interval);
  }, []);

  return { updateAvailable };
}
