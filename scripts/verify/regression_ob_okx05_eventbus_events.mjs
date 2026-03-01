/**
 * regression_ob_okx05_eventbus_events.mjs — RG_OB_OKX05_EVENTBUS_EVENTS
 *
 * Gate: Verify that edge_okx_orderbook_01_offline_replay.mjs:
 *   1. Exits with EC=0 (PASS) when run with a valid fixture
 *   2. Emits BOOK_BOOT event (EPOCH-EVENTBUS-REPLAY dir exists with events)
 *   3. Emits BOOK_SEAL event (replay completes)
 *   4. EventBus epoch dir is created under reports/evidence/
 *
 * This gate runs the replay script as a subprocess with TREASURE_NET_KILL=1.
 *
 * Surface: DATA
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

const NEXT_ACTION = 'npm run -s verify:regression:ob-okx05-eventbus-events';
const REPLAY_SCRIPT = path.join(ROOT, 'scripts', 'edge', 'edge_okx_orderbook_01_offline_replay.mjs');
const FIXTURE_PATH = path.join(ROOT, 'artifacts', 'fixtures', 'okx', 'orderbook', 'main', 'fixture.jsonl');

const checks = [];

// Check script exists
checks.push({
  check: 'replay_script_exists',
  pass: fs.existsSync(REPLAY_SCRIPT),
  detail: fs.existsSync(REPLAY_SCRIPT)
    ? `edge_okx_orderbook_01_offline_replay.mjs present — OK`
    : `MISSING: ${path.relative(ROOT, REPLAY_SCRIPT)}`,
});

checks.push({
  check: 'fixture_exists',
  pass: fs.existsSync(FIXTURE_PATH),
  detail: fs.existsSync(FIXTURE_PATH) ? `fixture.jsonl present — OK` : `MISSING fixture`,
});

if (fs.existsSync(REPLAY_SCRIPT) && fs.existsSync(FIXTURE_PATH)) {
  // Run replay with TREASURE_NET_KILL=1
  const result = spawnSync(
    process.execPath,
    [REPLAY_SCRIPT],
    {
      env: { ...process.env, TREASURE_NET_KILL: '1' },
      cwd: ROOT,
      encoding: 'utf8',
      timeout: 30000,
    }
  );

  const stdout = (result.stdout || '').trim();
  const stderr = (result.stderr || '').trim();
  const exitCode = result.status;

  checks.push({
    check: 'replay_exit_code_zero',
    pass: exitCode === 0,
    detail: exitCode === 0
      ? `replay exited with EC=0 — PASS`
      : `replay exited with EC=${exitCode} — stdout=${stdout.slice(0, 200)} stderr=${stderr.slice(0, 200)}`,
  });

  checks.push({
    check: 'replay_stdout_contains_pass',
    pass: stdout.includes('[PASS]'),
    detail: stdout.includes('[PASS]')
      ? `stdout contains [PASS] — OK`
      : `stdout does not contain [PASS]: ${stdout.slice(0, 200)}`,
  });

  // Check EventBus epoch dir was created
  const PROVIDER_ID = 'okx_orderbook_ws';
  const runId = `REPLAY-OKX-ORDERBOOK-${PROVIDER_ID}`;
  const epochDir = path.join(ROOT, 'reports', 'evidence', `EPOCH-EVENTBUS-REPLAY-${runId}`);

  checks.push({
    check: 'eventbus_epoch_dir_created',
    pass: fs.existsSync(epochDir),
    detail: fs.existsSync(epochDir)
      ? `EPOCH dir exists: ${path.relative(ROOT, epochDir)} — OK`
      : `MISSING epoch dir: ${path.relative(ROOT, epochDir)}`,
  });

  if (fs.existsSync(epochDir)) {
    // Read the eventbus log file
    const logFile = path.join(epochDir, 'EVENTS.jsonl');
    if (fs.existsSync(logFile)) {
      const logLines = fs.readFileSync(logFile, 'utf8').split('\n').map((l) => l.trim()).filter(Boolean);
      const events = [];
      for (const line of logLines) {
        try { events.push(JSON.parse(line)); } catch (_) { /* skip */ }
      }

      const eventTypes = events.map((e) => e.event);

      checks.push({
        check: 'eventbus_log_has_book_boot',
        pass: eventTypes.includes('BOOK_BOOT'),
        detail: eventTypes.includes('BOOK_BOOT')
          ? `BOOK_BOOT event present in eventbus log — OK`
          : `MISSING BOOK_BOOT in events: [${eventTypes.join(', ')}]`,
      });

      checks.push({
        check: 'eventbus_log_has_book_seal',
        pass: eventTypes.includes('BOOK_SEAL'),
        detail: eventTypes.includes('BOOK_SEAL')
          ? `BOOK_SEAL event present in eventbus log — OK`
          : `MISSING BOOK_SEAL in events: [${eventTypes.join(', ')}]`,
      });

      checks.push({
        check: 'eventbus_log_has_book_reset',
        pass: eventTypes.includes('BOOK_RESET'),
        detail: eventTypes.includes('BOOK_RESET')
          ? `BOOK_RESET event present in eventbus log — OK`
          : `MISSING BOOK_RESET in events: [${eventTypes.join(', ')}]`,
      });

      checks.push({
        check: 'all_events_are_cert_mode',
        pass: events.every((e) => e.mode === 'CERT'),
        detail: events.every((e) => e.mode === 'CERT')
          ? `all ${events.length} events have mode=CERT — OK`
          : `CERT_MODE violation: some events missing mode=CERT`,
      });

      checks.push({
        check: 'all_events_have_no_time_fields',
        pass: events.every((e) => !('ts' in e) && !('timestamp' in e) && !('time' in e)),
        detail: events.every((e) => !('ts' in e) && !('timestamp' in e) && !('time' in e))
          ? `all events are tick-only (no ts/timestamp/time) — OK`
          : `TIME_FIELD violation: events have ts/timestamp/time fields`,
      });
    } else {
      checks.push({
        check: 'eventbus_events_jsonl_exists',
        pass: false,
        detail: `MISSING: ${path.relative(ROOT, logFile)}`,
      });
    }
  }
}

const failed = checks.filter((c) => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'OB_OKX05_EVENTBUS_FAIL';

writeMd(path.join(EXEC, 'REGRESSION_OB_OKX05.md'), [
  '# REGRESSION_OB_OKX05.md', '',
  `STATUS: ${status}`,
  `REASON_CODE: ${reason_code}`,
  `RUN_ID: ${RUN_ID}`,
  `NEXT_ACTION: ${NEXT_ACTION}`, '',
  '## POLICY',
  '- Replay must exit EC=0',
  '- EventBus epoch dir must be created',
  '- BOOK_BOOT and BOOK_SEAL must be emitted',
  '- All events must have mode=CERT',
  '- Events must be tick-only (no ts/timestamp/time)', '',
  '## CHECKS',
  checks.map((c) => `- [${c.pass ? 'PASS' : 'FAIL'}] ${c.check}: ${c.detail}`).join('\n'), '',
  '## FAILED',
  failed.length === 0 ? '- NONE' : failed.map((c) => `- ${c.check}: ${c.detail}`).join('\n'),
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'regression_ob_okx05.json'), {
  schema_version: '1.0.0',
  gate_id: 'RG_OB_OKX05_EVENTBUS_EVENTS',
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: NEXT_ACTION,
  checks,
  failed_checks: failed.map((c) => c.check),
});

console.log(`[${status}] regression_ob_okx05_eventbus_events — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
