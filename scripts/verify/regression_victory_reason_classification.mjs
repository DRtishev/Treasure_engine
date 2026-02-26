import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

const src = fs.readFileSync(path.join(ROOT, 'scripts/executor/executor_epoch_victory_seal.mjs'), 'utf8');
const checks = {
  op_safe_requires_tracked_or_staged: src.includes('trackedBeforeBaseline.length > 0 || stagedBeforeBaseline.length > 0'),
  untracked_not_in_op_safe_branch: !src.includes('untrackedBeforeBaseline'),
  snap01_precheck_branch_exists: src.includes("reason_code: 'SNAP01'"),
  snap01_block_surface_mapped: src.includes("if (reason_code === 'SNAP01') return 'PRECHECK_SNAP01';"),
};
const ok = Object.values(checks).every(Boolean);
const status = ok ? 'PASS' : 'FAIL';
const reason_code = ok ? 'NONE' : 'RG_VIC01';
writeMd(path.join(EXEC, 'REGRESSION_VICTORY_REASON_CLASSIFICATION.md'), `# REGRESSION_VICTORY_REASON_CLASSIFICATION.md\n\nSTATUS: ${status}\nREASON_CODE: ${reason_code}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: npm run -s verify:regression:victory-reason-classification\n\n${Object.entries(checks).map(([k, v]) => `- ${k}: ${v}`).join('\n')}\n`);
writeJsonDeterministic(path.join(MANUAL, 'regression_victory_reason_classification.json'), { schema_version: '1.0.0', status, reason_code, run_id: RUN_ID, checks });
console.log(`[${status}] regression_victory_reason_classification — ${reason_code}`);
process.exit(ok ? 0 : 1);
