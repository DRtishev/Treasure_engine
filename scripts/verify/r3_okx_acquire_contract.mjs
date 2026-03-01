/**
 * r3_okx_acquire_contract.mjs — verify:r3:okx-acquire-contract
 *
 * Placeholder: NEEDS_DATA until OKX acquire kernel is implemented.
 * Will verify: acquire + replay + lock contract under NET_KILL.
 *
 * NOT wired into daily chain.
 */

import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

const status = 'NEEDS_DATA';
const reason_code = 'R3_ACQ_CONTRACT_NEEDS_DATA';

writeMd(path.join(EXEC, 'R3_OKX_ACQUIRE_CONTRACT.md'), [
  '# R3_OKX_ACQUIRE_CONTRACT.md', '',
  `STATUS: ${status}`,
  `REASON_CODE: ${reason_code}`,
  `RUN_ID: ${RUN_ID}`,
  'NEXT_ACTION: implement OKX acquire kernel (EPOCH-67)', '',
  '## BLOCKERS',
  '- OKX acquire kernel not yet implemented',
  '- No captured data under artifacts/incoming/okx/',
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'r3_okx_acquire_contract.json'), {
  schema_version: '1.0.0',
  gate_id: 'R3_OKX_ACQUIRE_CONTRACT',
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: 'implement OKX acquire kernel (EPOCH-67)',
});

console.log(`[${status}] r3_okx_acquire_contract — ${reason_code}`);
process.exit(2);
