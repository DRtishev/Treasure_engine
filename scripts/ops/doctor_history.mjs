/**
 * doctor_history.mjs — Append-only JSONL ledger for Doctor runs
 *
 * Sprint 2: Each doctor run appends one JSON line with scoreboard + verdict.
 * Never modifies existing lines. Read for trending and regression detection.
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const HISTORY_PATH = path.join(ROOT, 'reports/evidence/EXECUTOR/DOCTOR_HISTORY.jsonl');

/**
 * Append a doctor run result to the JSONL ledger.
 * @param {Object} entry — must contain at least { verdict, score, confidence_score, run_id }
 */
export function appendDoctorHistory(entry) {
  const dir = path.dirname(HISTORY_PATH);
  fs.mkdirSync(dir, { recursive: true });
  const line = JSON.stringify({
    ...entry,
    appended_at_tick: entry.run_id || 'UNKNOWN',
  });
  fs.appendFileSync(HISTORY_PATH, line + '\n');
}

/**
 * Read all doctor history entries.
 * @returns {Object[]} array of parsed entries (skips malformed lines)
 */
export function readDoctorHistory() {
  if (!fs.existsSync(HISTORY_PATH)) return [];
  const lines = fs.readFileSync(HISTORY_PATH, 'utf8').split('\n').filter(Boolean);
  const entries = [];
  for (const line of lines) {
    try {
      entries.push(JSON.parse(line));
    } catch {
      // Skip malformed lines
    }
  }
  return entries;
}
