import "dotenv/config";
import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";

import { initDatabase } from "./db.js";
import { callEvents, getActiveCallsList } from "./call-aggregator.js";
import { connectorEvents, start as startConnector, stop as stopConnector, getExtensionList, isNfonConnected } from "./nfon-connector.js";
import callsRouter from "./routes/calls.js";
import extensionsRouter from "./routes/extensions.js";

const PORT = Number(process.env.PORT) || 3001;

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

// REST routes
app.use("/api/calls", callsRouter);
app.use("/api/extensions", extensionsRouter);

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
});

callEvents.on("call:updated", (call) => {
  io.emit("call:updated", call);
});

connectorEvents.on("extensions:updated", (exts) => {
  io.emit("extensions", exts);
});

connectorEvents.on("sse:connected", () => {
  io.emit("nfon:connected");
});

connectorEvents.on("sse:disconnected", () => {
  io.emit("nfon:disconnected");
});

// Start
async function main() {
  console.log("NFON Call Monitor - Server");
  console.log("=========================\n");

  initDatabase();

  httpServer.listen(PORT, () => {
    console.log(`[Server] Läuft auf http://localhost:${PORT}`);
  });

  await startConnector();
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
