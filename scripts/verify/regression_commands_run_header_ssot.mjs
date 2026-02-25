import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';
import { COMMANDS_RUN_HEADER_LINES } from '../executor/commands_run_header_ssot.mjs';

const ROOT = path.resolve(process.cwd());
const EXEC_DIR = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC_DIR, 'gates/manual');
const NEXT_ACTION = 'npm run -s epoch:victory:seal';

const runChainPath = path.join(ROOT, 'scripts/executor/executor_run_chain.mjs');
const guardPath = path.join(ROOT, 'scripts/verify/executor_commands_run_guard.mjs');
const ssotPath = path.join(ROOT, 'scripts/executor/commands_run_header_ssot.mjs');

const runChainSrc = fs.readFileSync(runChainPath, 'utf8');
const guardSrc = fs.readFileSync(guardPath, 'utf8');
const ssotSrc = fs.readFileSync(ssotPath, 'utf8');

const executionModeIndex = COMMANDS_RUN_HEADER_LINES.indexOf('EXECUTION_MODE:');
const nextActionIndex = COMMANDS_RUN_HEADER_LINES.indexOf('NEXT_ACTION:');

const checks = {
  ssot_exports_symbol: ssotSrc.includes('export const COMMANDS_RUN_HEADER_LINES'),
  run_chain_imports_ssot: runChainSrc.includes("import { COMMANDS_RUN_HEADER_LINES } from './commands_run_header_ssot.mjs';"),
  run_chain_uses_ssot_lines: runChainSrc.includes('const headerLines = COMMANDS_RUN_HEADER_LINES.map((line) => {'),
  guard_imports_ssot: guardSrc.includes("import { COMMANDS_RUN_HEADER_LINES } from '../executor/commands_run_header_ssot.mjs';"),
  guard_uses_ssot_lines: guardSrc.includes('const requiredStarts = [...COMMANDS_RUN_HEADER_LINES];'),
  ssot_has_execution_mode: executionModeIndex >= 0,
  ssot_has_next_action: nextActionIndex >= 0,
  ssot_execution_mode_before_next_action: executionModeIndex >= 0 && nextActionIndex >= 0 && executionModeIndex < nextActionIndex,
};

const ok = Object.values(checks).every(Boolean);
const status = ok ? 'PASS' : 'FAIL';
const reason_code = ok ? 'NONE' : 'RG_CMD01';

writeMd(path.join(EXEC_DIR, 'REGRESSION_COMMANDS_RUN_HEADER_SSOT.md'), `# REGRESSION_COMMANDS_RUN_HEADER_SSOT.md\n\nSTATUS: ${status}\nREASON_CODE: ${reason_code}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${NEXT_ACTION}\n\n${Object.entries(checks).map(([k, v]) => `- ${k}: ${v}`).join('\n')}\n`);

writeJsonDeterministic(path.join(MANUAL, 'regression_commands_run_header_ssot.json'), {
  schema_version: '1.0.0',
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: NEXT_ACTION,
  checks,
});

console.log(`[${status}] regression_commands_run_header_ssot — ${reason_code}`);
process.exit(ok ? 0 : 1);
