import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = path.resolve(process.cwd());
const EXEC_DIR = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC_DIR, 'gates/manual');
const NEXT_ACTION = 'npm run -s epoch:victory:seal';

const src = fs.readFileSync(path.join(ROOT, 'scripts/executor/executor_mega_proof_x2.mjs'), 'utf8');

const checks = {
  timeout_classifies_to01: src.includes("if (run1.timed_out || run2.timed_out)") && src.includes("reasonCode = 'TO01';") && src.includes("status = 'BLOCKED';"),
  nonzero_ec_classifies_ec01_blocked: src.includes("} else if (run1.ec !== 0 || run2.ec !== 0)") && src.includes("reasonCode = 'EC01';") && src.includes("status = 'BLOCKED';"),
  nonzero_ec_does_not_use_nd01: !src.includes("} else if (run1.ec !== 0 || run2.ec !== 0) {\n  status = 'FAIL';\n  reasonCode = 'ND01';"),
  nd01_reserved_for_mismatch_only: src.includes("} else if (fp1_noise.aggregate !== fp2_noise.aggregate)") && src.includes("reasonCode = 'ND01';") && src.includes("} else if (fp1_semantic.aggregate !== fp2_semantic.aggregate)") && src.includes("reasonCode = 'ND01_SEM01';"),
};

const ok = Object.values(checks).every(Boolean);
const status = ok ? 'PASS' : 'FAIL';
const reason_code = ok ? 'NONE' : 'RG_MPF01';

writeMd(path.join(EXEC_DIR, 'REGRESSION_MEGA_PROOF_X2_FAILURE_CLASSIFICATION.md'), `# REGRESSION_MEGA_PROOF_X2_FAILURE_CLASSIFICATION.md\n\nSTATUS: ${status}\nREASON_CODE: ${reason_code}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${NEXT_ACTION}\n\n${Object.entries(checks).map(([k, v]) => `- ${k}: ${v}`).join('\n')}\n`);

writeJsonDeterministic(path.join(MANUAL, 'regression_mega_proof_x2_failure_classification.json'), {
  schema_version: '1.0.0',
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: NEXT_ACTION,
  checks,
});

console.log(`[${status}] regression_mega_proof_x2_failure_classification — ${reason_code}`);
process.exit(ok ? 0 : 1);
