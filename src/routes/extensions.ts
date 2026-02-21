import { Router } from "express";
import { getExtensionList, connectorEvents } from "../nfon-connector.js";
import { setUserStatus } from "../db.js";

const router = Router();

router.get("/", (_req, res) => {
  res.json(getExtensionList());
});

const VALID_STATUSES = ["none", "online", "offline", "mittagspause", "homeoffice", "office"];

router.post("/status", (req, res) => {
  const { extension, status, message } = req.body;
  if (!extension || !status || !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: "extension und status (online|offline|mittagspause|homeoffice|office) erforderlich" });
  }
  setUserStatus(extension, status, (message || "").slice(0, 100));
  connectorEvents.emit("extensions:updated");
  res.json({ ok: true });
});

export default router;
