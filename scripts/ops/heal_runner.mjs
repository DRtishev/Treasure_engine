/**
 * heal_runner.mjs — EPOCH-71 healAll() wrapper for FSM T06 action
 *
 * Runs healAll() from self_heal.mjs and writes a receipt.
 * Used as the action for T06_DEGRADED_TO_HEALING transition.
 *
 * Output: reports/evidence/EPOCH-HEAL-<RUN_ID>/HEAL_RECEIPT.json
 * Exit: 0 if any heal applied, 1 if nothing healed
 */

import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';
import { healAll } from '../lib/self_heal.mjs';

const ROOT = process.cwd();
const EPOCH_DIR = path.join(ROOT, 'reports', 'evidence', `EPOCH-HEAL-${RUN_ID}`);
fs.mkdirSync(EPOCH_DIR, { recursive: true });

let heals = [];
try {
  heals = healAll();
} catch (e) {
  console.log(`[FAIL] heal_runner — ${e.message}`);
  process.exit(1);
}

const healed = heals.filter((h) => h.healed);

writeJsonDeterministic(path.join(EPOCH_DIR, 'HEAL_RECEIPT.json'), {
  schema_version: '1.0.0',
  gate_id: 'HEAL_RUNNER',
  run_id: RUN_ID,
  status: healed.length > 0 ? 'HEALED' : 'NO_ACTION',
  heals_applied: healed.length,
  heals_total: heals.length,
  actions: heals.map((h) => ({
    action: h.action,
    healed: h.healed,
    detail: h.detail,
  })),
});

console.log(`[${healed.length > 0 ? 'PASS' : 'FAIL'}] heal_runner — ${healed.length} heal(s) applied`);
for (const h of healed) {
  console.log(`  HEALED: ${h.action} — ${h.detail}`);
}

process.exit(healed.length > 0 ? 0 : 1);
