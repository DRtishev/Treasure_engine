import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

// A1+A2: updated to allLiquidation topic + liq_side normalization (v2 schema)
// Bybit: side=Buy → LONG position liquidated; side=Sell → SHORT position liquidated
const fixtureRows = [
  { provider_id: 'bybit_ws_v5', symbol: 'BTCUSDT', side: 'Sell', liq_side: 'SHORT', ts: 1735689600000, p: '43000', v: '12', topic: 'allLiquidation.BTCUSDT' },
  { provider_id: 'bybit_ws_v5', symbol: 'BTCUSDT', side: 'Buy', liq_side: 'LONG', ts: 1735689601000, p: '43010', v: '4', topic: 'allLiquidation.BTCUSDT' },
  { provider_id: 'bybit_ws_v5', symbol: 'ETHUSDT', side: 'Sell', liq_side: 'SHORT', ts: 1735689602000, p: '2400', v: '20', topic: 'allLiquidation.ETHUSDT' },
];
const canon = (v) => Array.isArray(v) ? v.map(canon) : v && typeof v === 'object' ? Object.keys(v).sort((a, b) => a.localeCompare(b)).reduce((o, k) => (o[k] = canon(v[k]), o), {}) : v;
const sha = (x) => crypto.createHash('sha256').update(x).digest('hex');

const runId = 'RG_DATA04_FIXTURE';
const dir = path.join(process.cwd(), 'artifacts/incoming/liquidations/bybit_ws_v5', runId);
fs.mkdirSync(dir, { recursive: true });
const raw = fixtureRows.map((r) => JSON.stringify(r)).join('\n') + '\n';
// liq_side included in normalized rows (Sabotage fix #2: RG_LIQ_LOCK01)
const normalized = { provider_id: 'bybit_ws_v5', schema_version: 'liquidations.bybit_ws_v5.v2', time_unit_sentinel: 'ms', rows: fixtureRows.map((r) => ({ liq_side: r.liq_side, provider_id: r.provider_id, symbol: r.symbol, side: r.side, ts: Number(r.ts), p: String(r.p), v: String(r.v), topic: r.topic || '' })) };
const lock = { provider_id: 'bybit_ws_v5', schema_version: 'liquidations.bybit_ws_v5.v2', time_unit_sentinel: 'ms', raw_capture_sha256: sha(raw), normalized_schema_sha256: sha(JSON.stringify(canon(normalized))), captured_at_utc: 'VOLATILE' };
fs.writeFileSync(path.join(dir, 'raw.jsonl'), raw);
fs.writeFileSync(path.join(dir, 'lock.json'), JSON.stringify(lock, null, 2) + '\n');

function replay() {
  return spawnSync(process.execPath, ['scripts/edge/edge_liq_01_offline_replay.mjs', '--provider', 'bybit_ws_v5', '--run-id', runId], { env: { ...process.env, TREASURE_NET_KILL: '1' }, encoding: 'utf8' });
}
const a = replay();
const b = replay();
const ok = a.status === 0 && b.status === 0 && sha(raw) === lock.raw_capture_sha256;

const EXEC = path.join(process.cwd(), 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });
writeMd(path.join(EXEC, 'REGRESSION_LIQ_FIXTURE_OFFLINE_X2.md'), `# REGRESSION_LIQ_FIXTURE_OFFLINE_X2.md\n\nSTATUS: ${ok ? 'PASS' : 'FAIL'}\nREASON_CODE: ${ok ? 'NONE' : 'RG_DATA04'}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: npm run -s verify:regression:liq-fixture-offline-x2\n\n- replay_a_ec: ${a.status}\n- replay_b_ec: ${b.status}\n- fixture_rows: ${fixtureRows.length}\n- raw_sha256: ${sha(raw)}\n`);
writeJsonDeterministic(path.join(MANUAL, 'regression_liq_fixture_offline_x2.json'), { schema_version: '1.0.0', status: ok ? 'PASS' : 'FAIL', reason_code: ok ? 'NONE' : 'RG_DATA04', run_id: RUN_ID, replay_a_ec: a.status, replay_b_ec: b.status, fixture_rows: fixtureRows.length, raw_sha256: sha(raw) });
console.log(`[${ok ? 'PASS' : 'FAIL'}] regression_liq_fixture_offline_x2 — ${ok ? 'NONE' : 'RG_DATA04'}`);
process.exit(ok ? 0 : 1);
