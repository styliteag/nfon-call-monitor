import "dotenv/config";
import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";
import { readFileSync } from "fs";

import { initDatabase, getLastHeartbeat, updateHeartbeat, upsertCall, backupDatabase, purgeOldCalls, getCallCounts } from "./db.js";
import { callEvents, getActiveCallsList, cleanStaleCalls } from "./call-aggregator.js";
import { connectorEvents, start as startConnector, stop as stopConnector, getExtensionList, isNfonConnected } from "./nfon-connector.js";
import callsRouter from "./routes/calls.js";
import extensionsRouter from "./routes/extensions.js";
import authRouter from "./routes/auth.js";
import pfRouter from "./routes/pf.js";
import clickToDialRouter from "./routes/click-to-dial.js";
import { requireAuth, validateToken } from "./dashboard-auth.js";
import { initPfCache } from "./projectfacts.js";
import * as log from "./log.js";

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

app.get("/api/health", (_req, res) => {
  const nfonConnected = isNfonConnected();
  const socketClients = io.engine.clientsCount;
  const uptimeSeconds = Math.floor(process.uptime());

  const status = nfonConnected ? "ok" : "degraded";
  const httpStatus = nfonConnected ? 200 : 503;

  res.status(httpStatus).json({
    status,
    version: APP_VERSION,
    uptime: uptimeSeconds,
    nfonConnected,
    socketClients,
  });
});

// Prometheus metrics endpoint (Basic Auth)
const METRICS_USER = process.env.METRICS_USER;
const METRICS_PASS = process.env.METRICS_PASS;

app.get("/api/metrics", (req, res) => {
  if (!METRICS_USER || !METRICS_PASS) {
    return res.status(404).end();
  }

  const auth = req.headers.authorization;
  if (!auth?.startsWith("Basic ")) {
    res.setHeader("WWW-Authenticate", 'Basic realm="metrics"');
    return res.status(401).end();
  }
  const [user, pass] = Buffer.from(auth.slice(6), "base64").toString().split(":");
  if (user !== METRICS_USER || pass !== METRICS_PASS) {
    res.setHeader("WWW-Authenticate", 'Basic realm="metrics"');
    return res.status(401).end();
  }

  const uptime = Math.floor(process.uptime());
  const nfonUp = isNfonConnected() ? 1 : 0;
  const clients = io.engine.clientsCount;
  const activeCalls = getActiveCallsList().length;
  const extensions = getExtensionList().length;
  const callCounts = getCallCounts();
  const mem = process.memoryUsage();

  const lines = [
    "# HELP nfon_up NFON SSE connection status (1=connected, 0=disconnected)",
    "# TYPE nfon_up gauge",
    `nfon_up ${nfonUp}`,
    "# HELP nfon_uptime_seconds Server uptime in seconds",
    "# TYPE nfon_uptime_seconds gauge",
    `nfon_uptime_seconds ${uptime}`,
    "# HELP nfon_websocket_clients Connected Socket.IO clients",
    "# TYPE nfon_websocket_clients gauge",
    `nfon_websocket_clients ${clients}`,
    "# HELP nfon_active_calls Currently active calls",
    "# TYPE nfon_active_calls gauge",
    `nfon_active_calls ${activeCalls}`,
    "# HELP nfon_extensions_total Total number of extensions",
    "# TYPE nfon_extensions_total gauge",
    `nfon_extensions_total ${extensions}`,
    "# HELP nfon_calls_total Total calls by status",
    "# TYPE nfon_calls_total gauge",
    ...Object.entries(callCounts).map(([status, count]) =>
      `nfon_calls_total{status="${status}"} ${count}`
    ),
    "# HELP nfon_memory_bytes Process memory usage in bytes",
    "# TYPE nfon_memory_bytes gauge",
    `nfon_memory_bytes{type="rss"} ${mem.rss}`,
    `nfon_memory_bytes{type="heap_used"} ${mem.heapUsed}`,
    `nfon_memory_bytes{type="heap_total"} ${mem.heapTotal}`,
    "",
  ];

  res.setHeader("Content-Type", "text/plain; version=0.0.4; charset=utf-8");
  res.send(lines.join("\n"));
});

// Auth middleware for all other /api/* routes
app.use("/api", requireAuth);

// Config endpoint (returns kopfnummern for Durchwahl extraction)
app.get("/api/config", (_req, res) => {
  const raw = process.env.KOPFNUMMERN || "";
  const rawNames = process.env.KOPFNUMMERN_NAME || "";
  const kopfnummern = raw.split(",").map((s) => s.trim()).filter(Boolean);
  const namen = rawNames.split(",").map((s) => s.trim());
  const kopfnummernMap = kopfnummern.map((nr, i) => ({ nr, name: namen[i] || nr }));

  // NFON Funktionscodes — see https://www.nfon.com/de/service/dokumentation/uebersichten/produktuebersichten/funktionscodes-der-nfon-telefonanlage/
  // *1:Aufnahme, *10+N:Rufuml.Profil, *11+TN:Rufuml.fest, **11:aus, *12+TN:Rufuml.unerr., **12:aus,
  // *13+TN:Rufuml.besetzt, **13:aus, *14+TN:Rufuml.unreg., **14:aus, *2+N:Kurzwahl, *3:Pickup,
  // *490:Anklopfen, **490:aus, *5:Rückruf, **5:aus, *55:Primärgerät, *791:Mailbox, *8:Call Pull,
  // *80:Durchsage, **80:aus, *84+N*1:Queue join, **84+N*1:Queue leave, *85:Echo,
  // *86:CLIR, *860:Kopfnr-CLIP, *863:DND, **86:CLIP, *87:Agent On, **87:Agent Off, *9+N:Projekt
  // Example: "SPECIAL_NUMBERS=*55:Primär,*87:Agent On,**87:Agent Off"
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
  log.debug("Socket.IO", `Client verbunden: ${socket.id}`);

  // Send current state on connect
  socket.emit("active-calls", getActiveCallsList());
  socket.emit("extensions", getExtensionList());
  if (isNfonConnected()) {
    socket.emit("nfon:connected");
  }

  socket.on("disconnect", () => {
    log.debug("Socket.IO", `Client getrennt: ${socket.id}`);
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
  console.log(`\n${APP_TITLE} v${APP_VERSION}`);
  console.log("=========================\n");

  initDatabase();

  // Downtime detection: check how long the server was offline
  const lastHeartbeat = getLastHeartbeat();
  const now = new Date();
  if (lastHeartbeat) {
    const lastSeen = new Date(lastHeartbeat);
    const downtimeMs = now.getTime() - lastSeen.getTime();
    const downtimeMin = Math.round(downtimeMs / 60_000);
    if (downtimeMin >= 2) {
      const hours = Math.floor(downtimeMin / 60);
      const mins = downtimeMin % 60;
      const durationText = hours > 0 ? `${hours} Std ${mins} Min` : `${mins} Min`;
      log.warn("Server", `Server war ${durationText} offline (letzter Heartbeat: ${lastHeartbeat})`);
      upsertCall({
        id: `downtime-${lastSeen.toISOString()}`,
        extension: "system",
        extensionName: "System",
        caller: "",
        callee: "",
        direction: "inbound",
        startTime: lastSeen.toISOString(),
        endTime: now.toISOString(),
        duration: Math.round(downtimeMs / 1000),
        status: "system",
        endReason: `Server offline für ${durationText} — Ereignisse in diesem Zeitraum wurden möglicherweise nicht erfasst.`,
      });
    }
  }
  updateHeartbeat();
  setInterval(updateHeartbeat, 60_000);

  await initPfCache();

  httpServer.listen(PORT, () => {
    log.info("Server", `Läuft auf http://localhost:${PORT}`);
  });

  await startConnector();

  // Periodically clean up stale calls (every 60s)
  setInterval(cleanStaleCalls, 60_000);

  // Daily database backup at 02:00
  function scheduleDailyBackup() {
    const now = new Date();
    const next = new Date(now);
    next.setHours(2, 0, 0, 0);
    if (next <= now) next.setDate(next.getDate() + 1);
    const delay = next.getTime() - now.getTime();
    setTimeout(() => {
      backupDatabase();
      purgeOldCalls();
      setInterval(() => { backupDatabase(); purgeOldCalls(); }, 24 * 60 * 60_000);
    }, delay);
    log.info("Backup", `Nächstes Backup um 02:00 (in ${Math.round(delay / 60_000)} Min)`);
  }
  scheduleDailyBackup();
}

process.on("SIGINT", () => {
  log.info("Server", "Wird beendet...");
  stopConnector();
  httpServer.close();
  process.exit(0);
});

main().catch((err) => {
  log.error("Server", "Fataler Fehler:", err);
  process.exit(1);
});
