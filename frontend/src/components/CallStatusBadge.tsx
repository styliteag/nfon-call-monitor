import type { CallStatus } from "../../../shared/types";

const config: Record<CallStatus, { label: string; className: string }> = {
  ringing: { label: "Klingelt", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300 animate-pulse" },
  active: { label: "Aktiv", className: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300" },
  answered: { label: "Angenommen", className: "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300" },
  missed: { label: "Verpasst", className: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300" },
  busy: { label: "Besetzt", className: "bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300" },
  rejected: { label: "Abgelehnt", className: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300" },
};

interface Props {
  status: CallStatus;
}

export function CallStatusBadge({ status }: Props) {
  const { label, className } = config[status] ?? { label: status, className: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}
