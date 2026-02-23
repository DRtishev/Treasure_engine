import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';

const ROOT = path.resolve(process.cwd());
const EXECUTOR_DIR = path.join(ROOT, 'reports', 'evidence', 'EXECUTOR');
const MANUAL_DIR = path.join(EXECUTOR_DIR, 'gates', 'manual');
const NODE_TRUTH = path.join(ROOT, 'NODE_TRUTH.md');
const NEXT_ACTION = 'source ~/.nvm/nvm.sh && nvm install 22.22.0 && nvm use 22.22.0';

fs.mkdirSync(MANUAL_DIR, { recursive: true });

function parseNodeTruth(text) {
  const allowedFamily = (text.match(/allowed_family:\s*(\d+)/) || [])[1] || '';
  const pinned = (text.match(/hard_pinned_minor:\s*([0-9]+\.[0-9]+\.[0-9]+)/) || [])[1] || '';
  return { allowed_family: allowedFamily, hard_pinned_minor: pinned };
}

let status = 'PASS';
let reasonCode = 'NONE';
let message = 'Node authority preflight passed.';
let allowedFamily = '';
let pinnedMinor = '';
let contractLoaded = false;
let nodeTruthSha = 'MISSING';
const runtimeExecPath = process.execPath || 'UNKNOWN';
const runtimePlatform = process.platform || 'UNKNOWN';
const runtimeArch = process.arch || 'UNKNOWN';

if (!fs.existsSync(NODE_TRUTH)) {
  status = 'NEEDS_DATA';
  reasonCode = 'ENV01';
  message = 'NODE_TRUTH.md missing.';
} else {
  const nodeTruthRaw = fs.readFileSync(NODE_TRUTH, 'utf8');
  nodeTruthSha = crypto.createHash('sha256').update(nodeTruthRaw).digest('hex');
  const parsed = parseNodeTruth(nodeTruthRaw);
  allowedFamily = parsed.allowed_family;
  pinnedMinor = parsed.hard_pinned_minor;
  contractLoaded = Boolean(allowedFamily && pinnedMinor);
  const runtime = process.version.replace(/^v/, '');
  const familyOk = allowedFamily && process.version.startsWith(`v${allowedFamily}.`);
  const pinnedOk = pinnedMinor && runtime.startsWith(`${pinnedMinor}`);
  if (!contractLoaded || !familyOk || !pinnedOk) {
    status = 'NEEDS_DATA';
    reasonCode = 'ENV01';
    message = 'Node authority mismatch vs NODE_TRUTH.';
  }
}

writeMd(path.join(EXECUTOR_DIR, 'ENV_AUTHORITY.md'), `# ENV_AUTHORITY.md\n\nSTATUS: ${status}\nREASON_CODE: ${reasonCode}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${NEXT_ACTION}\n\n- node_truth_path: NODE_TRUTH.md\n- contract_loaded: ${contractLoaded}\n- allowed_family: ${allowedFamily || 'UNKNOWN'}\n- expected_pinned_minor: ${pinnedMinor || 'UNKNOWN'}\n- runtime_node_version: ${process.version}\n- runtime_exec_path: ${runtimeExecPath}\n- platform: ${runtimePlatform}\n- arch: ${runtimeArch}\n- node_truth_sha256: ${nodeTruthSha}\n- verdict: ${status}\n`);

writeJsonDeterministic(path.join(MANUAL_DIR, 'env_authority.json'), {
  schema_version: '1.0.0',
  status,
  reason_code: reasonCode,
  run_id: RUN_ID,
  message,
  next_action: NEXT_ACTION,
  node_truth_path: 'NODE_TRUTH.md',
  contract_loaded: contractLoaded,
  allowed_family: allowedFamily || 'UNKNOWN',
  expected_pinned_minor: pinnedMinor || 'UNKNOWN',
  runtime_node_version: process.version,
  runtime_exec_path: runtimeExecPath,
  platform: runtimePlatform,
  arch: runtimeArch,
  node_truth_sha256: nodeTruthSha,
  verdict: status,
});

console.log(`[${status}] env_node_truth_authority — ${reasonCode}`);
process.exit(status === 'PASS' ? 0 : 1);
