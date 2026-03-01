import { Router } from "express";
import rateLimit from "express-rate-limit";
import { verifyLogin, createSession, validateToken } from "../dashboard-auth.js";
import * as log from "../log.js";

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Zu viele Anmeldeversuche. Bitte versuchen Sie es in 15 Minuten erneut." },
});

router.post("/login", loginLimiter, (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    res.status(400).json({ error: "Username und Passwort erforderlich" });
    return;
  }

  if (!verifyLogin(username, password)) {
    res.status(401).json({ error: "Ungültige Anmeldedaten" });
    return;
  }

  const token = createSession(username);
  log.debug("Auth", `Dashboard-Login: ${username}`);
  res.json({ token });
});

router.post("/logout", (_req, res) => {
  log.debug("Auth", "Dashboard-Logout");
  res.json({ ok: true });
});

router.get("/check", (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ valid: false });
    return;
  }

  const token = authHeader.slice(7);
  if (validateToken(token)) {
    res.json({ valid: true });
  } else {
    res.status(401).json({ valid: false });
  }
});

export default router;
