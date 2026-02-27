import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = path.resolve(process.cwd());
const EXEC_DIR = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC_DIR, 'gates/manual');
const NEXT_ACTION = 'npm run -s epoch:mega:proof:x2';
fs.mkdirSync(MANUAL, { recursive: true });
const src = fs.readFileSync(path.join(ROOT, 'scripts/executor/executor_with_node22.sh'), 'utf8');

const hasTimeout = src.includes('NODE22_WRAPPED_TIMEOUT') && /timeout\s+"\$NODE22_WRAPPED_TIMEOUT"/.test(src);
const hasExecForwarding = src.includes('scripts/ops/node_authority_run.sh "$@"');
const hasTimeoutMapping = /if \[\[ \$rc -eq 124 \]\]; then\n\s+emit_gate "wrapped_cmd" "timeout" "ENV02"/.test(src);
const hasNvmUsage = /nvm\.sh|nvm install|nvm use/.test(src);

const status = hasTimeout && hasExecForwarding && hasTimeoutMapping && !hasNvmUsage ? 'PASS' : 'BLOCKED';
const reason_code = status === 'PASS' ? 'NONE' : 'ENV02';
writeMd(path.join(EXEC_DIR, 'REGRESSION_NODE22_WRAPPER_TIMEOUT.md'), `# REGRESSION_NODE22_WRAPPER_TIMEOUT.md\n\nSTATUS: ${status}\nREASON_CODE: ${reason_code}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${NEXT_ACTION}\n\n- has_overall_timeout: ${hasTimeout}\n- has_exec_forwarding_pattern: ${hasExecForwarding}\n- has_timeout_error_mapping: ${hasTimeoutMapping}\n- has_nvm_usage: ${hasNvmUsage}\n`);
writeJsonDeterministic(path.join(MANUAL, 'regression_node22_wrapper_timeout.json'), {
  schema_version: '1.0.0',
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: NEXT_ACTION,
  has_overall_timeout: hasTimeout,
  has_exec_forwarding_pattern: hasExecForwarding,
  has_timeout_error_mapping: hasTimeoutMapping,
  has_nvm_usage: hasNvmUsage,
});
console.log(`[${status}] regression_node22_wrapper_timeout — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
