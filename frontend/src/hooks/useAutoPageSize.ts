import { useState, useEffect } from "react";

const ROW_HEIGHT = 49; // py-1.5 (12px) + text-sm line (20px) + text-xs line (16px) + 1px divider
const HEADER = 49;     // py-3 (24px) + content (24px) + border (1px)
const FILTERS = 41;    // py-2 (16px) + content (24px) + border (1px)
const THEAD = 32;      // py-2 (16px) + text-xs (16px)

// Extension card grid: card ~76px + gap 8px, container py-3 (24px)
const EXT_CARD_ROW = 84; // card height + gap
const EXT_CARD_PAD = 24; // container py-3

interface Options {
  layout: "split" | "stacked";
  extensionCount: number;
}

export function useAutoPageSize(opts: Options): number {
  const { layout, extensionCount } = opts;
  const [size, setSize] = useState(() => calc(layout, extensionCount));
  useEffect(() => {
    const onResize = () => setSize(calc(layout, extensionCount));
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [layout, extensionCount]);
  return size;
}

function calc(layout: string, extensionCount: number): number {
  let overhead = HEADER + FILTERS + THEAD;
  if (layout === "stacked" && extensionCount > 0) {
    // Estimate grid columns based on common breakpoints
    const w = window.innerWidth;
    const cols = w >= 1280 ? 8 : w >= 1024 ? 6 : w >= 640 ? 4 : 2;
    const rows = Math.ceil(extensionCount / cols);
    overhead += rows * EXT_CARD_ROW + EXT_CARD_PAD;
  }
  const available = window.innerHeight - overhead;
  return Math.max(5, Math.floor(available / ROW_HEIGHT));
}
