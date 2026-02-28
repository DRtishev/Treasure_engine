/**
 * node_toolchain_ensure.mjs — ops:node:toolchain:ensure
 *
 * Offline-only vendored toolchain check.
 * - Verifies lock file presence and schema
 * - Verifies node binary exists and is executable
 * - Asserts vendored node -v == v22.22.0
 * - Writes deterministic receipts (no download, no curl, no network)
 *
 * Sabotage fix: RG_NET_TOOLCHAIN01_NO_NET_IN_VERIFY_FAST
 * If toolchain not present => EC=2 NETV01 (needs acquire, not auto-download).
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
const TOOLCHAIN_DIR = path.join(ROOT, 'artifacts/toolchains/node/v22.22.0');
const PLATFORM = 'linux-x64';
const BASENAME = `node-v22.22.0-${PLATFORM}`;
const LOCK_PATH = path.join(TOOLCHAIN_DIR, `${BASENAME}.lock.json`);
const NODE_BIN = path.join(TOOLCHAIN_DIR, PLATFORM, BASENAME, 'bin', 'node');
const EXPECTED_VERSION = 'v22.22.0';

fs.mkdirSync(MANUAL, { recursive: true });

let status = 'PASS';
let reason = 'NONE';
let nodeRuntime = 'UNKNOWN';

// No network allowed — fail-closed if toolchain not present
if (!fs.existsSync(LOCK_PATH)) {
  status = 'BLOCKED';
  reason = 'NETV01: lock file missing — run ops:node:toolchain:acquire with double-key unlock';
} else if (!fs.existsSync(NODE_BIN)) {
  status = 'BLOCKED';
  reason = 'NETV01: node binary missing — run ops:node:toolchain:acquire with double-key unlock';
} else {
  // Verify lock schema
  let lock;
  try {
    lock = JSON.parse(fs.readFileSync(LOCK_PATH, 'utf8'));
  } catch (e) {
    status = 'BLOCKED';
    reason = `ACQ_LOCK01: lock.json parse error — ${e.message}`;
  }

  if (status === 'PASS') {
    if (lock.status !== 'READY') {
      status = 'BLOCKED';
      reason = `ACQ_LOCK01: lock.status=${lock.status} expected READY`;
    } else if (lock.node_version !== '22.22.0') {
      status = 'BLOCKED';
      reason = `ACQ_LOCK01: lock.node_version=${lock.node_version} expected 22.22.0`;
    } else {
      // Verify binary runs and returns correct version
      const r = spawnSync(NODE_BIN, ['-v'], { encoding: 'utf8' });
      nodeRuntime = (r.stdout || '').trim() || 'UNKNOWN';
      if (r.status !== 0 || nodeRuntime !== EXPECTED_VERSION) {
        status = 'BLOCKED';
        reason = `ACQ_LOCK01: node runtime=${nodeRuntime} expected ${EXPECTED_VERSION}`;
      }
    }
  }
}

writeMd(path.join(EXEC, 'NODE_TOOLCHAIN_ENSURE.md'), [
  '# NODE_TOOLCHAIN_ENSURE.md', '',
  `STATUS: ${status}`,
  `REASON_CODE: ${reason}`,
  `RUN_ID: ${RUN_ID}`,
  `NEXT_ACTION: npm run -s verify:fast`, '',
  `- lock_path: ${LOCK_PATH}`,
  `- node_bin: ${NODE_BIN}`,
  `- node_runtime: ${nodeRuntime}`,
  `- expected_version: ${EXPECTED_VERSION}`,
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'node_toolchain_ensure.json'), {
  schema_version: '1.0.0',
  gate_id: 'RG_NET_TOOLCHAIN01',
  status,
  reason_code: reason,
  run_id: RUN_ID,
  node_bin: path.relative(ROOT, NODE_BIN),
  node_runtime: nodeRuntime,
  expected_version: EXPECTED_VERSION,
  network_used: false,
});

console.log(`[${status}] node_toolchain_ensure — ${reason}`);
process.exit(status === 'PASS' ? 0 : 2);
