import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';

const ROOT = path.resolve(process.cwd());
const REG_DIR = path.join(ROOT, 'reports', 'evidence', 'EDGE_PROFIT_00', 'registry');
const MANUAL_DIR = path.join(REG_DIR, 'gates', 'manual');
const NEXT_ACTION = 'npm run -s epoch:edge:profit:public:00:x2:node22';

fs.mkdirSync(MANUAL_DIR, { recursive: true });
const env = { ...process.env, REAL_PUBLIC_DRY_RUN: '1', ENABLE_NETWORK: '0', PROVIDER_ALLOWLIST: 'binance,bybit,okx,kraken' };
const run1 = spawnSync('bash', ['-lc', 'npm run -s edge:profit:00:acquire:public'], { cwd: ROOT, encoding: 'utf8', env, maxBuffer: 64 * 1024 * 1024 });
const lockPath = path.join(ROOT, 'artifacts', 'incoming', 'real_public_market.lock.json');
const lock = fs.existsSync(lockPath) ? JSON.parse(fs.readFileSync(lockPath, 'utf8')) : null;

let status = 'PASS';
let reasonCode = 'NONE';
let message = 'PublicData lock smoke deterministic in dry-run mode.';
if (!lock || String(lock.reason_code || '') !== 'ACQ02') {
  status = 'BLOCKED';
  reasonCode = 'ME01';
  message = 'Dry-run lock missing or reason_code not ACQ02.';
}

writeMd(path.join(REG_DIR, 'REGRESSION_PUBLIC_PUBLICDATA_LOCK_SMOKE.md'), `# REGRESSION_PUBLIC_PUBLICDATA_LOCK_SMOKE.md\n\nSTATUS: ${status}\nREASON_CODE: ${reasonCode}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${NEXT_ACTION}\n\n- command_ec: ${Number.isInteger(run1.status) ? run1.status : 1}\n- lock_exists: ${Boolean(lock)}\n- lock_reason_code: ${lock?.reason_code || 'MISSING'}\n- lock_net_family: ${lock?.net_family ?? 'MISSING'}\n`);

writeJsonDeterministic(path.join(MANUAL_DIR, 'regression_public_publicdata_lock_smoke.json'), {
  schema_version: '1.0.0',
  status,
  reason_code: reasonCode,
  run_id: RUN_ID,
  message,
  next_action: NEXT_ACTION,
  command_ec: Number.isInteger(run1.status) ? run1.status : 1,
  lock_exists: Boolean(lock),
  lock_reason_code: lock?.reason_code || 'MISSING',
  lock_net_family: lock?.net_family ?? null,
});

console.log(`[${status}] regression_public_publicdata_lock_smoke — ${reasonCode}`);
process.exit(status === 'PASS' ? 0 : 1);
