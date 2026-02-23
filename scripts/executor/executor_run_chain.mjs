import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';

const ROOT = path.resolve(process.cwd());
const EXEC_DIR = path.join(ROOT, 'reports', 'evidence', 'EXECUTOR');
const COMMANDS_MD = path.join(EXEC_DIR, 'COMMANDS_RUN.md');
const SSOT_ENTRYPOINT = 'npm run -s executor:run:chain';

fs.mkdirSync(EXEC_DIR, { recursive: true });

const VERIFY_MODE = (process.env.VERIFY_MODE || 'GIT').toUpperCase();

function runShell(cmd) {
  const startedAt = new Date().toISOString();
  const result = spawnSync('bash', ['-lc', cmd], {
    cwd: ROOT,
    encoding: 'utf8',
    env: process.env,
    maxBuffer: 16 * 1024 * 1024,
  });
  const completedAt = new Date().toISOString();
  return {
    cmd,
    startedAt,
    completedAt,
    ec: Number.isInteger(result.status) ? result.status : 1,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
  };
}

const npmVersion = runShell('npm -v');
const commands = [
  'npm run -s verify:env:authority',
  'ENABLE_SQLITE_PERSISTENCE=0 TREASURE_OMIT_OPTIONAL_PROOF=1 npm ci --omit=optional',
  'npm run -s p0:all',
  'npm run -s gov:gov01',
  'npm run -s gov:integrity',
  'npm run -s edge:profit:01:super',
];

if (fs.existsSync(path.join(ROOT, 'scripts', 'edge', 'edge_lab', 'edge_walk_forward_lite.mjs'))) {
  commands.push('npm run -s edge:profit:01:wf-lite');
}

commands.push(
  'npm run -s export:final-validated',
  'npm run -s verify:edge:profit:00:release',
  'npm run -s edge:profit:00:doctor',
  'npm run -s verify:report:contradiction',
);

function render(records, status, reason) {
  const sections = records.map((r, idx) => {
    const out = (r.stdout + r.stderr).trimEnd();
    return [
      `## STEP ${idx + 1}`,
      `COMMAND: ${r.cmd}`,
      `EC: ${r.ec}`,
      `STARTED_AT: ${r.startedAt}`,
      `COMPLETED_AT: ${r.completedAt}`,
      '```',
      out || '(no output)',
      '```',
      '',
    ].join('\n');
  }).join('');

  const md = [
    '# COMMANDS_RUN.md',
    '',
    `STATUS: ${status}`,
    `REASON_CODE: ${reason}`,
    `NODE_VERSION: ${process.version}`,
    `NPM_VERSION: ${npmVersion.ec === 0 ? npmVersion.stdout.trim() : 'MISSING'}`,
    `RUN_ID: ${RUN_ID}`,
    `VERIFY_MODE: ${VERIFY_MODE}`,
    `NEXT_ACTION: ${SSOT_ENTRYPOINT}`,
    '',
    sections,
  ].join('\n');

  writeMd(COMMANDS_MD, md);
}

const records = [];
render(records, 'RUNNING', 'RUN01');

for (const cmd of commands) {
  const rec = runShell(cmd);
  records.push(rec);
  if (rec.ec !== 0) {
    render(records, 'BLOCKED', 'EC01');
    console.log('[BLOCKED] executor_run_chain — EC01');
    process.exit(1);
  }
  render(records, 'RUNNING', 'RUN01');
}

render(records, 'PASS', 'NONE');
console.log('[PASS] executor_run_chain — NONE');
