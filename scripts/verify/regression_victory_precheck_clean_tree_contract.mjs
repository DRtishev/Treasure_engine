import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';
import { runBounded } from '../executor/spawn_bounded.mjs';

const ROOT = path.resolve(process.cwd());
const EXEC_DIR = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC_DIR, 'gates/manual');
const NEXT_ACTION = 'npm run -s epoch:victory:seal';
const src = fs.readFileSync(path.join(ROOT, 'scripts/executor/executor_epoch_victory_seal.mjs'), 'utf8');

function cleanupTmp() {
  fs.rmSync(path.join(ROOT, '.tmp_trn'), { recursive: true, force: true });
  runBounded('git clean -fd -- .tmp_trn', { cwd: ROOT, env: process.env, timeoutMs: 10000 });
}

const baselineIdx = src.indexOf('npm run -s executor:clean:baseline');
const gitStatusIdx = src.indexOf('git status -sb');
const staticChecks = {
  has_baseline_clean: baselineIdx >= 0,
  baseline_before_git_status: baselineIdx >= 0 && gitStatusIdx >= 0 && baselineIdx < gitStatusIdx,
  has_git_status: src.includes('git status -sb'),
  has_git_diff: src.includes('git diff --name-only'),
  has_git_diff_cached: src.includes('git diff --cached --name-only'),
  has_git_untracked: src.includes('git ls-files --others --exclude-standard'),
  has_precheck_md: src.includes('VICTORY_PRECHECK.md'),
  has_precheck_json: src.includes('victory_precheck.json'),
  has_snap01_exit: src.includes('SNAP01') && src.includes('process.exit(1)'),
  has_drift_detected_signal: src.includes('drift_detected'),
  has_drift_severity_signal: src.includes('drift_severity'),
  has_baseline_telemetry_semantic: src.includes('Baseline Clean Telemetry (SEMANTIC)'),
  has_baseline_telemetry_volatile: src.includes('Baseline Clean Telemetry (VOLATILE)'),
  has_list_truncation_contract: src.includes('... (+${extra} more)'),
};

cleanupTmp();
fs.mkdirSync(path.join(ROOT, '.tmp_trn'), { recursive: true });
for (let i = 0; i < 61; i += 1) {
  fs.writeFileSync(path.join(ROOT, '.tmp_trn', `f_${String(i).padStart(3, '0')}.tmp`), `x${i}\n`);
}

const run = runBounded('npm run -s epoch:victory:seal', {
  cwd: ROOT,
  env: { ...process.env, TREASURE_I_UNDERSTAND_RESTORE: '1' },
  timeoutMs: 180000,
  maxBuffer: 64 * 1024 * 1024,
});

const preMd = fs.readFileSync(path.join(EXEC_DIR, 'VICTORY_PRECHECK.md'), 'utf8');
const preJson = JSON.parse(fs.readFileSync(path.join(MANUAL, 'victory_precheck.json'), 'utf8'));

const lines = preMd.split(/\r?\n/);
const start = lines.findIndex((l) => l.trim() === '## DIRTY_UNTRACKED_FILES (max 50 shown)');
let previewCount = 0;
if (start >= 0) {
  for (let i = start + 1; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (line.startsWith('#')) break;
    if (line.startsWith('- ')) previewCount += 1;
  }
}

const untracked = Array.isArray(preJson?.dirty_untracked_files) ? preJson.dirty_untracked_files : [];
const sortedUntracked = [...untracked].sort((a, b) => a.localeCompare(b));
const dynamicChecks = {
  blocked_snap01: run.ec === 1 && preJson.reason_code === 'SNAP01',
  md_preview_max_50: previewCount <= 51,
  md_preview_has_overflow_marker: preMd.includes('... (+'),
  json_full_list_gt_50: untracked.length > 50,
  json_full_list_sorted: JSON.stringify(untracked) === JSON.stringify(sortedUntracked),
};

cleanupTmp();
runBounded('git restore reports/evidence/EXECUTOR/VICTORY_PRECHECK.md reports/evidence/EXECUTOR/VICTORY_SEAL.md reports/evidence/EXECUTOR/gates/manual/victory_precheck.json reports/evidence/EXECUTOR/gates/manual/victory_seal.json', { cwd: ROOT, env: process.env, timeoutMs: 10000 });

const checks = { ...staticChecks, ...dynamicChecks };
const ok = Object.values(checks).every(Boolean);
const status = ok ? 'PASS' : 'FAIL';
const failReason = (!dynamicChecks.md_preview_max_50 || !dynamicChecks.json_full_list_gt_50 || !dynamicChecks.json_full_list_sorted) ? 'RG_TRN01' : 'RG_SNAP02';
const reason_code = ok ? 'NONE' : failReason;

writeMd(path.join(EXEC_DIR, 'REGRESSION_VICTORY_PRECHECK_CLEAN_TREE_CONTRACT.md'), `# REGRESSION_VICTORY_PRECHECK_CLEAN_TREE_CONTRACT.md\n\nSTATUS: ${status}\nREASON_CODE: ${reason_code}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${NEXT_ACTION}\n\n${Object.entries(checks).map(([k,v])=>`- ${k}: ${v}`).join('\n')}\n- untracked_json_n: ${untracked.length}\n- md_preview_count: ${previewCount}\n`);
writeJsonDeterministic(path.join(MANUAL, 'regression_victory_precheck_clean_tree_contract.json'), {
  schema_version: '1.0.0',
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: NEXT_ACTION,
  checks,
  truncation_probe: {
    untracked_json_n: untracked.length,
    md_preview_count: previewCount,
  },
});
console.log(`[${status}] regression_victory_precheck_clean_tree_contract — ${reason_code}`);
process.exit(ok ? 0 : 1);
