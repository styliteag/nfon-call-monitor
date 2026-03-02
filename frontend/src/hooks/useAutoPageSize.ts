import { useState, useEffect } from "react";

const ROW_HEIGHT = 49; // py-1.5 (12px) + text-sm line (20px) + text-xs line (16px) + 1px divider
const HEADER = 49;     // py-3 (24px) + content (24px) + border (1px)
const FILTERS = 41;    // py-2 (16px) + content (24px) + border (1px)
const THEAD = 32;      // py-2 (16px) + text-xs (16px)

export function useAutoPageSize(): number {
  const [size, setSize] = useState(() => calc());
  useEffect(() => {
    const onResize = () => setSize(calc());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return size;
}

function calc(): number {
  const available = window.innerHeight - HEADER - FILTERS - THEAD;
  return Math.max(5, Math.floor(available / ROW_HEIGHT));
}
