import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

const p = path.join(ROOT, 'NODE_TRUTH.md');
if (!fs.existsSync(p)) {
  writeMd(path.join(EXEC, 'REGRESSION_NODE_TRUTH_ENFORCEMENT.md'), `# REGRESSION_NODE_TRUTH_ENFORCEMENT.md\n\nSTATUS: BLOCKED\nREASON_CODE: NT01\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: npm run -s env:node22:doctor\n`);
  writeJsonDeterministic(path.join(MANUAL, 'regression_node_truth_enforcement.json'), { schema_version: '1.0.0', status: 'BLOCKED', reason_code: 'NT01', run_id: RUN_ID });
  console.log('[BLOCKED] regression_node_truth_enforcement — NT01');
  process.exit(2);
}
const doc = fs.readFileSync(p, 'utf8');
const family = Number((doc.match(/allowed_family:\s*(\d+)/) || [])[1]);
const pinned = (doc.match(/hard_pinned_minor:\s*([0-9.]+)/) || [])[1] || 'UNKNOWN';
const major = Number(process.version.replace(/^v/, '').split('.')[0]);
const ok = Number.isFinite(family) && major === family;
const status = ok ? 'PASS' : 'BLOCKED';
const reason = ok ? 'NONE' : 'NT01';
writeMd(path.join(EXEC, 'REGRESSION_NODE_TRUTH_ENFORCEMENT.md'), `# REGRESSION_NODE_TRUTH_ENFORCEMENT.md\n\nSTATUS: ${status}\nREASON_CODE: ${reason}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: npm run -s env:node22:doctor\n\n- process_version: ${process.version}\n- allowed_family: ${family}\n- hard_pinned_minor: ${pinned}\n`);
writeJsonDeterministic(path.join(MANUAL, 'regression_node_truth_enforcement.json'), { schema_version: '1.0.0', status, reason_code: reason, run_id: RUN_ID, process_version: process.version, allowed_family: family, hard_pinned_minor: pinned });
console.log(`[${status}] regression_node_truth_enforcement — ${reason}`);
process.exit(ok ? 0 : 2);
