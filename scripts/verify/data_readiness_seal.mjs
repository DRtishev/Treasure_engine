import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { runBounded } from '../executor/spawn_bounded.mjs';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = path.resolve(process.cwd());
const EXEC_DIR = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC_DIR, 'gates/manual');
const NEXT_ACTION = 'npm run -s verify:public:data:readiness';
fs.mkdirSync(MANUAL, { recursive: true });

const provider = process.env.DATA_PROVIDER || 'BYBIT_LIQ';
const registry = {
  BYBIT_LIQ: {
    lock: 'artifacts/incoming/bybit_liq.lock.json',
    raw: 'artifacts/incoming/bybit_liq.raw.json',
    schema: 'liq.lock.v1',
    replay: `OFFLINE_REPLAY=1 TREASURE_NET_KILL=1 node -r ${JSON.stringify(path.join(ROOT, 'scripts/safety/net_kill_preload.cjs'))} scripts/verify/liquidations_smoke_gate.mjs`,
  },
};
const cfg = registry[provider];
let status = 'PASS';
let reason_code = 'NONE';
let replay_ec = 0;
if (!cfg) {
  status = 'FAIL'; reason_code = 'RDY_SCH01';
}
let missing = [];
if (cfg) {
  missing = [cfg.lock, cfg.raw].filter((p) => !fs.existsSync(path.join(ROOT, p)));
  if (missing.length) {
    status = 'NEEDS_DATA'; reason_code = 'RDY01';
  } else {
    const lock = JSON.parse(fs.readFileSync(path.join(ROOT, cfg.lock), 'utf8'));
    const raw = fs.readFileSync(path.join(ROOT, cfg.raw));
    const rawSha = crypto.createHash('sha256').update(raw).digest('hex');
    if (lock.raw_capture_sha256 !== rawSha || lock.schema_version !== cfg.schema) {
      status = 'FAIL'; reason_code = 'RDY02';
    } else {
      const r = runBounded(cfg.replay, { cwd: ROOT, env: process.env, maxBuffer: 8 * 1024 * 1024 });
      replay_ec = r.ec;
      if (r.ec !== 0) { status = 'FAIL'; reason_code = 'RDY_NET01'; }
    }
  }
}

writeMd(path.join(EXEC_DIR, 'PUBLIC_DATA_READINESS_SEAL.md'), `# PUBLIC_DATA_READINESS_SEAL.md\n\nSTATUS: ${status}\nREASON_CODE: ${reason_code}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${NEXT_ACTION}\n\n- provider: ${provider}\n- lock: ${cfg ? cfg.lock : 'UNKNOWN'}\n- raw: ${cfg ? cfg.raw : 'UNKNOWN'}\n- expected_schema_version: ${cfg ? cfg.schema : 'UNKNOWN'}\n${missing.map((m) => `- missing: ${m}`).join('\n') || '- missing: NONE'}\n- replay_ec: ${replay_ec}\n`);
writeJsonDeterministic(path.join(MANUAL, 'public_data_readiness_seal.json'), {
  schema_version: '1.0.0', status, reason_code, run_id: RUN_ID, next_action: NEXT_ACTION,
  provider, lock: cfg ? cfg.lock : 'UNKNOWN', raw: cfg ? cfg.raw : 'UNKNOWN', expected_schema_version: cfg ? cfg.schema : 'UNKNOWN', missing, replay_ec,
});
console.log(`[${status}] data_readiness_seal — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : status === 'NEEDS_DATA' ? 2 : 1);
