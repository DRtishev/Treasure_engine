import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

const src = fs.readFileSync(path.join(ROOT, 'scripts/verify/regression_node_truth_enforcement.mjs'), 'utf8');
const hasNextAction = src.includes('npm run -s env:node22:doctor');
const hasScriptOnlyPattern = /NEXT_ACTION:\s*npm run -s env:node22:doctor/.test(fs.readFileSync(path.join(EXEC, 'REGRESSION_NODE_TRUTH_ENFORCEMENT.md'), 'utf8'));
const ok = hasNextAction && hasScriptOnlyPattern;
const status = ok ? 'PASS' : 'FAIL';
const reason_code = ok ? 'NONE' : 'RG_NODE02';
writeMd(path.join(EXEC, 'REGRESSION_NODE_TRUTH_NEXT_ACTION_CONTRACT.md'), `# REGRESSION_NODE_TRUTH_NEXT_ACTION_CONTRACT.md\n\nSTATUS: ${status}\nREASON_CODE: ${reason_code}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: npm run -s verify:regression:node-truth-next-action-contract\n\n- source_has_next_action: ${hasNextAction}\n- evidence_has_script_only_next_action: ${hasScriptOnlyPattern}\n`);
writeJsonDeterministic(path.join(MANUAL, 'regression_node_truth_next_action_contract.json'), { schema_version: '1.0.0', status, reason_code, run_id: RUN_ID, source_has_next_action: hasNextAction, evidence_has_script_only_next_action: hasScriptOnlyPattern });
console.log(`[${status}] regression_node_truth_next_action_contract — ${reason_code}`);
process.exit(ok ? 0 : 1);
