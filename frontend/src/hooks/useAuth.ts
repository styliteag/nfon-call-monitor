import { useState, useEffect, useCallback } from "react";

const TOKEN_KEY = "nfon_auth_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check existing token on mount
  useEffect(() => {
    const token = getToken();
    if (!token) {
      setChecking(false);
      return;
    }

    fetch("/api/auth/check", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        setIsAuthenticated(res.ok);
        if (!res.ok) clearToken();
      })
      .catch(() => {
        // Network error (e.g. backend restarting) — keep the token,
        // it will be validated on the next successful request.
        setIsAuthenticated(false);
      })
      .finally(() => setChecking(false));
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Login fehlgeschlagen");
        return false;
      }

      const { token } = await res.json();
      localStorage.setItem(TOKEN_KEY, token);
      setIsAuthenticated(true);
      return true;
    } catch {
      setError("Verbindung zum Server fehlgeschlagen");
      return false;
    }
  }, []);

  const logout = useCallback(async () => {
    const token = getToken();
    if (token) {
      try {
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {
        // Ignore network errors on logout
      }
    }
    clearToken();
    setIsAuthenticated(false);
  }, []);

  return { isAuthenticated, checking, error, login, logout };
}
