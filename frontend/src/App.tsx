import { LoginForm } from "./components/LoginForm";
import { Dashboard } from "./components/Dashboard";
import { useDarkMode } from "./hooks/useDarkMode";
import { useAuth } from "./hooks/useAuth";

export default function App() {
  const { isAuthenticated, checking, error, login, logout } = useAuth();
  const { dark, toggle } = useDarkMode();

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <p className="text-gray-500 dark:text-gray-400">Laden...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginForm onLogin={login} error={error} />;
  }

  return <Dashboard dark={dark} onToggleDark={toggle} onLogout={logout} />;
}
