import path from 'node:path';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';

const ROOT = path.resolve(process.cwd());
const REG_DIR = path.join(ROOT, 'reports', 'evidence', 'EDGE_PROFIT_00', 'registry');
const MANUAL_DIR = path.join(REG_DIR, 'gates', 'manual');
const NEXT_ACTION = 'npm run -s epoch:edge:profit:public:00:x2:node22';

fs.mkdirSync(MANUAL_DIR, { recursive: true });

const env = { ...process.env, REAL_PUBLIC_DRY_RUN: '1', ENABLE_NETWORK: '0', PROVIDER_ALLOWLIST: 'binance,bybit,okx,kraken' };
const r = spawnSync('bash', ['-lc', 'npm run -s epoch:edge:profit:public:00:x2:node22'], { cwd: ROOT, encoding: 'utf8', env, maxBuffer: 64 * 1024 * 1024 });
const p = path.join(ROOT, 'reports', 'evidence', 'EXECUTOR', 'gates', 'manual', 'epoch_edge_profit_public_00_x2.json');
const out = fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : { reason_code: 'ME01', status: 'BLOCKED' };

let status = 'PASS';
let reasonCode = 'NONE';
let message = 'Regression OK: ACQ path does not misclassify as ND01.';
if (out.reason_code === 'ND01') {
  status = 'FAIL';
  reasonCode = 'ND01';
  message = 'Regression failure: ACQ dry-run produced ND01.';
} else if (!['ACQ01', 'ACQ02', 'NONE', 'ND_NET01'].includes(String(out.reason_code || ''))) {
  status = 'BLOCKED';
  reasonCode = 'ME01';
  message = `Unexpected reason_code=${out.reason_code || 'UNKNOWN'}`;
}

writeMd(path.join(REG_DIR, 'REGRESSION_PUBLIC_ACQ02_NOT_ND01.md'), `# REGRESSION_PUBLIC_ACQ02_NOT_ND01.md\n\nSTATUS: ${status}\nREASON_CODE: ${reasonCode}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${NEXT_ACTION}\n\n- command_ec: ${Number.isInteger(r.status) ? r.status : 1}\n- x2_status: ${out.status || 'UNKNOWN'}\n- x2_reason_code: ${out.reason_code || 'UNKNOWN'}\n`);

writeJsonDeterministic(path.join(MANUAL_DIR, 'regression_public_acq02_not_nd01.json'), {
  schema_version: '1.0.0',
  status,
  reason_code: reasonCode,
  run_id: RUN_ID,
  message,
  next_action: NEXT_ACTION,
  command_ec: Number.isInteger(r.status) ? r.status : 1,
  x2_status: out.status || 'UNKNOWN',
  x2_reason_code: out.reason_code || 'UNKNOWN',
});

console.log(`[${status}] regression_public_acq02_is_not_nd01 — ${reasonCode}`);
process.exit(status === 'PASS' ? 0 : 1);
