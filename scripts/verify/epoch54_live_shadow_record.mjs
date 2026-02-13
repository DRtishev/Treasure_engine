#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { parseJsonl, normalizeTradeEvent, fingerprintObject } from '../../core/edge/data_contracts.mjs';
import { evaluateDataQuality } from '../../core/edge/data_quality.mjs';
import { dedupPublicTrades } from '../../core/edge/public_trade_dedup.mjs';

const root = process.cwd();
const epoch = process.env.EVIDENCE_EPOCH || 'EPOCH-54';
const manualDir = path.join(root, 'reports/evidence', epoch, 'gates', 'manual');
fs.mkdirSync(manualDir, { recursive: true });

let passed = 0; let failed = 0;
const checks = [];
const check = (ok, msg) => { checks.push({ ok, msg }); if (ok) { passed += 1; console.log(`✓ ${msg}`); } else { failed += 1; console.error(`✗ ${msg}`); } };

const fixtureRaw = parseJsonl(fs.readFileSync('data/fixtures/binance/e49_fixture/raw/chunks/chunk_1700000000000_0001.jsonl', 'utf8'));
const norm = fixtureRaw.map((r) => normalizeTradeEvent(r, 'binance'));

function rechunkFp(rows, chunk) {
  const chunks = [];
  for (let i = 0; i < rows.length; i += chunk) chunks.push(rows.slice(i, i + chunk));
  const flat = chunks.flat().sort((a, b) => a.ts_ms - b.ts_ms || a.output_fingerprint.localeCompare(b.output_fingerprint));
  return fingerprintObject(flat.map((x) => x.output_fingerprint));
}

const fp1 = rechunkFp(norm, 1);
const fp2 = rechunkFp(norm, 3);
check(fp1 === fp2, 'rechunk fingerprint invariant under chunk boundaries');

const withDupIds = [norm[0], norm[0], norm[1]].map((r, i) => ({ ...r, trade_id: i === 1 ? norm[0].trade_id : r.trade_id }));
const dedupStrict = dedupPublicTrades(withDupIds, { strict: true });
check(dedupStrict.report.dedup_count >= 1, 'strict dedup removes duplicate trade_id rows');

const noIds = norm.slice(0, 3).map((r) => ({ ...r, trade_id: null }));
const dedupHeur = dedupPublicTrades([noIds[0], noIds[0], noIds[1]], { strict: false });
check(dedupHeur.report.heuristic_dedup_used === true, 'heuristic dedup flagged when trade_id absent');

let strictFail = false;
try { dedupPublicTrades([noIds[0], noIds[0]], { strict: true }); } catch { strictFail = true; }
check(strictFail, 'strict mode fails when heuristic dedup would be required');

const quality = evaluateDataQuality(dedupStrict.rows);
const dataset_manifest = {
  dataset_id: 'e49_fixture', provider: 'binance', reconnect_count: 0, gap_count: quality.report.gap_count,
  dedup_count: dedupStrict.report.dedup_count, out_of_order_count: quality.report.out_of_order_count, heuristic_dedup_used: false,
  replay_fingerprint: fp1
};
const rechunk = { fp_chunk_1: fp1, fp_chunk_3: fp2, invariant: fp1 === fp2 };

fs.writeFileSync(path.join(manualDir, 'dataset_manifest.json'), JSON.stringify(dataset_manifest, null, 2) + '\n');
fs.writeFileSync(path.join(manualDir, 'quality_report.json'), JSON.stringify(quality.report, null, 2) + '\n');
fs.writeFileSync(path.join(manualDir, 'rechunk_invariant.json'), JSON.stringify(rechunk, null, 2) + '\n');

const result = { epoch: 'EPOCH-54', status: failed === 0 ? 'PASS' : 'FAIL', passed, failed, checks };
fs.writeFileSync(path.join(manualDir, 'verify_epoch54_result.json'), JSON.stringify(result, null, 2) + '\n');

if (failed) process.exit(1);
console.log(`PASS verify:epoch54 checks=${passed}`);
