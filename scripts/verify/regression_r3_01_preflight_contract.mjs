/**
 * regression_r3_01_preflight_contract.mjs — RG_R3_PREFLIGHT01
 *
 * Verify that edge_okx_orderbook_10_acquire_live.mjs exists, has double-key
 * check, has correct exit codes, and refuses under TREASURE_NET_KILL=1.
 * Static analysis only (no execution).
 *
 * Gate: verify:regression:r3-01-preflight-contract
 */

import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

const ACQUIRE_SCRIPT = path.join(ROOT, 'scripts/edge/edge_okx_orderbook_10_acquire_live.mjs');

const violations = [];

// 1. Script exists
if (!fs.existsSync(ACQUIRE_SCRIPT)) {
  violations.push('acquire_script_missing');
} else {
  const src = fs.readFileSync(ACQUIRE_SCRIPT, 'utf8');

  // 2. Double-key: --enable-network flag check
  if (!src.includes('--enable-network')) {
    violations.push('missing_enable_network_flag_check');
  }

  // 3. Double-key: ALLOW_NETWORK file check
  if (!src.includes('ALLOW_NETWORK')) {
    violations.push('missing_allow_network_file_check');
  }

  // 4. NET_KILL contract: refuses under TREASURE_NET_KILL=1
  if (!src.includes('TREASURE_NET_KILL')) {
    violations.push('missing_netkill_contract');
  }

  // 5. Exit code 2 for NEEDS_NETWORK
  if (!src.includes('process.exit(2)')) {
    violations.push('missing_exit_code_2');
  }

  // 6. Exit code 1 for FAIL
  if (!src.includes('process.exit(1)')) {
    violations.push('missing_exit_code_1');
  }

  // 7. EventBus emissions
  if (!src.includes('ACQ_BOOT') || !src.includes('ACQ_SEAL')) {
    violations.push('missing_eventbus_emissions');
  }

  // 8. Lock file production (raw.jsonl + lock.json)
  if (!src.includes('raw.jsonl') || !src.includes('lock.json')) {
    violations.push('missing_artifact_production');
  }

  // 9. SHA256 integrity
  if (!src.includes('sha256')) {
    violations.push('missing_sha256_integrity');
  }

  // 10. Provider ID
  if (!src.includes('okx_orderbook_ws')) {
    violations.push('missing_provider_id');
  }
}

const status = violations.length === 0 ? 'PASS' : 'FAIL';
const reason = violations.length === 0 ? 'NONE' : 'RG_R3_PREFLIGHT01_VIOLATION';

writeMd(path.join(EXEC, 'REGRESSION_R3_01_PREFLIGHT_CONTRACT.md'), [
  '# REGRESSION_R3_01_PREFLIGHT_CONTRACT.md', '',
  `STATUS: ${status}`,
  `REASON_CODE: ${reason}`,
  `RUN_ID: ${RUN_ID}`,
  `NEXT_ACTION: npm run -s verify:fast`, '',
  `VIOLATIONS: ${violations.length}`,
  violations.length > 0
    ? violations.map((v) => `- ${v}`).join('\n')
    : '- NONE',
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'regression_r3_01_preflight_contract.json'), {
  schema_version: '1.0.0',
  gate_id: 'RG_R3_PREFLIGHT01',
  status,
  reason_code: reason,
  run_id: RUN_ID,
  acquire_script: 'scripts/edge/edge_okx_orderbook_10_acquire_live.mjs',
  violations,
});

console.log(`[${status}] regression_r3_01_preflight_contract — ${reason}`);
process.exit(status === 'PASS' ? 0 : 1);
