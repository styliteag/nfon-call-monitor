import { Router } from "express";
import { lookupPhone, lookupPhones, searchContacts, isPfActive } from "../projectfacts.js";

const router = Router();

router.get("/lookup", (req, res) => {
  const number = req.query.number as string;
  if (!number) return res.status(400).json({ error: "number required" });
  const contact = lookupPhone(number);
  res.json({ contact });
});

router.get("/search", (req, res) => {
  const q = req.query.q as string;
  if (!q) return res.status(400).json({ error: "q required" });
  if (!isPfActive()) return res.json({ results: [] });
  const results = searchContacts(q);
  res.json({ results });
});

router.post("/lookup-batch", (req, res) => {
  const numbers: string[] = req.body.numbers || [];
  const contacts = lookupPhones(numbers);
  res.json({ contacts });
});

export default router;
