const isDebug = () => (process.env.LOG || "").toLowerCase() === "debug";

function ts(): string {
  const d = new Date();
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  const s = String(d.getSeconds()).padStart(2, "0");
  const ms = String(d.getMilliseconds()).padStart(3, "0");
  return `${h}:${m}:${s}.${ms}`;
}

/** Always shown: startup, important state changes */
export function info(tag: string, ...args: unknown[]): void {
  console.log(`${ts()} [${tag}]`, ...args);
}

/** Always shown */
export function warn(tag: string, ...args: unknown[]): void {
  console.warn(`${ts()} [${tag}]`, ...args);
}

/** Always shown */
export function error(tag: string, ...args: unknown[]): void {
  console.error(`${ts()} [${tag}]`, ...args);
}

/** Only when LOG=debug */
export function debug(tag: string, ...args: unknown[]): void {
  if (isDebug()) console.log(`${ts()} [${tag}]`, ...args);
}
