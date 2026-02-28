/**
 * regression_sig02_determinism_x2.mjs — RG_SIG02
 *
 * Verifies that edge_liq_02_signals.mjs is deterministic: run it twice against
 * the same fixture (bybit_ws_v5 / RG_DATA04_FIXTURE) and assert that the
 * features_jsonl_sha256 in features_liq.lock.json is identical both runs.
 *
 * Requires: regression_liq_fixture_offline_x2 to have run at least once
 *           (fixture dir must exist at artifacts/incoming/liquidations/bybit_ws_v5/RG_DATA04_FIXTURE/)
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

const SIGNAL_SCRIPT = path.join(ROOT, 'scripts/edge/edge_liq_02_signals.mjs');
const LOCK_PATH = path.join(ROOT, 'artifacts/outgoing/features_liq.lock.json');
const FIXTURE_DIR = path.join(ROOT, 'artifacts/incoming/liquidations/bybit_ws_v5/RG_DATA04_FIXTURE');
const PROVIDER = 'bybit_ws_v5';
const RUN = 'RG_DATA04_FIXTURE';

const fails = [];

if (!fs.existsSync(FIXTURE_DIR)) {
  fails.push(`MISSING_FIXTURE: ${FIXTURE_DIR} — run regression_liq_fixture_offline_x2 first`);
}

const runs = [];

if (fails.length === 0) {
  for (let i = 1; i <= 2; i++) {
    try {
      execFileSync(
        process.execPath,
        [SIGNAL_SCRIPT, '--provider', PROVIDER, '--run-id', RUN],
        {
          env: { ...process.env, TREASURE_NET_KILL: '1' },
          cwd: ROOT,
          stdio: 'pipe',
          encoding: 'utf8',
          timeout: 30_000,
        },
      );
      const lock = JSON.parse(fs.readFileSync(LOCK_PATH, 'utf8'));
      runs.push({
        run: i,
        sha256: lock.features_jsonl_sha256,
        bars_n: lock.bars_n,
        schema_version: lock.schema_version,
      });
    } catch (e) {
      fails.push(`RUN${i}_EXEC_ERROR: ${e.message}`);
      break;
    }
  }

  if (fails.length === 0) {
    if (runs.length !== 2) {
      fails.push(`NOT_TWO_RUNS: only ${runs.length} run(s) completed`);
    } else {
      if (runs[0].sha256 !== runs[1].sha256) {
        fails.push(`SHA256_MISMATCH: run1=${runs[0].sha256} run2=${runs[1].sha256}`);
      }
      if (runs[0].bars_n !== runs[1].bars_n) {
        fails.push(`BARS_N_MISMATCH: run1=${runs[0].bars_n} run2=${runs[1].bars_n}`);
      }
      if (runs[0].schema_version !== runs[1].schema_version) {
        fails.push(`SCHEMA_VERSION_MISMATCH: run1=${runs[0].schema_version} run2=${runs[1].schema_version}`);
      }
    }
  }
}

const ok = fails.length === 0;
const status = ok ? 'PASS' : 'FAIL';
const reason = ok ? 'NONE' : 'RG_SIG02';
const sha_match = runs.length === 2 && runs[0].sha256 === runs[1].sha256;

writeMd(
  path.join(EXEC, 'REGRESSION_SIG02_DETERMINISM_X2.md'),
  `# REGRESSION_SIG02_DETERMINISM_X2.md\n\nSTATUS: ${status}\nREASON_CODE: ${reason}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: npm run -s verify:regression:sig02-determinism-x2\n\n## Runs\n\n${runs.map(r => `- run${r.run}: sha256=${r.sha256} bars_n=${r.bars_n}`).join('\n')}\n\n## Result\n\n- sha_match: ${sha_match}\n\n${fails.map(f => `- FAIL: ${f}`).join('\n') || '- checks: ALL_PASS'}\n`,
);
writeJsonDeterministic(path.join(MANUAL, 'regression_sig02_determinism_x2.json'), {
  schema_version: '1.0.0',
  status,
  reason_code: reason,
  run_id: RUN_ID,
  provider: PROVIDER,
  fixture_run_id: RUN,
  runs,
  sha_match,
  fails,
});

console.log(`[${status}] regression_sig02_determinism_x2 — ${reason}`);
if (!ok) fails.forEach(f => console.error(`  ${f}`));
process.exit(ok ? 0 : 1);
