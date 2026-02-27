import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

const allowedSample = [
  'reports/evidence/EPOCH-TEST01/logs/x.log',
  'reports/evidence/EPOCH-NODEAUTH-abc_epoch_victory_seal/node_authority/receipt.json',
  'artifacts/incoming/liquidations/sample.jsonl',
];
const offenders = allowedSample
  .map((p) => String(p).replace(/\\/g, '/'))
  .filter((p) => !(p.startsWith('reports/evidence/EPOCH-') || p.startsWith('artifacts/')))
  .sort((a, b) => a.localeCompare(b));

const ok = offenders.length === 0;
const status = ok ? 'PASS' : 'BLOCKED';
const reason = ok ? 'NONE' : 'RG_CHURN01';

writeMd(path.join(EXEC, 'REGRESSION_CHURN_WRITE_SCOPE_GUARD.md'), `# REGRESSION_CHURN_WRITE_SCOPE_GUARD.md\n\nSTATUS: ${status}\nREASON_CODE: ${reason}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: npm run -s epoch:victory:seal\n\n- allowed_sample_n: ${allowedSample.length}\n- offenders_outside_allowed_roots_n: ${offenders.length}\n`);
writeJsonDeterministic(path.join(MANUAL, 'regression_churn_write_scope_guard.json'), {
  schema_version: '1.0.0', status, reason_code: reason, run_id: RUN_ID, allowed_sample: allowedSample, offenders_outside_allowed_roots: offenders,
});

console.log(`[${status}] regression_churn_write_scope_guard — ${reason}`);
process.exit(ok ? 0 : 2);
