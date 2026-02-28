/**
 * regression_bus01_determinism_x2.mjs — RG_BUS01_DETERMINISM_X2
 *
 * Gate: Running ops:eventbus:smoke twice produces byte-identical
 *       EVENTS.jsonl (modulo run_id normalization).
 * Surface: DATA
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
const EVIDENCE_DIR = path.join(ROOT, 'reports', 'evidence');
fs.mkdirSync(MANUAL, { recursive: true });
const NEXT_ACTION = 'npm run -s verify:fast';
const BUS_SCRIPT = path.join(ROOT, 'scripts', 'ops', 'eventbus_v1.mjs');

const checks = [];
checks.push({ check: 'eventbus_script_exists', pass: fs.existsSync(BUS_SCRIPT), detail: BUS_SCRIPT });

function normalize(content) {
  return content
    .replace(/"run_id"\s*:\s*"[^"]*"/g, '"run_id":"NORMALIZED"')
    .replace(/EPOCH-EVENTBUS-[^\/\\"]+/g, 'EPOCH-EVENTBUS-NORMALIZED');
}

function runSmoke() {
  const r = spawnSync(process.execPath, [BUS_SCRIPT], { cwd: ROOT, encoding: 'utf8', env: { ...process.env } });
  if (r.status !== 0) return { ok: false, hash: null, lines: 0 };
  const dirs = fs.existsSync(EVIDENCE_DIR)
    ? fs.readdirSync(EVIDENCE_DIR).filter((d) => d.startsWith('EPOCH-EVENTBUS-')).sort()
    : [];
  if (!dirs.length) return { ok: false, hash: null, lines: 0 };
  const jsonl = path.join(EVIDENCE_DIR, dirs[dirs.length - 1], 'EVENTS.jsonl');
  if (!fs.existsSync(jsonl)) return { ok: false, hash: null, lines: 0 };
  const raw = fs.readFileSync(jsonl, 'utf8');
  const norm = normalize(raw);
  return { ok: true, hash: crypto.createHash('sha256').update(norm).digest('hex'), lines: raw.trim().split('\n').length };
}

if (fs.existsSync(BUS_SCRIPT)) {
  const r1 = runSmoke();
  const r2 = runSmoke();
  checks.push({ check: 'run1_ok', pass: r1.ok, detail: `lines=${r1.lines}` });
  checks.push({ check: 'run2_ok', pass: r2.ok, detail: `lines=${r2.lines}` });
  if (r1.ok && r2.ok) {
    const stable = r1.hash === r2.hash;
    checks.push({ check: 'events_jsonl_byte_stable_x2', pass: stable, detail: stable ? `hash=${r1.hash.slice(0, 16)}` : `drift! r1=${r1.hash.slice(0, 16)} r2=${r2.hash.slice(0, 16)}` });
    checks.push({ check: 'events_count_stable', pass: r1.lines === r2.lines, detail: `r1=${r1.lines} r2=${r2.lines}` });
  }

  // Verify EVENTS.jsonl entries are tick-ordered
  const dirs = fs.existsSync(EVIDENCE_DIR)
    ? fs.readdirSync(EVIDENCE_DIR).filter((d) => d.startsWith('EPOCH-EVENTBUS-')).sort()
    : [];
  if (dirs.length) {
    const jsonl = path.join(EVIDENCE_DIR, dirs[dirs.length - 1], 'EVENTS.jsonl');
    if (fs.existsSync(jsonl)) {
      const lines = fs.readFileSync(jsonl, 'utf8').trim().split('\n').filter(Boolean);
      const ticks = lines.map((l) => { try { return JSON.parse(l).tick; } catch { return null; } }).filter((t) => t !== null);
      const sorted = [...ticks].sort((a, b) => a - b);
      checks.push({ check: 'events_tick_ordered', pass: JSON.stringify(ticks) === JSON.stringify(sorted), detail: `ticks=[${ticks.join(',')}]` });
      checks.push({ check: 'events_ticks_positive', pass: ticks.every((t) => t >= 1), detail: `min=${Math.min(...ticks)}` });
    }
  }
}

const failed = checks.filter((c) => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'ND_BYTE01';

writeMd(path.join(EXEC, 'REGRESSION_BUS01_DETERMINISM_X2.md'), [
  '# REGRESSION_BUS01_DETERMINISM_X2.md', '',
  `STATUS: ${status}`, `REASON_CODE: ${reason_code}`, `RUN_ID: ${RUN_ID}`, `NEXT_ACTION: ${NEXT_ACTION}`, '',
  '## CHECKS', checks.map((c) => `- [${c.pass ? 'PASS' : 'FAIL'}] ${c.check}: ${c.detail}`).join('\n'), '',
  '## FAILED', failed.length === 0 ? '- NONE' : failed.map((c) => `- ${c.check}: ${c.detail}`).join('\n'),
].join('\n'));
writeJsonDeterministic(path.join(MANUAL, 'regression_bus01_determinism_x2.json'), {
  schema_version: '1.0.0', gate_id: 'RG_BUS01_DETERMINISM_X2',
  status, reason_code, run_id: RUN_ID, next_action: NEXT_ACTION, checks, failed_checks: failed.map((c) => c.check),
});
console.log(`[${status}] regression_bus01_determinism_x2 — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
