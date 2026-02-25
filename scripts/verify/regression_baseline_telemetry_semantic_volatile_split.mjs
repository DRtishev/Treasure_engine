import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';
import { runBounded } from '../executor/spawn_bounded.mjs';

const ROOT = path.resolve(process.cwd());
const EXEC_DIR = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC_DIR, 'gates/manual');
const NEXT_ACTION = 'npm run -s epoch:victory:seal';

fs.mkdirSync(MANUAL, { recursive: true });

const run = runBounded('npm run -s epoch:victory:seal', {
  cwd: ROOT,
  env: { ...process.env, TREASURE_I_UNDERSTAND_RESTORE: '1' },
  timeoutMs: 180000,
  maxBuffer: 64 * 1024 * 1024,
});

let pre = {};
try {
  pre = JSON.parse(fs.readFileSync(path.join(MANUAL, 'victory_precheck.json'), 'utf8'));
} catch {
  pre = {};
}
const bt = pre?.baseline_telemetry || {};
const checks = {
  precheck_exists: Object.keys(pre).length > 0,
  semantic_has_counts: Number.isFinite(Number(bt?.semantic?.baseline_files_restored_n)) && Number.isFinite(Number(bt?.semantic?.baseline_evidence_removed_n)),
  semantic_has_no_elapsed_ms: !('baseline_clean_elapsed_ms' in (bt?.semantic || {})),
  volatile_has_elapsed_ms: Number.isFinite(Number(bt?.volatile?.baseline_clean_elapsed_ms)),
};

const ok = Object.values(checks).every(Boolean);
const status = ok ? 'PASS' : 'FAIL';
const reason_code = ok ? 'NONE' : 'RG_BTL01';

writeMd(path.join(EXEC_DIR, 'REGRESSION_BASELINE_TELEMETRY_SEMANTIC_VOLATILE_SPLIT.md'), `# REGRESSION_BASELINE_TELEMETRY_SEMANTIC_VOLATILE_SPLIT.md\n\nSTATUS: ${status}\nREASON_CODE: ${reason_code}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${NEXT_ACTION}\n\n- epoch_victory_seal_ec: ${run.ec}\n${Object.entries(checks).map(([k, v]) => `- ${k}: ${v}`).join('\n')}\n`);

writeJsonDeterministic(path.join(MANUAL, 'regression_baseline_telemetry_semantic_volatile_split.json'), {
  schema_version: '1.0.0',
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: NEXT_ACTION,
  epoch_victory_seal_ec: run.ec,
  checks,
});

runBounded('git restore reports/evidence/EXECUTOR/VICTORY_PRECHECK.md reports/evidence/EXECUTOR/VICTORY_SEAL.md reports/evidence/EXECUTOR/gates/manual/victory_precheck.json reports/evidence/EXECUTOR/gates/manual/victory_seal.json reports/evidence/EXECUTOR/BASELINE_SAFETY.md reports/evidence/EXECUTOR/gates/manual/baseline_safety.json', { cwd: ROOT, env: process.env, timeoutMs: 10000 });

console.log(`[${status}] regression_baseline_telemetry_semantic_volatile_split — ${reason_code}`);
process.exit(ok ? 0 : 1);
