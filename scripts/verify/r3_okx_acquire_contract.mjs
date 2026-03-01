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
// R3 evidence writes to EPOCH-R3-* directories (not EXECUTOR)
// to avoid PR05/PR01 allowlist violations. EXECUTOR is for daily-chain only.
const R3_EVIDENCE = path.join(ROOT, 'reports/evidence', `EPOCH-R3-OKX-ACQUIRE-${RUN_ID}`);
fs.mkdirSync(R3_EVIDENCE, { recursive: true });

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
// RG_R3_OKX05_LOCK_ATOMIC_FINAL — lock_state=FINAL, written once at SEAL
// ---------------------------------------------------------------------------
{
  const fixtureExists = fs.existsSync(FIXTURE_RAW) && fs.existsSync(FIXTURE_LOCK);
  if (fixtureExists) {
    const lock = JSON.parse(fs.readFileSync(FIXTURE_LOCK, 'utf8'));

    // lock_state must be FINAL
    const hasFinalState = lock.lock_state === 'FINAL';
    checks.push({
      check: 'RG_R3_OKX05_LOCK_ATOMIC_lock_state_final',
      pass: hasFinalState,
      detail: hasFinalState
        ? 'lock_state=FINAL'
        : `lock_state=${lock.lock_state || 'MISSING'}`,
    });

    // Source: acquire script must NOT write lock before raw (seal-only)
    const acqSrc = fs.existsSync(ACQ_SCRIPT) ? fs.readFileSync(ACQ_SCRIPT, 'utf8') : '';
    // Lock must be written AFTER raw.jsonl (raw appears first in source order)
    const rawWriteIdx = acqSrc.indexOf("writeFileSync(path.join(outDir, 'raw.jsonl')");
    const lockWriteIdx = acqSrc.indexOf("writeFileSync(path.join(outDir, 'lock.json')");
    const sealOrder = rawWriteIdx >= 0 && lockWriteIdx >= 0 && rawWriteIdx < lockWriteIdx;
    checks.push({
      check: 'RG_R3_OKX05_LOCK_ATOMIC_seal_order',
      pass: sealOrder,
      detail: sealOrder
        ? 'raw.jsonl written before lock.json (seal-only order)'
        : `WRONG ORDER: raw@${rawWriteIdx} lock@${lockWriteIdx}`,
    });

    // No DRAFT lock_state assignment in acquire source
    // (comments mentioning DRAFT are ok; actual lock_state:'DRAFT' is not)
    const hasDraftAssign = /lock_state\s*[:=]\s*['"]DRAFT['"]/.test(acqSrc);
    checks.push({
      check: 'RG_R3_OKX05_LOCK_ATOMIC_no_draft_state',
      pass: !hasDraftAssign,
      detail: !hasDraftAssign ? 'no lock_state=DRAFT assignment' : 'lock_state=DRAFT found',
    });
  }
}

// ---------------------------------------------------------------------------
// RG_EVT_DATA01_R3_EVENTS_SCHEMA_COMPAT — EventBus events are schema-valid
// ---------------------------------------------------------------------------
{
  const busDir = path.join(ROOT, 'reports/evidence/EPOCH-EVENTBUS-REPLAY-ACQ-OB-okx_orderbook_ws');
  const eventsFile = path.join(busDir, 'EVENTS.jsonl');

  if (fs.existsSync(eventsFile)) {
    const lines = fs.readFileSync(eventsFile, 'utf8').trim().split('\n').filter(Boolean);
    const events = lines.map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);

    // No wall-clock fields in any event
    const FORBIDDEN_RE = /(_at|_ts|_ms|timestamp|elapsed|wall_clock)($|[^a-z])/i;
    const wallClockViolations = [];
    for (const ev of events) {
      for (const key of Object.keys(ev)) {
        if (FORBIDDEN_RE.test(key)) wallClockViolations.push(`root.${key}`);
      }
      if (ev.attrs && typeof ev.attrs === 'object') {
        for (const key of Object.keys(ev.attrs)) {
          if (FORBIDDEN_RE.test(key)) wallClockViolations.push(`attrs.${key}`);
        }
      }
    }
    checks.push({
      check: 'RG_EVT_DATA01_no_wallclock_fields',
      pass: wallClockViolations.length === 0,
      detail: wallClockViolations.length === 0
        ? 'no wall-clock fields in events'
        : `VIOLATIONS: ${wallClockViolations.join(', ')}`,
    });

    // Required schema keys on every event
    const REQUIRED_KEYS = ['schema_version', 'tick', 'run_id', 'mode', 'component', 'event', 'reason_code', 'surface', 'evidence_paths', 'attrs'];
    const missingKeys = [];
    for (let i = 0; i < events.length; i++) {
      for (const k of REQUIRED_KEYS) {
        if (!(k in events[i])) missingKeys.push(`event[${i}].${k}`);
      }
    }
    checks.push({
      check: 'RG_EVT_DATA01_required_schema_keys',
      pass: missingKeys.length === 0,
      detail: missingKeys.length === 0
        ? `all ${events.length} events have required keys`
        : `MISSING: ${missingKeys.slice(0, 5).join(', ')}`,
    });

    // Tick ordering: ascending + component/event lex for same tick
    const tickAsc = events.every((e, i) => i === 0 || e.tick >= events[i - 1].tick);
    checks.push({
      check: 'RG_EVT_DATA01_tick_ascending',
      pass: tickAsc,
      detail: tickAsc ? 'ticks ascending' : 'ticks NOT ascending',
    });
  }
}

// ---------------------------------------------------------------------------
// RG_PR06_R3_NO_EXECUTOR_RUNTIME_CHURN — R3 gates don't touch EXECUTOR
// ---------------------------------------------------------------------------
{
  // Source inspection: r3_preflight and r3_okx_acquire_contract must NOT
  // reference EXECUTOR path for writing evidence
  const prefSrc = fs.existsSync(path.join(ROOT, 'scripts/verify/r3_preflight.mjs'))
    ? fs.readFileSync(path.join(ROOT, 'scripts/verify/r3_preflight.mjs'), 'utf8')
    : '';
  const acqContractSrc = fs.readFileSync(path.join(ROOT, 'scripts/verify/r3_okx_acquire_contract.mjs'), 'utf8');

  // Check: preflight does not write to EXECUTOR
  const prefNoExec = !prefSrc.includes("'reports/evidence/EXECUTOR'") &&
    !prefSrc.includes('"reports/evidence/EXECUTOR"');
  checks.push({
    check: 'RG_PR06_preflight_no_executor_write',
    pass: prefNoExec,
    detail: prefNoExec ? 'preflight writes to EPOCH-R3-* only' : 'EXECUTOR ref found in preflight',
  });

  // Check: acquire contract uses EPOCH-R3-* for evidence (not EXECUTOR writeMd/writeJson)
  // We check that the evidence output variable is R3_EVIDENCE, not EXEC/MANUAL
  const usesR3Evidence = acqContractSrc.includes('R3_EVIDENCE') &&
    acqContractSrc.includes('EPOCH-R3-');
  checks.push({
    check: 'RG_PR06_contract_uses_epoch_r3',
    pass: usesR3Evidence,
    detail: usesR3Evidence ? 'contract writes to EPOCH-R3-* evidence dir' : 'EPOCH-R3 pattern not found',
  });

  // Check: no R3_*.md or r3_*.json on disk in EXECUTOR
  const execDirParts = ['reports', 'evidence', 'EXECUTOR'];
  const execDir = path.join(ROOT, ...execDirParts);
  const r3InExec = fs.existsSync(execDir) ?
    fs.readdirSync(execDir).filter((f) => /^R3_/i.test(f)) : [];
  const manualDir = path.join(execDir, 'gates', 'manual');
  const r3InManual = fs.existsSync(manualDir) ?
    fs.readdirSync(manualDir).filter((f) => /^r3_/i.test(f)) : [];
  const noR3OnDisk = r3InExec.length === 0 && r3InManual.length === 0;
  checks.push({
    check: 'RG_PR06_no_r3_in_executor_on_disk',
    pass: noR3OnDisk,
    detail: noR3OnDisk
      ? 'no R3 files in EXECUTOR'
      : `FOUND: ${[...r3InExec, ...r3InManual].join(', ')}`,
  });
}

// ---------------------------------------------------------------------------
// RG_CAP05_R3_POLICY_FROM_CAPABILITIES — acquire sources from capabilities
// ---------------------------------------------------------------------------
{
  const acqSrc = fs.existsSync(ACQ_SCRIPT) ? fs.readFileSync(ACQ_SCRIPT, 'utf8') : '';

  // Source must import/read data_capabilities.json
  const readsCapabilities = acqSrc.includes('data_capabilities.json');
  checks.push({
    check: 'RG_CAP05_reads_capabilities',
    pass: readsCapabilities,
    detail: `reads_capabilities=${readsCapabilities}`,
  });

  // Source must reference okx caps for depth_levels
  const usesDepthLevels = acqSrc.includes('depth_levels');
  checks.push({
    check: 'RG_CAP05_uses_depth_levels',
    pass: usesDepthLevels,
    detail: `uses_depth_levels=${usesDepthLevels}`,
  });

  // Source must reference topic_format from capabilities
  const usesTopicFormat = acqSrc.includes('topic_format');
  checks.push({
    check: 'RG_CAP05_uses_topic_format',
    pass: usesTopicFormat,
    detail: `uses_topic_format=${usesTopicFormat}`,
  });

  // Verify capabilities file is parseable and has okx section
  const capsPath = path.join(ROOT, 'specs/data_capabilities.json');
  let capsValid = false;
  if (fs.existsSync(capsPath)) {
    try {
      const caps = JSON.parse(fs.readFileSync(capsPath, 'utf8'));
      capsValid = !!caps.capabilities?.okx?.orderbook?.depth_levels &&
        !!caps.capabilities?.okx?.policy?.topic_format;
    } catch {}
  }
  checks.push({
    check: 'RG_CAP05_capabilities_valid',
    pass: capsValid,
    detail: capsValid
      ? 'okx capabilities present with depth_levels + topic_format'
      : 'MISSING or invalid okx capabilities',
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

writeMd(path.join(R3_EVIDENCE, 'R3_OKX_ACQUIRE_CONTRACT.md'), [
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

writeJsonDeterministic(path.join(R3_EVIDENCE, 'r3_okx_acquire_contract.json'), {
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
