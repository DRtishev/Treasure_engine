/**
 * node_toolchain_acquire.mjs — ops:node:toolchain:acquire
 *
 * Downloads and installs the vendored node toolchain from nodejs.org.
 * REQUIRES double-key unlock to use network:
 *   1. Flag --enable-network passed to this command
 *   2. File artifacts/incoming/ALLOW_NETWORK with content: ALLOW_NETWORK: YES
 *
 * If either key is missing => EC=2 NETV01 (fail-closed).
 * For offline toolchain verification, use: ops:node:toolchain:ensure
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
const ARCHIVE = `${BASENAME}.tar.xz`;
const BASE_URL = 'https://nodejs.org/dist/v22.22.0';
const ARCHIVE_URL = `${BASE_URL}/${ARCHIVE}`;
const SHAS_URL = `${BASE_URL}/SHASUMS256.txt`;
const ARCHIVE_PATH = path.join(TOOLCHAIN_DIR, ARCHIVE);
const SHAS_PATH = path.join(TOOLCHAIN_DIR, 'SHASUMS256.txt');
const EXTRACT_ROOT = path.join(TOOLCHAIN_DIR, PLATFORM);
const NODE_BIN = path.join(EXTRACT_ROOT, BASENAME, 'bin', 'node');
const LOCK_PATH = path.join(TOOLCHAIN_DIR, `${BASENAME}.lock.json`);
const ALLOW_NETWORK_FILE = path.join(ROOT, 'artifacts/incoming/ALLOW_NETWORK');

fs.mkdirSync(MANUAL, { recursive: true });
fs.mkdirSync(TOOLCHAIN_DIR, { recursive: true });

const run = (cmd, args) => spawnSync(cmd, args, { cwd: ROOT, encoding: 'utf8' });

let status = 'PASS';
let reason = 'NONE';
let expectedSha = 'UNKNOWN';
let actualSha = 'UNKNOWN';
let nodeRuntime = 'UNKNOWN';

// Double-key unlock check — fail-closed (Sabotage fix #1: ACQ_NET01)
const hasFlag = process.argv.includes('--enable-network');
const hasFile = fs.existsSync(ALLOW_NETWORK_FILE) &&
  fs.readFileSync(ALLOW_NETWORK_FILE, 'utf8').trim() === 'ALLOW_NETWORK: YES';

if (!hasFlag || !hasFile) {
  status = 'BLOCKED';
  reason = `ACQ_NET01: double-key unlock required (flag --enable-network=${hasFlag} + file ALLOW_NETWORK=${hasFile})`;
} else {
  try {
    let r = run('curl', ['-fsSL', SHAS_URL, '-o', SHAS_PATH]);
    if (r.status !== 0) throw new Error('FETCH_SHAS_FAIL');

    const shas = fs.readFileSync(SHAS_PATH, 'utf8');
    const line = shas.split('\n').find((x) => x.trim().endsWith(` ${ARCHIVE}`));
    if (!line) throw new Error('SHA_MISSING');
    expectedSha = line.trim().split(/\s+/)[0];

    r = run('curl', ['-fsSL', ARCHIVE_URL, '-o', ARCHIVE_PATH]);
    if (r.status !== 0) throw new Error('FETCH_ARCHIVE_FAIL');

    r = run('sha256sum', [ARCHIVE_PATH]);
    if (r.status !== 0) throw new Error('SHA256SUM_FAIL');
    actualSha = (r.stdout || '').trim().split(/\s+/)[0] || 'UNKNOWN';
    if (actualSha !== expectedSha) throw new Error('SHA_MISMATCH');

    fs.mkdirSync(EXTRACT_ROOT, { recursive: true });
    r = run('tar', ['-xJf', ARCHIVE_PATH, '-C', EXTRACT_ROOT]);
    if (r.status !== 0) throw new Error('TAR_FAIL');

    if (!fs.existsSync(NODE_BIN)) throw new Error('NODE_BIN_MISSING');
    fs.chmodSync(NODE_BIN, 0o755);
    fs.accessSync(NODE_BIN, fs.constants.X_OK);
    r = spawnSync(NODE_BIN, ['-v'], { encoding: 'utf8' });
    nodeRuntime = (r.stdout || '').trim() || 'UNKNOWN';
    if (r.status !== 0 || nodeRuntime !== 'v22.22.0') throw new Error('NODE_RUNTIME_MISMATCH');

    writeJsonDeterministic(LOCK_PATH, {
      schema_version: '1.0.0',
      status: 'READY',
      node_version: '22.22.0',
      platform: PLATFORM,
      archive: ARCHIVE,
      sha256_expected: expectedSha,
      sha256_actual: actualSha,
      node_runtime: nodeRuntime,
      run_id: RUN_ID,
    });
  } catch (e) {
    status = 'BLOCKED';
    reason = String(e.message || e);
  }
}

writeMd(path.join(EXEC, 'NODE_TOOLCHAIN_ACQUIRE.md'), [
  '# NODE_TOOLCHAIN_ACQUIRE.md', '',
  `STATUS: ${status}`,
  `REASON_CODE: ${reason}`,
  `RUN_ID: ${RUN_ID}`,
  `NEXT_ACTION: npm run -s epoch:victory:seal`, '',
  `- archive_url: ${ARCHIVE_URL}`,
  `- archive_path: ${ARCHIVE_PATH}`,
  `- lock_path: ${LOCK_PATH}`,
  `- sha256_expected: ${expectedSha}`,
  `- sha256_actual: ${actualSha}`,
  `- node_runtime: ${nodeRuntime}`,
  `- enable_network_flag: ${hasFlag}`,
  `- allow_network_file: ${hasFile}`,
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'node_toolchain_acquire.json'), {
  schema_version: '1.0.0',
  status,
  reason_code: reason,
  run_id: RUN_ID,
  archive_url: ARCHIVE_URL,
  archive_path: path.relative(ROOT, ARCHIVE_PATH),
  lock_path: path.relative(ROOT, LOCK_PATH),
  sha256_expected: expectedSha,
  sha256_actual: actualSha,
  node_runtime: nodeRuntime,
  enable_network_flag: hasFlag,
  allow_network_file: hasFile,
});

console.log(`[${status}] node_toolchain_acquire — ${reason}`);
process.exit(status === 'PASS' ? 0 : 2);
