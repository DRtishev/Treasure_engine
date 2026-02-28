/**
 * regression_liq_lock01_normalized_hash_match.mjs — RG_LIQ_LOCK01_NORMALIZED_HASH_MATCH
 *
 * Gate: offline replay must recompute normalized_schema_sha256 using liq_side
 *       and the result must match the fixture lock value exactly.
 *
 * Sabotage fix #2: liq_side was excluded from normalized replay (hash mismatch).
 * Fix: edge_liq_01_offline_replay.mjs now includes liq_side in normalized rows.
 * Surface: DATA
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

const NEXT_ACTION = 'npm run -s verify:fast';
const sha = (x) => crypto.createHash('sha256').update(x).digest('hex');
const canon = (v) => Array.isArray(v) ? v.map(canon) : v && typeof v === 'object'
  ? Object.keys(v).sort((a, b) => a.localeCompare(b)).reduce((o, k) => (o[k] = canon(v[k]), o), {})
  : v;

const checks = [];

// Check 1: Fixture lock file exists
const fixtureLockPath = path.join(ROOT, 'artifacts/fixtures/liq/bybit_ws_v5/v2/lock.json');
const fixtureRawPath = path.join(ROOT, 'artifacts/fixtures/liq/bybit_ws_v5/v2/raw.jsonl');
checks.push({ check: 'fixture_lock_exists', pass: fs.existsSync(fixtureLockPath), detail: fixtureLockPath });
checks.push({ check: 'fixture_raw_exists', pass: fs.existsSync(fixtureRawPath), detail: fixtureRawPath });

if (fs.existsSync(fixtureLockPath) && fs.existsSync(fixtureRawPath)) {
  const lock = JSON.parse(fs.readFileSync(fixtureLockPath, 'utf8'));
  const rawContent = fs.readFileSync(fixtureRawPath, 'utf8');

  // Check 2: raw SHA matches lock
  const rawSha = sha(rawContent);
  checks.push({
    check: 'raw_capture_sha256_matches',
    pass: rawSha === lock.raw_capture_sha256,
    detail: rawSha === lock.raw_capture_sha256
      ? 'raw SHA matches lock — OK'
      : `raw=${rawSha} lock=${lock.raw_capture_sha256}`,
  });

  // Check 3: Recompute normalized hash WITH liq_side
  const rows = rawContent.split('\n').filter(Boolean).map(JSON.parse);
  const normalized = {
    provider_id: 'bybit_ws_v5',
    schema_version: 'liquidations.bybit_ws_v5.v2',
    time_unit_sentinel: 'ms',
    rows: rows.map((r) => ({
      liq_side: r.liq_side,
      p: String(r.p),
      provider_id: r.provider_id,
      side: r.side,
      symbol: r.symbol,
      topic: r.topic || '',
      ts: Number(r.ts),
      v: String(r.v),
    })),
  };
  const recomputedHash = sha(JSON.stringify(canon(normalized)));
  checks.push({
    check: 'normalized_hash_with_liq_side_matches_lock',
    pass: recomputedHash === lock.normalized_schema_sha256,
    detail: recomputedHash === lock.normalized_schema_sha256
      ? `hash matches lock (${recomputedHash.slice(0, 16)}…) — OK`
      : `recomputed=${recomputedHash} lock=${lock.normalized_schema_sha256}`,
  });

  // Check 4: All rows have valid liq_side (LONG|SHORT)
  const invalidLiqSide = rows.filter((r) => !['LONG', 'SHORT'].includes(r.liq_side));
  checks.push({
    check: 'all_rows_have_valid_liq_side',
    pass: invalidLiqSide.length === 0,
    detail: invalidLiqSide.length === 0
      ? `all ${rows.length} rows have valid liq_side — OK`
      : `${invalidLiqSide.length} rows with invalid liq_side: ${JSON.stringify(invalidLiqSide[0])}`,
  });

  // Check 5: schema_version is v2
  checks.push({
    check: 'schema_version_is_v2',
    pass: lock.schema_version === 'liquidations.bybit_ws_v5.v2',
    detail: `schema_version=${lock.schema_version}`,
  });

  // Check 6: Run offline replay against fixture and assert PASS x2
  const runId = 'RG_LIQ_LOCK01_FIXTURE';
  const runDir = path.join(ROOT, 'artifacts/incoming/liquidations/bybit_ws_v5', runId);
  fs.mkdirSync(runDir, { recursive: true });
  // Create fixture run with lock that includes liq_side normalization
  fs.writeFileSync(path.join(runDir, 'raw.jsonl'), rawContent);
  const fixtureRunLock = {
    provider_id: 'bybit_ws_v5',
    schema_version: 'liquidations.bybit_ws_v5.v2',
    time_unit_sentinel: 'ms',
    raw_capture_sha256: rawSha,
    normalized_schema_sha256: recomputedHash,
    captured_at_utc: 'FIXTURE',
  };
  fs.writeFileSync(path.join(runDir, 'lock.json'), JSON.stringify(fixtureRunLock, null, 2) + '\n');

  function replay() {
    return spawnSync(
      process.execPath,
      ['scripts/edge/edge_liq_01_offline_replay.mjs', '--provider', 'bybit_ws_v5', '--run-id', runId],
      { cwd: ROOT, encoding: 'utf8', env: { ...process.env, TREASURE_NET_KILL: '1' } },
    );
  }
  const a = replay();
  const b = replay();
  checks.push({
    check: 'replay_run_a_pass',
    pass: a.status === 0,
    detail: a.status === 0 ? 'replay A exit 0 — OK' : `replay A exit=${a.status}: ${(a.stdout || a.stderr || '').trim().slice(0, 120)}`,
  });
  checks.push({
    check: 'replay_run_b_pass',
    pass: b.status === 0,
    detail: b.status === 0 ? 'replay B exit 0 — OK' : `replay B exit=${b.status}: ${(b.stdout || b.stderr || '').trim().slice(0, 120)}`,
  });
}

// Check 7: edge_liq_01_offline_replay.mjs includes liq_side in normalized rows
const replayScript = path.join(ROOT, 'scripts/edge/edge_liq_01_offline_replay.mjs');
if (fs.existsSync(replayScript)) {
  const content = fs.readFileSync(replayScript, 'utf8');
  const hasLiqSide = content.includes('liq_side');
  checks.push({
    check: 'replay_script_includes_liq_side',
    pass: hasLiqSide,
    detail: hasLiqSide ? 'replay script includes liq_side — OK' : 'FAIL: liq_side missing from replay normalization',
  });
}

const failed = checks.filter((c) => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'LIQ_LOCK01_HASH_MISMATCH';

writeMd(path.join(EXEC, 'REGRESSION_LIQ_LOCK01.md'), [
  '# REGRESSION_LIQ_LOCK01.md', '',
  `STATUS: ${status}`,
  `REASON_CODE: ${reason_code}`,
  `RUN_ID: ${RUN_ID}`,
  `NEXT_ACTION: ${NEXT_ACTION}`, '',
  '## CHECKS',
  checks.map((c) => `- [${c.pass ? 'PASS' : 'FAIL'}] ${c.check}: ${c.detail}`).join('\n'), '',
  '## FAILED',
  failed.length === 0 ? '- NONE' : failed.map((c) => `- ${c.check}: ${c.detail}`).join('\n'),
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'regression_liq_lock01.json'), {
  schema_version: '1.0.0',
  gate_id: 'RG_LIQ_LOCK01_NORMALIZED_HASH_MATCH',
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: NEXT_ACTION,
  checks,
  failed_checks: failed.map((c) => c.check),
});

console.log(`[${status}] regression_liq_lock01_normalized_hash_match — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
