import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = path.resolve(process.cwd());
const EXEC_DIR = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC_DIR, 'gates/manual');
const NEXT_ACTION = 'npm run -s epoch:mega:proof:x2';
fs.mkdirSync(MANUAL, { recursive: true });

const gateSrc = fs.readFileSync(path.join(ROOT, 'scripts/verify/profit_foundation_freeze_gate.mjs'), 'utf8');
const gateMatch = gateSrc.match(/const required = \[(.*?)\];/s);
const gateList = gateMatch ? [...gateMatch[1].matchAll(/'([^']+)'/g)].map((m) => m[1]) : [];

const doc = fs.readFileSync(path.join(ROOT, 'EDGE_LAB/PROFIT_FOUNDATION_FREEZE.md'), 'utf8');
const sectionMatch = doc.match(/Required freeze artifacts \(gate SSOT\):([\s\S]*?)\n\nRequired foundation checks/);
const docList = sectionMatch ? [...sectionMatch[1].matchAll(/-\s+(.+)/g)].map((m) => m[1].trim()) : [];

const same = JSON.stringify(gateList) === JSON.stringify(docList);
const status = same ? 'PASS' : 'BLOCKED';
const reason_code = same ? 'NONE' : 'EC01';

writeMd(path.join(EXEC_DIR, 'REGRESSION_PROFIT_FOUNDATION_FREEZE_SSOT.md'), `# REGRESSION_PROFIT_FOUNDATION_FREEZE_SSOT.md\n\nSTATUS: ${status}\nREASON_CODE: ${reason_code}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${NEXT_ACTION}\n\n## GATE_REQUIRED\n${gateList.map((x) => `- ${x}`).join('\n') || '- none'}\n\n## DOC_REQUIRED\n${docList.map((x) => `- ${x}`).join('\n') || '- none'}\n`);
writeJsonDeterministic(path.join(MANUAL, 'regression_profit_foundation_freeze_ssot.json'), {
  schema_version: '1.0.0',
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: NEXT_ACTION,
  gate_required: gateList,
  doc_required: docList,
});
console.log(`[${status}] regression_profit_foundation_freeze_ssot — ${reason_code}`);
process.exit(same ? 0 : 1);
