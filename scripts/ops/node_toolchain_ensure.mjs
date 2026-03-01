/**
 * node_toolchain_ensure.mjs — ops:node:toolchain:ensure
 *
 * Offline-only vendored toolchain check.
 * - Verifies lock file presence and schema
 * - Verifies node binary exists and is executable
 * - Asserts vendored node -v == v22.22.0
 * - Writes deterministic receipts (no download, no curl, no network)
 *
 * SSOT reason_code classification:
 *   ACQ_LOCK01 — lock file missing or lock schema invalid
 *   NT02       — lock ok, but binary missing / not-executable / wrong version
 *   NONE       — toolchain ready
 *
 * NETV01 is NEVER used here. NETV01 is reserved for forbidden network in CERT lanes.
 * Bootstrap one-liner: npm run -s ops:node:toolchain:bootstrap
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
const BOOTSTRAP_CMD = 'npm run -s ops:node:toolchain:bootstrap';

fs.mkdirSync(MANUAL, { recursive: true });

let status = 'PASS';
let reason_code = 'NONE';
let detail = { kind: 'ready', message: 'toolchain ready', next_action: 'npm run -s verify:fast' };
let nodeRuntime = 'UNKNOWN';

// Step 1: lock file present?
if (!fs.existsSync(LOCK_PATH)) {
  status = 'BLOCKED';
  reason_code = 'ACQ_LOCK01';
  detail = {
    kind: 'lock_missing',
    message: 'toolchain lock file absent — run bootstrap to acquire vendored node',
    next_action: BOOTSTRAP_CMD,
  };
}

// Step 2: lock parseable and schema valid?
if (status === 'PASS') {
  let lock;
  try {
    lock = JSON.parse(fs.readFileSync(LOCK_PATH, 'utf8'));
  } catch (e) {
    status = 'BLOCKED';
    reason_code = 'ACQ_LOCK01';
    detail = {
      kind: 'lock_parse_error',
      message: `lock.json unreadable: ${e.message}`,
      next_action: BOOTSTRAP_CMD,
    };
  }

  if (status === 'PASS' && lock) {
    if (lock.status !== 'READY') {
      status = 'BLOCKED';
      reason_code = 'ACQ_LOCK01';
      detail = {
        kind: 'lock_status_not_ready',
        message: `lock.status=${lock.status} expected READY`,
        next_action: BOOTSTRAP_CMD,
      };
    } else if (lock.node_version !== '22.22.0') {
      status = 'BLOCKED';
      reason_code = 'ACQ_LOCK01';
      detail = {
        kind: 'lock_version_mismatch',
        message: `lock.node_version=${lock.node_version} expected 22.22.0`,
        next_action: BOOTSTRAP_CMD,
      };
    }
  }
}

// Step 3: binary present? (lock must be OK to reach here)
if (status === 'PASS') {
  if (!fs.existsSync(NODE_BIN)) {
    status = 'BLOCKED';
    reason_code = 'NT02';
    detail = {
      kind: 'toolchain_binary_missing',
      message: `node binary absent at ${path.relative(ROOT, NODE_BIN)}`,
      next_action: BOOTSTRAP_CMD,
    };
  }
}

// Step 4: binary executable?
if (status === 'PASS') {
  try {
    fs.accessSync(NODE_BIN, fs.constants.X_OK);
  } catch {
    status = 'BLOCKED';
    reason_code = 'NT02';
    detail = {
      kind: 'toolchain_not_executable',
      message: `node binary not executable: ${path.relative(ROOT, NODE_BIN)}`,
      next_action: BOOTSTRAP_CMD,
    };
  }
}

// Step 5: binary returns correct version?
if (status === 'PASS') {
  const r = spawnSync(NODE_BIN, ['-v'], { encoding: 'utf8' });
  nodeRuntime = (r.stdout || '').trim() || 'UNKNOWN';
  if (r.status !== 0 || nodeRuntime !== EXPECTED_VERSION) {
    status = 'BLOCKED';
    reason_code = 'NT02';
    detail = {
      kind: 'toolchain_wrong_version',
      message: `node -v returned ${nodeRuntime} expected ${EXPECTED_VERSION}`,
      next_action: BOOTSTRAP_CMD,
    };
  }
}

writeMd(path.join(EXEC, 'NODE_TOOLCHAIN_ENSURE.md'), [
  '# NODE_TOOLCHAIN_ENSURE.md', '',
  `STATUS: ${status}`,
  `REASON_CODE: ${reason_code}`,
  `DETAIL_KIND: ${detail.kind}`,
  `DETAIL_MSG: ${detail.message}`,
  `NEXT_ACTION: ${detail.next_action}`,
  `RUN_ID: ${RUN_ID}`, '',
  `- lock_path: ${LOCK_PATH}`,
  `- node_bin: ${NODE_BIN}`,
  `- node_runtime: ${nodeRuntime}`,
  `- expected_version: ${EXPECTED_VERSION}`,
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'node_toolchain_ensure.json'), {
  schema_version: '1.0.0',
  gate_id: 'RG_NET_TOOLCHAIN01',
  status,
  reason_code,
  detail,
  run_id: RUN_ID,
  node_bin: path.relative(ROOT, NODE_BIN),
  node_runtime: nodeRuntime,
  expected_version: EXPECTED_VERSION,
  network_used: false,
});

console.log(`[${status}] node_toolchain_ensure — ${reason_code}`);
if (status !== 'PASS') console.log(`  NEXT: ${detail.next_action}`);
process.exit(status === 'PASS' ? 0 : 2);
