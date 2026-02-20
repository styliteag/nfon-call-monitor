import "dotenv/config";
import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";
import { readFileSync } from "fs";

import { initDatabase } from "./db.js";
import { callEvents, getActiveCallsList, cleanStaleCalls } from "./call-aggregator.js";
import { connectorEvents, start as startConnector, stop as stopConnector, getExtensionList, isNfonConnected } from "./nfon-connector.js";
import callsRouter from "./routes/calls.js";
import extensionsRouter from "./routes/extensions.js";
import authRouter from "./routes/auth.js";
import pfRouter from "./routes/pf.js";
import clickToDialRouter from "./routes/click-to-dial.js";
import { requireAuth, validateToken } from "./dashboard-auth.js";
import { initPfCache } from "./projectfacts.js";

const PORT = Number(process.env.PORT) || 3001;

// Read version from VERSION file, fall back to APP_VERSION env, then "unknown"
function getVersion(): string {
  for (const p of [path.join(process.cwd(), "VERSION"), "/app/VERSION"]) {
    try { return readFileSync(p, "utf-8").trim(); } catch {}
  }
  return process.env.APP_VERSION || "unknown";
}
const APP_VERSION = getVersion();
const APP_TITLE = process.env.APP_TITLE || "NFON Call Monitor";

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:3001"],
  },
});

// Middleware
app.use(cors({ origin: ["http://localhost:5173"] }));
app.use(express.json());

// Public endpoints (before auth middleware)
app.use("/api/auth", authRouter);
app.get("/api/version", (_req, res) => res.json({ version: APP_VERSION, appTitle: APP_TITLE }));

// Auth middleware for all other /api/* routes
app.use("/api", requireAuth);

// Config endpoint (returns kopfnummern for Durchwahl extraction)
app.get("/api/config", (_req, res) => {
  const raw = process.env.KOPFNUMMERN || "";
  const rawNames = process.env.KOPFNUMMERN_NAME || "";
  const kopfnummern = raw.split(",").map((s) => s.trim()).filter(Boolean);
  const namen = rawNames.split(",").map((s) => s.trim());
  const kopfnummernMap = kopfnummern.map((nr, i) => ({ nr, name: namen[i] || nr }));

  // Special numbers: "SPECIAL_NUMBERS=*55:Primär,*87:Agent On,**87:Agent Off"
  const specialNumbers: Record<string, string> = {};
  for (const entry of (process.env.SPECIAL_NUMBERS || "").split(",").filter(Boolean)) {
    const [num, label] = entry.split(":").map((s) => s.trim());
    if (num && label) specialNumbers[num] = label;
  }

  res.json({ kopfnummern, kopfnummernMap, specialNumbers });
});

// REST routes
app.use("/api/calls", callsRouter);
app.use("/api/extensions", extensionsRouter);
app.use("/api/pf", pfRouter);
app.use("/api/click-to-dial", clickToDialRouter);

// Serve frontend in production
const frontendDist = path.join(process.cwd(), "frontend", "dist");
app.use(express.static(frontendDist));
app.get("*", (_req, res, next) => {
  // Only serve index.html for non-API routes
  if (_req.path.startsWith("/api")) return next();
  res.sendFile(path.join(frontendDist, "index.html"), (err) => {
    if (err) next();
  });
});

// Socket.IO auth middleware
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (token && validateToken(token)) {
    next();
  } else {
    next(new Error("Nicht autorisiert"));
  }
});

// Socket.IO
io.on("connection", (socket) => {
  console.log(`[Socket.IO] Client verbunden: ${socket.id}`);

  // Send current state on connect
  socket.emit("active-calls", getActiveCallsList());
  socket.emit("extensions", getExtensionList());
  if (isNfonConnected()) {
    socket.emit("nfon:connected");
  }

  socket.on("disconnect", () => {
    console.log(`[Socket.IO] Client getrennt: ${socket.id}`);
  });
});

// Forward aggregator events to all Socket.IO clients
callEvents.on("call:new", (call) => {
  io.emit("call:new", call);
  io.emit("extensions", getExtensionList());
});

callEvents.on("call:updated", (call) => {
  io.emit("call:updated", call);
  io.emit("extensions", getExtensionList());
});

connectorEvents.on("extensions:updated", () => {
  io.emit("extensions", getExtensionList());
});

connectorEvents.on("sse:connected", () => {
  io.emit("nfon:connected");
});

connectorEvents.on("sse:disconnected", () => {
  io.emit("nfon:disconnected");
});

// Start
async function main() {
  console.log(`${APP_TITLE} v${APP_VERSION}`);
  console.log("=========================\n");

  initDatabase();
  await initPfCache();

  httpServer.listen(PORT, () => {
    console.log(`[Server] Läuft auf http://localhost:${PORT}`);
  });

  await startConnector();

  // Periodically clean up stale calls (every 60s)
  setInterval(cleanStaleCalls, 60_000);
}

process.on("SIGINT", () => {
  console.log("\nServer wird beendet...");
  stopConnector();
  httpServer.close();
  process.exit(0);
});

main().catch((err) => {
  console.error("Fataler Fehler:", err);
  process.exit(1);
});
