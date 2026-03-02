import { useState, useEffect } from "react";

const ROW_HEIGHT = 40;
const OVERHEAD = 300;

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
  const available = window.innerHeight - OVERHEAD;
  return Math.max(5, Math.floor(available / ROW_HEIGHT));
}
