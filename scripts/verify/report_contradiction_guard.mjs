import fs from 'node:fs';
import path from 'node:path';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';

const ROOT = path.resolve(process.cwd());
const EXEC_DIR = path.join(ROOT, 'reports', 'evidence', 'EXECUTOR');
const MANUAL_DIR = path.join(EXEC_DIR, 'gates', 'manual');
const ENV_JSON = path.join(MANUAL_DIR, 'env_authority.json');
const COMMANDS_MD = path.join(EXEC_DIR, 'COMMANDS_RUN.md');
const RUN_CHAIN_CMD = 'npm run -s executor:run:chain';

fs.mkdirSync(MANUAL_DIR, { recursive: true });

let status = 'PASS';
let reasonCode = 'NONE';
let message = 'No contradiction between env authority and command log node versions.';
let envNode = 'MISSING';
let cmdNode = 'MISSING';
let nextAction = 'npm run -s gov:integrity';

if (!fs.existsSync(ENV_JSON) || !fs.existsSync(COMMANDS_MD)) {
  status = 'NEEDS_DATA';
  reasonCode = 'ND_LOG01';
  message = 'Missing env_authority.json or COMMANDS_RUN.md.';
  nextAction = RUN_CHAIN_CMD;
} else {
  const env = JSON.parse(fs.readFileSync(ENV_JSON, 'utf8'));
  const md = fs.readFileSync(COMMANDS_MD, 'utf8');
  envNode = String(env.runtime_node_version || 'MISSING');

  const headerMatch = md.match(/^NODE_VERSION:\s*(v[0-9]+\.[0-9]+\.[0-9]+)\s*$/m);
  if (!headerMatch) {
    status = 'NEEDS_DATA';
    reasonCode = 'ND_LOG01';
    message = 'COMMANDS_RUN.md missing strict SSOT NODE_VERSION header line.';
    nextAction = RUN_CHAIN_CMD;
  } else {
    cmdNode = headerMatch[1];
    if (envNode !== cmdNode) {
      status = 'FAIL';
      reasonCode = 'REP01';
      message = `Node version contradiction detected env=${envNode} commands=${cmdNode}.`;
      nextAction = RUN_CHAIN_CMD;
    }
  }
}

writeMd(path.join(EXEC_DIR, 'REPORT_CONTRADICTION_GUARD.md'), `# REPORT_CONTRADICTION_GUARD.md\n\nSTATUS: ${status}\nREASON_CODE: ${reasonCode}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${nextAction}\n\n- env_authority_json: reports/evidence/EXECUTOR/gates/manual/env_authority.json\n- commands_run_md: reports/evidence/EXECUTOR/COMMANDS_RUN.md\n- env_runtime_node_version: ${envNode}\n- commands_runtime_node_version: ${cmdNode}\n`);

writeJsonDeterministic(path.join(MANUAL_DIR, 'report_contradiction_guard.json'), {
  schema_version: '1.0.0',
  status,
  reason_code: reasonCode,
  run_id: RUN_ID,
  message,
  next_action: nextAction,
  env_runtime_node_version: envNode,
  commands_runtime_node_version: cmdNode,
});

console.log(`[${status}] report_contradiction_guard — ${reasonCode}`);
process.exit(status === 'PASS' ? 0 : 1);
