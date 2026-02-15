#!/usr/bin/env node
import path from 'node:path';
import crypto from 'node:crypto';
import { ingestE78Recon } from '../../core/edge/e78_recon_coverage.mjs';
import { E80_ROOT, ensureDir, quietLog, minimalLog } from './e80_lib.mjs';
import { writeMd } from './e66_lib.mjs';

if(process.env.CI==='true') throw new Error('manual microfill forbidden in CI');
if(process.env.ENABLE_DEMO_ADAPTER!=='1'||process.env.ALLOW_MANUAL_RECON!=='1'||process.env.UPDATE_E80_EVIDENCE!=='1') throw new Error('requires ENABLE_DEMO_ADAPTER=1 ALLOW_MANUAL_RECON=1 UPDATE_E80_EVIDENCE=1');
if(process.env.LIVE_TRADING==='1') throw new Error('live trading forbidden');

const source=path.resolve('core/edge/fixtures/e80_recon_observed_multi.csv');
const recon=ingestE78Recon(source);
const latBuckets={lt150:0,b150_200:0,gte200:0};
const slipBuckets={lt04:0,b04_08:0,gte08:0};
for(const r of recon.accepted){if(r.latency_ms<150)latBuckets.lt150++;else if(r.latency_ms<200)latBuckets.b150_200++;else latBuckets.gte200++;if(r.slippage_est<0.4)slipBuckets.lt04++;else if(r.slippage_est<0.8)slipBuckets.b04_08++;else slipBuckets.gte08++;}
const fp=crypto.createHash('sha256').update(JSON.stringify({source_sha:recon.source_sha,latBuckets,slipBuckets})).digest('hex');
ensureDir(E80_ROOT);
writeMd(path.join(E80_ROOT,'EXEC_RECON_MICROFILL.md'),['# E80 EXEC RECON MICROFILL','- mode: DEMO_ONLY','- live_trading: DISABLED',`- source_sha256: ${recon.source_sha}`,`- microfill_fingerprint: ${fp}`,'','## expected_vs_filled','- comparator: abs(filled_px-expected_px)/expected_px aggregated from observed fixture','',`- latency_buckets: ${JSON.stringify(latBuckets)}`,`- slippage_buckets: ${JSON.stringify(slipBuckets)}`].join('\n'));
quietLog(JSON.stringify({microfill_fingerprint:fp},null,2));
minimalLog(`verify:exec:recon:microfill PASSED microfill_fingerprint=${fp}`);
