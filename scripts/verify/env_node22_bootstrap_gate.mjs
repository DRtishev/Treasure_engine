import fs from 'node:fs';
import path from 'node:path';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';

const ROOT = path.resolve(process.cwd());
const EXEC_DIR = path.join(ROOT, 'reports', 'evidence', 'EXECUTOR');
const MANUAL_DIR = path.join(EXEC_DIR, 'gates', 'manual');
const OUT_MD = path.join(EXEC_DIR, 'NODE22_BOOTSTRAP.md');
const OUT_JSON = path.join(MANUAL_DIR, 'node22_bootstrap.json');
const NEXT_ACTION = 'npm run -s epoch:edge:profit:public:00:x2:node22';

fs.mkdirSync(MANUAL_DIR, { recursive: true });

const target = 'v22.22.0';
const stage = process.env.BOOTSTRAP_STAGE || 'inspect';
const event = process.env.BOOTSTRAP_EVENT || 'inspect';
const errorClass = process.env.BOOTSTRAP_ERROR_CLASS || 'NONE';
const elapsed = Number(process.env.BOOTSTRAP_ELAPSED_SEC || 0);
const nodeVersion = process.env.BOOTSTRAP_NODE_VERSION || process.version;

function bucket(sec) {
  if (!Number.isFinite(sec) || sec <= 0) return '0s';
  if (sec <= 30) return '0-30s';
  if (sec <= 60) return '31-60s';
  if (sec <= 120) return '61-120s';
  if (sec <= 240) return '121-240s';
  return '241+s';
}

let status = 'PASS';
let reasonCode = 'NONE';
let message = `Node22 bootstrap gate satisfied (${nodeVersion}).`;
if (event === 'timeout') {
  status = 'NEEDS_DATA';
  reasonCode = 'ENV02';
  message = `Node22 bootstrap timed out at stage=${stage}.`;
} else if (event === 'fail') {
  status = 'NEEDS_DATA';
  reasonCode = 'ENV01';
  message = `Node22 bootstrap failed at stage=${stage}.`;
} else if (event === 'inspect' && nodeVersion !== target) {
  status = 'NEEDS_DATA';
  reasonCode = 'ENV01';
  message = `Node runtime mismatch: got ${nodeVersion}, need ${target}.`;
}

writeMd(OUT_MD, `# NODE22_BOOTSTRAP.md\n\nSTATUS: ${status}\nREASON_CODE: ${reasonCode}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${NEXT_ACTION}\n\n- target_node: ${target}\n- node_version: ${nodeVersion}\n- stage: ${stage}\n- event: ${event}\n- error_class: ${errorClass}\n- elapsed_bucket: ${bucket(elapsed)}\n`);

writeJsonDeterministic(OUT_JSON, {
  schema_version: '1.0.0',
  status,
  reason_code: reasonCode,
  run_id: RUN_ID,
  message,
  next_action: NEXT_ACTION,
  target_node: target,
  node_version: nodeVersion,
  stage,
  event,
  error_class: errorClass,
  elapsed_bucket: bucket(elapsed),
});

console.log(`[${status}] env_node22_bootstrap_gate — ${reasonCode}`);
process.exit(status === 'PASS' ? 0 : 1);
