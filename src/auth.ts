import "dotenv/config";
import * as log from "./log.js";

const BASE_URL = process.env.CTI_API_BASE_URL || "https://providersupportdata.cloud-cfg.com";

interface TokenResponse {
  "access-token": string;
  "refresh-token": string;
}

interface Tokens {
  accessToken: string;
  refreshToken: string;
}

let currentTokens: Tokens | null = null;
let refreshTimer: ReturnType<typeof setTimeout> | null = null;

export async function login(): Promise<Tokens> {
  const username = process.env.CTI_API_USERNAME;
  const password = process.env.CTI_API_PASSWORD;

  if (!username || !password) {
    throw new Error(
      "CTI_API_USERNAME und CTI_API_PASSWORD müssen in .env gesetzt sein.\n" +
      "Beantrage Zugangsdaten bei: vertrieb@nfon.com"
    );
  }

  const res = await fetch(`${BASE_URL}/v1/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
    body: JSON.stringify({ username, password }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Login fehlgeschlagen (${res.status}): ${body}`);
  }

  const data = await res.json() as TokenResponse;
  currentTokens = {
    accessToken: data["access-token"],
    refreshToken: data["refresh-token"],
  };
  log.info("Auth", "NFON Login erfolgreich.");
  return currentTokens;
}

export async function refreshTokens(): Promise<Tokens> {
  if (!currentTokens) {
    throw new Error("Kein Refresh Token vorhanden. Bitte zuerst login() aufrufen.");
  }

  const res = await fetch(`${BASE_URL}/v1/login`, {
    method: "PUT",
    headers: {
      "Accept": "application/json",
      "Authorization": `Bearer ${currentTokens.refreshToken}`,
    },
  });

  if (!res.ok) {
    const body = await res.text();
    log.warn("Auth", `Token-Refresh fehlgeschlagen (${res.status}): ${body}`);
    log.info("Auth", "Versuche erneuten Login...");
    return login();
  }

  const data = await res.json() as TokenResponse;
  currentTokens = {
    accessToken: data["access-token"],
    refreshToken: data["refresh-token"],
  };
  log.debug("Auth", "Token erneuert.");
  return currentTokens;
}

export function startAutoRefresh(intervalMs = 4 * 60 * 1000): void {
  stopAutoRefresh();
  refreshTimer = setInterval(async () => {
    try {
      await refreshTokens();
    } catch (err) {
      log.error("Auth", "Auto-Refresh fehlgeschlagen:", err);
    }
  }, intervalMs);
  log.debug("Auth", `Auto-Refresh alle ${intervalMs / 1000}s aktiviert.`);
}

export function stopAutoRefresh(): void {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
}

export function getAccessToken(): string {
  if (!currentTokens) {
    throw new Error("Nicht authentifiziert. Bitte zuerst login() aufrufen.");
  }
  return currentTokens.accessToken;
}

export function getBaseUrl(): string {
  return BASE_URL;
}
