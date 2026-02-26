import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = path.resolve(process.cwd());
const EXEC_DIR = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC_DIR, 'gates/manual');
const NEXT_ACTION = 'npm run -s epoch:victory:seal';

fs.mkdirSync(MANUAL, { recursive: true });

const src = fs.readFileSync(path.join(ROOT, '.gitignore'), 'utf8');
const lines = src.split(/\r?\n/).map((line) => line.trim());

const idxLogNegation = lines.indexOf('!reports/evidence/**/*.log');
const idxEpochDir = lines.indexOf('reports/evidence/EPOCH-*/');
const idxEpochAll = lines.indexOf('reports/evidence/EPOCH-*/**');

const checks = {
  has_log_negation_anchor: idxLogNegation >= 0,
  has_epoch_dir_ignore_rule: idxEpochDir >= 0,
  has_epoch_recursive_ignore_rule: idxEpochAll >= 0,
  epoch_dir_rule_after_log_negation: idxLogNegation >= 0 && idxEpochDir > idxLogNegation,
  epoch_recursive_rule_after_log_negation: idxLogNegation >= 0 && idxEpochAll > idxLogNegation,
  epoch_rule_order_stable: idxEpochDir >= 0 && idxEpochAll === idxEpochDir + 1,
};

const ok = Object.values(checks).every(Boolean);
const status = ok ? 'PASS' : 'FAIL';
const reason_code = ok ? 'NONE' : 'RG_EPOCH01';

writeMd(
  path.join(EXEC_DIR, 'REGRESSION_EPOCH_EVIDENCE_CYCLE_GITIGNORE.md'),
  `# REGRESSION_EPOCH_EVIDENCE_CYCLE_GITIGNORE.md\n\nSTATUS: ${status}\nREASON_CODE: ${reason_code}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${NEXT_ACTION}\n\n${Object.entries(checks).map(([k, v]) => `- ${k}: ${v}`).join('\n')}\n`,
);

writeJsonDeterministic(path.join(MANUAL, 'regression_epoch_evidence_cycle_gitignore.json'), {
  schema_version: '1.0.0',
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: NEXT_ACTION,
  checks,
});

console.log(`[${status}] regression_epoch_evidence_cycle_gitignore — ${reason_code}`);
process.exit(ok ? 0 : 1);
