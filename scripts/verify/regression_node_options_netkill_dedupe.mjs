import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = path.resolve(process.cwd());
const EXEC_DIR = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC_DIR, 'gates/manual');
const NEXT_ACTION = 'npm run -s verify:regression:node-options-netkill-dedupe';
fs.mkdirSync(MANUAL, { recursive: true });

const src = fs.readFileSync(path.join(ROOT, 'scripts/executor/executor_run_chain.mjs'), 'utf8');
const hasIncludesDedupe = src.includes('normalized.includes(preloadAbs)');
const hasTrim = src.includes("String(existing || '').trim()");
const hasLiteralFlag = src.includes('`--require ${JSON.stringify(preloadAbs)}`');
const status = hasIncludesDedupe && hasTrim && hasLiteralFlag ? 'PASS' : 'FAIL';
const reason_code = status === 'PASS' ? 'NONE' : 'RG_NOD01';
writeMd(path.join(EXEC_DIR, 'REGRESSION_NODE_OPTIONS_NETKILL_DEDUPE.md'), `# REGRESSION_NODE_OPTIONS_NETKILL_DEDUPE.md\n\nSTATUS: ${status}\nREASON_CODE: ${reason_code}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${NEXT_ACTION}\n\n- has_includes_dedupe: ${hasIncludesDedupe}\n- has_trim: ${hasTrim}\n- has_literal_flag: ${hasLiteralFlag}\n`);
writeJsonDeterministic(path.join(MANUAL, 'regression_node_options_netkill_dedupe.json'), { schema_version:'1.0.0', status, reason_code, run_id:RUN_ID, next_action:NEXT_ACTION, has_includes_dedupe:hasIncludesDedupe, has_trim:hasTrim, has_literal_flag:hasLiteralFlag });
console.log(`[${status}] regression_node_options_netkill_dedupe — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
