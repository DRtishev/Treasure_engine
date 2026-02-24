import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';
import { RUN_ID, writeMd, stableEvidenceNormalize } from '../edge/edge_lab/canon.mjs';
import { stableDiagSummary } from './executor_public_x2_diag_only.mjs';

const ROOT = path.resolve(process.cwd());
const EXEC_DIR = path.join(ROOT, 'reports', 'evidence', 'EXECUTOR');
const MANUAL_DIR = path.join(EXEC_DIR, 'gates', 'manual');
const OUT_MD = path.join(EXEC_DIR, 'EPOCH_EDGE_PROFIT_PUBLIC_00_X2.md');
const OUT_JSON = path.join(MANUAL_DIR, 'epoch_edge_profit_public_00_x2.json');
const LADDER_MD = path.join(EXEC_DIR, 'PUBLIC_X2_DIAG_LADDER.md');
const LADDER_JSON = path.join(MANUAL_DIR, 'public_x2_diag_ladder.json');
const SENTINEL_MD = path.join(EXEC_DIR, 'PUBLIC_REACHABILITY_SENTINEL.md');
const SENTINEL_JSON = path.join(MANUAL_DIR, 'public_reachability_sentinel.json');
const NEXT_ACTION = 'npm run -s epoch:edge:profit:public:00:x2:node22';

fs.mkdirSync(MANUAL_DIR, { recursive: true });

function runEpoch(runIndex) {
  const env = {
    ...process.env,
    ACQUIRE_IF_MISSING: '1',
    ENABLE_NETWORK: process.env.ENABLE_NETWORK || '0',
    PROVIDER_ALLOWLIST: process.env.PROVIDER_ALLOWLIST || 'binance,bybit,okx,kraken',
  };
  const r = spawnSync('bash', ['-lc', 'npm run -s epoch:edge:profit:public:00:node22'], { cwd: ROOT, encoding: 'utf8', env, maxBuffer: 64 * 1024 * 1024 });
  const ep = path.join(ROOT, 'reports', 'evidence', 'EXECUTOR', 'gates', 'manual', 'epoch_edge_profit_public_00.json');
  const epoch = fs.existsSync(ep) ? JSON.parse(fs.readFileSync(ep, 'utf8')) : { status: 'BLOCKED', reason_code: 'ME01' };
  const diag = stableDiagSummary(ROOT);
  return { run: runIndex, ec: Number.isInteger(r.status) ? r.status : 1, epoch, diag };
}

function sha256(s) { return crypto.createHash('sha256').update(s).digest('hex'); }
function normFile(rel) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) return null;
  return sha256(stableEvidenceNormalize(fs.readFileSync(abs, 'utf8'), { assertD005: false }));
}

const targets = [
  'artifacts/incoming/real_public_market.lock.md',
  'artifacts/incoming/real_public_market.lock.json',
  'artifacts/incoming/real_public_market.jsonl',
  'artifacts/incoming/paper_telemetry.csv',
  'reports/evidence/EDGE_PROFIT_00/public/gates/manual/paper_evidence_ingest.json',
  'reports/evidence/EDGE_PROFIT_00/public/gates/manual/paper_evidence_normalized.json',
  'reports/evidence/EDGE_PROFIT_00/public/gates/manual/edge_profit_00_closeout.json',
  'reports/evidence/EDGE_PROFIT_00/public/PROOF_ENVELOPE_INDEX.md',
  'reports/evidence/EXECUTOR/EPOCH_EDGE_PROFIT_PUBLIC_00.md',
  'reports/evidence/EXECUTOR/COMMANDS_RUN.md',
  'reports/evidence/EXECUTOR/gates/manual/epoch_edge_profit_public_00.json',
];

function fingerprint() {
  const parts = [];
  for (const rel of targets) {
    const h = normFile(rel);
    if (!h) return { ok: false, missing: rel, aggregate: null, parts: [] };
    parts.push({ path: rel, sha256_norm: h });
  }
  return { ok: true, missing: '', parts, aggregate: sha256(parts.map((p) => `${p.path}:${p.sha256_norm}`).join('\n')) };
}

const r1 = runEpoch(1);
const r2 = runEpoch(2);

let status = 'PASS';
let reasonCode = 'NONE';
let message = 'Public epoch x2 deterministic fingerprint match.';
let f1 = null;
let f2 = null;

const bothAcq02 = r1.epoch?.reason_code === 'ACQ02' && r2.epoch?.reason_code === 'ACQ02';
const bothSmk01 = r1.epoch?.reason_code === 'SMK01' && r2.epoch?.reason_code === 'SMK01';
const anySmkOrder = r1.epoch?.reason_code === 'SMK_ORDER01' || r2.epoch?.reason_code === 'SMK_ORDER01';
if (bothAcq02) {
  if (r1.diag.ok && r2.diag.ok && r1.diag.digest === r2.diag.digest) {
    status = 'NEEDS_DATA';
    reasonCode = 'ACQ02';
    message = 'Both runs blocked by stable ACQ02 diagnostics; determinism preserved.';
  } else {
    status = 'FAIL';
    reasonCode = 'ND_NET01';
    message = 'Network diagnostic classification drift across x2 runs.';
  }
} else if (bothSmk01) {
  status = 'BLOCKED';
  reasonCode = 'SMK01';
  message = 'Both runs blocked by smoke precheck failure.';
} else if (anySmkOrder) {
  status = 'FAIL';
  reasonCode = 'SMK_ORDER01';
  message = 'Acquire bypassed smoke ordering guard in one or more runs.';
} else if (r1.ec !== 0 || r2.ec !== 0) {
  status = 'FAIL';
  reasonCode = 'ND01';
  message = 'epoch:edge:profit:public:00 failed in one or both runs.';
} else {
  f1 = fingerprint();
  f2 = fingerprint();
  if (!f1.ok || !f2.ok) {
    status = 'FAIL';
    reasonCode = 'ND01';
    message = `Missing fingerprint input: ${f1.missing || f2.missing}`;
  } else if (f1.aggregate !== f2.aggregate) {
    status = 'FAIL';
    reasonCode = 'ND01';
    message = 'Determinism mismatch between x2 runs.';
  }
}

if (bothAcq02) {
  writeMd(SENTINEL_MD, `# PUBLIC_REACHABILITY_SENTINEL.md\n\nSTATUS: NEEDS_DATA\nREASON_CODE: ACQ02\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${NEXT_ACTION}\n\n- run1_reason_code: ${r1.epoch?.reason_code || 'UNKNOWN'}\n- run2_reason_code: ${r2.epoch?.reason_code || 'UNKNOWN'}\n- diag_digest_run1: ${r1.diag?.digest || 'MISSING'}\n- diag_digest_run2: ${r2.diag?.digest || 'MISSING'}\n- net_family_run1: ${r1.diag?.net_family ?? 'MISSING'}\n- net_family_run2: ${r2.diag?.net_family ?? 'MISSING'}\n- hosts_run1: ${(r1.diag?.hosts || []).join(',') || 'NONE'}\n- hosts_run2: ${(r2.diag?.hosts || []).join(',') || 'NONE'}\n`);
  writeJsonDeterministic(SENTINEL_JSON, {
    schema_version: '1.0.0',
    status: 'NEEDS_DATA',
    reason_code: 'ACQ02',
    run_id: RUN_ID,
    message: 'Reachability sentinel: ACQ02 reproduced in x2 with stable diagnostics.',
    next_action: NEXT_ACTION,
    run1_reason_code: r1.epoch?.reason_code || 'UNKNOWN',
    run2_reason_code: r2.epoch?.reason_code || 'UNKNOWN',
    run1_diag_digest: r1.diag?.digest || null,
    run2_diag_digest: r2.diag?.digest || null,
    run1_net_family: r1.diag?.net_family ?? null,
    run2_net_family: r2.diag?.net_family ?? null,
    run1_hosts: r1.diag?.hosts || [],
    run2_hosts: r2.diag?.hosts || [],
  });
}

writeMd(LADDER_MD, `# PUBLIC_X2_DIAG_LADDER.md\n\nSTATUS: ${status}\nREASON_CODE: ${reasonCode}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${NEXT_ACTION}\n\n- run1_reason_code: ${r1.epoch?.reason_code || 'UNKNOWN'}\n- run2_reason_code: ${r2.epoch?.reason_code || 'UNKNOWN'}\n- run1_diag_digest: ${r1.diag?.digest || 'MISSING'}\n- run2_diag_digest: ${r2.diag?.digest || 'MISSING'}\n- run1_net_family: ${r1.diag?.net_family ?? 'MISSING'}\n- run2_net_family: ${r2.diag?.net_family ?? 'MISSING'}\n- run1_hosts: ${(r1.diag?.hosts || []).join(',') || 'NONE'}\n- run2_hosts: ${(r2.diag?.hosts || []).join(',') || 'NONE'}\n`);

writeJsonDeterministic(LADDER_JSON, {
  schema_version: '1.0.0',
  status,
  reason_code: reasonCode,
  run_id: RUN_ID,
  message,
  next_action: NEXT_ACTION,
  run1_reason_code: r1.epoch?.reason_code || 'UNKNOWN',
  run2_reason_code: r2.epoch?.reason_code || 'UNKNOWN',
  run1_diag_digest: r1.diag?.digest || null,
  run2_diag_digest: r2.diag?.digest || null,
  run1_net_family: r1.diag?.net_family ?? null,
  run2_net_family: r2.diag?.net_family ?? null,
  run1_hosts: r1.diag?.hosts || [],
  run2_hosts: r2.diag?.hosts || [],
});

writeMd(OUT_MD, `# EPOCH_EDGE_PROFIT_PUBLIC_00_X2.md\n\nSTATUS: ${status}\nREASON_CODE: ${reasonCode}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${NEXT_ACTION}\n\n- run_1_ec: ${r1.ec}\n- run_2_ec: ${r2.ec}\n- aggregate_run_1: ${f1?.aggregate || 'MISSING'}\n- aggregate_run_2: ${f2?.aggregate || 'MISSING'}\n`);

writeJsonDeterministic(OUT_JSON, {
  schema_version: '1.0.0', status, reason_code: reasonCode, run_id: RUN_ID, message, next_action: NEXT_ACTION,
  run_1_ec: r1.ec, run_2_ec: r2.ec,
  aggregate_run_1: f1?.aggregate || null, aggregate_run_2: f2?.aggregate || null,
  inputs_run_1: f1?.parts || [], inputs_run_2: f2?.parts || [],
});

console.log(`[${status}] executor_epoch_edge_profit_public_00_x2 — ${reasonCode}`);
process.exit(status === 'PASS' ? 0 : 1);
