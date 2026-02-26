import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const scripts = pkg.scripts || {};

const contracts = [
  ['epoch:victory:seal', '_epoch:victory:seal'],
  ['epoch:mega:proof:x2', '_epoch:mega:proof:x2'],
  ['epoch:foundation:seal', '_epoch:foundation:seal'],
  ['epoch:victory:triage', '_epoch:victory:triage'],
  ['verify:repo:byte-audit:x2', '_verify:repo:byte-audit:x2'],
  ['verify:public:data:readiness', '_verify:public:data:readiness'],
];

const offenders = [];
for (const [outer, inner] of contracts) {
  const outerValue = scripts[outer] || 'MISSING';
  const innerValue = scripts[inner] || 'MISSING';
  const expectedPrefix = `bash scripts/ops/node_authority_run.sh npm run -s ${inner}`;
  if (outerValue !== expectedPrefix || innerValue === 'MISSING') {
    offenders.push({ outer, outer_value: outerValue, expected: expectedPrefix, inner, inner_value: innerValue });
  }
}

const ok = offenders.length === 0;
const status = ok ? 'PASS' : 'BLOCKED';
const reason = ok ? 'NONE' : 'RG_NODE_WRAP01';

const offenderLines = offenders.length === 0
  ? '- offenders: []\n'
  : offenders.map((o) => `- offender: ${o.outer} expected='${o.expected}' actual='${o.outer_value}' inner='${o.inner}' inner_value='${o.inner_value}'`).join('\n') + '\n';

writeMd(path.join(EXEC, 'REGRESSION_NODE_WRAP_CONTRACT.md'), `# REGRESSION_NODE_WRAP_CONTRACT.md\n\nSTATUS: ${status}\nREASON_CODE: ${reason}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: npm run -s epoch:victory:seal\n\n${offenderLines}`);
writeJsonDeterministic(path.join(MANUAL, 'regression_node_wrap_contract.json'), {
  schema_version: '1.0.0',
  status,
  reason_code: reason,
  run_id: RUN_ID,
  offenders,
});

console.log(`[${status}] regression_node_wrap_contract — ${reason}`);
process.exit(ok ? 0 : 2);
