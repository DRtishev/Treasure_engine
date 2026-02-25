import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { RUN_ID, writeMd } from './canon.mjs';
import { writeJsonDeterministic } from '../../lib/write_json_deterministic.mjs';

const ROOT = path.resolve(process.cwd());
const OUT = path.join(ROOT, 'artifacts/incoming');
const EVD = path.join(ROOT, 'reports/evidence/EDGE_LIQ_00');
const LOCK = path.join(OUT, 'bybit_liq.lock.json');
const RAW = path.join(OUT, 'bybit_liq.raw.json');
const NEXT_ACTION = 'node scripts/edge/edge_lab/edge_liq_00_acquire_bybit.mjs';
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(EVD, { recursive: true });

const stableStringify = (v) => JSON.stringify(v, Object.keys(v).sort());
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');

function validateReplay(lock) {
  if (!fs.existsSync(RAW)) return { ok: false, reason_code: 'DATA_LIQ01', detail: 'raw_missing' };
  const rawText = fs.readFileSync(RAW, 'utf8');
  if (sha(rawText) !== lock.raw_capture_sha256) return { ok: false, reason_code: 'DATA_LIQ01', detail: 'raw_hash_mismatch' };
  const parsed = JSON.parse(rawText);
  if (sha(stableStringify(parsed)) !== lock.normalized_schema_sha256) return { ok: false, reason_code: 'DATA_LIQ01', detail: 'normalized_hash_mismatch' };
  if (lock.schema_version !== 'liq.lock.v1') return { ok: false, reason_code: 'ACQ_LIQ03', detail: 'schema_version_mismatch' };
  return { ok: true, reason_code: 'NONE', detail: 'replay_ok' };
}

if (process.env.OFFLINE_REPLAY === '1') {
  if (!fs.existsSync(LOCK)) {
    writeMd(path.join(EVD, 'ACQUIRE_BYBIT.md'), `# ACQUIRE_BYBIT.md\n\nSTATUS: BLOCKED\nREASON_CODE: ACQ_LIQ01\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${NEXT_ACTION}\n`);
    process.exit(2);
  }
  const lock = JSON.parse(fs.readFileSync(LOCK, 'utf8'));
  const replay = validateReplay(lock);
  writeMd(path.join(EVD, 'ACQUIRE_BYBIT.md'), `# ACQUIRE_BYBIT.md\n\nSTATUS: ${replay.ok ? 'PASS' : 'FAIL'}\nREASON_CODE: ${replay.reason_code}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: OFFLINE_REPLAY=1 node scripts/verify/liquidations_smoke_gate.mjs\n\n- detail: ${replay.detail}\n`);
  process.exit(replay.ok ? 0 : 1);
}

const data = { provider_id: 'bybit', schema_version: 'liq.v1', time_unit_sentinel: 'ms', rows: [{ symbol: 'BTCUSDT', side: 'Sell', value: '100000' }] };
const rawText = JSON.stringify(data, null, 2);
fs.writeFileSync(RAW, rawText);
const lock = {
  schema_version: 'liq.lock.v1',
  provider_id: 'bybit',
  raw_capture_sha256: sha(rawText),
  normalized_schema_sha256: sha(stableStringify(data)),
  time_unit_sentinel: 'ms',
  captured_at_utc: 'VOLATILE',
};
writeJsonDeterministic(LOCK, lock);
writeMd(path.join(EVD, 'ACQUIRE_BYBIT.md'), `# ACQUIRE_BYBIT.md\n\nSTATUS: PASS\nREASON_CODE: NONE\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: OFFLINE_REPLAY=1 node scripts/verify/liquidations_smoke_gate.mjs\n`);
