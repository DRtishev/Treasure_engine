/**
 * net_lock.mjs — ops:net:lock
 *
 * Deletes artifacts/incoming/ALLOW_NETWORK, restoring CERT offline posture.
 *
 * Fail-closed:
 *   - File absent → BLOCKED (NET_UNLOCK01, kind=lock_without_unlock)
 *     (indicates unlock was skipped or bootstrap anomaly)
 *   - File exists with wrong content → BLOCKED (NET_UNLOCK01, kind=tamper_detected)
 *     (indicates tampering between unlock and lock)
 *
 * After successful lock: ALLOW_NETWORK must not exist (verified by RG_NET_UNLOCK02).
 *
 * Normal usage: npm run -s ops:node:toolchain:bootstrap (handles full lifecycle).
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const SCRIPT_DIR = path.resolve(path.dirname(new URL(import.meta.url).pathname));
const ROOT_CANDIDATE = path.resolve(SCRIPT_DIR, '..', '..');
const gitRoot = spawnSync('git', ['-C', ROOT_CANDIDATE, 'rev-parse', '--show-toplevel'], { encoding: 'utf8' });
const ROOT = gitRoot.status === 0 ? String(gitRoot.stdout || '').trim() : ROOT_CANDIDATE;

const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
const ALLOW_FILE = path.join(ROOT, 'artifacts/incoming/ALLOW_NETWORK');
const ALLOW_CONTENT = 'ALLOW_NETWORK: YES';

fs.mkdirSync(MANUAL, { recursive: true });

let status = 'PASS';
let reason_code = 'NONE';
let detail = { kind: 'locked', message: 'ALLOW_NETWORK removed — CERT posture restored', next_action: 'npm run -s verify:fast' };

if (!fs.existsSync(ALLOW_FILE)) {
  status = 'BLOCKED';
  reason_code = 'NET_UNLOCK01';
  detail = {
    kind: 'lock_without_unlock',
    message: 'ALLOW_NETWORK absent — cannot lock (was ops:net:unlock never run?)',
    next_action: 'npm run -s ops:net:unlock',
  };
} else {
  const existing = fs.readFileSync(ALLOW_FILE, 'utf8').trim();
  if (existing !== ALLOW_CONTENT) {
    status = 'BLOCKED';
    reason_code = 'NET_UNLOCK01';
    detail = {
      kind: 'tamper_detected',
      message: `ALLOW_NETWORK content wrong — expected "${ALLOW_CONTENT}" got "${existing.slice(0, 40)}"`,
      next_action: 'npm run -s ops:net:unlock',
    };
  } else {
    fs.unlinkSync(ALLOW_FILE);
  }
}

writeMd(path.join(EXEC, 'NET_LOCK.md'), [
  '# NET_LOCK.md', '',
  `STATUS: ${status}`,
  `REASON_CODE: ${reason_code}`,
  `DETAIL_KIND: ${detail.kind}`,
  `DETAIL_MSG: ${detail.message}`,
  `NEXT_ACTION: ${detail.next_action}`,
  `RUN_ID: ${RUN_ID}`,
  `ALLOW_FILE: ${path.relative(ROOT, ALLOW_FILE)}`,
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'net_lock.json'), {
  schema_version: '1.0.0',
  gate_id: 'RG_NET_LOCK',
  status,
  reason_code,
  detail,
  run_id: RUN_ID,
  allow_file: path.relative(ROOT, ALLOW_FILE),
  file_removed: status === 'PASS',
});

console.log(`[${status}] ops:net:lock — ${reason_code}`);
if (status !== 'PASS') console.log(`  BLOCKED: ${detail.message}`);
process.exit(status === 'PASS' ? 0 : 2);
