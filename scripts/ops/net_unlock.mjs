/**
 * net_unlock.mjs — ops:net:unlock
 *
 * Creates artifacts/incoming/ALLOW_NETWORK with exact content "ALLOW_NETWORK: YES".
 * This is the FIRST key of the double-key network unlock for CERT lanes.
 * The SECOND key is the --enable-network flag passed to ops:node:toolchain:acquire.
 *
 * Idempotent: if file exists with correct content → PASS (already unlocked).
 * Fail-closed: if file exists with wrong content → BLOCKED (NET_UNLOCK01, tamper).
 *
 * MUST be followed by ops:net:lock after network operation completes.
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
fs.mkdirSync(path.join(ROOT, 'artifacts/incoming'), { recursive: true });

let status = 'PASS';
let reason_code = 'NONE';
let detail = { kind: 'unlocked', message: 'ALLOW_NETWORK created', next_action: 'npm run -s ops:node:toolchain:acquire -- --enable-network' };

if (fs.existsSync(ALLOW_FILE)) {
  const existing = fs.readFileSync(ALLOW_FILE, 'utf8').trim();
  if (existing !== ALLOW_CONTENT) {
    status = 'BLOCKED';
    reason_code = 'NET_UNLOCK01';
    detail = {
      kind: 'tamper_detected',
      message: `ALLOW_NETWORK exists with wrong content — expected "${ALLOW_CONTENT}" got "${existing.slice(0, 40)}"`,
      next_action: 'npm run -s ops:net:lock',
    };
  } else {
    detail = { kind: 'already_unlocked', message: 'ALLOW_NETWORK already present with correct content', next_action: 'npm run -s ops:node:toolchain:acquire -- --enable-network' };
  }
} else {
  fs.writeFileSync(ALLOW_FILE, ALLOW_CONTENT + '\n', 'utf8');
}

writeMd(path.join(EXEC, 'NET_UNLOCK.md'), [
  '# NET_UNLOCK.md', '',
  `STATUS: ${status}`,
  `REASON_CODE: ${reason_code}`,
  `DETAIL_KIND: ${detail.kind}`,
  `DETAIL_MSG: ${detail.message}`,
  `NEXT_ACTION: ${detail.next_action}`,
  `RUN_ID: ${RUN_ID}`,
  `ALLOW_FILE: ${path.relative(ROOT, ALLOW_FILE)}`,
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'net_unlock.json'), {
  schema_version: '1.0.0',
  gate_id: 'RG_NET_UNLOCK',
  status,
  reason_code,
  detail,
  run_id: RUN_ID,
  allow_file: path.relative(ROOT, ALLOW_FILE),
});

console.log(`[${status}] ops:net:unlock — ${reason_code}`);
if (status !== 'PASS') console.log(`  BLOCKED: ${detail.message}`);
process.exit(status === 'PASS' ? 0 : 2);
