import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = path.resolve(process.cwd());
const EXEC_DIR = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC_DIR, 'gates/manual');
const NEXT_ACTION = 'npm run -s verify:regression:node-options-no-overwrite';

const src = fs.readFileSync(path.join(ROOT, 'scripts/executor/executor_run_chain.mjs'), 'utf8');
const staticBan = /process\.env\.NODE_OPTIONS\s*=/.test(src);
const additive = src.includes('buildNetKillNodeOptions(process.env.NODE_OPTIONS)');
const persistence = src.includes('normalized.includes(preloadAbs)') && src.includes('preloadFlag');
const childBypassHeuristic = /child_process\.(spawn|spawnSync|exec|execSync)\([\s\S]*NODE_OPTIONS\s*:/.test(src);
const status = !staticBan && additive && persistence && !childBypassHeuristic ? 'PASS' : 'FAIL';
const reason_code = status === 'PASS' ? 'NONE' : 'RG_NOD02';

writeMd(path.join(EXEC_DIR, 'REGRESSION_NODE_OPTIONS_NO_OVERWRITE.md'), `# REGRESSION_NODE_OPTIONS_NO_OVERWRITE.md\n\nSTATUS: ${status}\nREASON_CODE: ${reason_code}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${NEXT_ACTION}\n\n- has_direct_overwrite: ${staticBan}\n- has_additive_merge: ${additive}\n- has_preload_persistence: ${persistence}\n- child_bypass_heuristic: ${childBypassHeuristic}\n`);
writeJsonDeterministic(path.join(MANUAL, 'regression_node_options_no_overwrite.json'), { schema_version:'1.0.0', status, reason_code, run_id:RUN_ID, next_action:NEXT_ACTION, has_direct_overwrite:staticBan, has_additive_merge:additive, has_preload_persistence:persistence, child_bypass_heuristic:childBypassHeuristic });
console.log(`[${status}] regression_node_options_no_overwrite — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
