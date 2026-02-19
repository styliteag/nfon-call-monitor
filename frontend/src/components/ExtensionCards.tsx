import type { ExtensionInfo } from "../../../shared/types";

interface Props {
  extensions: ExtensionInfo[];
}

function isOnline(presence: string): boolean {
  return presence === "available" || presence === "online";
}

function cardBorder(ext: ExtensionInfo): string {
  if (ext.currentCallId) return "border-red-400 bg-red-50 dark:bg-red-900/30 dark:border-red-600";
  if (ext.line === "idle") return "border-green-400 bg-green-50 dark:bg-green-900/30 dark:border-green-600";
  return "border-gray-300 bg-gray-50 dark:border-gray-600 dark:bg-gray-800";
}

function presenceDotColor(presence: string): string {
  if (isOnline(presence)) return "bg-green-500";
  return "bg-gray-400";
}

function lineDotColor(line: string): string {
  switch (line) {
    case "busy":
    case "ringing":
      return "bg-red-500";
    case "idle":
      return "bg-green-500";
    default:
      return "bg-gray-400";
  }
}

function presenceLabel(presence: string): string {
  if (isOnline(presence)) return "Verfügbar";
  return "Offline";
}

function lineLabel(line: string): string {
  switch (line) {
    case "idle": return "Frei";
    case "busy": return "Besetzt";
    case "ringing": return "Klingelt";
    case "offline": return "Offline";
    default: return line;
  }
}

export function ExtensionCards({ extensions }: Props) {
  if (extensions.length === 0) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2 px-4 py-3">
      {extensions.map((ext) => (
        <div
          key={ext.uuid}
          className={`rounded-lg border-2 px-3 py-2 text-center ${cardBorder(ext)}`}
        >
          <div className="font-mono text-sm font-bold dark:text-gray-100">{ext.extensionNumber}</div>
          <div className="text-xs text-gray-600 dark:text-gray-400 truncate">{ext.name}</div>
          <div className="flex items-center justify-center gap-2 mt-1">
            <span
              className={`inline-block w-2 h-2 rounded-full ${lineDotColor(ext.line)}`}
              title={`Line: ${lineLabel(ext.line)}`}
            />
            <span
              className={`inline-block w-2 h-2 rounded-full ${presenceDotColor(ext.presence)}`}
              title={`Presence: ${presenceLabel(ext.presence)}`}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
