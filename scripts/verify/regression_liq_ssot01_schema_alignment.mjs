/**
 * regression_liq_ssot01_schema_alignment.mjs — RG_LIQ_SSOT01_SCHEMA_ALIGNMENT
 *
 * Gate: DATA_AUTHORITY_MODEL.md SSOT must declare schema_version matching
 *       the code constant in edge_liq_01_offline_replay.mjs (bybit_ws_v5).
 *       Any drift blocks with explicit reason_code.
 *
 * Sabotage fix #3: SSOT doc had v1, code uses v2.
 * Fix: DATA_AUTHORITY_MODEL.md updated to liquidations.bybit_ws_v5.v2.
 * Surface: OFFLINE_AUTHORITY
 */

import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

const NEXT_ACTION = 'npm run -s verify:fast';
const checks = [];

// Expected schema version per code constant (SSOT of code truth)
const CODE_SCHEMA_VERSION = 'liquidations.bybit_ws_v5.v2';

// Check 1: DATA_AUTHORITY_MODEL.md exists
const ssotPath = path.join(ROOT, 'DATA_AUTHORITY_MODEL.md');
checks.push({ check: 'ssot_doc_exists', pass: fs.existsSync(ssotPath), detail: ssotPath });

if (fs.existsSync(ssotPath)) {
  const doc = fs.readFileSync(ssotPath, 'utf8');

  // Check 2: SSOT contains v2 schema version for bybit_ws_v5
  const hasBybitV2 = doc.includes(CODE_SCHEMA_VERSION);
  checks.push({
    check: 'ssot_declares_bybit_v2_schema',
    pass: hasBybitV2,
    detail: hasBybitV2
      ? `SSOT declares ${CODE_SCHEMA_VERSION} — OK`
      : `DRIFT: SSOT missing ${CODE_SCHEMA_VERSION} (code uses v2, doc must match)`,
  });

  // Check 3: SSOT does NOT declare outdated v1 for bybit_ws_v5
  const hasStaleV1 = doc.includes('liquidations.bybit_ws_v5.v1');
  checks.push({
    check: 'ssot_no_stale_v1_for_bybit',
    pass: !hasStaleV1,
    detail: !hasStaleV1
      ? 'SSOT has no stale v1 bybit schema — OK'
      : 'DRIFT: SSOT still declares liquidations.bybit_ws_v5.v1 (must be v2)',
  });

  // Check 4: SSOT has network unlock double-key doctrine
  const hasDoubleKey = doc.includes('--enable-network') && doc.includes('ALLOW_NETWORK');
  checks.push({
    check: 'ssot_has_double_key_doctrine',
    pass: hasDoubleKey,
    detail: hasDoubleKey
      ? 'SSOT documents double-key network unlock — OK'
      : 'SSOT missing double-key unlock doctrine',
  });
}

// Check 5: Code constant in edge_liq_01_offline_replay.mjs matches SSOT
const replayPath = path.join(ROOT, 'scripts/edge/edge_liq_01_offline_replay.mjs');
checks.push({ check: 'replay_script_exists', pass: fs.existsSync(replayPath), detail: replayPath });
if (fs.existsSync(replayPath)) {
  const code = fs.readFileSync(replayPath, 'utf8');
  const hasV2 = code.includes(CODE_SCHEMA_VERSION);
  checks.push({
    check: 'code_schema_version_is_v2',
    pass: hasV2,
    detail: hasV2
      ? `code uses ${CODE_SCHEMA_VERSION} — OK`
      : `DRIFT: code missing ${CODE_SCHEMA_VERSION}`,
  });
}

const failed = checks.filter((c) => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'LIQ_SSOT01_SCHEMA_DRIFT';

writeMd(path.join(EXEC, 'REGRESSION_LIQ_SSOT01.md'), [
  '# REGRESSION_LIQ_SSOT01.md', '',
  `STATUS: ${status}`,
  `REASON_CODE: ${reason_code}`,
  `RUN_ID: ${RUN_ID}`,
  `NEXT_ACTION: ${NEXT_ACTION}`, '',
  '## CHECKS',
  checks.map((c) => `- [${c.pass ? 'PASS' : 'FAIL'}] ${c.check}: ${c.detail}`).join('\n'), '',
  '## FAILED',
  failed.length === 0 ? '- NONE' : failed.map((c) => `- ${c.check}: ${c.detail}`).join('\n'),
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'regression_liq_ssot01.json'), {
  schema_version: '1.0.0',
  gate_id: 'RG_LIQ_SSOT01_SCHEMA_ALIGNMENT',
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: NEXT_ACTION,
  code_schema_version: CODE_SCHEMA_VERSION,
  checks,
  failed_checks: failed.map((c) => c.check),
});

console.log(`[${status}] regression_liq_ssot01_schema_alignment — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
