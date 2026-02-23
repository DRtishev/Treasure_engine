import fs from 'node:fs';
import path from 'node:path';
import { writeJsonDeterministic } from '../../lib/write_json_deterministic.mjs';
import { RUN_ID, writeMd } from './canon.mjs';

const ROOT = path.resolve(process.cwd());
const EPOCH_DIR = path.join(ROOT, 'reports', 'evidence', 'EDGE_PROFIT_00');
const MANUAL_DIR = path.join(EPOCH_DIR, 'gates', 'manual');

fs.mkdirSync(MANUAL_DIR, { recursive: true });

const registry = [
  {
    id: 'HYP-0001',
    name: 'BTC mean-reversion micro swing (paper only)',
    params: { lookback_bars: 48, z_entry: 2.2, z_exit: 0.6 },
    timeframe: '5m',
    venue: 'BINANCE_SPOT',
    expected_edge_type: 'MEAN_REVERSION',
    status: 'CANDIDATE',
  },
  {
    id: 'HYP-0002',
    name: 'ETH momentum continuation with latency-aware exits (paper only)',
    params: { breakout_bars: 24, trail_bps: 14, max_latency_ms: 350 },
    timeframe: '1m',
    venue: 'BINANCE_SPOT',
    expected_edge_type: 'MOMENTUM',
    status: 'CANDIDATE',
  },
];

const required = ['id', 'name', 'params', 'timeframe', 'venue', 'expected_edge_type', 'status'];
const ids = new Set();
const errors = [];
for (const row of registry) {
  for (const k of required) {
    if (!(k in row)) errors.push(`missing_field:${row.id || 'UNKNOWN'}:${k}`);
  }
  if (!/^HYP-\d{4}$/.test(row.id)) errors.push(`bad_id_format:${row.id}`);
  if (ids.has(row.id)) errors.push(`duplicate_id:${row.id}`);
  ids.add(row.id);
}

const status = errors.length === 0 ? 'PASS' : 'BLOCKED';
const reasonCode = errors.length === 0 ? 'NONE' : 'RG01';
const nextAction = errors.length === 0
  ? 'npm run -s edge:profit:00:ingest'
  : 'npm run -s edge:profit:00';

const md = `# HYPOTHESIS_REGISTRY.md — EDGE_PROFIT_00 Registry Court

STATUS: ${status}
REASON_CODE: ${reasonCode}
RUN_ID: ${RUN_ID}
NEXT_ACTION: ${nextAction}

## Registry Rows

| id | name | timeframe | venue | expected_edge_type | status |
|---|---|---|---|---|---|
${registry.map((r) => `| ${r.id} | ${r.name} | ${r.timeframe} | ${r.venue} | ${r.expected_edge_type} | ${r.status} |`).join('\n')}

## Change Protocol

- PROPOSE → APPLY receipts required for any mutation.
- IDs are immutable and append-only.

## Validation Errors

${errors.length ? errors.map((e) => `- ${e}`).join('\n') : '- NONE'}
`;

writeMd(path.join(EPOCH_DIR, 'HYPOTHESIS_REGISTRY.md'), md);

writeJsonDeterministic(path.join(MANUAL_DIR, 'hypothesis_registry.json'), {
  schema_version: '1.0.0',
  status,
  reason_code: reasonCode,
  run_id: RUN_ID,
  message: errors.length === 0
    ? `Registry valid with ${registry.length} immutable hypothesis entries.`
    : `Registry validation failed: ${errors.join('; ')}`,
  next_action: nextAction,
  hypothesis_count: registry.length,
  registry_ids: registry.map((r) => r.id),
  errors,
});

console.log(`[${status}] edge_hypothesis_registry_court — ${reasonCode}`);
process.exit(status === 'PASS' ? 0 : 1);
