import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
const SELFTEST = path.join(EXEC, 'selftest');
fs.mkdirSync(MANUAL, { recursive: true });

const res = spawnSync('bash', ['scripts/ops/node_authority_run.sh', '--selftest'], { cwd: ROOT, encoding: 'utf8' });

const passJsonPath = path.join(SELFTEST, 'gates/manual/node_authority_receipt_HOST_PASS.json');
const blockedJsonPath = path.join(SELFTEST, 'gates/manual/node_authority_receipt_BLOCKED_NT02.json');
const expectedPass = '{"schema_version":"1.0.0","status":"PASS","reason_code":"NONE","run_id":"NODEAUTH_SELFTEST","next_action":"npm run -s ops:node:truth","backend":"HOST_NODE22","required_node":"22.22.0","node_runtime":"v22.22.0","image_tag":"NONE","image_id":"NONE"}\n';
const expectedBlocked = '{"schema_version":"1.0.0","status":"BLOCKED","reason_code":"NT02","run_id":"NODEAUTH_SELFTEST","next_action":"npm run -s ops:node:truth","backend":"NO_NODE22_BACKEND","required_node":"22.22.0","node_runtime":"UNKNOWN","image_tag":"NONE","image_id":"NONE"}\n';

let offenders = [];
if (res.status !== 0) offenders.push(`selftest_exit_${res.status}`);
if (!fs.existsSync(passJsonPath)) offenders.push('missing_pass_receipt');
if (!fs.existsSync(blockedJsonPath)) offenders.push('missing_blocked_receipt');
if (fs.existsSync(passJsonPath) && fs.readFileSync(passJsonPath, 'utf8') !== expectedPass) offenders.push('pass_receipt_mismatch');
if (fs.existsSync(blockedJsonPath) && fs.readFileSync(blockedJsonPath, 'utf8') !== expectedBlocked) offenders.push('blocked_receipt_mismatch');

const ok = offenders.length === 0;
const status = ok ? 'PASS' : 'BLOCKED';
const reason = ok ? 'NONE' : 'RG_NODE_BACKEND01';

writeMd(path.join(EXEC, 'REGRESSION_NODE_BACKEND_RECEIPT_CONTRACT.md'), `# REGRESSION_NODE_BACKEND_RECEIPT_CONTRACT.md\n\nSTATUS: ${status}\nREASON_CODE: ${reason}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: npm run -s epoch:victory:seal\n\n- selftest_exit: ${res.status ?? 'NULL'}\n- offenders: ${offenders.length ? offenders.join(',') : '[]'}\n`);
writeJsonDeterministic(path.join(MANUAL, 'regression_node_backend_receipt_contract.json'), {
  schema_version: '1.0.0',
  status,
  reason_code: reason,
  run_id: RUN_ID,
  selftest_exit: res.status,
  offenders,
});

console.log(`[${status}] regression_node_backend_receipt_contract — ${reason}`);
process.exit(ok ? 0 : 2);
