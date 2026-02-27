import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

const src = fs.readFileSync(path.join(ROOT, '.gitignore'), 'utf8');
const hasAllow = /(^|\n)artifacts\/incoming\/ALLOW_NETWORK\n?/m.test(src);
const status = hasAllow ? 'PASS' : 'FAIL';
const reason_code = hasAllow ? 'NONE' : 'RG_GIT02';
writeMd(path.join(EXEC, 'REGRESSION_GITIGNORE_ALLOW_NETWORK.md'), `# REGRESSION_GITIGNORE_ALLOW_NETWORK.md\n\nSTATUS: ${status}\nREASON_CODE: ${reason_code}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: npm run -s verify:regression:gitignore-allow-network\n\n- has_rule_artifacts/incoming/ALLOW_NETWORK: ${hasAllow}\n`);
writeJsonDeterministic(path.join(MANUAL, 'regression_gitignore_allow_network.json'), { schema_version: '1.0.0', status, reason_code, run_id: RUN_ID, has_allow_network_rule: hasAllow });
console.log(`[${status}] regression_gitignore_allow_network — ${reason_code}`);
process.exit(hasAllow ? 0 : 1);
