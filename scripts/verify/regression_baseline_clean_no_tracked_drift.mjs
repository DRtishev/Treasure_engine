import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';
import { runBounded } from '../executor/spawn_bounded.mjs';

const ROOT = path.resolve(process.cwd());
const EXEC_DIR = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC_DIR, 'gates/manual');
const NEXT_ACTION = 'npm run -s verify:regression:baseline-clean-no-tracked-drift';

fs.mkdirSync(MANUAL, { recursive: true });

function sortedLines(text) {
  return String(text || '').split(/\r?\n/).map((v) => v.trim()).filter(Boolean).sort((a, b) => a.localeCompare(b));
}

function parseTelemetry(outText) {
  const m = String(outText || '').match(/BASELINE_TELEMETRY_JSON:(\{[^\n]+\})/);
  if (!m) return null;
  try { return JSON.parse(m[1]); } catch { return null; }
}

const baseline = runBounded('npm run -s executor:clean:baseline', {
  cwd: ROOT,
  env: process.env,
  timeoutMs: 120000,
  maxBuffer: 32 * 1024 * 1024,
});

const diff = runBounded('git diff --name-only', { cwd: ROOT, env: process.env, timeoutMs: 5000 });
const diffCached = runBounded('git diff --cached --name-only', { cwd: ROOT, env: process.env, timeoutMs: 5000 });

const tracked = sortedLines((diff.stdout + diff.stderr).trim());
const staged = sortedLines((diffCached.stdout + diffCached.stderr).trim());
const telemetry = parseTelemetry((baseline.stdout + baseline.stderr));

const checks = {
  baseline_exit_ok: baseline.ec === 0,
  tracked_diff_empty: diff.ec === 0 && tracked.length === 0,
  staged_diff_empty: diffCached.ec === 0 && staged.length === 0,
  telemetry_present: telemetry !== null,
  telemetry_semantic_has_counts: telemetry !== null && Number.isFinite(Number(telemetry?.semantic?.baseline_files_restored_n)) && Number.isFinite(Number(telemetry?.semantic?.baseline_evidence_removed_n)),
  telemetry_semantic_has_no_elapsed_ms: telemetry !== null && !('baseline_clean_elapsed_ms' in (telemetry?.semantic || {})),
  telemetry_volatile_has_elapsed_ms: telemetry !== null && Number.isFinite(Number(telemetry?.volatile?.baseline_clean_elapsed_ms)),
};

const ok = Object.values(checks).every(Boolean);
const status = ok ? 'PASS' : 'FAIL';
const reason_code = (!checks.telemetry_semantic_has_no_elapsed_ms || !checks.telemetry_volatile_has_elapsed_ms) ? 'RG_BTL01' : (ok ? 'NONE' : 'RG_BASE01');

writeMd(path.join(EXEC_DIR, 'REGRESSION_BASELINE_CLEAN_NO_TRACKED_DRIFT.md'), `# REGRESSION_BASELINE_CLEAN_NO_TRACKED_DRIFT.md\n\nSTATUS: ${status}\nREASON_CODE: ${reason_code}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${NEXT_ACTION}\n\n${Object.entries(checks).map(([k, v]) => `- ${k}: ${v}`).join('\n')}\n- tracked_files_n: ${tracked.length}\n- staged_files_n: ${staged.length}\n\n## TRACKED_FILES\n${tracked.map((f) => `- ${f}`).join('\n') || '- NONE'}\n\n## STAGED_FILES\n${staged.map((f) => `- ${f}`).join('\n') || '- NONE'}\n\n## BASELINE_OUTPUT\n\`\`\`\n${(baseline.stdout + baseline.stderr).trim() || '(none)'}\n\`\`\`\n`);

writeJsonDeterministic(path.join(MANUAL, 'regression_baseline_clean_no_tracked_drift.json'), {
  schema_version: '1.0.0',
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: NEXT_ACTION,
  checks,
  baseline: {
    ec: baseline.ec,
    timedOut: baseline.timedOut,
    timeout_ms: baseline.timeout_ms,
  },
  telemetry,
  tracked_files: tracked,
  staged_files: staged,
});

console.log(`[${status}] regression_baseline_clean_no_tracked_drift — ${reason_code}`);
process.exit(ok ? 0 : 1);
