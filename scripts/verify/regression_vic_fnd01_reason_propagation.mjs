import fs from 'node:fs';
import path from 'node:path';
import { runBounded } from '../executor/spawn_bounded.mjs';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = path.resolve(process.cwd());
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
const NEXT_ACTION = 'npm run -s epoch:victory:seal';
fs.mkdirSync(MANUAL, { recursive: true });

const forcedReason = 'PFZ01_FORCED_REGRESSION';
const foundationProbe = runBounded('npm run -s _epoch:foundation:seal', {
  cwd: ROOT,
  env: { ...process.env, FOUNDATION_FORCE_REASON: forcedReason },
  timeoutMs: 300000,
  maxBuffer: 32 * 1024 * 1024,
});
const run = runBounded('npm run -s _epoch:victory:seal', {
  cwd: ROOT,
  env: { ...process.env, FOUNDATION_FORCE_REASON: forcedReason, VICTORY_ALLOW_DIRTY: '1' },
  timeoutMs: 900000,
  maxBuffer: 64 * 1024 * 1024,
});

const victoryPath = path.join(ROOT, 'reports/evidence', `EPOCH-VICTORY-${RUN_ID}`, 'gates/manual', 'victory_seal.json');
let reason_code = '';
let first_failing_step_index = null;
if (fs.existsSync(victoryPath)) {
  try {
    const payload = JSON.parse(fs.readFileSync(victoryPath, 'utf8'));
    reason_code = String(payload.reason_code || '').trim();
    first_failing_step_index = payload.first_failing_step_index ?? null;
  } catch {}
}

const hasFoundationReason = reason_code.includes(`FOUNDATION_${forcedReason}`);
const noBareStepEc7 = reason_code !== 'STEP_EC_7';
const status = run.ec !== 0 && hasFoundationReason && noBareStepEc7 ? 'PASS' : 'BLOCKED';
const reason = status === 'PASS' ? 'NONE' : 'RG_VIC_FND01';

writeMd(path.join(EXEC, 'REGRESSION_VIC_FND01_REASON_PROPAGATION.md'), `# REGRESSION_VIC_FND01_REASON_PROPAGATION.md\n\nSTATUS: ${status}\nREASON_CODE: ${reason}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${NEXT_ACTION}\n\n- forced_reason: ${forcedReason}\n- pre_forced_foundation_ec: ${foundationProbe.ec}\n- epoch_victory_seal_ec: ${run.ec}\n- observed_reason_code: ${reason_code || 'MISSING'}\n- first_failing_step_index: ${first_failing_step_index}\n- has_foundation_reason: ${hasFoundationReason}\n- no_bare_step_ec_7: ${noBareStepEc7}\n`);
writeJsonDeterministic(path.join(MANUAL, 'regression_vic_fnd01_reason_propagation.json'), {
  schema_version: '1.0.0',
  status,
  reason_code: reason,
  run_id: RUN_ID,
  next_action: NEXT_ACTION,
  forced_reason: forcedReason,
  pre_forced_foundation_ec: foundationProbe.ec,
  epoch_victory_seal_ec: run.ec,
  observed_reason_code: reason_code,
  first_failing_step_index,
  has_foundation_reason: hasFoundationReason,
  no_bare_step_ec_7: noBareStepEc7,
});

console.log(`[${status}] regression_vic_fnd01_reason_propagation — ${reason}`);
process.exit(status === 'PASS' ? 0 : 1);
