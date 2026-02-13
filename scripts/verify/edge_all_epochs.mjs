import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const evidenceEpoch = process.env.EVIDENCE_EPOCH || 'EPOCH-EDGE-LOCAL-MEGA';
const runLabel = process.env.EDGE_RUN_LABEL || 'run';
const root = process.cwd();
const base = path.join(root, 'reports/evidence', evidenceEpoch, 'verify_edge');
fs.mkdirSync(base, { recursive: true });
const initialTrackedStatus = spawnSync('git', ['status', '--porcelain', '--untracked-files=no'], { encoding: 'utf8' }).stdout;

const requiredByEpoch = {
  '31': ['FEATURE_CONTRACTS.md', 'LOOKAHEAD_SENTINEL_PLAN.md', 'FINGERPRINT_RULES.md', 'VERDICT.md'],
  '32': ['SPEC_CONTRACTS.md', 'GATE_PLAN.md', 'FINGERPRINT_POLICY.md', 'VERDICT.md'],
  '33': ['SPEC_CONTRACTS.md', 'GATE_PLAN.md', 'FINGERPRINT_POLICY.md', 'VERDICT.md'],
  '34': ['SPEC_CONTRACTS.md', 'GATE_PLAN.md', 'FINGERPRINT_POLICY.md', 'VERDICT.md'],
  '35': ['SPEC_CONTRACTS.md', 'GATE_PLAN.md', 'FINGERPRINT_POLICY.md', 'VERDICT.md'],
  '36': ['SPEC_CONTRACTS.md', 'GATE_PLAN.md', 'FINGERPRINT_POLICY.md', 'VERDICT.md'],
  '37': ['SPEC_CONTRACTS.md', 'GATE_PLAN.md', 'FINGERPRINT_POLICY.md', 'VERDICT.md'],
  '38': ['SPEC_CONTRACTS.md', 'GATE_PLAN.md', 'FINGERPRINT_POLICY.md', 'VERDICT.md'],
  '39': ['SPEC_CONTRACTS.md', 'GATE_PLAN.md', 'FINGERPRINT_POLICY.md', 'EXPECTED_FAILURE.md', 'VERDICT.md'],
  '40': ['SPEC_CONTRACTS.md', 'GATE_PLAN.md', 'FINGERPRINT_POLICY.md', 'CLEAN_CLONE_PROOF.md', 'VERDICT.md']
};

const summary = [];

for (const epoch of ['31', '32', '33', '34', '35', '36', '37', '38', '39', '40']) {
  const epochGateDir = path.join(root, 'reports/evidence', evidenceEpoch, `epoch${epoch}`, 'gates');
  fs.mkdirSync(epochGateDir, { recursive: true });
  const logPath = path.join(epochGateDir, `${runLabel}.log`);

  const result = spawnSync('npm', ['run', `verify:epoch${epoch}`], { encoding: 'utf8', env: { ...process.env, EVIDENCE_EPOCH: evidenceEpoch } });
  const logText = [
    `command=npm run verify:epoch${epoch}`,
    `exit_code=${result.status ?? 'null'}`,
    '',
    result.stdout || '',
    result.stderr || ''
  ].join('\n');
  fs.writeFileSync(logPath, logText);

  let requiredMissing = [];
  if ((result.status ?? 1) === 0) {
    requiredMissing = requiredByEpoch[epoch].filter((rel) => !fs.existsSync(path.join(root, 'reports/evidence', evidenceEpoch, `epoch${epoch}`, rel)));
  }

  const passed = (result.status ?? 1) === 0 && requiredMissing.length === 0;
  summary.push({ epoch, status: passed ? 'PASS' : 'FAIL', log: path.relative(root, logPath), requiredMissing });
  if (!passed) break;
}

const cleanCloneLog = path.join(base, `clean_clone_${runLabel}.log`);
if (process.env.ENABLE_CLEAN_CLONE === '1') {
  const cc = spawnSync('npm', ['run', 'verify:clean-clone'], { encoding: 'utf8', env: process.env });
  fs.writeFileSync(cleanCloneLog, `${cc.stdout || ''}\n${cc.stderr || ''}`);
  summary.push({ epoch: 'clean-clone', status: cc.status === 0 ? 'PASS' : 'FAIL', log: path.relative(root, cleanCloneLog) });
} else {
  fs.writeFileSync(cleanCloneLog, 'SKIPPED (set ENABLE_CLEAN_CLONE=1 to run).\n');
  summary.push({ epoch: 'clean-clone', status: 'SKIPPED', log: path.relative(root, cleanCloneLog) });
}

const summaryJsonPath = path.join(base, `verify_edge_summary_${runLabel}.json`);
fs.writeFileSync(summaryJsonPath, `${JSON.stringify({ runLabel, summary }, null, 2)}\n`);

const lines = ['| epoch | status | log | missing_required |', '|---|---|---|---|', ...summary.map((item) => `| ${item.epoch} | ${item.status} | ${item.log} | ${(item.requiredMissing || []).join(', ')} |`)];
const summaryMdPath = path.join(base, `verify_edge_summary_${runLabel}.md`);
fs.writeFileSync(summaryMdPath, `${lines.join('\n')}\n`);

const gitStatus = spawnSync('git', ['status', '--porcelain', '--untracked-files=no'], { encoding: 'utf8' });
const driftPath = path.join(base, `verify_edge_no_dirty_${runLabel}.status`);
fs.writeFileSync(driftPath, gitStatus.stdout && gitStatus.stdout.trim() ? gitStatus.stdout : 'CLEAN\n');
if (gitStatus.stdout !== initialTrackedStatus) {
  console.error(`verify:edge modified tracked files; see ${path.relative(root, driftPath)}`);
  process.exit(1);
}

const failed = summary.find((item) => item.status === 'FAIL');
if (failed) {
  console.error(`verify:edge failed at ${failed.epoch}; see ${failed.log}`);
  process.exit(1);
}

console.log(`PASS verify:edge run=${runLabel} evidence=${path.relative(root, base)}`);
