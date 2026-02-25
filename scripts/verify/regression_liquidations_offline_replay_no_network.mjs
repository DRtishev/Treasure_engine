import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { runBounded } from '../executor/spawn_bounded.mjs';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = path.resolve(process.cwd());
const EVD = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EVD, 'gates/manual');
const OUT = path.join(ROOT, 'artifacts/incoming');
const LOCK = path.join(OUT, 'bybit_liq.lock.json');
const RAW = path.join(OUT, 'bybit_liq.raw.json');
const NEXT_ACTION = 'npm run -s verify:regression:liquidations-offline-replay-no-network';
fs.mkdirSync(MANUAL, { recursive: true });
fs.mkdirSync(OUT, { recursive: true });

const raw = JSON.stringify({ provider_id:'bybit', schema_version:'liq.v1', time_unit_sentinel:'ms', rows:[{s:'BTCUSDT'}] }, null, 2);
fs.writeFileSync(RAW, raw);
const rawSha = crypto.createHash('sha256').update(raw).digest('hex');
const normSha = crypto.createHash('sha256').update(JSON.stringify(JSON.parse(raw), Object.keys(JSON.parse(raw)).sort())).digest('hex');
fs.writeFileSync(LOCK, JSON.stringify({ schema_version:'liq.lock.v1', provider_id:'bybit', raw_capture_sha256:rawSha, normalized_schema_sha256:normSha, time_unit_sentinel:'ms', captured_at_utc:'VOLATILE' }, null, 2));

const preloadPath = path.join(ROOT, 'scripts', 'safety', 'net_kill_preload.cjs');
const cmd = `OFFLINE_REPLAY=1 TREASURE_NET_KILL=1 node -r ${JSON.stringify(preloadPath)} scripts/verify/liquidations_smoke_gate.mjs`;
const r = runBounded(cmd, { cwd: ROOT, env: process.env, maxBuffer: 8 * 1024 * 1024 });
const ok = r.ec === 0 && !/NETV01/.test(`${r.stdout}\n${r.stderr}`);
const status = ok ? 'PASS' : 'FAIL';
const reason_code = ok ? 'NONE' : 'ND_LIQ01';

writeMd(path.join(EVD, 'REGRESSION_LIQUIDATIONS_OFFLINE_REPLAY_NO_NETWORK.md'), `# REGRESSION_LIQUIDATIONS_OFFLINE_REPLAY_NO_NETWORK.md\n\nSTATUS: ${status}\nREASON_CODE: ${reason_code}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${NEXT_ACTION}\n\n- ec: ${r.ec}\n- cmd: ${cmd}\n`);
writeJsonDeterministic(path.join(MANUAL, 'regression_liquidations_offline_replay_no_network.json'), { schema_version:'1.0.0', status, reason_code, run_id:RUN_ID, next_action:NEXT_ACTION, ec:r.ec, cmd });
console.log(`[${status}] regression_liquidations_offline_replay_no_network — ${reason_code}`);
process.exit(ok ? 0 : 1);
