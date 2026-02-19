import { Router } from "express";
import { verifyLogin, createSession, validateToken } from "../dashboard-auth.js";

const router = Router();

router.post("/login", (req, res) => {
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
  console.log(`[Auth] Login erfolgreich: ${username}`);
  res.json({ token });
});

router.post("/logout", (_req, res) => {
  console.log("[Auth] Logout");
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
