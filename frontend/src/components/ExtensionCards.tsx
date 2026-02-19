import type { ExtensionInfo } from "../../../shared/types";

interface Props {
  extensions: ExtensionInfo[];
}

function presenceColor(presence: string, hasCall: boolean): string {
  if (hasCall) return "border-red-400 bg-red-50";
  if (presence === "online") return "border-green-400 bg-green-50";
  return "border-gray-300 bg-gray-50";
}

function presenceDot(presence: string, hasCall: boolean): string {
  if (hasCall) return "bg-red-500";
  if (presence === "online") return "bg-green-500";
  return "bg-gray-400";
}

export function ExtensionCards({ extensions }: Props) {
  if (extensions.length === 0) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2 px-4 py-3">
      {extensions.map((ext) => {
        const hasCall = !!ext.currentCallId;
        return (
          <div
            key={ext.uuid}
            className={`rounded-lg border-2 px-3 py-2 text-center ${presenceColor(ext.presence, hasCall)}`}
          >
            <div className="font-mono text-sm font-bold">{ext.extensionNumber}</div>
            <div className="text-xs text-gray-600 truncate">{ext.name}</div>
            <span
              className={`inline-block w-2 h-2 rounded-full mt-1 ${presenceDot(ext.presence, hasCall)}`}
            />
          </div>
        );
      })}
    </div>
  );
}
