export function formatDuration(seconds?: number): string {
  if (seconds == null) return "-";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function formatTime(iso?: string): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function formatDate(iso?: string): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatDateTime(iso?: string): string {
  if (!iso) return "-";
  return `${formatDate(iso)} ${formatTime(iso)}`;
}

export interface KopfnummerEntry {
  nr: string;
  name: string;
}

export function formatPhone(number: string, kopfnummern?: string[], kopfnummernMap?: KopfnummerEntry[]): string {
  if (!number) return "-";
  if (kopfnummern) {
    for (const prefix of kopfnummern) {
      if (number.startsWith(prefix)) {
        const durchwahl = number.slice(prefix.length);
        if (durchwahl === "0") {
          const entry = kopfnummernMap?.find((e) => e.nr === prefix);
          return entry?.name || "Zentrale";
        }
        if (durchwahl) return durchwahl;
      }
    }
  }
  return number;
}

export function getStandort(number: string, kopfnummernMap?: KopfnummerEntry[]): string | null {
  if (!number || !kopfnummernMap) return null;
  for (const entry of kopfnummernMap) {
    if (number.startsWith(entry.nr)) return entry.name;
  }
  return null;
}
