import type { ReactNode } from "react";
import { ConnectionStatus } from "./ConnectionStatus";

interface Props {
  children: ReactNode;
  isConnected: boolean;
  nfonConnected: boolean;
}

export function Layout({ children, isConnected, nfonConnected }: Props) {
  return (
    <div className="h-screen flex flex-col bg-white">
      <header className="flex items-center justify-between px-4 py-3 border-b bg-white shadow-sm">
        <h1 className="text-lg font-bold text-gray-900">NFON Call Monitor</h1>
        <ConnectionStatus isConnected={isConnected} nfonConnected={nfonConnected} />
      </header>
      <main className="flex-1 flex flex-col overflow-hidden">{children}</main>
    </div>
  );
}
