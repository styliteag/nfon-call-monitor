import { Router } from "express";
import { getExtensionList } from "../nfon-connector.js";

const router = Router();

router.get("/", (_req, res) => {
  res.json(getExtensionList());
});

export default router;
