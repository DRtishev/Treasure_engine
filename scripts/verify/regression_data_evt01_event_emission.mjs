/**
 * regression_data_evt01_event_emission.mjs — RG_DATA_EVT01_EVENT_EMISSION
 *
 * Gate: replay scripts must emit all 5 Data-Organ events into EventBus:
 *       REPLAY_BOOT, REPLAY_APPLY, REPLAY_DEDUP, REPLAY_REORDER, REPLAY_SEAL
 *       - Emitted to EPOCH-EVENTBUS-REPLAY-<run_id>/EVENTS.jsonl
 *       - Events must be tick-ordered (strictly increasing tick)
 *       - No time fields (no _at, _ts, _ms, timestamp etc.)
 *
 * Phase 5: Data-Organ R1 solder to WOW Organism.
 * Surface: DATA
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';
import { FORBIDDEN_FIELD_RE } from '../ops/event_schema_v1.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

const NEXT_ACTION = 'npm run -s verify:fast';
const sha = (x) => crypto.createHash('sha256').update(x).digest('hex');
const checks = [];

const REQUIRED_EVENTS = ['REPLAY_BOOT', 'REPLAY_APPLY', 'REPLAY_DEDUP', 'REPLAY_REORDER', 'REPLAY_SEAL'];

// Check 1: event_emitter.mjs exists
const emitterPath = path.join(ROOT, 'scripts/edge/data_organ/event_emitter.mjs');
checks.push({ check: 'event_emitter_exists', pass: fs.existsSync(emitterPath), detail: emitterPath });

if (fs.existsSync(emitterPath)) {
  const content = fs.readFileSync(emitterPath, 'utf8');
  // Check 2: emitter exports all required emit functions
  for (const evt of REQUIRED_EVENTS) {
    const fnName = `emit${evt.split('_').map((w) => w[0] + w.slice(1).toLowerCase()).join('')}`;
    const hasExport = content.includes(fnName) || content.includes(`'${evt}'`) || content.includes(`"${evt}"`);
    checks.push({
      check: `emitter_has_${evt.toLowerCase()}`,
      pass: hasExport,
      detail: hasExport ? `${fnName} or '${evt}' found — OK` : `MISSING: ${fnName} or '${evt}'`,
    });
  }
}

// Check 3: Create fixture run and test liq replay emits events
const fixtureRows = [
  { provider_id: 'bybit_ws_v5', symbol: 'BTCUSDT', side: 'Sell', liq_side: 'SHORT', ts: 1735689600000, p: '43000', v: '10', topic: 'allLiquidation.BTCUSDT' },
  { provider_id: 'bybit_ws_v5', symbol: 'BTCUSDT', side: 'Buy', liq_side: 'LONG', ts: 1735689601000, p: '43010', v: '5', topic: 'allLiquidation.BTCUSDT' },
];
const canon = (v) => Array.isArray(v) ? v.map(canon) : v && typeof v === 'object'
  ? Object.keys(v).sort((a, b) => a.localeCompare(b)).reduce((o, k) => (o[k] = canon(v[k]), o), {})
  : v;

const fixRunId = 'RG_DATA_EVT01_FIXTURE';
const fixDir = path.join(ROOT, 'artifacts/incoming/liquidations/bybit_ws_v5', fixRunId);
fs.mkdirSync(fixDir, { recursive: true });

const raw = fixtureRows.map((r) => JSON.stringify(r)).join('\n') + '\n';
const normalizedForHash = {
  provider_id: 'bybit_ws_v5',
  schema_version: 'liquidations.bybit_ws_v5.v2',
  time_unit_sentinel: 'ms',
  rows: fixtureRows.map((r) => ({
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
const fixtureRunLock = {
  provider_id: 'bybit_ws_v5',
  schema_version: 'liquidations.bybit_ws_v5.v2',
  time_unit_sentinel: 'ms',
  raw_capture_sha256: sha(raw),
  normalized_schema_sha256: sha(JSON.stringify(canon(normalizedForHash))),
  captured_at_utc: 'FIXTURE',
};
fs.writeFileSync(path.join(fixDir, 'raw.jsonl'), raw);
fs.writeFileSync(path.join(fixDir, 'lock.json'), JSON.stringify(fixtureRunLock, null, 2) + '\n');

const r = spawnSync(
  process.execPath,
  ['scripts/edge/edge_liq_01_offline_replay.mjs', '--provider', 'bybit_ws_v5', '--run-id', fixRunId],
  { cwd: ROOT, encoding: 'utf8', env: { ...process.env, TREASURE_NET_KILL: '1' } },
);
checks.push({
  check: 'replay_exits_0',
  pass: r.status === 0,
  detail: r.status === 0 ? 'replay exits 0 — OK' : `exit=${r.status}: ${(r.stdout || r.stderr || '').trim().slice(0, 120)}`,
});

if (r.status === 0) {
  // Find the EPOCH-EVENTBUS-REPLAY-* dir created by the replay
  const evidenceDir = path.join(ROOT, 'reports', 'evidence');
  const replayBusDirs = fs.existsSync(evidenceDir)
    ? fs.readdirSync(evidenceDir)
        .filter((d) => d.startsWith('EPOCH-EVENTBUS-REPLAY-') && d.includes(fixRunId))
        .sort()
    : [];
  const latestReplayBus = replayBusDirs.length > 0 ? replayBusDirs[replayBusDirs.length - 1] : null;
  const eventsPath = latestReplayBus ? path.join(evidenceDir, latestReplayBus, 'EVENTS.jsonl') : null;

  checks.push({
    check: 'epoch_eventbus_replay_dir_created',
    pass: Boolean(eventsPath && fs.existsSync(eventsPath)),
    detail: eventsPath ? path.relative(ROOT, eventsPath) : 'No EPOCH-EVENTBUS-REPLAY-*/EVENTS.jsonl found',
  });

  if (eventsPath && fs.existsSync(eventsPath)) {
    const lines = fs.readFileSync(eventsPath, 'utf8').trim().split('\n').filter(Boolean);
    const events = lines.map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);

    // Check 4: All 5 events present
    for (const evt of REQUIRED_EVENTS) {
      const found = events.some((e) => e.event === evt);
      checks.push({
        check: `event_${evt.toLowerCase()}_present`,
        pass: found,
        detail: found ? `${evt} found in bus — OK` : `MISSING: ${evt} not in EVENTS.jsonl`,
      });
    }

    // Check 5: Tick ordering — strictly increasing
    const ticks = events.map((e) => e.tick);
    const ticksOrdered = ticks.every((t, i) => i === 0 || t > ticks[i - 1]);
    checks.push({
      check: 'events_tick_ordered',
      pass: ticksOrdered,
      detail: ticksOrdered ? `ticks strictly increasing (${ticks.join(',')}) — OK` : `out-of-order: ${ticks.join(',')}`,
    });

    // Check 6: No time fields (RG_EVT02 doctrine)
    const timeViolations = [];
    for (const ev of events) {
      for (const key of Object.keys(ev)) {
        if (FORBIDDEN_FIELD_RE.test(key)) timeViolations.push(`event ${ev.event} field ${key}`);
      }
      if (ev.attrs && typeof ev.attrs === 'object') {
        for (const key of Object.keys(ev.attrs)) {
          if (FORBIDDEN_FIELD_RE.test(key)) timeViolations.push(`event ${ev.event} attrs.${key}`);
        }
      }
    }
    checks.push({
      check: 'no_time_fields_in_events',
      pass: timeViolations.length === 0,
      detail: timeViolations.length === 0 ? 'no forbidden time fields — OK' : `violations: ${timeViolations.join('; ')}`,
    });

    // Check 7: component is DATA_ORGAN
    const dataOrganEvents = events.filter((e) => e.component === 'DATA_ORGAN');
    checks.push({
      check: 'events_use_data_organ_component',
      pass: dataOrganEvents.length === events.length,
      detail: dataOrganEvents.length === events.length
        ? `all ${events.length} events use DATA_ORGAN component — OK`
        : `only ${dataOrganEvents.length}/${events.length} events use DATA_ORGAN`,
    });
  }
}

const failed = checks.filter((c) => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'DATA_EVT01_EMISSION_MISSING';

writeMd(path.join(EXEC, 'REGRESSION_DATA_EVT01.md'), [
  '# REGRESSION_DATA_EVT01.md', '',
  `STATUS: ${status}`,
  `REASON_CODE: ${reason_code}`,
  `RUN_ID: ${RUN_ID}`,
  `NEXT_ACTION: ${NEXT_ACTION}`, '',
  '## CHECKS',
  checks.map((c) => `- [${c.pass ? 'PASS' : 'FAIL'}] ${c.check}: ${c.detail}`).join('\n'), '',
  '## FAILED',
  failed.length === 0 ? '- NONE' : failed.map((c) => `- ${c.check}: ${c.detail}`).join('\n'),
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'regression_data_evt01.json'), {
  schema_version: '1.0.0',
  gate_id: 'RG_DATA_EVT01_EVENT_EMISSION',
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: NEXT_ACTION,
  required_events: REQUIRED_EVENTS,
  checks,
  failed_checks: failed.map((c) => c.check),
});

console.log(`[${status}] regression_data_evt01_event_emission — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
