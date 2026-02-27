import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = path.resolve(process.cwd());
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
const NEXT_ACTION = 'npm run -s epoch:victory:seal';
fs.mkdirSync(MANUAL, { recursive: true });

const toolchainBase = path.join(ROOT, 'artifacts/toolchains/node/v22.22.0');
const basename = 'node-v22.22.0-linux-x64';
const lockPath = path.join(toolchainBase, `${basename}.lock.json`);

const run = (cmd, args, env = process.env) => spawnSync(cmd, args, {
  cwd: ROOT,
  encoding: 'utf8',
  env,
  timeout: 900000,
  maxBuffer: 32 * 1024 * 1024,
});

const cmds = [];
if (!fs.existsSync(lockPath)) {
  cmds.push('npm run -s ops:node:toolchain:acquire');
  run('npm', ['run', '-s', 'ops:node:toolchain:acquire']);
}

const head7 = (run('git', ['rev-parse', '--short=7', 'HEAD']).stdout || 'UNKNOWN').trim() || 'UNKNOWN';
const forcedCmd = 'npm run -s epoch:victory:seal';
const slug = 'npm_run_s_epoch_victory_seal';
const epochId = `NODEAUTH_${head7}_${slug}`;
const witnessPath = path.join(ROOT, 'reports/evidence', `EPOCH-NODEAUTH-${RUN_ID}`, 'node_authority', 'BACKEND_WITNESS.json');
const receiptPath = path.join(ROOT, 'reports/evidence', `EPOCH-NODEAUTH-${epochId}`, 'node_authority', 'receipt.json');

cmds.push('bash scripts/ops/node_authority_run.sh node -v');
const wrapped = run('bash', ['scripts/ops/node_authority_run.sh', 'node', '-v'], {
  ...process.env,
  NODEAUTH_FORCE_COMMAND: forcedCmd,
  PATH: '/usr/bin:/bin',
});
const wrappedVersion = `${wrapped.stdout || ''}${wrapped.stderr || ''}`.trim().split(/\r?\n/).filter(Boolean).pop() || 'UNKNOWN';

let selectedBackend = 'MISSING';
if (fs.existsSync(receiptPath)) {
  try {
    selectedBackend = String(JSON.parse(fs.readFileSync(receiptPath, 'utf8')).backend || 'MISSING');
  } catch {
    selectedBackend = 'INVALID';
  }
}

let witness = {};
if (fs.existsSync(witnessPath)) {
  try {
    witness = JSON.parse(fs.readFileSync(witnessPath, 'utf8'));
  } catch {
    witness = { parse_error: true };
  }
}

const checks = {
  wrapped_ec_zero: wrapped.status === 0,
  selected_backend_vendored: selectedBackend === 'VENDORED_NODE22',
  wrapped_node_version_v22220: wrappedVersion === 'v22.22.0',
  witness_lock_present_true: witness.vendored_lock_present === true,
  witness_node_present_true: witness.vendored_node_present === true,
  witness_exec_ok_true: witness.vendored_node_exec_ok === true,
};

const ok = Object.values(checks).every(Boolean);
const status = ok ? 'PASS' : 'BLOCKED';
const reason_code = ok ? 'NONE' : 'RG_NODE_VENDOR01';

writeMd(path.join(EXEC, 'REGRESSION_NODE_VENDOR01.md'), `# REGRESSION_NODE_VENDOR01.md\n\nSTATUS: ${status}\nREASON_CODE: ${reason_code}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${NEXT_ACTION}\n\n## COMMANDS\n${cmds.map((c) => `- ${c}`).join('\n')}\n\n- receipt_path: ${path.relative(ROOT, receiptPath)}\n- witness_path: ${path.relative(ROOT, witnessPath)}\n- wrapped_ec: ${wrapped.status ?? 'NULL'}\n- wrapped_node_version: ${wrappedVersion}\n- selected_backend: ${selectedBackend}\n\n## CHECKS\n${Object.entries(checks).map(([k, v]) => `- ${k}: ${v}`).join('\n')}\n`);

writeJsonDeterministic(path.join(MANUAL, 'regression_node_vendor01.json'), {
  schema_version: '1.0.0',
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: NEXT_ACTION,
  commands: cmds,
  receipt_path: path.relative(ROOT, receiptPath),
  witness_path: path.relative(ROOT, witnessPath),
  wrapped_ec: wrapped.status ?? null,
  wrapped_node_version: wrappedVersion,
  selected_backend: selectedBackend,
  checks,
});

console.log(`[${status}] regression_node_vendor01 — ${reason_code}`);
process.exit(ok ? 0 : 1);
