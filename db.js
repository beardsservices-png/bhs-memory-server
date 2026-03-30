import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Store the DB file in /data if it exists (Railway persistent volume),
// otherwise fall back to the project root for local dev.
const dbPath = process.env.DB_PATH || path.join(__dirname, "callers.db");

export const db = new Database(dbPath);

// ─── SCHEMA ───────────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS callers (
    phone             TEXT PRIMARY KEY,
    name              TEXT,
    callback_number   TEXT,
    last_service      TEXT,
    last_location     TEXT,
    notes             TEXT,
    last_call_id      TEXT,
    last_call_date    TEXT,
    call_summary      TEXT,
    sentiment         TEXT,
    call_count        INTEGER DEFAULT 1,
    created_at        TEXT DEFAULT (datetime('now')),
    updated_at        TEXT DEFAULT (datetime('now'))
  )
`);

// ─── UPSERT (insert or update on conflict) ────────────────────────────────────
// Preserves existing name/callback_number if the new call didn't capture them.
export function upsertCaller({
  phone,
  name,
  callback_number,
  last_service,
  last_location,
  notes,
  last_call_id,
  last_call_date,
  call_summary,
  sentiment,
}) {
  const existing = getCaller(phone);

  if (!existing) {
    db.prepare(`
      INSERT INTO callers
        (phone, name, callback_number, last_service, last_location,
         notes, last_call_id, last_call_date, call_summary, sentiment, call_count)
      VALUES
        (@phone, @name, @callback_number, @last_service, @last_location,
         @notes, @last_call_id, @last_call_date, @call_summary, @sentiment, 1)
    `).run({ phone, name, callback_number, last_service, last_location, notes, last_call_id, last_call_date, call_summary, sentiment });
  } else {
    // Always update call-specific fields; only overwrite name/callback if we got new values
    db.prepare(`
      UPDATE callers SET
        name            = COALESCE(@name, name),
        callback_number = COALESCE(@callback_number, callback_number),
        last_service    = COALESCE(@last_service, last_service),
        last_location   = COALESCE(@last_location, last_location),
        notes           = COALESCE(@notes, notes),
        last_call_id    = @last_call_id,
        last_call_date  = @last_call_date,
        call_summary    = @call_summary,
        sentiment       = @sentiment,
        call_count      = call_count + 1,
        updated_at      = datetime('now')
      WHERE phone = @phone
    `).run({ phone, name, callback_number, last_service, last_location, notes, last_call_id, last_call_date, call_summary, sentiment });
  }
}

// ─── GET CALLER BY PHONE NUMBER ───────────────────────────────────────────────
export function getCaller(phone) {
  return db.prepare("SELECT * FROM callers WHERE phone = ?").get(phone) || null;
}
