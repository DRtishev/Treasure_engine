import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';

const ROOT = path.resolve(process.cwd());
const EXEC_DIR = path.join(ROOT, 'reports', 'evidence', 'EXECUTOR');
const MANUAL_DIR = path.join(EXEC_DIR, 'gates', 'manual');
const OUT_MD = path.join(EXEC_DIR, 'PROFIT_REAL_ENTRY.md');
const OUT_JSON = path.join(MANUAL_DIR, 'profit_real_entry.json');
const NEXT_ACTION = 'npm run -s epoch:profit:real:00';

fs.mkdirSync(MANUAL_DIR, { recursive: true });

function run(cmd) {
  const r = spawnSync('bash', ['-lc', cmd], { cwd: ROOT, encoding: 'utf8', env: process.env, maxBuffer: 32 * 1024 * 1024 });
  return {
    cmd,
    ec: Number.isInteger(r.status) ? r.status : 1,
    output: `${r.stdout || ''}${r.stderr || ''}`.trim(),
  };
}

function readStatus(abs) {
  if (!fs.existsSync(abs)) return 'MISSING';
  try {
    const data = JSON.parse(fs.readFileSync(abs, 'utf8'));
    return String(data.status || 'MISSING').toUpperCase();
  } catch {
    return 'MISSING';
  }
}

const records = [];
let status = 'PASS';
let reasonCode = 'NONE';
let message = 'Profit REAL entry completed.';

function recordStep(cmd, critical = true) {
  const rec = run(cmd);
  records.push(rec);
  if (rec.ec !== 0 && critical && status === 'PASS') {
    status = 'BLOCKED';
    reasonCode = 'EC01';
    message = `Command failed: ${cmd}`;
  }
  return rec;
}

const lockdown = recordStep('npm run -s verify:system:lockdown');
if (lockdown.ec !== 0 && status !== 'PASS') {
  status = 'BLOCKED';
  reasonCode = 'PRF01';
  message = 'SYSTEM_LOCKDOWN_CERT prerequisite failed.';
}

if (status === 'PASS') {
  recordStep('npm run -s edge:profit:00:real:drop:unpack', false);
  const unpackStatus = readStatus(path.join(ROOT, 'reports', 'evidence', 'EDGE_PROFIT_00', 'real', 'gates', 'manual', 'real_drop_unpack.json'));
  if (unpackStatus !== 'PASS') {
    status = unpackStatus === 'NEEDS_DATA' ? 'NEEDS_DATA' : 'FAIL';
    reasonCode = unpackStatus === 'NEEDS_DATA' ? 'RDROP01' : 'RDROP02';
    message = `REAL_DROP unpack status is ${unpackStatus}.`;
  }
}

if (status === 'PASS') {
  recordStep('npm run -s edge:profit:00:import:csv');
}
if (status === 'PASS') {
  recordStep('npm run -s executor:run:chain');
}

const laneBMode = fs.existsSync(path.join(ROOT, 'reports', 'evidence', 'EXECUTOR', 'COMMANDS_RUN.md'))
  ? (fs.readFileSync(path.join(ROOT, 'reports', 'evidence', 'EXECUTOR', 'COMMANDS_RUN.md'), 'utf8').match(/^LANE_B_MODE:\s*(\S+)\s*$/m)?.[1] || 'UNKNOWN')
  : 'MISSING';

const outputSections = records.map((r, i) => [
  `### STEP ${i + 1}`,
  '',
  '```',
  (r.output || '(no output)').slice(0, 2400),
  '```',
].join('\n')).join('\n\n');

writeMd(OUT_MD, `# PROFIT_REAL_ENTRY.md

STATUS: ${status}
REASON_CODE: ${reasonCode}
RUN_ID: ${RUN_ID}
NEXT_ACTION: ${NEXT_ACTION}

- lane_b_mode: ${laneBMode}

## COMMANDS

${records.map((r) => `- cmd: ${r.cmd} | ec=${r.ec}`).join('\n') || '- NONE'}

## OUTPUT

${outputSections || '- NONE'}
`);

writeJsonDeterministic(OUT_JSON, {
  schema_version: '1.0.0',
  status,
  reason_code: reasonCode,
  run_id: RUN_ID,
  message,
  next_action: NEXT_ACTION,
  lane_b_mode: laneBMode,
  commands: records.map((r) => ({ cmd: r.cmd, ec: r.ec })),
});

console.log(`[${status}] executor_profit_real_entry — ${reasonCode}`);
process.exit(status === 'PASS' ? 0 : 1);
