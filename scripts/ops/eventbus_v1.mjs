/**
 * eventbus_v1.mjs — WOW Organism EventBus v1
 *
 * Append-only tick-ordered event stream.
 * No mtime, no filesystem ordering — tick counter is the sole order.
 *
 * API:
 *   const bus = createBus(runId, epochDir);
 *   bus.append(fields)   → canonicalized event (tick auto-incremented)
 *   bus.events()         → readonly event array (stable ordering)
 *   bus.reduce(fn, init) → fold over events
 *   bus.flush()          → write EVENTS.jsonl (deterministic)
 *   bus.summary()        → { run_id, events_n, components_seen[], status }
 *
 * Gates: RG_BUS01_DETERMINISM_X2, RG_BUS02_WRITE_SCOPE
 * Write-scope (R5): reports/evidence/EPOCH-EVENTBUS-<run_id>/ ONLY
 */

import fs from 'node:fs';
import path from 'node:path';
import { makeEvent, canonicalize, EVENT_SCHEMA_VERSION } from './event_schema_v1.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';

const ROOT = process.cwd();

// ---------------------------------------------------------------------------
// createBus — factory
// ---------------------------------------------------------------------------
export function createBus(runId = RUN_ID, epochDir = null) {
  const _runId = runId;
  const _epochDir = epochDir ?? path.join(ROOT, 'reports', 'evidence', `EPOCH-EVENTBUS-${_runId}`);
  let _tick = 0;
  const _events = [];

  function append(fields) {
    _tick += 1;
    const ev = makeEvent({ ...fields, tick: _tick, run_id: _runId });
    _events.push(ev);
    return ev;
  }

  function events() {
    // Return stable copy sorted by tick (should already be sorted)
    return [..._events].sort((a, b) => a.tick - b.tick);
  }

  function reduce(fn, init) {
    return events().reduce(fn, init);
  }

  function flush() {
    fs.mkdirSync(_epochDir, { recursive: true });

    // EVENTS.jsonl — one line per event, keys sorted for determinism
    const lines = events().map((ev) => {
      const sorted = {};
      for (const k of Object.keys(ev).sort()) sorted[k] = ev[k];
      return JSON.stringify(sorted);
    });
    fs.writeFileSync(path.join(_epochDir, 'EVENTS.jsonl'), lines.join('\n') + '\n', 'utf8');

    // SUMMARY.json
    const components = [...new Set(events().map((e) => e.component))].sort();
    const failed = events().filter((e) => e.reason_code !== 'NONE');

    writeJsonDeterministic(path.join(_epochDir, 'SUMMARY.json'), {
      schema_version: EVENT_SCHEMA_VERSION,
      gate_id: 'WOW_EVENTBUS_V1',
      run_id: _runId,
      events_n: _events.length,
      ticks_n: _tick,
      components_seen: components,
      failed_n: failed.length,
      status: failed.length === 0 ? 'PASS' : 'FAIL',
      reason_code: failed.length === 0 ? 'NONE' : failed[0].reason_code,
      next_action: 'npm run -s verify:fast',
    });

    // EVENTS.md — human-readable
    const rows = events().map((e) =>
      `| ${e.tick} | ${e.component} | ${e.event} | ${e.reason_code} | ${e.surface} |`
    ).join('\n');

    writeMd(path.join(_epochDir, 'EVENTS.md'), [
      `# EVENTS — EPOCH-EVENTBUS-${_runId}`, '',
      `RUN_ID: ${_runId}`,
      `EVENTS: ${_events.length}`,
      `COMPONENTS: ${components.join(', ')}`, '',
      '| tick | component | event | reason_code | surface |',
      '|------|-----------|-------|-------------|---------|',
      rows || '| - | - | - | - | - |', '',
      '## NEXT_ACTION', 'npm run -s verify:fast', '',
    ].join('\n'));

    return { jsonlPath: path.join(_epochDir, 'EVENTS.jsonl'), epochDir: _epochDir };
  }

  function summary() {
    return {
      run_id: _runId,
      events_n: _events.length,
      ticks_n: _tick,
      components_seen: [...new Set(events().map((e) => e.component))].sort(),
      epochDir: _epochDir,
    };
  }

  return { append, events, reduce, flush, summary };
}

// ---------------------------------------------------------------------------
// readBus(jsonlPath) — reconstruct bus from EVENTS.jsonl (read-only)
// ---------------------------------------------------------------------------
export function readBus(jsonlPath) {
  if (!fs.existsSync(jsonlPath)) return { events: () => [], reduce: (fn, init) => init };
  const lines = fs.readFileSync(jsonlPath, 'utf8').trim().split('\n').filter(Boolean);
  const evts = lines.map((l) => { try { return JSON.parse(l); } catch { return null; } })
    .filter(Boolean)
    .sort((a, b) => a.tick - b.tick);
  return {
    events: () => evts,
    reduce: (fn, init) => evts.reduce(fn, init),
  };
}

// ---------------------------------------------------------------------------
// findLatestBusJsonl(evidenceDir) — find latest EPOCH-EVENTBUS-* EVENTS.jsonl
// No mtime — sorted lexicographically (stable)
// ---------------------------------------------------------------------------
export function findLatestBusJsonl(evidenceDir = path.join(ROOT, 'reports', 'evidence')) {
  if (!fs.existsSync(evidenceDir)) return null;
  const dirs = fs.readdirSync(evidenceDir)
    .filter((d) => d.startsWith('EPOCH-EVENTBUS-'))
    .sort((a, b) => a.localeCompare(b)); // lexicographic — deterministic
  if (dirs.length === 0) return null;
  const latest = dirs[dirs.length - 1];
  const p = path.join(evidenceDir, latest, 'EVENTS.jsonl');
  return fs.existsSync(p) ? p : null;
}

// ---------------------------------------------------------------------------
// CLI smoke (invoked via: npm run -s ops:eventbus:smoke)
// ---------------------------------------------------------------------------
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.url.replace('file://', ''))) {
  const bus = createBus();
  bus.append({ mode: 'CERT', component: 'EVENTBUS', event: 'BUS_INIT', surface: 'DATA' });
  bus.append({ mode: 'CERT', component: 'EVENTBUS', event: 'EVENT_APPENDED', surface: 'DATA', attrs: { source: 'smoke' } });
  bus.append({ mode: 'CERT', component: 'TIMEMACHINE', event: 'LEDGER_BOOT', surface: 'UX' });
  bus.append({ mode: 'CERT', component: 'TIMEMACHINE', event: 'LEDGER_SEAL', surface: 'UX', attrs: { ticks_total: 8, ticks_failed: 0 } });
  bus.append({ mode: 'CERT', component: 'EVENTBUS', event: 'EVENT_APPENDED', surface: 'DATA', attrs: { source: 'smoke_seal' } });

  const { jsonlPath, epochDir } = bus.flush();

  console.log(`[PASS] ops:eventbus:smoke — NONE`);
  console.log(`  EVENTS:  ${path.relative(ROOT, jsonlPath)}`);
  console.log(`  EPOCH:   ${path.relative(ROOT, epochDir)}`);
  console.log(`  TOTAL:   ${bus.summary().events_n} events`);
}
