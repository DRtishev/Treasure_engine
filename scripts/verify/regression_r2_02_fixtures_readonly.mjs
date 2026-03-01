/**
 * regression_r2_02_fixtures_readonly.mjs — RG_R2_02_FIXTURES_READONLY
 *
 * Asserts that running verify:r2:okx-orderbook under NET_KILL does NOT mutate:
 *   artifacts/fixtures/okx/orderbook/**
 *   specs/**
 *   docs/**
 *
 * Protocol:
 *   1. Record git diff baseline for guarded paths.
 *   2. Run verify:r2:okx-orderbook with TREASURE_NET_KILL=1.
 *   3. Check git diff for guarded paths again.
 *   4. Fail-closed if any mutation detected.
 *
 * Gate ID : RG_R2_02_FIXTURES_READONLY
 * Wired   : verify:r2:okx-orderbook (called from verify:r2:preflight suite)
 */

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

const GATE_ID = 'RG_R2_02_FIXTURES_READONLY';
const NEXT_ACTION = 'npm run -s verify:r2:okx-orderbook';

// Paths guarded against mutation
const GUARDED_PATHS = [
  'artifacts/fixtures/okx/orderbook',
  'specs',
  'docs',
];

function gitDiff(paths) {
  const r = spawnSync(
    'git', ['diff', '--name-only', 'HEAD', '--', ...paths],
    { encoding: 'utf8', cwd: ROOT }
  );
  return String(r.stdout || '').split('\n').map((x) => x.trim()).filter(Boolean).sort();
}

function gitDiffUntracked(paths) {
  // Also check untracked new files in guarded paths
  const r = spawnSync(
    'git', ['ls-files', '--others', '--exclude-standard', '--', ...paths],
    { encoding: 'utf8', cwd: ROOT }
  );
  return String(r.stdout || '').split('\n').map((x) => x.trim()).filter(Boolean).sort();
}

// --- Pre-run snapshot ---
const preMutated = gitDiff(GUARDED_PATHS);
const preUntracked = gitDiffUntracked(GUARDED_PATHS);

// --- Run verify:r2:okx-orderbook under NET_KILL ---
const r2Result = spawnSync(
  'bash', ['-lc', 'npm run -s verify:r2:okx-orderbook'],
  {
    encoding: 'utf8',
    cwd: ROOT,
    env: {
      ...process.env,
      TREASURE_NET_KILL: '1',
      NODE_KILL_NET: '1',
    },
  }
);

const r2ExitCode = r2Result.status ?? 1;
const r2Stdout = (r2Result.stdout || '').trim();
const r2Stderr = (r2Result.stderr || '').trim();

// --- Post-run diff ---
const postMutated = gitDiff(GUARDED_PATHS);
const postUntracked = gitDiffUntracked(GUARDED_PATHS);

// New mutations = files in post but not pre
const newMutated = postMutated.filter((f) => !preMutated.includes(f));
const newUntracked = postUntracked.filter((f) => !preUntracked.includes(f));
const allMutations = [...newMutated, ...newUntracked].sort((a, b) => a.localeCompare(b));

// --- Verdict ---
const r2Pass = r2ExitCode === 0;
const noMutation = allMutations.length === 0;
const ok = r2Pass && noMutation;

const status = ok ? 'PASS' : 'FAIL';
let reason_code = 'NONE';
if (!r2Pass) reason_code = 'RG_R2_02_INNER_GATE_FAIL';
if (!noMutation) reason_code = reason_code === 'NONE' ? 'RG_R2_02_MUTATION_DETECTED' : reason_code + '+MUTATION';

const checks = {
  inner_gate_exit_code: r2ExitCode,
  inner_gate_pass: r2Pass,
  mutations_detected_n: allMutations.length,
  no_mutation: noMutation,
  guarded_paths: GUARDED_PATHS,
};

writeMd(path.join(EXEC, 'REGRESSION_R2_02_FIXTURES_READONLY.md'), [
  '# REGRESSION_R2_02_FIXTURES_READONLY.md', '',
  `STATUS: ${status}`,
  `REASON_CODE: ${reason_code}`,
  `RUN_ID: ${RUN_ID}`,
  `NEXT_ACTION: ${NEXT_ACTION}`, '',
  '## GUARDED PATHS',
  GUARDED_PATHS.map((p) => `- ${p}`).join('\n'), '',
  '## INNER GATE: verify:r2:okx-orderbook (TREASURE_NET_KILL=1)',
  `- exit_code: ${r2ExitCode}`,
  `- pass: ${r2Pass}`, '',
  '## MUTATION CHECK',
  `- mutations_detected_n: ${allMutations.length}`,
  allMutations.length > 0
    ? '### MUTATIONS\n' + allMutations.map((f) => `- ${f}`).join('\n')
    : '- NONE', '',
  '## INNER GATE OUTPUT',
  '```',
  r2Stdout || '(no stdout)',
  '```',
  r2Stderr ? `\n### STDERR\n\`\`\`\n${r2Stderr}\n\`\`\`` : '',
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'regression_r2_02_fixtures_readonly.json'), {
  schema_version: '1.0.0',
  gate_id: GATE_ID,
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: NEXT_ACTION,
  checks,
  mutations: allMutations,
});

console.log(`[${status}] regression_r2_02_fixtures_readonly — ${reason_code}`);
console.log(`  inner_gate_exit_code: ${r2ExitCode}`);
console.log(`  mutations_detected_n: ${allMutations.length}`);
process.exit(ok ? 0 : 1);
