/**
 * regression_paper02_no_net.mjs — RG_PAPER02
 *
 * Verifies that edge_paper_00_sim.mjs enforces TREASURE_NET_KILL=1.
 * Runs the paper sim WITHOUT the env var set and expects exit code 1.
 * Also verifies the error message contains ND_PAPER01 reason code.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

const PAPER_SCRIPT = path.join(ROOT, 'scripts/edge/edge_paper_00_sim.mjs');

const fails = [];

// Run WITHOUT TREASURE_NET_KILL — expect non-zero exit + ND_PAPER01 in stderr
const env = { ...process.env };
delete env.TREASURE_NET_KILL;

const result = spawnSync(process.execPath, [PAPER_SCRIPT], { env, cwd: ROOT, encoding: 'utf8', timeout: 10_000 });
const stderr = result.stderr || '';
const stdout = result.stdout || '';

if (result.status === 0)
  fails.push(`NET_KILL_NOT_ENFORCED: expected non-zero exit, got 0 (sim ran without TREASURE_NET_KILL=1)`);
if (!stderr.includes('ND_PAPER01') && !stdout.includes('ND_PAPER01'))
  fails.push(`REASON_CODE_MISSING: expected ND_PAPER01 in output, got stderr="${stderr.slice(0, 200)}" stdout="${stdout.slice(0, 200)}"`);

// Also run WITH TREASURE_NET_KILL=1 and missing fixtures → expect NEEDS_DATA (exit 2) not crash
const resultWithKill = spawnSync(
  process.execPath, [PAPER_SCRIPT, '--price-provider', 'offline_fixture', '--price-run-id', '__no_such_run__'],
  { env: { ...process.env, TREASURE_NET_KILL: '1' }, cwd: ROOT, encoding: 'utf8', timeout: 10_000 }
);
// Should exit 2 (NEEDS_DATA) or 1 (FAIL) but NOT crash with unhandled exception
if (resultWithKill.status === null)
  fails.push('CRASH_WITH_NETKILL: process timed out or was killed');

const ok = fails.length === 0;
const status = ok ? 'PASS' : 'FAIL';
const reason = ok ? 'NONE' : 'RG_PAPER02';

writeMd(path.join(EXEC, 'REGRESSION_PAPER02_NO_NET.md'),
  `# REGRESSION_PAPER02_NO_NET.md\n\nSTATUS: ${status}\nREASON_CODE: ${reason}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: npm run -s verify:regression:paper02-no-net\n\n## Test: no TREASURE_NET_KILL\n\n- exit_code: ${result.status}\n- stderr_snippet: ${stderr.slice(0, 120)}\n- nd_paper01_present: ${stderr.includes('ND_PAPER01') || stdout.includes('ND_PAPER01')}\n\n${fails.map(f => `- FAIL: ${f}`).join('\n') || '- checks: ALL_PASS'}\n`);
writeJsonDeterministic(path.join(MANUAL, 'regression_paper02_no_net.json'), {
  schema_version: '1.0.0', status, reason_code: reason, run_id: RUN_ID,
  no_netkill_exit: result.status, nd_paper01_present: stderr.includes('ND_PAPER01') || stdout.includes('ND_PAPER01'), fails,
});

console.log(`[${status}] regression_paper02_no_net — ${reason}`);
if (!ok) fails.forEach(f => console.error(`  ${f}`));
process.exit(ok ? 0 : 1);
