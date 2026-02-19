import { Router } from "express";
import { lookupPhone, lookupPhones } from "../projectfacts.js";

const router = Router();

router.get("/lookup", (req, res) => {
  const number = req.query.number as string;
  if (!number) return res.status(400).json({ error: "number required" });
  const contact = lookupPhone(number);
  res.json({ contact });
});

router.post("/lookup-batch", (req, res) => {
  const numbers: string[] = req.body.numbers || [];
  const contacts = lookupPhones(numbers);
  res.json({ contacts });
});

export default router;
