const isDebug = () => (process.env.LOG || "").toLowerCase() === "debug";

function ts(): string {
  return new Date().toISOString().slice(11, 23);
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
