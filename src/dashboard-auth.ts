import crypto from "node:crypto";
import type { Request, Response, NextFunction } from "express";
import * as log from "./log.js";

const JWT_EXPIRY_SECONDS = 7 * 24 * 60 * 60; // 7 days

let jwtSecret: string;

const envSecret = process.env.DASHBOARD_JWT_SECRET;
if (envSecret) {
  jwtSecret = envSecret;
} else {
  jwtSecret = crypto.randomBytes(32).toString("hex");
  log.warn("Auth", "DASHBOARD_JWT_SECRET nicht gesetzt — generiertes Secret wird bei Neustart ungültig");
}

// --- JWT helpers (HMAC-SHA256, no npm dependency) ---

function base64url(data: string | Buffer): string {
  const buf = typeof data === "string" ? Buffer.from(data) : data;
  return buf.toString("base64url");
}

function sign(header: string, payload: string): string {
  return crypto
    .createHmac("sha256", jwtSecret)
    .update(`${header}.${payload}`)
    .digest("base64url");
}

function createJwt(claims: Record<string, unknown>): string {
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = base64url(JSON.stringify(claims));
  const signature = sign(header, payload);
  return `${header}.${payload}.${signature}`;
}

function verifyJwt(token: string): Record<string, unknown> | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [header, payload, signature] = parts;
  const expected = sign(header, payload);
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    return null;
  }

  try {
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (typeof claims.exp === "number" && claims.exp < Math.floor(Date.now() / 1000)) {
      return null; // expired
    }
    return claims;
  } catch {
    return null;
  }
}

// --- Public API ---

export function verifyLogin(username: string, password: string): boolean {
  const expectedUser = process.env.DASHBOARD_USER;
  const expectedHash = process.env.DASHBOARD_PASSWORD_HASH;

  if (!expectedUser || !expectedHash) {
    log.error("Auth", "DASHBOARD_USER oder DASHBOARD_PASSWORD_HASH nicht in .env gesetzt");
    return false;
  }

  const passwordHash = crypto.createHash("sha256").update(password).digest("hex");
  return username === expectedUser && passwordHash === expectedHash;
}

export function createSession(username: string): string {
  const now = Math.floor(Date.now() / 1000);
  return createJwt({ sub: username, iat: now, exp: now + JWT_EXPIRY_SECONDS });
}

export function validateToken(token: string): boolean {
  return verifyJwt(token) !== null;
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Nicht autorisiert" });
    return;
  }

  const token = authHeader.slice(7);
  if (!validateToken(token)) {
    res.status(401).json({ error: "Ungültiger Token" });
    return;
  }

  next();
}
