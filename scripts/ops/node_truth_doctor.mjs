import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';

const ROOT = process.cwd();
const p = path.join(ROOT, 'NODE_TRUTH.md');
let family = 'UNKNOWN';
let pinned = 'UNKNOWN';
if (fs.existsSync(p)) {
  const doc = fs.readFileSync(p, 'utf8');
  family = (doc.match(/allowed_family:\s*(\d+)/) || [,'UNKNOWN'])[1];
  pinned = (doc.match(/hard_pinned_minor:\s*([0-9.]+)/) || [,'UNKNOWN'])[1];
}
const current = process.version;
const next_action = 'npm run -s env:node22:doctor';
const status = String(current).startsWith(`v${family}.`) ? 'PASS' : 'BLOCKED';
writeMd(path.join(ROOT, 'reports/evidence/EXECUTOR/NODE_TRUTH_DOCTOR.md'), `# NODE_TRUTH_DOCTOR.md\n\nSTATUS: ${status}\nREASON_CODE: ${status === 'PASS' ? 'NONE' : 'NT01'}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${next_action}\n\n- current_node: ${current}\n- allowed_family: ${family}\n- hard_pinned_minor: ${pinned}\n`);
console.log(`[${status}] node_truth_doctor current=${current} required_family=${family} pinned=${pinned}`);
process.exit(status === 'PASS' ? 0 : 2);
