import type { ReactNode } from "react";
import { ConnectionStatus } from "./ConnectionStatus";

interface Props {
  children: ReactNode;
  appTitle: string;
  isConnected: boolean;
  nfonConnected: boolean;
  dark: boolean;
  onToggleDark: () => void;
  onLogout: () => void;
  notifications?: { enabled: boolean; toggle: () => void; supported: boolean };
}

export function Layout({ children, appTitle, isConnected, nfonConnected, dark, onToggleDark, onLogout, notifications }: Props) {
  return (
    <div className="h-screen flex flex-col bg-white dark:bg-gray-900">
      <header className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
        <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">
          {appTitle}
          <span className="ml-2 text-xs font-normal text-gray-400 dark:text-gray-500">v{import.meta.env.VITE_APP_VERSION || "dev"}</span>
        </h1>
        <div className="flex items-center gap-3">
          <ConnectionStatus isConnected={isConnected} nfonConnected={nfonConnected} />
          {notifications?.supported && (
            <button
              onClick={notifications.toggle}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
              title={notifications.enabled ? "Benachrichtigungen aus" : "Benachrichtigungen an"}
            >
              {notifications.enabled ? (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                  <path fillRule="evenodd" d="M10 2a6 6 0 00-6 6c0 1.887-.454 3.665-1.257 5.234a.75.75 0 00.515 1.076 32.91 32.91 0 003.256.508 3.5 3.5 0 006.972 0 32.903 32.903 0 003.256-.508.75.75 0 00.515-1.076A11.448 11.448 0 0116 8a6 6 0 00-6-6z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                  <path d="M4 8a6 6 0 0110.607-3.868.75.75 0 101.06-1.06A7.5 7.5 0 002.5 8c0 1.72-.394 3.348-1.093 4.803a.75.75 0 00.525 1.073 33.4 33.4 0 003.455.58.75.75 0 10.164-1.49 31.903 31.903 0 01-2.498-.42A12.811 12.811 0 004 8z" />
                  <path d="M17.5 8a5.974 5.974 0 01-.941 3.22.75.75 0 101.238.844C18.574 10.78 19 9.434 19 8a7.48 7.48 0 00-1.957-5.06.75.75 0 10-1.12.996A5.98 5.98 0 0117.5 8z" />
                  <path fillRule="evenodd" d="M7.014 14.766a.75.75 0 01.836.649 2.5 2.5 0 004.3 0 .75.75 0 011.486.186 4 4 0 01-6.872 0 .75.75 0 01.65-.835z" clipRule="evenodd" />
                  <path d="M3.28 2.22a.75.75 0 00-1.06 1.06l14.5 14.5a.75.75 0 101.06-1.06L3.28 2.22z" />
                </svg>
              )}
            </button>
          )}
          <button
            onClick={onToggleDark}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
            title={dark ? "Light Mode" : "Dark Mode"}
          >
            {dark ? (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                <path d="M10 2a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0110 2zM10 15a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0110 15zM10 7a3 3 0 100 6 3 3 0 000-6zM15.657 5.404a.75.75 0 10-1.06-1.06l-1.061 1.06a.75.75 0 001.06 1.06l1.06-1.06zM6.464 14.596a.75.75 0 10-1.06-1.06l-1.06 1.06a.75.75 0 001.06 1.06l1.06-1.06zM18 10a.75.75 0 01-.75.75h-1.5a.75.75 0 010-1.5h1.5A.75.75 0 0118 10zM5 10a.75.75 0 01-.75.75h-1.5a.75.75 0 010-1.5h1.5A.75.75 0 015 10zM14.596 15.657a.75.75 0 001.06-1.06l-1.06-1.061a.75.75 0 10-1.06 1.06l1.06 1.06zM5.404 6.464a.75.75 0 001.06-1.06l-1.06-1.06a.75.75 0 10-1.061 1.06l1.06 1.06z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                <path fillRule="evenodd" d="M7.455 2.004a.75.75 0 01.26.77 7 7 0 009.958 7.967.75.75 0 011.067.853A8.5 8.5 0 116.647 1.921a.75.75 0 01.808.083z" clipRule="evenodd" />
              </svg>
            )}
          </button>
          <button
            onClick={onLogout}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
            title="Abmelden"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path fillRule="evenodd" d="M3 4.25A2.25 2.25 0 015.25 2h5.5A2.25 2.25 0 0113 4.25v2a.75.75 0 01-1.5 0v-2a.75.75 0 00-.75-.75h-5.5a.75.75 0 00-.75.75v11.5c0 .414.336.75.75.75h5.5a.75.75 0 00.75-.75v-2a.75.75 0 011.5 0v2A2.25 2.25 0 0110.75 18h-5.5A2.25 2.25 0 013 15.75V4.25z" clipRule="evenodd" />
              <path fillRule="evenodd" d="M19 10a.75.75 0 00-.75-.75H8.704l1.048-.943a.75.75 0 10-1.004-1.114l-2.5 2.25a.75.75 0 000 1.114l2.5 2.25a.75.75 0 101.004-1.114l-1.048-.943h9.546A.75.75 0 0019 10z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </header>
      <main className="flex-1 flex flex-col overflow-hidden">{children}</main>
    </div>
  );
}
