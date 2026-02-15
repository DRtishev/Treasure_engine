#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { parseObservedReconFixture, deriveExecutionEnvelope } from '../../core/edge/e76_profit_reality_bridge.mjs';
import { writeMd } from './e66_lib.mjs';

const update = process.env.UPDATE_E76_EVIDENCE === '1';
if (process.env.CI === 'true') throw new Error('MANUAL_RECON_FORBIDDEN_IN_CI');
if (process.env.NODE_ENV === 'test') throw new Error('MANUAL_RECON_FORBIDDEN_IN_TESTS');
if (process.env.ENABLE_DEMO_ADAPTER !== '1' || process.env.ALLOW_MANUAL_RECON !== '1') throw new Error('MANUAL_RECON_GATES_REQUIRED');
if (!update) throw new Error('UPDATE_E76_EVIDENCE=1 required for manual recon write');

const fixture = path.resolve(process.env.E76_RECON_FIXTURE || 'core/edge/fixtures/e76_recon_observed_fixture.csv');
const rows = parseObservedReconFixture(fixture);
const env = deriveExecutionEnvelope(rows, { seed: Number(process.env.SEED || '12345') });
const fixtureSha = crypto.createHash('sha256').update(fs.readFileSync(fixture)).digest('hex');

const lines = [
  '# E76 EXEC RECON OBSERVED',
  '- mode: MANUAL_RECON',
  '- note: NO LIVE IO PERFORMED; fixture-based only',
  `- fixture: ${fixture}`,
  `- fixture_sha256: ${fixtureSha}`,
  `- envelope_fingerprint: ${env.envelope_fingerprint}`,
  '',
  '| parameter | value |',
  '|---|---|',
  `| symbol | ${rows[0]?.symbol || 'N/A'} |`,
  `| fee_maker_bps | ${env.base.fees.maker_bps} |`,
  `| fee_taker_bps | ${env.base.fees.taker_bps} |`,
  `| spread_median_bps | ${env.base.spread_bps.median} |`,
  `| spread_p95_bps | ${env.base.spread_bps.p95} |`,
  `| slippage_small_median_bps | ${env.base.slippage_bps_buckets.small.median} |`,
  `| slippage_medium_median_bps | ${env.base.slippage_bps_buckets.medium.median} |`,
  `| slippage_large_median_bps | ${env.base.slippage_bps_buckets.large.median} |`,
  `| latency_decision_submit_median_ms | ${env.base.latency_ms.decision_submit.median} |`,
  `| latency_submit_ack_median_ms | ${env.base.latency_ms.submit_ack.median} |`,
  `| latency_ack_fill_median_ms | ${env.base.latency_ms.ack_fill.median} |`,
  `| tick_size | ${env.base.constraints.tick_size} |`,
  `| lot_size | ${env.base.constraints.lot_size} |`,
  `| min_qty | ${env.base.constraints.min_qty} |`,
  `| min_notional | ${env.base.constraints.min_notional} |`,
  '',
  '## SOURCES',
  '- official: Bybit API docs (fees/rate limits/instruments), checked 2026-02-15T09:00:00Z',
  '- alternate: exchangefees and public microstructure references, checked 2026-02-15T09:20:00Z'
];

writeMd(path.resolve('reports/evidence/E76/EXEC_RECON_OBSERVED.md'), lines.join('\n'));
console.log('e76 manual recon collected');
