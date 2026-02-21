import { useState, useCallback } from "react";

const STORAGE_KEY = "myExtension";

export function useMyExtension() {
  const [myExtension, setMyExtension] = useState<string | null>(
    () => localStorage.getItem(STORAGE_KEY)
  );

  const select = useCallback((ext: string | null) => {
    if (ext) {
      localStorage.setItem(STORAGE_KEY, ext);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
    setMyExtension(ext);
  }, []);

  return { myExtension, select };
}
