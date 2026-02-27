import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

const runId = 'RG_VRD01_FIXTURE';
const dir = path.join(ROOT, 'artifacts/incoming/liquidations/bybit_ws_v5', runId);
fs.mkdirSync(dir, { recursive: true });
const rows = [{ provider_id: 'bybit_ws_v5', symbol: 'BTCUSDT', side: 'Sell', ts: 1735689600000, p: '43000', v: '3', topic: 'liquidation.BTCUSDT' }];
const raw = rows.map((r) => JSON.stringify(r)).join('\n') + '\n';
const canon = (v) => Array.isArray(v) ? v.map(canon) : v && typeof v === 'object' ? Object.keys(v).sort((a,b)=>a.localeCompare(b)).reduce((o,k)=>(o[k]=canon(v[k]),o),{}) : v;
const sha = (x) => crypto.createHash('sha256').update(x).digest('hex');
const lock = { provider_id: 'bybit_ws_v5', schema_version: 'liquidations.bybit_ws_v5.v1', time_unit_sentinel: 'ms', raw_capture_sha256: sha(raw), normalized_schema_sha256: sha(JSON.stringify(canon({ provider_id: 'bybit_ws_v5', schema_version: 'liquidations.bybit_ws_v5.v1', time_unit_sentinel: 'ms', rows }))), captured_at_utc: 'VOLATILE' };
fs.writeFileSync(path.join(dir, 'raw.jsonl'), raw);
fs.writeFileSync(path.join(dir, 'lock.json'), JSON.stringify(lock, null, 2) + '\n');

const readRun = spawnSync('npm', ['run', '-s', 'verify:public:data:readiness'], { cwd: ROOT, encoding: 'utf8' });
let readiness = { status: 'UNKNOWN', reason_code: 'UNKNOWN' };
try { readiness = JSON.parse(fs.readFileSync(path.join(MANUAL, 'public_data_readiness_seal.json'), 'utf8')); } catch {}
const victory = spawnSync('npm', ['run', '-s', 'epoch:victory:seal'], { cwd: ROOT, encoding: 'utf8' });
let seal = { reason_code: 'UNKNOWN', status: 'UNKNOWN' };
try { seal = JSON.parse(fs.readFileSync(path.join(MANUAL, 'victory_seal.json'), 'utf8')); } catch {}

const readinessPass = readiness.status === 'PASS';
const coherent = !readinessPass || seal.reason_code !== 'RDY01';
const ok = readRun.status === 0 && coherent;
const status = ok ? 'PASS' : 'FAIL';
const reason_code = ok ? 'NONE' : 'RG_VRD01';

writeMd(path.join(EXEC, 'REGRESSION_VICTORY_READINESS_COHERENCE.md'), `# REGRESSION_VICTORY_READINESS_COHERENCE.md\n\nSTATUS: ${status}\nREASON_CODE: ${reason_code}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: npm run -s verify:regression:victory-readiness-coherence\n\n- readiness_status: ${readiness.status}\n- readiness_reason_code: ${readiness.reason_code}\n- victory_status: ${seal.status}\n- victory_reason_code: ${seal.reason_code}\n- coherent_no_rdy01_when_readiness_pass: ${coherent}\n- victory_ec: ${victory.status}\n`);
writeJsonDeterministic(path.join(MANUAL, 'regression_victory_readiness_coherence.json'), { schema_version: '1.0.0', status, reason_code, run_id: RUN_ID, readiness_status: readiness.status, readiness_reason_code: readiness.reason_code, victory_status: seal.status, victory_reason_code: seal.reason_code, coherent_no_rdy01_when_readiness_pass: coherent, victory_ec: victory.status });
console.log(`[${status}] regression_victory_readiness_coherence — ${reason_code}`);
process.exit(ok ? 0 : 1);
