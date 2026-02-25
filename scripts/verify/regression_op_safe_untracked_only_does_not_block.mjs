import fs from 'node:fs';
import path from 'node:path';
import { runBounded } from '../executor/spawn_bounded.mjs';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = path.resolve(process.cwd());
const EXEC_DIR = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC_DIR, 'gates/manual');
const NEXT_ACTION = 'npm run -s epoch:victory:seal';

fs.mkdirSync(MANUAL, { recursive: true });

const preTracked = runBounded('git diff --name-only', { cwd: ROOT, env: process.env, timeoutMs: 5000 });
const preStaged = runBounded('git diff --cached --name-only', { cwd: ROOT, env: process.env, timeoutMs: 5000 });
const prePaths = `${preTracked.stdout || ''}\n${preTracked.stderr || ''}\n${preStaged.stdout || ''}\n${preStaged.stderr || ''}`
  .split(/\r?\n/)
  .map((x) => x.trim())
  .filter(Boolean);
const preOperatorRelevantDrift = prePaths.some((p) => !p.startsWith('reports/evidence/') && !p.startsWith('artifacts/incoming/'));

const probeDir = path.join(ROOT, '.tmp_untracked');
const probeFile = path.join(probeDir, `probe_${RUN_ID}.txt`);
fs.mkdirSync(probeDir, { recursive: true });
fs.writeFileSync(probeFile, `probe=${RUN_ID}\n`);

let run;
let sealReason = 'MISSING';
try {
  run = runBounded('npm run -s epoch:victory:seal', {
    cwd: ROOT,
    env: process.env,
    timeoutMs: 30 * 60 * 1000,
    maxBuffer: 64 * 1024 * 1024,
  });
  const sealPath = path.join(MANUAL, 'victory_seal.json');
  if (fs.existsSync(sealPath)) {
    const j = JSON.parse(fs.readFileSync(sealPath, 'utf8'));
    sealReason = String(j.reason_code || 'MISSING');
  }
} finally {
  fs.rmSync(probeDir, { recursive: true, force: true });
  runBounded('git clean -fd -- .tmp_untracked', { cwd: ROOT, env: process.env, timeoutMs: 10000 });
}

const checks = {
  preexisting_operator_drift_skips_runtime_assert: preOperatorRelevantDrift || sealReason !== 'OP_SAFE01',
  seal_did_not_emit_op_safe01_when_no_preexisting_operator_drift: preOperatorRelevantDrift ? true : sealReason !== 'OP_SAFE01',
  allowed_exit_code_shape: [0, 1, 2].includes(Number(run?.ec ?? 1)),
};

const ok = Object.values(checks).every(Boolean);
const status = ok ? 'PASS' : 'FAIL';
const reason_code = ok ? 'NONE' : 'RG_OPA04';

writeMd(path.join(EXEC_DIR, 'REGRESSION_OP_SAFE_UNTRACKED_ONLY_DOES_NOT_BLOCK.md'), `# REGRESSION_OP_SAFE_UNTRACKED_ONLY_DOES_NOT_BLOCK.md\n\nSTATUS: ${status}\nREASON_CODE: ${reason_code}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${NEXT_ACTION}\n\n${Object.entries(checks).map(([k, v]) => `- ${k}: ${v}`).join('\n')}\n- seal_ec: ${run.ec}\n- seal_reason_code: ${sealReason}\n- preexisting_operator_drift: ${preOperatorRelevantDrift}\n`);
writeJsonDeterministic(path.join(MANUAL, 'regression_op_safe_untracked_only_does_not_block.json'), {
  schema_version: '1.0.0',
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: NEXT_ACTION,
  checks,
  seal_ec: run.ec,
  seal_reason_code: sealReason,
  preexisting_operator_drift: preOperatorRelevantDrift,
});

console.log(`[${status}] regression_op_safe_untracked_only_does_not_block — ${reason_code}`);
process.exit(ok ? 0 : 1);
