/**
 * regression_fix03_determinism_x2.mjs — RG_FIX03
 *
 * Runs edge_fixtures_build.mjs twice and verifies that the SHA of both
 * liq/raw.jsonl and price/raw.jsonl are identical both times.
 * Confirms the fixture builder is fully deterministic.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

const BUILDER = path.join(ROOT, 'scripts/edge/edge_fixtures_build.mjs');
const LIQ_RAW = path.join(ROOT, 'artifacts/fixtures/liq/bybit_ws_v5/v2/raw.jsonl');
const LIQ_LOCK = path.join(ROOT, 'artifacts/fixtures/liq/bybit_ws_v5/v2/lock.json');
const PRICE_RAW = path.join(ROOT, 'artifacts/fixtures/price/offline_fixture/v1/raw.jsonl');
const PRICE_LOCK = path.join(ROOT, 'artifacts/fixtures/price/offline_fixture/v1/lock.json');
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');

const fails = [];
const runs = [];

for (let i = 1; i <= 2; i++) {
  try {
    execFileSync(process.execPath, [BUILDER], { cwd: ROOT, stdio: 'pipe', encoding: 'utf8', timeout: 15_000 });
    const liqRawSha = sha(fs.readFileSync(LIQ_RAW, 'utf8'));
    const priceRawSha = sha(fs.readFileSync(PRICE_RAW, 'utf8'));
    const liqLock = JSON.parse(fs.readFileSync(LIQ_LOCK, 'utf8'));
    const priceLock = JSON.parse(fs.readFileSync(PRICE_LOCK, 'utf8'));
    runs.push({
      run: i,
      liq_raw_sha: liqRawSha,
      liq_lock_sha: liqLock.raw_capture_sha256,
      price_raw_sha: priceRawSha,
      price_lock_sha: priceLock.raw_sha256,
    });
  } catch (e) {
    fails.push(`RUN${i}_ERROR: ${e.message}`);
    break;
  }
}

if (fails.length === 0 && runs.length === 2) {
  if (runs[0].liq_raw_sha !== runs[1].liq_raw_sha)
    fails.push(`LIQ_RAW_NONDETERMINISTIC: run1=${runs[0].liq_raw_sha.slice(0,16)} run2=${runs[1].liq_raw_sha.slice(0,16)}`);
  if (runs[0].price_raw_sha !== runs[1].price_raw_sha)
    fails.push(`PRICE_RAW_NONDETERMINISTIC: run1=${runs[0].price_raw_sha.slice(0,16)} run2=${runs[1].price_raw_sha.slice(0,16)}`);
  if (runs[0].liq_lock_sha !== runs[1].liq_lock_sha)
    fails.push(`LIQ_LOCK_SHA_NONDETERMINISTIC`);
  if (runs[0].price_lock_sha !== runs[1].price_lock_sha)
    fails.push(`PRICE_LOCK_SHA_NONDETERMINISTIC`);
}

const ok = fails.length === 0;
const status = ok ? 'PASS' : 'FAIL';
const reason = ok ? 'NONE' : 'RG_FIX03';
const sha_match = runs.length === 2
  && runs[0].liq_raw_sha === runs[1].liq_raw_sha
  && runs[0].price_raw_sha === runs[1].price_raw_sha;

writeMd(path.join(EXEC, 'REGRESSION_FIX03_DETERMINISM_X2.md'),
  `# REGRESSION_FIX03_DETERMINISM_X2.md\n\nSTATUS: ${status}\nREASON_CODE: ${reason}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: npm run -s verify:regression:fix03-determinism-x2\n\n## Runs\n\n${runs.map(r => `- run${r.run}: liq_sha=${r.liq_raw_sha?.slice(0,16)} price_sha=${r.price_raw_sha?.slice(0,16)}`).join('\n')}\n\n- sha_match: ${sha_match}\n\n${fails.map(f => `- FAIL: ${f}`).join('\n') || '- checks: ALL_PASS'}\n`);
writeJsonDeterministic(path.join(MANUAL, 'regression_fix03_determinism_x2.json'), {
  schema_version: '1.0.0', status, reason_code: reason, run_id: RUN_ID, runs, sha_match, fails,
});

console.log(`[${status}] regression_fix03_determinism_x2 — ${reason}`);
if (!ok) fails.forEach(f => console.error(`  ${f}`));
process.exit(ok ? 0 : 1);
