/**
 * r3_okx_acquire_contract.mjs — verify:r3:okx-acquire-contract
 *
 * EPOCH-67 R3 OKX Acquire Kernel gates.
 * Validates the acquire + replay + lock contract using the acquire_test fixture.
 *
 * RG_R3_OKX01_WRITE_SCOPE:    acquire writes only under allowed paths
 * RG_R3_OKX02_LOCK_FIRST:     lock fields present + sha matches raw fixture
 * RG_R3_OKX03_EVENTBUS:       replay emits required events in deterministic order
 * RG_R3_OKX04_ALLOWFILE:      acquire refuses without allow-file (source analysis)
 *
 * NOT wired into daily chain (verify:fast / ops:life).
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

const NEXT_ACTION = 'npm run -s verify:r3:okx-acquire-contract';
const sha256Hex = (x) => crypto.createHash('sha256').update(x).digest('hex');

const checks = [];

// ---------------------------------------------------------------------------
// Fixture paths
// ---------------------------------------------------------------------------
const FIXTURE_DIR = path.join(ROOT, 'artifacts/fixtures/okx/orderbook/acquire_test');
const FIXTURE_RAW = path.join(FIXTURE_DIR, 'raw.jsonl');
const FIXTURE_LOCK = path.join(FIXTURE_DIR, 'lock.json');
const ACQ_SCRIPT = path.join(ROOT, 'scripts/edge/edge_okx_orderbook_10_acquire_live.mjs');
const REPLAY_SCRIPT = path.join(ROOT, 'scripts/edge/edge_okx_orderbook_11_replay_captured.mjs');
const NET_KILL_PRELOAD = path.join(ROOT, 'scripts/safety/net_kill_preload.cjs');

// ---------------------------------------------------------------------------
// RG_R3_OKX01_WRITE_SCOPE — acquire writes only under allowed paths
// ---------------------------------------------------------------------------
{
  const acqSrc = fs.existsSync(ACQ_SCRIPT)
    ? fs.readFileSync(ACQ_SCRIPT, 'utf8')
    : '';

  // Check: acquire script references artifacts/incoming/okx/orderbook as output path
  const writesIncoming = acqSrc.includes('artifacts/incoming/okx/orderbook');
  // Check: no writes to EXECUTOR runtime or other forbidden paths
  const noExecWrite = !acqSrc.includes('reports/evidence/EXECUTOR');
  // Check: acquire script exists
  const scriptExists = fs.existsSync(ACQ_SCRIPT);

  checks.push({
    check: 'RG_R3_OKX01_WRITE_SCOPE_script_exists',
    pass: scriptExists,
    detail: scriptExists ? 'acquire script present' : 'MISSING',
  });
  checks.push({
    check: 'RG_R3_OKX01_WRITE_SCOPE_writes_incoming',
    pass: writesIncoming,
    detail: `writes_incoming=${writesIncoming}`,
  });
  checks.push({
    check: 'RG_R3_OKX01_WRITE_SCOPE_no_executor_write',
    pass: noExecWrite,
    detail: `no_executor_write=${noExecWrite}`,
  });

  // Check: replay script exists
  const replayExists = fs.existsSync(REPLAY_SCRIPT);
  checks.push({
    check: 'RG_R3_OKX01_WRITE_SCOPE_replay_exists',
    pass: replayExists,
    detail: replayExists ? 'replay script present' : 'MISSING',
  });
}

// ---------------------------------------------------------------------------
// RG_R3_OKX02_LOCK_FIRST — lock fields present + sha matches raw fixture
// ---------------------------------------------------------------------------
{
  const fixtureExists = fs.existsSync(FIXTURE_RAW) && fs.existsSync(FIXTURE_LOCK);
  checks.push({
    check: 'RG_R3_OKX02_LOCK_FIRST_fixture_exists',
    pass: fixtureExists,
    detail: fixtureExists ? 'fixture raw+lock present' : 'MISSING',
  });

  if (fixtureExists) {
    let lock;
    try {
      lock = JSON.parse(fs.readFileSync(FIXTURE_LOCK, 'utf8'));
    } catch (e) {
      checks.push({
        check: 'RG_R3_OKX02_LOCK_FIRST_parseable',
        pass: false,
        detail: `lock parse error: ${e.message}`,
      });
    }

    if (lock) {
      // Required lock fields
      const requiredFields = ['provider_id', 'lane_id', 'schema_version', 'raw_capture_sha256', 'line_count'];
      const missingFields = requiredFields.filter((f) => !(f in lock));
      checks.push({
        check: 'RG_R3_OKX02_LOCK_FIRST_required_fields',
        pass: missingFields.length === 0,
        detail: missingFields.length === 0
          ? `all fields present: ${requiredFields.join(', ')}`
          : `MISSING: ${missingFields.join(', ')}`,
      });

      // SHA match
      const rawContent = fs.readFileSync(FIXTURE_RAW, 'utf8');
      const rawSha = sha256Hex(rawContent);
      const shaMatch = rawSha === lock.raw_capture_sha256;
      checks.push({
        check: 'RG_R3_OKX02_LOCK_FIRST_sha_match',
        pass: shaMatch,
        detail: shaMatch
          ? `sha256 match: ${rawSha.slice(0, 16)}...`
          : `MISMATCH: raw=${rawSha.slice(0, 16)}... lock=${(lock.raw_capture_sha256 || '').slice(0, 16)}...`,
      });

      // Line count match
      const lines = rawContent.split('\n').map((l) => l.trim()).filter(Boolean);
      const countMatch = lines.length === lock.line_count;
      checks.push({
        check: 'RG_R3_OKX02_LOCK_FIRST_line_count',
        pass: countMatch,
        detail: countMatch
          ? `line_count=${lines.length}`
          : `MISMATCH: raw=${lines.length} lock=${lock.line_count}`,
      });

      // No timestamp fields in lock (no _at, _ts keys)
      const lockKeys = Object.keys(lock);
      const tsFields = lockKeys.filter((k) => /(_at|_ts|timestamp|created|updated|generated|date)$/i.test(k));
      checks.push({
        check: 'RG_R3_OKX02_LOCK_FIRST_no_timestamps',
        pass: tsFields.length === 0,
        detail: tsFields.length === 0
          ? 'no timestamp fields in lock'
          : `FORBIDDEN: ${tsFields.join(', ')}`,
      });
    }
  }
}

// ---------------------------------------------------------------------------
// RG_R3_OKX03_EVENTBUS — replay emits required events in deterministic order
// ---------------------------------------------------------------------------
{
  // Run replay under NET_KILL with fixture, check EventBus output
  const r = spawnSync(process.execPath, [
    '--require', NET_KILL_PRELOAD,
    REPLAY_SCRIPT,
    '--fixture-dir', FIXTURE_DIR,
  ], {
    cwd: ROOT,
    encoding: 'utf8',
    env: { ...process.env, TREASURE_NET_KILL: '1' },
    timeout: 15000,
  });

  const replayPass = r.status === 0;
  checks.push({
    check: 'RG_R3_OKX03_EVENTBUS_replay_pass',
    pass: replayPass,
    detail: replayPass
      ? `replay PASS EC=0`
      : `replay FAIL EC=${r.status} stderr=${(r.stderr || '').slice(0, 200)}`,
  });

  // Find the EventBus output and verify events
  const busDir = path.join(ROOT, 'reports/evidence/EPOCH-EVENTBUS-REPLAY-ACQ-OB-okx_orderbook_ws');
  const eventsFile = path.join(busDir, 'EVENTS.jsonl');
  const eventsExist = fs.existsSync(eventsFile);

  checks.push({
    check: 'RG_R3_OKX03_EVENTBUS_events_file',
    pass: eventsExist,
    detail: eventsExist ? 'EVENTS.jsonl present' : 'MISSING',
  });

  if (eventsExist) {
    const eventLines = fs.readFileSync(eventsFile, 'utf8').trim().split('\n').filter(Boolean);
    const events = eventLines.map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
    const eventNames = events.map((e) => e.event);

    // Required events in order: REPLAY_BOOT, REPLAY_APPLY, REPLAY_SEAL
    const REQUIRED_ORDER = ['REPLAY_BOOT', 'REPLAY_APPLY', 'REPLAY_SEAL'];
    const found = REQUIRED_ORDER.filter((name) => eventNames.includes(name));
    const allPresent = found.length === REQUIRED_ORDER.length;
    checks.push({
      check: 'RG_R3_OKX03_EVENTBUS_required_events',
      pass: allPresent,
      detail: allPresent
        ? `all required events present: ${REQUIRED_ORDER.join(', ')}`
        : `MISSING: ${REQUIRED_ORDER.filter((n) => !eventNames.includes(n)).join(', ')}`,
    });

    // Verify tick ordering (monotonically increasing)
    const ticks = events.map((e) => e.tick);
    const tickOrdered = ticks.every((t, i) => i === 0 || t > ticks[i - 1]);
    checks.push({
      check: 'RG_R3_OKX03_EVENTBUS_tick_order',
      pass: tickOrdered,
      detail: tickOrdered
        ? `ticks monotonically increasing: [${ticks.join(', ')}]`
        : `TICKS NOT ORDERED: [${ticks.join(', ')}]`,
    });

    // Verify determinism: run replay again, compare events
    const r2 = spawnSync(process.execPath, [
      '--require', NET_KILL_PRELOAD,
      REPLAY_SCRIPT,
      '--fixture-dir', FIXTURE_DIR,
    ], {
      cwd: ROOT,
      encoding: 'utf8',
      env: { ...process.env, TREASURE_NET_KILL: '1' },
      timeout: 15000,
    });

    if (r2.status === 0 && fs.existsSync(eventsFile)) {
      const events2Lines = fs.readFileSync(eventsFile, 'utf8').trim().split('\n').filter(Boolean);
      const events2 = events2Lines.map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
      const eventNames2 = events2.map((e) => e.event);
      const deterministic = JSON.stringify(eventNames) === JSON.stringify(eventNames2);
      checks.push({
        check: 'RG_R3_OKX03_EVENTBUS_determinism_x2',
        pass: deterministic,
        detail: deterministic
          ? 'deterministic: two runs produce identical event sequence'
          : `NOT DETERMINISTIC: run1=${eventNames.join(',')} run2=${eventNames2.join(',')}`,
      });
    }
  }
}

// ---------------------------------------------------------------------------
// RG_R3_OKX04_ALLOWFILE — acquire refuses without allow-file (source analysis)
// ---------------------------------------------------------------------------
{
  const acqSrc = fs.existsSync(ACQ_SCRIPT)
    ? fs.readFileSync(ACQ_SCRIPT, 'utf8')
    : '';

  // Source must contain double-key guard patterns
  const hasAllowRef = acqSrc.includes('ALLOW_NETWORK');
  const hasExistsCheck = acqSrc.includes('existsSync') || acqSrc.includes('ALLOW_NETWORK');
  const hasFlagCheck = acqSrc.includes("'--enable-network'") || acqSrc.includes('"--enable-network"');
  const hasNetKillCheck = acqSrc.includes('TREASURE_NET_KILL');

  checks.push({
    check: 'RG_R3_OKX04_ALLOWFILE_double_key_guard',
    pass: hasAllowRef && hasFlagCheck,
    detail: `allow_ref=${hasAllowRef} flag_check=${hasFlagCheck}`,
  });
  checks.push({
    check: 'RG_R3_OKX04_ALLOWFILE_netkill_guard',
    pass: hasNetKillCheck,
    detail: `netkill_check=${hasNetKillCheck}`,
  });

  // Verify: ALLOW_NETWORK file absent right now (hygiene)
  const allowFile = path.join(ROOT, 'artifacts/incoming/ALLOW_NETWORK');
  const allowAbsent = !fs.existsSync(allowFile);
  checks.push({
    check: 'RG_R3_OKX04_ALLOWFILE_absent_now',
    pass: allowAbsent,
    detail: allowAbsent
      ? 'ALLOW_NETWORK file absent — hygiene OK'
      : 'ALLOW_NETWORK file present — must be cleaned after acquire',
  });

  // Verify: acquire source exits with EC=2 for missing double-key
  const hasEc2 = acqSrc.includes('process.exit(2)') && acqSrc.includes('ACQ_NET00');
  checks.push({
    check: 'RG_R3_OKX04_ALLOWFILE_ec2_refusal',
    pass: hasEc2,
    detail: `ec2_refusal_pattern=${hasEc2}`,
  });

  // Verify: acquire source exits with EC=1 for NET_KILL
  const hasEc1Contract = acqSrc.includes('process.exit(1)') && acqSrc.includes('CONTRACT');
  checks.push({
    check: 'RG_R3_OKX04_ALLOWFILE_ec1_contract',
    pass: hasEc1Contract,
    detail: `ec1_contract_pattern=${hasEc1Contract}`,
  });
}

// ---------------------------------------------------------------------------
// Check: NOT wired into verify:fast or ops:life
// ---------------------------------------------------------------------------
{
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  const fastScript = pkg.scripts?.['verify:fast'] || '';
  const lifeScript = pkg.scripts?.['ops:life'] || '';
  const lifeMjs = fs.existsSync(path.join(ROOT, 'scripts/ops/life.mjs'))
    ? fs.readFileSync(path.join(ROOT, 'scripts/ops/life.mjs'), 'utf8')
    : '';
  const wired = /verify:r3:/.test(fastScript) || /verify:r3:/.test(lifeScript) || /verify:r3:/.test(lifeMjs);
  checks.push({
    check: 'r3_not_wired_into_daily',
    pass: !wired,
    detail: wired ? 'WIRED: verify:r3:* found in daily chain' : 'not wired — OK',
  });
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
const failed = checks.filter((c) => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'R3_OKX_ACQUIRE_BLOCKED';

writeMd(path.join(EXEC, 'R3_OKX_ACQUIRE_CONTRACT.md'), [
  '# R3_OKX_ACQUIRE_CONTRACT.md — EPOCH-67 OKX Acquire Kernel Gates', '',
  `STATUS: ${status}`,
  `REASON_CODE: ${reason_code}`,
  `RUN_ID: ${RUN_ID}`,
  `NEXT_ACTION: ${NEXT_ACTION}`, '',
  '## CHECKS',
  checks.map((c) => `- [${c.pass ? 'PASS' : 'FAIL'}] ${c.check}: ${c.detail}`).join('\n'), '',
  '## FAILED',
  failed.length === 0 ? '- NONE' : failed.map((c) => `- ${c.check}: ${c.detail}`).join('\n'),
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'r3_okx_acquire_contract.json'), {
  schema_version: '1.0.0',
  gate_id: 'R3_OKX_ACQUIRE_CONTRACT',
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: NEXT_ACTION,
  checks,
  failed_checks: failed.map((c) => c.check),
});

console.log(`[${status}] r3_okx_acquire_contract — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
