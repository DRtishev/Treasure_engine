import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { runBounded } from '../executor/spawn_bounded.mjs';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = path.resolve(process.cwd());
const EVD = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EVD, 'gates/manual');
const RUN = 'RG_DATA03_FIXTURE';
const OUT = path.join(ROOT, 'artifacts/incoming/liquidations/bybit_ws_v5', RUN);
const LOCK = path.join(OUT, 'lock.json');
const RAW = path.join(OUT, 'raw.jsonl');
const NEXT_ACTION = 'npm run -s verify:regression:liquidations-offline-replay-no-network';
fs.mkdirSync(MANUAL, { recursive: true });
fs.mkdirSync(OUT, { recursive: true });

const rows = [{ topic:'liquidation.BTCUSDT', type:'snapshot', ts:1735689600000, data:[{S:'Sell', T:1735689600000, s:'BTCUSDT', p:'43000.5', v:'125000'}] }];
const raw = rows.map((r) => JSON.stringify(r)).join('\n') + '\n';
fs.writeFileSync(RAW, raw);
const canon = (v) => Array.isArray(v) ? v.map(canon) : v && typeof v === 'object' ? Object.keys(v).sort((a,b)=>a.localeCompare(b)).reduce((a, k) => (a[k] = canon(v[k]), a), {}) : v;
const normalizeRows = (rowsIn) => rowsIn.map((row) => ({ topic: row.topic, type: row.type, ts: Number(row.ts), data: Array.isArray(row.data) ? row.data.map((item) => ({ S: item.S, T: Number(item.T), s: item.s, p: String(item.p), v: String(item.v) })) : [] }));
const normalized = { provider_id:'bybit_ws_v5', schema_version:'liquidations.bybit_ws_v5.v1', time_unit_sentinel:'ms', rows: normalizeRows(rows) };
fs.writeFileSync(LOCK, JSON.stringify({
  provider_id:'bybit_ws_v5',
  schema_version:'liquidations.bybit_ws_v5.v1',
  time_unit_sentinel:'ms',
  raw_capture_sha256: crypto.createHash('sha256').update(raw).digest('hex'),
  normalized_schema_sha256: crypto.createHash('sha256').update(JSON.stringify(canon(normalized))).digest('hex'),
  captured_at_utc:'VOLATILE',
}, null, 2));

const cmd = `TREASURE_NET_KILL=1 node scripts/edge/edge_liq_01_offline_replay.mjs --run-id ${RUN}`;
const r = runBounded(cmd, { cwd: ROOT, env: process.env, maxBuffer: 8 * 1024 * 1024 });
const ok = r.ec === 0;
const status = ok ? 'PASS' : 'FAIL';
const reason_code = ok ? 'NONE' : 'ND_LIQ01';

writeMd(path.join(EVD, 'REGRESSION_LIQUIDATIONS_OFFLINE_REPLAY_NO_NETWORK.md'), `# REGRESSION_LIQUIDATIONS_OFFLINE_REPLAY_NO_NETWORK.md\n\nSTATUS: ${status}\nREASON_CODE: ${reason_code}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${NEXT_ACTION}\n\n- ec: ${r.ec}\n- cmd: ${cmd}\n`);
writeJsonDeterministic(path.join(MANUAL, 'regression_liquidations_offline_replay_no_network.json'), { schema_version:'1.0.0', status, reason_code, run_id:RUN_ID, next_action:NEXT_ACTION, ec:r.ec, cmd });
console.log(`[${status}] regression_liquidations_offline_replay_no_network — ${reason_code}`);
process.exit(ok ? 0 : 1);
