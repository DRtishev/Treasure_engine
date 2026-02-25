import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';

const ROOT = path.resolve(process.cwd());
const OUT = path.join(ROOT, 'artifacts/incoming');
const EVD = path.join(ROOT, 'reports/evidence/EDGE_LIQ_00');
const LOCK = path.join(OUT, 'bybit_liq.lock.json');
const RAW = path.join(OUT, 'bybit_liq.raw.json');
const NEXT_ACTION = 'OFFLINE_REPLAY=1 node scripts/verify/liquidations_smoke_gate.mjs';
fs.mkdirSync(EVD, { recursive: true });

const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const stable = (v) => JSON.stringify(v, Object.keys(v).sort());
if (process.env.OFFLINE_REPLAY !== '1') {
  writeMd(path.join(EVD, 'LIQUIDATIONS_SMOKE_GATE.md'), `# LIQUIDATIONS_SMOKE_GATE.md\n\nSTATUS: FAIL\nREASON_CODE: ACQ_LIQ01\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${NEXT_ACTION}\n`);
  process.exit(1);
}
if (!fs.existsSync(LOCK) || !fs.existsSync(RAW)) {
  writeMd(path.join(EVD, 'LIQUIDATIONS_SMOKE_GATE.md'), `# LIQUIDATIONS_SMOKE_GATE.md\n\nSTATUS: NEEDS_DATA\nREASON_CODE: ACQ_LIQ01\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: node scripts/edge/edge_lab/edge_liq_00_acquire_bybit.mjs\n`);
  process.exit(2);
}
const lock = JSON.parse(fs.readFileSync(LOCK, 'utf8'));
const rawText = fs.readFileSync(RAW, 'utf8');
const parsed = JSON.parse(rawText);
let ok = true;
let reason = 'NONE';
if (sha(rawText) !== lock.raw_capture_sha256) { ok = false; reason = 'DATA_LIQ01'; }
if (ok && sha(stable(parsed)) !== lock.normalized_schema_sha256) { ok = false; reason = 'DATA_LIQ01'; }
if (ok && lock.schema_version !== 'liq.lock.v1') { ok = false; reason = 'ACQ_LIQ03'; }
if (ok && process.env.TREASURE_NET_KILL !== '1') { ok = false; reason = 'ND_LIQ01'; }
writeMd(path.join(EVD, 'LIQUIDATIONS_SMOKE_GATE.md'), `# LIQUIDATIONS_SMOKE_GATE.md\n\nSTATUS: ${ok ? 'PASS' : 'FAIL'}\nREASON_CODE: ${reason}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${NEXT_ACTION}\n\n- offine_replay: ${process.env.OFFLINE_REPLAY}\n- net_kill: ${process.env.TREASURE_NET_KILL || '0'}\n`);
process.exit(ok ? 0 : 1);
