import { DatabaseSync } from "node:sqlite";
import path from "path";
import type { CallRecord, CallsQuery, CallsResponse } from "../shared/types.js";

let db: DatabaseSync;

export function initDatabase(): void {
  const dbPath = process.env.DB_PATH || path.join(process.cwd(), "calls.db");
  db = new DatabaseSync(dbPath);
  db.exec("PRAGMA journal_mode = WAL");

  db.exec(`
    CREATE TABLE IF NOT EXISTS calls (
      id TEXT NOT NULL,
      extension TEXT NOT NULL,
      caller TEXT NOT NULL,
      callee TEXT NOT NULL,
      extension_name TEXT NOT NULL DEFAULT '',
      direction TEXT NOT NULL,
      start_time TEXT NOT NULL,
      answer_time TEXT,
      end_time TEXT,
      duration INTEGER,
      status TEXT NOT NULL,
      end_reason TEXT,
      PRIMARY KEY (id, extension)
    )
  `);
  db.exec("CREATE INDEX IF NOT EXISTS idx_calls_start_time ON calls(start_time)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_calls_extension ON calls(extension)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_calls_status ON calls(status)");

  // Fix stale calls left as ringing/active from previous runs
  const staleFixed = db.prepare(`
    UPDATE calls SET status = 'missed', end_reason = 'stale'
    WHERE status IN ('ringing', 'active') AND end_time IS NULL
  `).run();
  if (staleFixed.changes > 0) {
    console.log(`[DB] ${staleFixed.changes} stale ringing/active Einträge auf 'missed' gesetzt.`);
  }

  console.log("[DB] SQLite initialisiert:", dbPath);
}

export function upsertCall(call: CallRecord): void {
  const stmt = db.prepare(`
    INSERT INTO calls (id, extension, caller, callee, extension_name, direction, start_time, answer_time, end_time, duration, status, end_reason)
    VALUES (:id, :extension, :caller, :callee, :extensionName, :direction, :startTime, :answerTime, :endTime, :duration, :status, :endReason)
    ON CONFLICT(id, extension) DO UPDATE SET
      caller = :caller,
      callee = :callee,
      extension_name = :extensionName,
      direction = :direction,
      answer_time = :answerTime,
      end_time = :endTime,
      duration = :duration,
      status = :status,
      end_reason = :endReason
  `);

  stmt.run({
    id: call.id,
    extension: call.extension,
    caller: call.caller,
    callee: call.callee,
    extensionName: call.extensionName,
    direction: call.direction,
    startTime: call.startTime,
    answerTime: call.answerTime ?? null,
    endTime: call.endTime ?? null,
    duration: call.duration ?? null,
    status: call.status,
    endReason: call.endReason ?? null,
  });
}

export function getCalls(query: CallsQuery): CallsResponse {
  const page = query.page ?? 1;
  const pageSize = Math.min(query.pageSize ?? 50, 200);
  const offset = (page - 1) * pageSize;

  const conditions: string[] = [];
  const params: Record<string, string | number> = {};

  if (query.extension) {
    conditions.push("extension = :extension");
    params.extension = query.extension;
  }
  if (query.status) {
    conditions.push("status = :status");
    params.status = query.status;
  }
  if (query.direction) {
    conditions.push("direction = :direction");
    params.direction = query.direction;
  }
  if (query.dateFrom) {
    conditions.push("start_time >= :dateFrom");
    params.dateFrom = query.dateFrom;
  }
  if (query.dateTo) {
    conditions.push("start_time <= :dateTo");
    params.dateTo = query.dateTo;
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const total = db.prepare(`SELECT COUNT(*) as count FROM calls ${where}`).get(params) as { count: number };

  const rows = db.prepare(
    `SELECT * FROM calls ${where} ORDER BY start_time DESC LIMIT :limit OFFSET :offset`
  ).all({ ...params, limit: pageSize, offset }) as Array<Record<string, unknown>>;

  const calls: CallRecord[] = rows.map(rowToCallRecord);

  return { calls, total: total.count, page, pageSize };
}

export function getActiveCalls(): CallRecord[] {
  const rows = db.prepare(
    "SELECT * FROM calls WHERE status IN ('ringing', 'active') ORDER BY start_time DESC"
  ).all() as Array<Record<string, unknown>>;

  return rows.map(rowToCallRecord);
}

function rowToCallRecord(row: Record<string, unknown>): CallRecord {
  return {
    id: row.id as string,
    caller: row.caller as string,
    callee: row.callee as string,
    extension: row.extension as string,
    extensionName: row.extension_name as string,
    direction: row.direction as "inbound" | "outbound",
    startTime: row.start_time as string,
    answerTime: (row.answer_time as string) || undefined,
    endTime: (row.end_time as string) || undefined,
    duration: row.duration != null ? (row.duration as number) : undefined,
    status: row.status as CallRecord["status"],
    endReason: (row.end_reason as string) || undefined,
  };
}
