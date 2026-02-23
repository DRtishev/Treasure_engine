import fs from 'node:fs';
import path from 'node:path';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';

const ROOT = path.resolve(process.cwd());
const EXEC_DIR = path.join(ROOT, 'reports', 'evidence', 'EXECUTOR');
const COMMANDS_RUN = path.join(EXEC_DIR, 'COMMANDS_RUN.md');
const OUT_MD = path.join(EXEC_DIR, 'COMMANDS_RUN_GUARD.md');
const OUT_JSON = path.join(EXEC_DIR, 'gates', 'manual', 'commands_run_guard.json');
const NEXT_ACTION = 'npm run -s executor:run:chain';

fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });

const requiredStarts = [
  '# COMMANDS_RUN',
  'GENERATED_BY: scripts/executor/executor_run_chain.mjs',
  'NODE_VERSION:',
  'NPM_VERSION:',
  'RUN_ID:',
  'VERIFY_MODE:',
  'LANE_A_STATUS:',
  'LANE_B_STATUS:',
  'LANE_B_MODE:',
  'NEXT_ACTION:',
];
const allowedHeadings = new Set(['# COMMANDS_RUN', '## STEP', '## LANE_SUMMARY', '## NOTES']);

let status = 'PASS';
let reasonCode = 'NONE';
let message = 'COMMANDS_RUN guard passed.';
const diagnostics = [];

if (!fs.existsSync(COMMANDS_RUN)) {
  status = 'FAIL';
  reasonCode = 'LOG01';
  message = 'Missing reports/evidence/EXECUTOR/COMMANDS_RUN.md.';
  diagnostics.push('missing_file:reports/evidence/EXECUTOR/COMMANDS_RUN.md');
} else {
  const text = fs.readFileSync(COMMANDS_RUN, 'utf8');
  const lines = text.split(/\r?\n/);

  for (let i = 0; i < requiredStarts.length; i++) {
    if (!String(lines[i] || '').startsWith(requiredStarts[i])) {
      status = 'FAIL';
      reasonCode = 'LOG01';
      message = 'COMMANDS_RUN required SSOT header lines are missing or reordered.';
      diagnostics.push(`missing_or_reordered_header:${requiredStarts[i]}`);
      break;
    }
  }

  const headings = lines
    .map((line, idx) => ({ line: line.trim(), idx: idx + 1 }))
    .filter((x) => /^(#{1,6})\s+/.test(x.line));

  for (const h of headings) {
    if (![...allowedHeadings].some((ok) => h.line.startsWith(ok))) {
      status = 'FAIL';
      reasonCode = 'LOG02';
      message = 'COMMANDS_RUN contains disallowed heading/tail content.';
      diagnostics.push(`disallowed_heading:L${h.idx}:${h.line}`);
      break;
    }
  }

  const laneAHeader = (text.match(/^LANE_A_STATUS:\s*(\S+)\s*$/m) || [])[1] || 'MISSING';
  const laneBHeader = (text.match(/^LANE_B_STATUS:\s*(\S+)\s*$/m) || [])[1] || 'MISSING';
  const laneBMode = (text.match(/^LANE_B_MODE:\s*(\S+)\s*$/m) || [])[1] || 'MISSING';

  const stepMatches = [...text.matchAll(/^## STEP\s+\d+[\s\S]*?^LANE:\s*([AB])\s*$[\s\S]*?^EC:\s*(\d+)\s*$/gm)];
  const laneASteps = stepMatches.filter((m) => m[1] === 'A');
  const laneBSteps = stepMatches.filter((m) => m[1] === 'B');
  const laneAFailed = laneASteps.filter((m) => Number(m[2]) !== 0).length;
  const laneBFailed = laneBSteps.filter((m) => Number(m[2]) !== 0).length;

  if (status === 'PASS' && laneAHeader === 'PASS' && laneAFailed > 0) {
    status = 'FAIL';
    reasonCode = 'LOG02';
    message = 'LANE_A_STATUS=PASS but lane A includes failing steps.';
    diagnostics.push(`lane_a_header_mismatch:failed_steps=${laneAFailed}`);
  }

  if (status === 'PASS' && laneBHeader === 'NEEDS_DATA' && laneBMode !== 'DRY_RUN') {
    status = 'FAIL';
    reasonCode = 'LOG02';
    message = 'LANE_B_STATUS=NEEDS_DATA is allowed only when LANE_B_MODE=DRY_RUN.';
    diagnostics.push('lane_b_needs_data_without_dry_run');
  }

  if (status === 'PASS' && laneBHeader === 'PASS' && laneBFailed > 0) {
    status = 'FAIL';
    reasonCode = 'LOG02';
    message = 'LANE_B_STATUS=PASS but lane B includes failing steps.';
    diagnostics.push(`lane_b_header_mismatch:failed_steps=${laneBFailed}`);
  }
}

writeMd(OUT_MD, `# COMMANDS_RUN_GUARD.md\n\nSTATUS: ${status}\nREASON_CODE: ${reasonCode}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${NEXT_ACTION}\n\n- commands_run_path: reports/evidence/EXECUTOR/COMMANDS_RUN.md\n- diagnostics_count: ${diagnostics.length}\n\n## DIAGNOSTICS\n\n${diagnostics.length ? diagnostics.map((d) => `- ${d}`).join('\n') : '- NONE'}\n`);

writeJsonDeterministic(OUT_JSON, {
  schema_version: '1.0.0',
  status,
  reason_code: reasonCode,
  run_id: RUN_ID,
  message,
  next_action: NEXT_ACTION,
  commands_run_path: 'reports/evidence/EXECUTOR/COMMANDS_RUN.md',
  diagnostics,
});

console.log(`[${status}] executor_commands_run_guard — ${reasonCode}`);
process.exit(status === 'PASS' ? 0 : 1);
