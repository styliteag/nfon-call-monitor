import { DatabaseSync } from "node:sqlite";
import path from "path";
import { mkdirSync, readdirSync, unlinkSync } from "fs";
import type { Call, CallLeg, CallRecord, CallStatus, CallsQuery, CallsResponse } from "../shared/types.js";
import { isPfActive, searchContactsByName } from "./projectfacts.js";
import * as log from "./log.js";

let db: DatabaseSync;
let dbPath: string;

export function initDatabase(): void {
  dbPath = process.env.DB_PATH || path.join(process.cwd(), "calls.db");
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

  db.exec(`
    CREATE TABLE IF NOT EXISTS agent_status (
      extension TEXT PRIMARY KEY,
      logged_in INTEGER NOT NULL DEFAULT 0,
      updated TEXT NOT NULL
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS user_status (
      extension TEXT PRIMARY KEY,
      status TEXT NOT NULL DEFAULT 'online',
      message TEXT NOT NULL DEFAULT '',
      updated TEXT NOT NULL
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS server_heartbeat (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      last_seen TEXT NOT NULL
    )
  `);

  // Migration: add transfer columns
  const cols = db.prepare("PRAGMA table_info(calls)").all() as Array<{ name: string }>;
  const colNames = new Set(cols.map((c) => c.name));
  if (!colNames.has("transferred_from")) {
    db.exec("ALTER TABLE calls ADD COLUMN transferred_from TEXT");
    db.exec("ALTER TABLE calls ADD COLUMN transferred_from_name TEXT");
    log.info("DB", "Migration: transferred_from/transferred_from_name Spalten hinzugefügt.");
  }
  if (!colNames.has("original_caller")) {
    db.exec("ALTER TABLE calls ADD COLUMN original_caller TEXT");
    log.info("DB", "Migration: original_caller Spalte hinzugefügt.");
  }

  // Fix stale calls left as ringing/active from previous runs
  const staleFixed = db.prepare(`
    UPDATE calls SET status = 'missed', end_reason = 'stale'
    WHERE status IN ('ringing', 'active') AND end_time IS NULL
  `).run();
  if (staleFixed.changes > 0) {
    log.warn("DB", `${staleFixed.changes} stale ringing/active Einträge auf 'missed' gesetzt.`);
  }

  log.info("DB", `SQLite initialisiert: ${dbPath}`);
}

export function upsertCall(call: CallRecord): void {
  const stmt = db.prepare(`
    INSERT INTO calls (id, extension, caller, callee, extension_name, direction, start_time, answer_time, end_time, duration, status, end_reason, transferred_from, transferred_from_name, original_caller)
    VALUES (:id, :extension, :caller, :callee, :extensionName, :direction, :startTime, :answerTime, :endTime, :duration, :status, :endReason, :transferredFrom, :transferredFromName, :originalCaller)
    ON CONFLICT(id, extension) DO UPDATE SET
      caller = :caller,
      callee = :callee,
      extension_name = :extensionName,
      direction = :direction,
      answer_time = :answerTime,
      end_time = :endTime,
      duration = :duration,
      status = :status,
      end_reason = :endReason,
      transferred_from = :transferredFrom,
      transferred_from_name = :transferredFromName,
      original_caller = :originalCaller
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
    transferredFrom: call.transferredFrom ?? null,
    transferredFromName: call.transferredFromName ?? null,
    originalCaller: call.originalCaller ?? null,
  });
}

/**
 * Update only the end_time for an already-completed call in the DB.
 * Used when a late hangup event arrives after stale cleanup.
 * Does NOT overwrite status/answerTime/duration — preserves the existing record.
 * Returns true if a row was updated.
 */
export function updateCallEnd(id: string, extension: string, endTime: string, endReason?: string): boolean {
  const result = db.prepare(`
    UPDATE calls SET end_time = :endTime, end_reason = COALESCE(:endReason, end_reason)
    WHERE id = :id AND extension = :extension
  `).run({ id, extension, endTime, endReason: endReason ?? null });
  return Number(result.changes) > 0;
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
  if (query.status === "missedOnly") {
    conditions.push("status = 'missed'");
    conditions.push("id NOT IN (SELECT id FROM calls WHERE status = 'answered')");
  } else if (query.status) {
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
  if (query.search) {
    const searchParts = ["caller LIKE :search", "callee LIKE :search", "extension_name LIKE :search"];
    params.search = `%${query.search}%`;

    // When PF is active, also search by contact name
    if (isPfActive()) {
      const matchingNumbers = searchContactsByName(query.search);
      if (matchingNumbers.length > 0) {
        const placeholders = matchingNumbers.map((num, i) => {
          const key = `pfnum${i}`;
          params[key] = num;
          return `:${key}`;
        });
        const inList = placeholders.join(", ");
        searchParts.push(`caller IN (${inList})`);
        searchParts.push(`callee IN (${inList})`);
      }
    }

    conditions.push(`(${searchParts.join(" OR ")})`);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  // Paginate by distinct call id (one logical call = one page slot, even if
  // the call has multiple legs / hunt-group members). The filters above
  // pick the matching IDs; once we have them we load *all* legs of those
  // calls so the aggregated Call has full context (e.g. on a status filter
  // the answering leg is still included as part of the matched call).
  const totalRow = db.prepare(
    `SELECT COUNT(DISTINCT id) as count FROM calls ${where}`
  ).get(params) as { count: number };

  const idRows = db.prepare(
    `SELECT id, MAX(start_time) as max_st FROM calls ${where}
     GROUP BY id ORDER BY max_st DESC, id LIMIT :limit OFFSET :offset`
  ).all({ ...params, limit: pageSize, offset }) as Array<{ id: string; max_st: string }>;

  if (idRows.length === 0) {
    return { calls: [], total: totalRow.count, page, pageSize };
  }

  const idParams: Record<string, string> = {};
  const idPlaceholders = idRows.map((row, i) => {
    const key = `gid${i}`;
    idParams[key] = row.id;
    return `:${key}`;
  }).join(", ");
  const orderMap = new Map(idRows.map((row, i) => [row.id, i]));

  const legRows = db.prepare(
    `SELECT * FROM calls WHERE id IN (${idPlaceholders})`
  ).all(idParams) as Array<Record<string, unknown>>;

  const grouped = legsByCallId(legRows.map(rowToCallRecord));
  const calls: Call[] = idRows
    .map((row) => grouped.get(row.id))
    .filter((legs): legs is CallLeg[] => !!legs && legs.length > 0)
    .sort((a, b) => (orderMap.get(a[0].id) ?? 0) - (orderMap.get(b[0].id) ?? 0))
    .map(aggregateLegs);

  return { calls, total: totalRow.count, page, pageSize };
}

export function getActiveCalls(): Call[] {
  const rows = db.prepare(
    `SELECT * FROM calls
     WHERE id IN (SELECT DISTINCT id FROM calls WHERE status IN ('ringing', 'active'))
     ORDER BY start_time DESC`
  ).all() as Array<Record<string, unknown>>;

  const grouped = legsByCallId(rows.map(rowToCallRecord));
  return [...grouped.values()]
    .map(aggregateLegs)
    .sort((a, b) => b.startTime.localeCompare(a.startTime));
}

export function upsertAgentStatus(extension: string, loggedIn: boolean): void {
  db.prepare(`
    INSERT INTO agent_status (extension, logged_in, updated)
    VALUES (:extension, :loggedIn, :updated)
    ON CONFLICT(extension) DO UPDATE SET
      logged_in = :loggedIn,
      updated = :updated
  `).run({
    extension,
    loggedIn: loggedIn ? 1 : 0,
    updated: new Date().toISOString(),
  });
}

export function getAgentStatuses(): Map<string, boolean> {
  const rows = db.prepare("SELECT extension, logged_in FROM agent_status").all() as Array<{ extension: string; logged_in: number }>;
  const map = new Map<string, boolean>();
  for (const row of rows) {
    map.set(row.extension, row.logged_in === 1);
  }
  return map;
}

export function updateHeartbeat(): void {
  db.prepare(`
    INSERT INTO server_heartbeat (id, last_seen) VALUES (1, :now)
    ON CONFLICT(id) DO UPDATE SET last_seen = :now
  `).run({ now: new Date().toISOString() });
}

export function getLastHeartbeat(): string | null {
  const row = db.prepare("SELECT last_seen FROM server_heartbeat WHERE id = 1").get() as { last_seen: string } | undefined;
  return row?.last_seen ?? null;
}

export function setUserStatus(extension: string, status: string, message: string): void {
  db.prepare(`
    INSERT INTO user_status (extension, status, message, updated)
    VALUES (:extension, :status, :message, :updated)
    ON CONFLICT(extension) DO UPDATE SET
      status = :status,
      message = :message,
      updated = :updated
  `).run({
    extension,
    status,
    message,
    updated: new Date().toISOString(),
  });
}

export function getUserStatuses(): Map<string, { status: string; message: string; updated: string }> {
  const rows = db.prepare("SELECT extension, status, message, updated FROM user_status").all() as Array<{ extension: string; status: string; message: string; updated: string }>;
  const map = new Map<string, { status: string; message: string; updated: string }>();
  for (const row of rows) {
    map.set(row.extension, { status: row.status, message: row.message, updated: row.updated });
  }
  return map;
}

export function clearAllUserStatuses(): number {
  const result = db.prepare("DELETE FROM user_status").run();
  return Number(result.changes);
}

export function getCallCounts(): Record<string, number> {
  const rows = db.prepare(
    "SELECT status, COUNT(*) as count FROM calls GROUP BY status"
  ).all() as Array<{ status: string; count: number }>;
  const counts: Record<string, number> = {};
  for (const row of rows) counts[row.status] = row.count;
  return counts;
}

const MAX_BACKUPS = Number(process.env.BACKUP_KEEP_DAYS) || 7;
const RETENTION_DAYS = Number(process.env.RETENTION_DAYS) || 60;

export function purgeOldCalls(): number {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);
  const cutoffISO = cutoff.toISOString();

  const result = db.prepare("DELETE FROM calls WHERE start_time < :cutoff").run({ cutoff: cutoffISO });
  const changes = Number(result.changes);
  if (changes > 0) {
    log.info("DB", `${changes} Anrufe älter als ${RETENTION_DAYS} Tage gelöscht.`);
  }
  return changes;
}

export function backupDatabase(): string | null {
  const backupDir = path.join(path.dirname(dbPath), "backups");
  mkdirSync(backupDir, { recursive: true });

  const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const backupPath = path.join(backupDir, `calls-${date}.db`);

  try {
    db.exec(`VACUUM INTO '${backupPath.replace(/'/g, "''")}'`);
    log.info("Backup", `Datenbank-Backup erstellt: ${backupPath}`);
  } catch (err) {
    log.error("Backup", "Backup fehlgeschlagen:", err);
    return null;
  }

  // Cleanup: keep only the newest MAX_BACKUPS files
  try {
    const files = readdirSync(backupDir)
      .filter((f) => f.startsWith("calls-") && f.endsWith(".db"))
      .sort()
      .reverse();

    for (const old of files.slice(MAX_BACKUPS)) {
      unlinkSync(path.join(backupDir, old));
      log.info("Backup", `Altes Backup gelöscht: ${old}`);
    }
  } catch (err) {
    log.warn("Backup", "Cleanup alter Backups fehlgeschlagen:", err);
  }

  return backupPath;
}

// Aggregate per-leg statuses into a single call status. From the user's
// perspective: any leg still ringing/active makes the call live; an
// answered leg makes the call answered. Otherwise the call is missed,
// unless every leg ended with the same hangup reason (all busy / all
// rejected) — in which case we keep the specific reason.
function aggregateStatus(legs: CallLeg[]): CallStatus {
  if (legs.some((l) => l.status === "ringing")) return "ringing";
  if (legs.some((l) => l.status === "active")) return "active";
  if (legs.some((l) => l.status === "answered")) return "answered";
  if (legs.some((l) => l.status === "system")) return "system";
  if (legs.every((l) => l.status === "busy")) return "busy";
  if (legs.every((l) => l.status === "rejected")) return "rejected";
  return "missed";
}

export function aggregateLegs(legs: CallLeg[]): Call {
  if (legs.length === 0) {
    throw new Error("aggregateLegs called with empty legs array");
  }
  const sorted = [...legs].sort((a, b) => a.startTime.localeCompare(b.startTime));
  const first = sorted[0];
  const answerer = sorted.find((l) => l.status === "answered" || l.status === "active");
  const status = aggregateStatus(sorted);
  const endTimes = sorted.map((l) => l.endTime).filter((t): t is string => !!t);
  const endTime = endTimes.length > 0 ? [...endTimes].sort().at(-1) : undefined;
  const transferLeg = sorted.find((l) => l.transferredFrom);
  // Same-uuid sequential transfer: the transferring extension is itself an
  // (answered) leg of this call. Anchor the row on the transferrer and expose
  // the target via transferredTo, rather than the recipient-anchored "von"
  // rendering used for cross-uuid transfers (where the source is not a leg).
  //
  // The recipient leg carries transferredFrom pointing at a DIFFERENT extension
  // that is itself an answered leg. Exclude the outbound-transfer self-marker
  // (transferredFrom === extension, set when an extension dials out to forward
  // a caller) so it cannot masquerade as the recipient — otherwise a call that
  // holds both legs would name the transferrer instead of the target.
  const sameUuidRecipient = sorted.find(
    (l) =>
      l.transferredFrom &&
      l.transferredFrom !== l.extension &&
      sorted.some((s) => s.extension === l.transferredFrom && !!s.answerTime)
  );
  return {
    id: first.id,
    caller: first.caller,
    callee: first.callee,
    direction: first.direction,
    startTime: first.startTime,
    answerTime: answerer?.answerTime,
    endTime,
    duration: answerer?.duration ?? first.duration,
    status,
    endReason: answerer?.endReason ?? first.endReason,
    transferredFrom: sameUuidRecipient ? undefined : transferLeg?.transferredFrom,
    transferredFromName: sameUuidRecipient ? undefined : transferLeg?.transferredFromName,
    transferredTo: sameUuidRecipient ? sameUuidRecipient.extension : undefined,
    transferredToName: sameUuidRecipient ? sameUuidRecipient.extensionName : undefined,
    originalCaller: sameUuidRecipient
      ? (sameUuidRecipient.originalCaller ?? sameUuidRecipient.caller)
      : (transferLeg?.originalCaller ?? first.originalCaller),
    answeredBy: answerer?.extension,
    answeredByName: answerer?.extensionName,
    legs: sorted,
  };
}

function legsByCallId(legs: CallLeg[]): Map<string, CallLeg[]> {
  const map = new Map<string, CallLeg[]>();
  for (const leg of legs) {
    const list = map.get(leg.id);
    if (list) list.push(leg);
    else map.set(leg.id, [leg]);
  }
  return map;
}

export function getCallById(id: string): Call | undefined {
  const rows = db.prepare("SELECT * FROM calls WHERE id = :id").all({ id }) as Array<Record<string, unknown>>;
  if (rows.length === 0) return undefined;
  return aggregateLegs(rows.map(rowToCallRecord));
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
    transferredFrom: (row.transferred_from as string) || undefined,
    transferredFromName: (row.transferred_from_name as string) || undefined,
    originalCaller: (row.original_caller as string) || undefined,
  };
}
