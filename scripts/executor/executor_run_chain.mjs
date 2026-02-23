import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';

const ROOT = path.resolve(process.cwd());
const EXEC_DIR = path.join(ROOT, 'reports', 'evidence', 'EXECUTOR');
const COMMANDS_MD = path.join(EXEC_DIR, 'COMMANDS_RUN.md');

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
  'npm run -s export:final-validated',
  'npm run -s verify:edge:profit:00:release',
  'npm run -s edge:profit:00:doctor',
];

const records = [];
for (const cmd of commands) {
  const rec = runShell(cmd);
  records.push(rec);
  if (rec.ec !== 0) break;
}

const firstFail = records.find((r) => r.ec !== 0);
const status = firstFail ? 'BLOCKED' : 'PASS';
const reason = firstFail ? 'EC01' : 'NONE';
const nextAction = firstFail ? firstFail.cmd : 'npm run -s verify:report:contradiction';

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
  `NEXT_ACTION: ${nextAction}`,
  '',
  sections,
].join('\n');

writeMd(COMMANDS_MD, md);
console.log(`[${status}] executor_run_chain — ${reason}`);
process.exit(firstFail ? 1 : 0);
