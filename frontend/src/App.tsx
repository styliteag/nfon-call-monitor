import { useEffect, useState } from "react";
import { LoginForm } from "./components/LoginForm";
import { Dashboard } from "./components/Dashboard";
import { useDarkMode } from "./hooks/useDarkMode";
import { useAuth } from "./hooks/useAuth";
import { fetchVersion } from "./lib/api";

const DEFAULT_TITLE = "NFON Call Monitor";

export default function App() {
  const { isAuthenticated, checking, error, login, logout } = useAuth();
  const { dark, toggle } = useDarkMode();
  const [appTitle, setAppTitle] = useState(DEFAULT_TITLE);

  useEffect(() => {
    fetchVersion().then(({ appTitle: t }) => {
      setAppTitle(t || DEFAULT_TITLE);
      document.title = t || DEFAULT_TITLE;
    }).catch(() => {});
  }, []);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <p className="text-gray-500 dark:text-gray-400">Laden...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginForm appTitle={appTitle} onLogin={login} error={error} />;
  }

  return <Dashboard appTitle={appTitle} dark={dark} onToggleDark={toggle} onLogout={logout} />;
}
