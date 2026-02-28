/**
 * regression_git_outgoing_ignore.mjs — RG_GIT_OUT01
 *
 * Verifies that transient computed output artifacts are gitignored:
 *   - artifacts/outgoing/*.jsonl  must be ignored
 *   - artifacts/outgoing/*.lock.json must be ignored
 *
 * Uses 'git check-ignore' to validate the actual gitignore evaluation.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

// Probe paths — these must be gitignored
const PROBE_PATHS = [
  'artifacts/outgoing/features_liq.jsonl',
  'artifacts/outgoing/features_liq.lock.json',
  'artifacts/outgoing/some_other.jsonl',
  'artifacts/outgoing/some_other.lock.json',
];

const fails = [];
const results = [];

for (const p of PROBE_PATHS) {
  try {
    // git check-ignore exits 0 if the path is ignored, 1 if not ignored
    execFileSync('git', ['check-ignore', '--quiet', p], { cwd: ROOT, stdio: 'pipe', encoding: 'utf8' });
    results.push({ path: p, ignored: true });
  } catch {
    // exit code 1 = not ignored
    results.push({ path: p, ignored: false });
    fails.push(`NOT_IGNORED: ${p} — add to .gitignore: artifacts/outgoing/*.jsonl / *.lock.json`);
  }
}

// Also verify the rules are textually present in .gitignore
const gitignorePath = path.join(ROOT, '.gitignore');
const gitignoreContent = fs.existsSync(gitignorePath) ? fs.readFileSync(gitignorePath, 'utf8') : '';
if (!gitignoreContent.includes('artifacts/outgoing/*.jsonl'))
  fails.push('GITIGNORE_RULE_MISSING: artifacts/outgoing/*.jsonl not found in .gitignore');
if (!gitignoreContent.includes('artifacts/outgoing/*.lock.json'))
  fails.push('GITIGNORE_RULE_MISSING: artifacts/outgoing/*.lock.json not found in .gitignore');

const ok = fails.length === 0;
const status = ok ? 'PASS' : 'FAIL';
const reason = ok ? 'NONE' : 'RG_GIT_OUT01';

writeMd(
  path.join(EXEC, 'REGRESSION_GIT_OUTGOING_IGNORE.md'),
  `# REGRESSION_GIT_OUTGOING_IGNORE.md\n\nSTATUS: ${status}\nREASON_CODE: ${reason}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: npm run -s verify:regression:git-outgoing-ignore\n\n## Probe results\n\n${results.map(r => `- ${r.ignored ? 'IGNORED' : 'NOT_IGNORED'}: ${r.path}`).join('\n')}\n\n${fails.map(f => `- FAIL: ${f}`).join('\n') || '- checks: ALL_PASS'}\n`,
);
writeJsonDeterministic(path.join(MANUAL, 'regression_git_outgoing_ignore.json'), {
  schema_version: '1.0.0',
  status,
  reason_code: reason,
  run_id: RUN_ID,
  probe_results: results,
  fails,
});

console.log(`[${status}] regression_git_outgoing_ignore — ${reason}`);
if (!ok) fails.forEach(f => console.error(`  ${f}`));
process.exit(ok ? 0 : 1);
