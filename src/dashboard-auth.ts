import crypto from "node:crypto";
import type { Request, Response, NextFunction } from "express";

// In-memory session store
const activeSessions = new Set<string>();

export function verifyLogin(username: string, password: string): boolean {
  const expectedUser = process.env.DASHBOARD_USER;
  const expectedHash = process.env.DASHBOARD_PASSWORD_HASH;

  if (!expectedUser || !expectedHash) {
    console.error("[Auth] DASHBOARD_USER oder DASHBOARD_PASSWORD_HASH nicht in .env gesetzt");
    return false;
  }

  const passwordHash = crypto.createHash("sha256").update(password).digest("hex");
  return username === expectedUser && passwordHash === expectedHash;
}

export function createSession(): string {
  const token = crypto.randomBytes(32).toString("hex");
  activeSessions.add(token);
  return token;
}

export function validateToken(token: string): boolean {
  return activeSessions.has(token);
}

export function removeSession(token: string): void {
  activeSessions.delete(token);
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
