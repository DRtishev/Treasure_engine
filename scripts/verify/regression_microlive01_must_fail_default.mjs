/**
 * regression_microlive01_must_fail_default.mjs — RG_ML01
 *
 * Verifies C1: microlive scaffold must-fail by default (no unlock file).
 *   - Without unlock file → exit 2 + NOT_UNLOCKED in output
 *   - Without TREASURE_NET_KILL → exit 1 + ND_ML01 in output
 *   - Unlock file with WRONG token → exit 2 (still locked)
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

const ML_SCRIPT = path.join(ROOT, 'scripts/edge/edge_microlive_00_scaffold.mjs');
const UNLOCK_FILE = path.join(ROOT, 'artifacts/incoming/MICROLIVE_UNLOCK');
const fails = [];

function run(extraEnv = {}, unlockContent = null) {
  // Temporarily write/remove unlock file
  const hadFile = fs.existsSync(UNLOCK_FILE);
  const origContent = hadFile ? fs.readFileSync(UNLOCK_FILE, 'utf8') : null;
  try {
    if (unlockContent === null) {
      if (fs.existsSync(UNLOCK_FILE)) fs.unlinkSync(UNLOCK_FILE);
    } else {
      fs.mkdirSync(path.dirname(UNLOCK_FILE), { recursive: true });
      fs.writeFileSync(UNLOCK_FILE, unlockContent);
    }
    return spawnSync(process.execPath, [ML_SCRIPT],
      { env: { ...process.env, ...extraEnv }, cwd: ROOT, encoding: 'utf8', timeout: 10_000 });
  } finally {
    // Restore original state
    if (hadFile) fs.writeFileSync(UNLOCK_FILE, origContent);
    else if (fs.existsSync(UNLOCK_FILE)) fs.unlinkSync(UNLOCK_FILE);
  }
}

// Test 1: No unlock file, with TREASURE_NET_KILL=1 → exit 2, NOT_UNLOCKED
const t1 = run({ TREASURE_NET_KILL: '1' }, null);
if (t1.status !== 2)
  fails.push(`T1_EXIT: expected 2 (NOT_UNLOCKED), got ${t1.status}`);
if (!t1.stderr.includes('NOT_UNLOCKED') && !t1.stdout.includes('NOT_UNLOCKED'))
  fails.push(`T1_REASON: NOT_UNLOCKED not in output; stderr="${t1.stderr.slice(0, 150)}"`);

// Test 2: No TREASURE_NET_KILL → exit 1, ND_ML01
const t2 = run({}, null);
if (t2.status !== 1)
  fails.push(`T2_EXIT: expected 1 (ND_ML01), got ${t2.status}`);
if (!t2.stderr.includes('ND_ML01'))
  fails.push(`T2_REASON: ND_ML01 not in stderr="${t2.stderr.slice(0, 150)}"`);

// Test 3: Wrong unlock token → exit 2
const t3 = run({ TREASURE_NET_KILL: '1' }, 'WRONG_TOKEN');
if (t3.status !== 2)
  fails.push(`T3_EXIT: expected 2 (wrong token still locked), got ${t3.status}`);

const ok = fails.length === 0;
const status = ok ? 'PASS' : 'FAIL';
const reason = ok ? 'NONE' : 'RG_ML01';

writeMd(path.join(EXEC, 'REGRESSION_MICROLIVE01_MUST_FAIL_DEFAULT.md'),
  `# REGRESSION_MICROLIVE01_MUST_FAIL_DEFAULT.md\n\nSTATUS: ${status}\nREASON_CODE: ${reason}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: npm run -s verify:regression:microlive01-must-fail-default\n\n## Tests\n\n- T1 (no unlock, NETKILL=1): exit=${t1.status} NOT_UNLOCKED=${t1.stderr.includes('NOT_UNLOCKED')}\n- T2 (no unlock, no NETKILL): exit=${t2.status} ND_ML01=${t2.stderr.includes('ND_ML01')}\n- T3 (wrong token): exit=${t3.status}\n\n${fails.map(f => `- FAIL: ${f}`).join('\n') || '- checks: ALL_PASS'}\n`);
writeJsonDeterministic(path.join(MANUAL, 'regression_microlive01_must_fail_default.json'), {
  schema_version: '1.0.0', status, reason_code: reason, run_id: RUN_ID,
  t1: { exit: t1.status }, t2: { exit: t2.status }, t3: { exit: t3.status }, fails,
});

console.log(`[${status}] regression_microlive01_must_fail_default — ${reason}`);
if (!ok) fails.forEach(f => console.error(`  ${f}`));
process.exit(ok ? 0 : 1);
