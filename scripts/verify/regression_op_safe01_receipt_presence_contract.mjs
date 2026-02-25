import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = path.resolve(process.cwd());
const EXEC_DIR = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC_DIR, 'gates/manual');
const NEXT_ACTION = 'npm run -s epoch:victory:seal';
const sealPath = path.join(MANUAL, 'victory_seal.json');
const baselineMdRel = 'reports/evidence/EXECUTOR/BASELINE_SAFETY.md';
const baselineJsonRel = 'reports/evidence/EXECUTOR/gates/manual/baseline_safety.json';
const baselineJsonPath = path.join(ROOT, baselineJsonRel);

const checks = {
  victory_seal_exists: fs.existsSync(sealPath),
};

if (checks.victory_seal_exists) {
  const seal = JSON.parse(fs.readFileSync(sealPath, 'utf8'));
  checks.seal_reason_code = String(seal.reason_code || 'NONE');
  if (checks.seal_reason_code === 'OP_SAFE01') {
    checks.baseline_safety_md_exists = fs.existsSync(path.join(ROOT, baselineMdRel));
    checks.baseline_safety_json_exists = fs.existsSync(baselineJsonPath);
    if (checks.baseline_safety_json_exists) {
      const baseline = JSON.parse(fs.readFileSync(baselineJsonPath, 'utf8'));
      checks.baseline_schema_version_present = typeof baseline.schema_version === 'string' && baseline.schema_version.length > 0;
      checks.baseline_reason_code_matches = String(baseline.reason_code) === 'OP_SAFE01';
      checks.baseline_full_lists_present = Array.isArray(baseline.tracked_files) && Array.isArray(baseline.staged_files);
    }
  }
}

const ok = Object.entries(checks)
  .filter(([k]) => !['seal_reason_code'].includes(k))
  .every(([, v]) => typeof v === 'boolean' ? v : true);
const status = ok ? 'PASS' : 'FAIL';
const reason_code = ok ? 'NONE' : 'RG_OPS01';

writeMd(path.join(EXEC_DIR, 'REGRESSION_OP_SAFE01_RECEIPT_PRESENCE_CONTRACT.md'), `# REGRESSION_OP_SAFE01_RECEIPT_PRESENCE_CONTRACT.md\n\nSTATUS: ${status}\nREASON_CODE: ${reason_code}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${NEXT_ACTION}\n\n${Object.entries(checks).map(([k, v]) => `- ${k}: ${v}`).join('\n')}\n`);
writeJsonDeterministic(path.join(MANUAL, 'regression_op_safe01_receipt_presence_contract.json'), {
  schema_version: '1.0.0',
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: NEXT_ACTION,
  checks,
});
console.log(`[${status}] regression_op_safe01_receipt_presence_contract — ${reason_code}`);
process.exit(ok ? 0 : 1);
