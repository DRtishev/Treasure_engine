import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const evidenceEpoch = process.env.EVIDENCE_EPOCH || 'EPOCH-EDGE-LOCAL-MEGA';
const runLabel = process.env.EDGE_RUN_LABEL || 'run';
const base = path.join('reports/evidence', evidenceEpoch, 'mega');
const gatesDir = path.join('reports/evidence', evidenceEpoch, 'gates');
fs.mkdirSync(base, { recursive: true });
fs.mkdirSync(gatesDir, { recursive: true });
const initialTrackedStatus = spawnSync('git', ['status', '--porcelain', '--untracked-files=no'], { encoding: 'utf8' }).stdout;

const summary = [];

for (const epoch of ['31', '32', '33', '34', '35', '36', '37', '38', '39', '40']) {
  const logPath = path.join(gatesDir, `verify_epoch${epoch}_${runLabel}.log`);
  try {
    const result = spawnSync('npm', ['run', `verify:epoch${epoch}`], { encoding: 'utf8', env: process.env });
    const logText = [
      `command=npm run verify:epoch${epoch}`,
      `exit_code=${result.status ?? 'null'}`,
      '',
      result.stdout || '',
      result.stderr || ''
    ].join('\n');
    fs.writeFileSync(logPath, logText);
    const passed = result.status === 0;
    summary.push({ epoch, status: passed ? 'PASS' : 'FAIL', log: logPath });
    if (!passed) break;
  } catch (error) {
    fs.writeFileSync(logPath, `spawn_error=${error.message}\n${error.stack || ''}\n`);
    summary.push({ epoch, status: 'FAIL', log: logPath });
    break;
  }
}

const cleanCloneLog = path.join(base, `clean_clone_${runLabel}.log`);
if (process.env.ENABLE_CLEAN_CLONE === '1') {
  const cc = spawnSync('npm', ['run', 'verify:clean-clone'], { encoding: 'utf8', env: process.env });
  fs.writeFileSync(cleanCloneLog, `${cc.stdout || ''}\n${cc.stderr || ''}`);
  summary.push({ epoch: 'clean-clone', status: cc.status === 0 ? 'PASS' : 'FAIL', log: cleanCloneLog });
} else {
  fs.writeFileSync(cleanCloneLog, 'SKIPPED (set ENABLE_CLEAN_CLONE=1 to run).\n');
  summary.push({ epoch: 'clean-clone', status: 'SKIPPED', log: cleanCloneLog });
}

const summaryJsonPath = path.join(base, `verify_edge_summary_${runLabel}.json`);
fs.writeFileSync(summaryJsonPath, `${JSON.stringify({ runLabel, summary }, null, 2)}\n`);

const lines = ['| epoch | status | log |', '|---|---|---|', ...summary.map((item) => `| ${item.epoch} | ${item.status} | ${item.log} |`)];
const summaryMdPath = path.join(base, `verify_edge_summary_${runLabel}.md`);
fs.writeFileSync(summaryMdPath, `${lines.join('\n')}\n`);


const gitStatus = spawnSync('git', ['status', '--porcelain', '--untracked-files=no'], { encoding: 'utf8' });
const driftPath = path.join(base, `verify_edge_no_dirty_${runLabel}.status`);
fs.writeFileSync(driftPath, gitStatus.stdout && gitStatus.stdout.trim() ? gitStatus.stdout : 'CLEAN\n');
if (gitStatus.stdout !== initialTrackedStatus) {
  console.error(`verify:edge modified tracked files; see ${driftPath}`);
  process.exit(1);
}
const failed = summary.find((item) => item.status === 'FAIL');
if (failed) {
  console.error(`verify:edge failed at ${failed.epoch}; see ${failed.log}`);
  process.exit(1);
}

console.log(`PASS verify:edge run=${runLabel} evidence=${base}`);
