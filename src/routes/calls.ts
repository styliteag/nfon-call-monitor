import { Router } from "express";
import { getCalls } from "../db.js";
import type { CallsQuery } from "../../shared/types.js";

const router = Router();

router.get("/", (req, res) => {
  const query: CallsQuery = {
    page: req.query.page ? Number(req.query.page) : 1,
    pageSize: req.query.pageSize ? Number(req.query.pageSize) : 50,
    extension: req.query.extension as string | undefined,
    status: req.query.status as string | undefined,
    direction: req.query.direction as string | undefined,
    dateFrom: req.query.dateFrom as string | undefined,
    dateTo: req.query.dateTo as string | undefined,
  };

  const result = getCalls(query);
  res.json(result);
});

export default router;
