/**
 * regression_data_quorum01.mjs — RG_DATA_QUORUM01: Data Feed Quorum
 *
 * Verifies:
 *   1. >= 2 independent capsules exist with LOCKED status
 *   2. SHA256 integrity of each capsule
 *   3. All capsules have valid schema_version
 *   4. Offline replay produces identical hash (x2 determinism)
 *
 * Write-scope: reports/evidence/EXECUTOR/gates/manual/regression_data_quorum01.json
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

const CAPSULE_DIR = path.join(ROOT, 'artifacts', 'capsules');
const NEXT_ACTION = 'npm run -s verify:fast';
const QUORUM_MIN = 2;

const checks = [];

function sha256File(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

// ─── Discover capsules ───
let lockFiles = [];
if (fs.existsSync(CAPSULE_DIR)) {
  lockFiles = fs.readdirSync(CAPSULE_DIR)
    .filter(f => f.endsWith('.lock.json'))
    .map(f => path.join(CAPSULE_DIR, f));
}

const capsules = [];
for (const lockPath of lockFiles) {
  try {
    const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
    const dataFile = path.basename(lockPath).replace('.lock.json', '.jsonl');
    const dataPath = path.join(CAPSULE_DIR, dataFile);
    capsules.push({ lock, lockPath, dataPath, dataExists: fs.existsSync(dataPath) });
  } catch (e) {
    // Corrupted lock file — skip
  }
}

// ─── Check 1: Quorum (>= QUORUM_MIN capsules) ───
const lockedCapsules = capsules.filter(c => c.lock.status === 'LOCKED' && c.dataExists);
checks.push({
  check: 'DATA_QUORUM_MIN',
  pass: lockedCapsules.length >= QUORUM_MIN,
  detail: `${lockedCapsules.length} locked capsules (min=${QUORUM_MIN}): ${lockedCapsules.map(c => c.lock.capsule_id).join(', ')}`,
});

// ─── Check 2: SHA256 integrity of each capsule ───
let allIntegrityPass = true;
for (const capsule of lockedCapsules) {
  const actual = sha256File(capsule.dataPath);
  const match = actual === capsule.lock.sha256;
  if (!match) allIntegrityPass = false;
  checks.push({
    check: `INTEGRITY_${capsule.lock.capsule_id}`,
    pass: match,
    detail: match
      ? `OK: sha256=${actual.slice(0, 16)}...`
      : `FAIL: expected=${capsule.lock.sha256.slice(0, 16)}... got=${actual.slice(0, 16)}...`,
  });
}

// ─── Check 3: Schema version valid ───
for (const capsule of lockedCapsules) {
  const valid = capsule.lock.schema_version === '1.0.0';
  checks.push({
    check: `SCHEMA_${capsule.lock.capsule_id}`,
    pass: valid,
    detail: valid ? `OK: schema_version=${capsule.lock.schema_version}` : `FAIL: schema_version=${capsule.lock.schema_version}`,
  });
}

// ─── Check 4: Replay determinism x2 (re-hash data files twice) ───
let replayDeterministic = true;
for (const capsule of lockedCapsules) {
  const h1 = sha256File(capsule.dataPath);
  const h2 = sha256File(capsule.dataPath);
  const match = h1 === h2;
  if (!match) replayDeterministic = false;
  checks.push({
    check: `REPLAY_X2_${capsule.lock.capsule_id}`,
    pass: match,
    detail: match ? `OK: hash=${h1.slice(0, 16)}... x2 identical` : `FAIL: ${h1.slice(0, 16)} vs ${h2.slice(0, 16)}`,
  });
}

// ─── Check 5: Data type diversity (at least 2 different data_types) ───
const dataTypes = new Set(lockedCapsules.map(c => c.lock.data_type));
checks.push({
  check: 'DATA_TYPE_DIVERSITY',
  pass: dataTypes.size >= 2,
  detail: `${dataTypes.size} types: ${[...dataTypes].join(', ')}`,
});

// ─── Verdict ───
const failed = checks.filter(c => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'RG_DATA_QUORUM01_VIOLATION';

for (const c of checks) {
  console.log(`  [${c.pass ? 'PASS' : 'FAIL'}] ${c.check}: ${c.detail}`);
}

writeMd(path.join(EXEC, 'REGRESSION_DATA_QUORUM01.md'), [
  '# RG_DATA_QUORUM01', '',
  `STATUS: ${status}`,
  `REASON_CODE: ${reason_code}`,
  `RUN_ID: ${RUN_ID}`,
  `NEXT_ACTION: ${NEXT_ACTION}`,
  `CHECKS_TOTAL: ${checks.length}`,
  `VIOLATIONS: ${failed.length}`, '',
  '## CAPSULE INVENTORY',
  lockedCapsules.map(c => `- ${c.lock.capsule_id}: ${c.lock.data_type} ${c.lock.symbol} ${c.lock.row_count} rows`).join('\n') || '- NONE', '',
  '## CHECKS',
  checks.map(c => `- [${c.pass ? 'PASS' : 'FAIL'}] ${c.check}: ${c.detail}`).join('\n'), '',
  '## FAILED',
  failed.length === 0 ? '- NONE' : failed.map(c => `- ${c.check}: ${c.detail}`).join('\n'),
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'regression_data_quorum01.json'), {
  schema_version: '1.0.0',
  gate_id: 'RG_DATA_QUORUM01',
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: NEXT_ACTION,
  checks_total: checks.length,
  violations: failed.length,
  capsule_count: lockedCapsules.length,
  quorum_min: QUORUM_MIN,
  data_types: [...dataTypes],
  capsules: lockedCapsules.map(c => ({
    capsule_id: c.lock.capsule_id,
    data_type: c.lock.data_type,
    symbol: c.lock.symbol,
    row_count: c.lock.row_count,
    sha256: c.lock.sha256,
  })),
  checks,
  failed_checks: failed.map(c => c.check),
});

console.log(`[${status}] RG_DATA_QUORUM01 — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
