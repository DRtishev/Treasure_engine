import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';
import { RUN_ID, writeMd, stableEvidenceNormalize } from '../edge/edge_lab/canon.mjs';

const ROOT = path.resolve(process.cwd());
const EXEC_DIR = path.join(ROOT, 'reports', 'evidence', 'EXECUTOR');
const MANUAL_DIR = path.join(EXEC_DIR, 'gates', 'manual');
const OUT_MD = path.join(EXEC_DIR, 'EPOCH_EDGE_PROFIT_PUBLIC_00_X2.md');
const OUT_JSON = path.join(MANUAL_DIR, 'epoch_edge_profit_public_00_x2.json');
const NEXT_ACTION = 'npm run -s epoch:edge:profit:public:00:x2';
const LOCK_PATH = path.join(ROOT, 'artifacts', 'incoming', 'real_public_market.lock.md');

fs.mkdirSync(MANUAL_DIR, { recursive: true });

function runEpoch(runIndex) {
  const lockExists = fs.existsSync(LOCK_PATH);
  const env = {
    ...process.env,
    ACQUIRE_IF_MISSING: '1',
    ENABLE_NETWORK: runIndex === 1 && !lockExists ? '1' : (process.env.ENABLE_NETWORK || '0'),
    PROVIDER_ALLOWLIST: process.env.PROVIDER_ALLOWLIST || 'binance,bybit,okx,kraken',
  };
  const mode = runIndex === 1 && !lockExists ? 'NETWORK' : 'LOCK_FIRST';
  const wrapped = 'source ~/.nvm/nvm.sh && nvm install 22.22.0 && nvm use 22.22.0 >/dev/null && npm run -s epoch:edge:profit:public:00';
  const r = spawnSync('bash', ['-lc', wrapped], { cwd: ROOT, encoding: 'utf8', env, maxBuffer: 64 * 1024 * 1024 });
  return { ec: Number.isInteger(r.status) ? r.status : 1, mode };
}

function sha256(s) { return crypto.createHash('sha256').update(s).digest('hex'); }
function normFile(rel) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) return null;
  return sha256(stableEvidenceNormalize(fs.readFileSync(abs, 'utf8'), { assertD005: false }));
}

const targets = [
  'reports/evidence/EXECUTOR/EPOCH_EDGE_PROFIT_PUBLIC_00.md',
  'reports/evidence/EDGE_PROFIT_00/public/EDGE_PROFIT_00_CLOSEOUT.md',
  'reports/evidence/EDGE_PROFIT_00/public/EXPECTANCY_PROOF.md',
  'reports/evidence/EDGE_PROFIT_00/public/PBO_CPCV.md',
  'reports/evidence/EDGE_PROFIT_00/public/RISK_MCDD.md',
  'reports/evidence/EDGE_PROFIT_00/registry/REGRESSION_NO_NET_VERIFY.md',
];

function fingerprint() {
  const parts = [];
  for (const rel of targets) {
    const h = normFile(rel);
    if (!h) return { ok: false, missing: rel, aggregate: null, parts: [] };
    parts.push({ path: rel, sha256_norm: h });
  }
  return { ok: true, missing: '', parts, aggregate: sha256(parts.map((p) => `${p.path}:${p.sha256_norm}`).join('\n')) };
}

const r1 = runEpoch(1);
const f1 = r1.ec === 0 ? fingerprint() : { ok: false, missing: 'run1', aggregate: null, parts: [] };
const r2 = runEpoch(2);
const f2 = r2.ec === 0 ? fingerprint() : { ok: false, missing: 'run2', aggregate: null, parts: [] };

let status = 'PASS';
let reasonCode = 'NONE';
let message = 'Public epoch x2 deterministic fingerprint match.';
if (r1.ec !== 0 || r2.ec !== 0) {
  status = 'FAIL';
  reasonCode = 'ND01';
  message = 'epoch:edge:profit:public:00 failed in one or both runs.';
} else if (!f1.ok || !f2.ok) {
  status = 'FAIL';
  reasonCode = 'ND01';
  message = `Missing fingerprint input: ${f1.missing || f2.missing}`;
} else if (f1.aggregate !== f2.aggregate) {
  status = 'FAIL';
  reasonCode = 'ND01';
  message = 'Determinism mismatch between x2 runs.';
}

writeMd(OUT_MD, `# EPOCH_EDGE_PROFIT_PUBLIC_00_X2.md\n\nSTATUS: ${status}\nREASON_CODE: ${reasonCode}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${NEXT_ACTION}\n\n- run_1_ec: ${r1.ec}\n- run_2_ec: ${r2.ec}\n- run_1_acquire_mode: ${r1.mode}\n- run_2_acquire_mode: ${r2.mode}\n- aggregate_run_1: ${f1.aggregate || 'MISSING'}\n- aggregate_run_2: ${f2.aggregate || 'MISSING'}\n`);

writeJsonDeterministic(OUT_JSON, {
  schema_version: '1.0.0', status, reason_code: reasonCode, run_id: RUN_ID, message, next_action: NEXT_ACTION,
  run_1_ec: r1.ec, run_2_ec: r2.ec, run_1_acquire_mode: r1.mode, run_2_acquire_mode: r2.mode,
  aggregate_run_1: f1.aggregate, aggregate_run_2: f2.aggregate, inputs_run_1: f1.parts, inputs_run_2: f2.parts,
});

console.log(`[${status}] executor_epoch_edge_profit_public_00_x2 — ${reasonCode}`);
process.exit(status === 'PASS' ? 0 : 1);
