/**
 * regression_evt02_no_time_fields.mjs — RG_EVT02_NO_TIME_FIELDS
 *
 * Gate: event_schema_v1.mjs validator MUST reject events containing
 *       forbidden timestamp fields anywhere in the payload.
 * Surface: DATA
 */

import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';
import { validate, FORBIDDEN_FIELD_RE } from '../ops/event_schema_v1.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });
const NEXT_ACTION = 'npm run -s verify:fast';

const checks = [];

const BASE = {
  schema_version: '1.0.0', tick: 1, run_id: 'abc', mode: 'CERT',
  component: 'TIMEMACHINE', event: 'HEARTBEAT', reason_code: 'NONE',
  surface: 'UX', evidence_paths: [], attrs: {},
};

function mustReject(label, event) {
  const r = validate(event);
  checks.push({ check: `rejects_${label}`, pass: !r.ok, detail: !r.ok ? `correctly rejected: ${r.errors[0]}` : 'SHOULD HAVE BEEN REJECTED' });
}

function mustAccept(label, event) {
  const r = validate(event);
  checks.push({ check: `accepts_${label}`, pass: r.ok, detail: r.ok ? 'OK' : r.errors.join('; ') });
}

// Cases that MUST be rejected (forbidden fields)
mustReject('root_started_at', { ...BASE, started_at: 'x' });
mustReject('root_completed_at', { ...BASE, completed_at: 'x' });
mustReject('root_elapsed_ms', { ...BASE, elapsed_ms: 42 });
mustReject('root_timestamp', { ...BASE, timestamp: 'x' });
mustReject('root_wall_clock', { ...BASE, wall_clock: 'x' });
mustReject('root_event_ts', { ...BASE, event_ts: 123 });
mustReject('attrs_started_at', { ...BASE, attrs: { started_at: 'x' } });
mustReject('attrs_elapsed_ms', { ...BASE, attrs: { elapsed_ms: 42 } });
mustReject('attrs_wall_ts', { ...BASE, attrs: { wall_ts: 42 } });
mustReject('iso_value_in_attrs', { ...BASE, attrs: { info: '2026-02-28T10:00:00Z' } });

// Cases that MUST be accepted (safe field names)
mustAccept('attrs_with_count', { ...BASE, attrs: { event_count: 5 } });
mustAccept('attrs_with_status', { ...BASE, attrs: { status: 'OK' } });
mustAccept('attrs_with_tick_info', { ...BASE, attrs: { ticks_total: 8, ticks_failed: 0 } });
mustAccept('empty_attrs', { ...BASE, attrs: {} });

// Check FORBIDDEN_FIELD_RE exported correctly
const reTests = [
  { key: 'started_at', should: true },
  { key: 'elapsed_ms', should: true },
  { key: 'timestamp', should: true },
  { key: 'wall_clock', should: true },
  { key: 'event_ts', should: true },
  { key: 'status', should: false },
  { key: 'run_id', should: false },
  { key: 'ticks_total', should: false },
  { key: 'event_count', should: false },
];
for (const { key, should } of reTests) {
  const matched = FORBIDDEN_FIELD_RE.test(key);
  checks.push({ check: `forbidden_re_${key}`, pass: matched === should, detail: `key="${key}" matched=${matched} expected=${should}` });
}

// Check existing EVENTS.jsonl files for forbidden fields
const EVIDENCE_DIR = path.join(ROOT, 'reports', 'evidence');
const busFiles = [];
if (fs.existsSync(EVIDENCE_DIR)) {
  for (const dir of fs.readdirSync(EVIDENCE_DIR).filter((d) => d.startsWith('EPOCH-EVENTBUS-'))) {
    const f = path.join(EVIDENCE_DIR, dir, 'EVENTS.jsonl');
    if (fs.existsSync(f)) busFiles.push(f);
  }
}
for (const f of busFiles) {
  const lines = fs.readFileSync(f, 'utf8').trim().split('\n').filter(Boolean);
  const lineErrors = [];
  for (const line of lines) {
    try {
      const ev = JSON.parse(line);
      const r = validate(ev);
      if (!r.ok) lineErrors.push(r.errors[0]);
    } catch { /* skip */ }
  }
  checks.push({ check: `existing_bus_file_valid:${path.basename(path.dirname(f))}`, pass: lineErrors.length === 0, detail: lineErrors.length === 0 ? `${lines.length} events valid` : lineErrors[0] });
}

const failed = checks.filter((c) => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'TIME02_NO_TIME_FIELDS';

writeMd(path.join(EXEC, 'REGRESSION_EVT02_NO_TIME_FIELDS.md'), [
  '# REGRESSION_EVT02_NO_TIME_FIELDS.md', '',
  `STATUS: ${status}`, `REASON_CODE: ${reason_code}`, `RUN_ID: ${RUN_ID}`, `NEXT_ACTION: ${NEXT_ACTION}`, '',
  '## CHECKS', checks.map((c) => `- [${c.pass ? 'PASS' : 'FAIL'}] ${c.check}: ${c.detail}`).join('\n'), '',
  '## FAILED', failed.length === 0 ? '- NONE' : failed.map((c) => `- ${c.check}: ${c.detail}`).join('\n'),
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'regression_evt02_no_time_fields.json'), {
  schema_version: '1.0.0', gate_id: 'RG_EVT02_NO_TIME_FIELDS',
  status, reason_code, run_id: RUN_ID, next_action: NEXT_ACTION,
  checks, bus_files_checked: busFiles.map((f) => path.relative(ROOT, f)),
  failed_checks: failed.map((c) => c.check),
});

console.log(`[${status}] regression_evt02_no_time_fields — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
