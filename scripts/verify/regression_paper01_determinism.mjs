/**
 * regression_paper01_determinism.mjs — RG_PAPER01
 *
 * Runs the paper sim twice against the same inputs and asserts that
 * paper_sim.lock.json SHA256 is identical both runs.
 *
 * Requires: price fixture + signals to be generated first (runs them inline).
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

const FIXTURE_SCRIPT = path.join(ROOT, 'scripts/edge/edge_price_00_bars_fixture.mjs');
const SIGNAL_SCRIPT = path.join(ROOT, 'scripts/edge/edge_liq_02_signals.mjs');
const LIQ_FIXTURE = path.join(ROOT, 'scripts/verify/regression_liq_fixture_offline_x2.mjs');
const PAPER_SCRIPT = path.join(ROOT, 'scripts/edge/edge_paper_00_sim.mjs');
const PAPER_LOCK = path.join(ROOT, 'artifacts/outgoing/paper_sim.lock.json');

const fails = [];
const runs = [];

// Step 1: ensure price fixture
try {
  execFileSync(process.execPath, [FIXTURE_SCRIPT], { cwd: ROOT, stdio: 'pipe', encoding: 'utf8', timeout: 15_000 });
} catch (e) { fails.push(`PRICE_FIXTURE_ERROR: ${e.stderr || e.message}`); }

// Step 2: ensure liq fixture + signals
if (fails.length === 0) {
  try {
    execFileSync(process.execPath, [LIQ_FIXTURE], { cwd: ROOT, stdio: 'pipe', encoding: 'utf8', timeout: 15_000 });
    execFileSync(process.execPath, [SIGNAL_SCRIPT, '--provider', 'bybit_ws_v5', '--run-id', 'RG_DATA04_FIXTURE'],
      { env: { ...process.env, TREASURE_NET_KILL: '1' }, cwd: ROOT, stdio: 'pipe', encoding: 'utf8', timeout: 15_000 });
  } catch (e) { fails.push(`LIQ_SIGNALS_ERROR: ${e.stderr || e.message}`); }
}

// Step 3: run paper sim twice
if (fails.length === 0) {
  for (let i = 1; i <= 2; i++) {
    try {
      execFileSync(process.execPath,
        [PAPER_SCRIPT, '--price-provider', 'offline_fixture', '--price-run-id', 'RG_PRICE01_FIXTURE'],
        { env: { ...process.env, TREASURE_NET_KILL: '1' }, cwd: ROOT, stdio: 'pipe', encoding: 'utf8', timeout: 15_000 });
      const lock = JSON.parse(fs.readFileSync(PAPER_LOCK, 'utf8'));
      runs.push({ run: i, sha256: lock.paper_sim_sha256, decisions_n: lock.decisions_n, total_pnl: lock.total_pnl });
    } catch (e) {
      fails.push(`SIM_RUN${i}_ERROR: ${e.stderr || e.message}`);
      break;
    }
  }

  if (fails.length === 0 && runs.length === 2) {
    if (runs[0].sha256 !== runs[1].sha256)
      fails.push(`SHA256_MISMATCH: run1=${runs[0].sha256} run2=${runs[1].sha256}`);
    if (runs[0].decisions_n !== runs[1].decisions_n)
      fails.push(`DECISIONS_N_MISMATCH: run1=${runs[0].decisions_n} run2=${runs[1].decisions_n}`);
  }
}

const ok = fails.length === 0;
const status = ok ? 'PASS' : 'FAIL';
const reason = ok ? 'NONE' : 'RG_PAPER01';
const sha_match = runs.length === 2 && runs[0].sha256 === runs[1].sha256;

writeMd(path.join(EXEC, 'REGRESSION_PAPER01_DETERMINISM.md'),
  `# REGRESSION_PAPER01_DETERMINISM.md\n\nSTATUS: ${status}\nREASON_CODE: ${reason}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: npm run -s verify:regression:paper01-determinism\n\n## Runs\n\n${runs.map(r => `- run${r.run}: sha256=${r.sha256} decisions_n=${r.decisions_n} pnl=${r.total_pnl}`).join('\n')}\n\n- sha_match: ${sha_match}\n\n${fails.map(f => `- FAIL: ${f}`).join('\n') || '- checks: ALL_PASS'}\n`);
writeJsonDeterministic(path.join(MANUAL, 'regression_paper01_determinism.json'), {
  schema_version: '1.0.0', status, reason_code: reason, run_id: RUN_ID, runs, sha_match, fails,
});

console.log(`[${status}] regression_paper01_determinism — ${reason}`);
if (!ok) fails.forEach(f => console.error(`  ${f}`));
process.exit(ok ? 0 : 1);
