import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'node22-toolchain-'));
const base = path.join(tmp, 'v22.22.0');
const nodeDir = path.join(base, 'linux-x64/node-v22.22.0-linux-x64/bin');
fs.mkdirSync(nodeDir, { recursive: true });
const fakeNode = path.join(nodeDir, 'node');
fs.writeFileSync(fakeNode, '#!/usr/bin/env bash\necho v22.22.0\n');
fs.chmodSync(fakeNode, 0o755);

const runWrapper = () => spawnSync('/bin/bash', ['scripts/ops/node_authority_run.sh', '/bin/true'], {
  cwd: ROOT,
  encoding: 'utf8',
  env: { ...process.env, NODE22_TOOLCHAIN_DIR: base, PATH: '/usr/bin:/bin' },
});

const first = runWrapper();
const receiptPath = path.join(ROOT, 'reports/evidence/EXECUTOR/gates/manual/node_authority_receipt.json');
const firstReceipt = fs.existsSync(receiptPath) ? fs.readFileSync(receiptPath, 'utf8') : '';

const lockPath = path.join(base, 'node-v22.22.0-linux-x64.lock.json');
fs.writeFileSync(lockPath, '{"status":"READY"}\n');

const second = runWrapper();
const secondReceipt = fs.existsSync(receiptPath) ? fs.readFileSync(receiptPath, 'utf8') : '';

const offenders = [];
if (first.status !== 2) offenders.push(`missing_lock_exit_${first.status}`);
if (!firstReceipt.includes('"backend":"NO_NODE22_BACKEND"')) offenders.push('missing_lock_backend_mismatch');
if (second.status !== 0) offenders.push(`with_lock_exit_${second.status}`);
if (!secondReceipt.includes('"backend":"VENDORED_NODE22"')) offenders.push('with_lock_backend_mismatch');

fs.rmSync(tmp, { recursive: true, force: true });

const ok = offenders.length === 0;
const status = ok ? 'PASS' : 'BLOCKED';
const reason = ok ? 'NONE' : 'RG_NODE_TOOLCHAIN_LOCK01';

writeMd(path.join(EXEC, 'REGRESSION_NODE_TOOLCHAIN_LOCK_CONTRACT.md'), `# REGRESSION_NODE_TOOLCHAIN_LOCK_CONTRACT.md\n\nSTATUS: ${status}\nREASON_CODE: ${reason}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: npm run -s epoch:victory:seal\n\n- offenders: ${offenders.length ? offenders.join(',') : '[]'}\n`);
writeJsonDeterministic(path.join(MANUAL, 'regression_node_toolchain_lock_contract.json'), {
  schema_version: '1.0.0',
  status,
  reason_code: reason,
  run_id: RUN_ID,
  offenders,
});

console.log(`[${status}] regression_node_toolchain_lock_contract — ${reason}`);
process.exit(ok ? 0 : 2);
