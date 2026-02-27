import fs from 'node:fs';
import path from 'node:path';
import { runBounded } from '../executor/spawn_bounded.mjs';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = path.resolve(process.cwd());
const EXEC_DIR = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC_DIR, 'gates/manual');
const NEXT_ACTION = 'npm run -s verify:public:data:readiness';
fs.mkdirSync(MANUAL, { recursive: true });

const providers = [
  { id: 'bybit_ws_v5', required: true },
  { id: 'okx_ws_v5', required: false },
  { id: 'binance_forceorder_ws', required: false },
];

function latestRun(providerId) {
  const baseDir = path.join(ROOT, 'artifacts/incoming/liquidations', providerId);
  if (!fs.existsSync(baseDir)) return { baseDir, runId: '', lock: '', raw: '' };
  const runId = fs.readdirSync(baseDir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort((a, b) => a.localeCompare(b)).at(-1) || '';
  return { baseDir, runId, lock: runId ? path.join(baseDir, runId, 'lock.json') : '', raw: runId ? path.join(baseDir, runId, 'raw.jsonl') : '' };
}

const perProvider = providers.map((p) => {
  const lane = latestRun(p.id);
  if (!lane.runId || !fs.existsSync(lane.lock) || !fs.existsSync(lane.raw)) {
    return { provider: p.id, required: p.required, status: p.required ? 'NEEDS_DATA' : 'OPTIONAL_MISSING', reason_code: p.required ? 'RDY01' : 'OPT01', replay_ec: 2, run_id: lane.runId || 'NONE', lock: lane.lock || 'NONE', raw: lane.raw || 'NONE' };
  }
  const cmd = `TREASURE_NET_KILL=1 node scripts/edge/edge_liq_01_offline_replay.mjs --provider ${JSON.stringify(p.id)} --run-id ${JSON.stringify(lane.runId)}`;
  const replay = runBounded(cmd, { cwd: ROOT, env: process.env, maxBuffer: 8 * 1024 * 1024 });
  return { provider: p.id, required: p.required, status: replay.ec === 0 ? 'PASS' : 'FAIL', reason_code: replay.ec === 0 ? 'NONE' : 'RDY02', replay_ec: replay.ec, run_id: lane.runId, lock: lane.lock, raw: lane.raw };
});

const required = perProvider.filter((x) => x.required);
let status = 'PASS';
let reason_code = 'NONE';
if (required.some((x) => x.status === 'NEEDS_DATA')) { status = 'NEEDS_DATA'; reason_code = 'RDY01'; }
else if (required.some((x) => x.status === 'FAIL')) { status = 'FAIL'; reason_code = 'RDY02'; }

writeMd(path.join(EXEC_DIR, 'PUBLIC_DATA_READINESS_SEAL.md'), `# PUBLIC_DATA_READINESS_SEAL.md\n\nSTATUS: ${status}\nREASON_CODE: ${reason_code}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${NEXT_ACTION}\n\n${perProvider.map((p) => `- provider=${p.provider} required=${p.required} status=${p.status} reason_code=${p.reason_code} replay_ec=${p.replay_ec} run_id=${p.run_id}`).join('\n')}\n`);
writeJsonDeterministic(path.join(MANUAL, 'public_data_readiness_seal.json'), { schema_version: '1.0.0', status, reason_code, run_id: RUN_ID, next_action: NEXT_ACTION, providers: perProvider });

console.log(`[${status}] data_readiness_seal — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : status === 'NEEDS_DATA' ? 2 : 1);
