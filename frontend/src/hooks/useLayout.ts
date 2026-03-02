import { useState } from "react";

export type LayoutMode = "stacked" | "split";

export function useLayout() {
  const [layout, setLayout] = useState<LayoutMode>(() => {
    const stored = localStorage.getItem("layout");
    return stored === "split" ? "split" : "stacked";
  });

  const toggle = () =>
    setLayout((prev) => {
      const next = prev === "stacked" ? "split" : "stacked";
      localStorage.setItem("layout", next);
      return next;
    });

  return { layout, toggle };
}
