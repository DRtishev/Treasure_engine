import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';

const ROOT = path.resolve(process.cwd());
const INCOMING = path.join(ROOT, 'artifacts', 'incoming');
const REG_DIR = path.join(ROOT, 'reports', 'evidence', 'EDGE_PROFIT_00', 'registry');
const MANUAL_DIR = path.join(REG_DIR, 'gates', 'manual');
const NEXT_ACTION = 'npm run -s epoch:edge:profit:public:00:x2:node22';

fs.mkdirSync(INCOMING, { recursive: true });
fs.mkdirSync(MANUAL_DIR, { recursive: true });

const lockPath = path.join(INCOMING, 'real_public_market.lock.json');
const jsonlPath = path.join(INCOMING, 'real_public_market.jsonl');
const csvPath = path.join(INCOMING, 'paper_telemetry.csv');
const backup = new Map();
for (const p of [lockPath, jsonlPath, csvPath]) if (fs.existsSync(p)) backup.set(p, fs.readFileSync(p));

try {
  const jsonl = '{"symbol":"BTCUSDT","tf":"5m","ts_open_ms":1735689600000,"o":1,"h":2,"l":0.5,"c":1.5,"v":10}\n';
  const csv = 'ts,symbol,side,signal_id,intended_entry,intended_exit,fill_price,fee,slippage_bps,latency_ms,result_pnl,source_tag,spread_bps,size_ratio\n2025-01-01T00:00:00Z,BTCUSDT,BUY,SIG1,1.0,1.1,1.0,0.0,1,10,0.1,REAL_PUBLIC_TEST,1,1\n';
  fs.writeFileSync(jsonlPath, jsonl);
  fs.writeFileSync(csvPath, csv);
  const lock = {
    schema_version: '1.0.0', provider_id: 'binance_public_data', route: 'PUBLIC_DATA', selected_net_family: 4,
    output_files: {
      jsonl_path: 'artifacts/incoming/real_public_market.jsonl',
      jsonl_sha256: crypto.createHash('sha256').update(jsonl).digest('hex'),
      telemetry_csv_path: 'artifacts/incoming/paper_telemetry.csv',
      telemetry_csv_sha256: crypto.createHash('sha256').update(csv).digest('hex'),
    },
  };
  writeJsonDeterministic(lockPath, lock);

  const r = spawnSync('bash', ['-lc', 'ENABLE_NETWORK=0 npm run -s edge:profit:00:acquire:public:smoke'], { cwd: ROOT, encoding: 'utf8', env: process.env });
  const smokeJsonPath = path.join(MANUAL_DIR, 'public_smoke.json');
  const smoke = fs.existsSync(smokeJsonPath) ? JSON.parse(fs.readFileSync(smokeJsonPath, 'utf8')) : {};
  const pass = r.status === 0 && smoke.status === 'PASS' && smoke.smoke_mode === 'OFFLINE_REPLAY' && smoke.root_cause_code === 'NONE';
  const status = pass ? 'PASS' : 'FAIL';
  const reasonCode = pass ? 'NONE' : 'RG01';

  writeMd(path.join(REG_DIR, 'REGRESSION_PUBLIC_SMOKE_OFFLINE_REPLAY.md'), `# REGRESSION_PUBLIC_SMOKE_OFFLINE_REPLAY.md\n\nSTATUS: ${status}\nREASON_CODE: ${reasonCode}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${NEXT_ACTION}\n\n- command_ec: ${Number.isInteger(r.status) ? r.status : 1}\n- smoke_status: ${smoke.status || 'UNKNOWN'}\n- smoke_mode: ${smoke.smoke_mode || 'UNKNOWN'}\n- smoke_root_cause_code: ${smoke.root_cause_code || 'UNKNOWN'}\n`);
  writeJsonDeterministic(path.join(MANUAL_DIR, 'regression_public_smoke_offline_replay.json'), {
    schema_version:'1.0.0', status, reason_code: reasonCode, run_id: RUN_ID,
    message: pass ? 'Smoke offline replay passed without network.' : 'Smoke offline replay regression failed.', next_action: NEXT_ACTION,
    command_ec: Number.isInteger(r.status) ? r.status : 1,
    smoke_status: smoke.status || 'UNKNOWN', smoke_mode: smoke.smoke_mode || 'UNKNOWN', smoke_root_cause_code: smoke.root_cause_code || 'UNKNOWN',
  });
  console.log(`[${status}] regression_public_smoke_offline_replay — ${reasonCode}`);
  process.exit(pass ? 0 : 1);
} finally {
  for (const p of [lockPath, jsonlPath, csvPath]) {
    if (backup.has(p)) fs.writeFileSync(p, backup.get(p));
    else if (fs.existsSync(p)) fs.rmSync(p);
  }
}
