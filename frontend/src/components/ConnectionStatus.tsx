interface Props {
  isConnected: boolean;
  nfonConnected: boolean;
}

export function ConnectionStatus({ isConnected, nfonConnected }: Props) {
  const connected = isConnected && nfonConnected;
  return (
    <div className="flex items-center gap-2 text-sm">
      <span
        className={`inline-block w-2.5 h-2.5 rounded-full ${
          connected ? "bg-green-500" : "bg-red-500 animate-pulse"
        }`}
      />
      <span className={connected ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}>
        {!isConnected ? "Nicht verbunden" : !nfonConnected ? "NFON getrennt" : "Verbunden"}
      </span>
    </div>
  );
}
