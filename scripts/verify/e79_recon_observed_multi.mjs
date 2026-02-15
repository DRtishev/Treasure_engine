#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { ingestE78Recon } from '../../core/edge/e78_recon_coverage.mjs';
import { E79_ROOT, ensureDir, quietLog, minimalLog } from './e79_lib.mjs';
import { writeMd } from './e66_lib.mjs';

const update=process.env.UPDATE_E79_EVIDENCE==='1';
if(process.env.CI==='true'&&update) throw new Error('UPDATE_E79_EVIDENCE forbidden in CI');
if(process.env.CI==='true'&&process.env.ALLOW_MANUAL_RECON==='1') throw new Error('manual recon forbidden in CI');

const source=path.resolve(process.env.RECON_OBSERVED_SOURCE||'core/edge/fixtures/e77_recon_observed_multi.csv');
if(!fs.existsSync(source)) throw new Error(`missing recon source: ${source}`);
const recon=ingestE78Recon(source);

const lines=['# E79 EXEC RECON OBSERVED MULTI',`- source_file: ${recon.source_file}`,`- source_sha256: ${recon.source_sha}`,`- recon_fingerprint: ${recon.fingerprint}`,'','## coverage','| symbol | window | accepted_rows | rejected_rows | rejects_breakdown |','|---|---|---:|---:|---|'];
for(const r of recon.coverageRows){const br=Object.entries(r.rejects).sort((a,b)=>a[0].localeCompare(b[0])).map(([k,v])=>`${k}:${v}`).join(', ')||'none';lines.push(`| ${r.symbol} | ${r.window} | ${r.accepted_rows} | ${r.rejected_rows} | ${br} |`);}
lines.push('','## Observed Recon Ledger',`- recon_input_sha: ${recon.source_sha}`,`- total_accepted: ${recon.accepted.length}`,`- total_rejected: ${recon.rejected.length}`);

if(update&&process.env.CI!=='true'){
  if(process.env.ALLOW_MANUAL_RECON==='1'&&!(process.env.ENABLE_DEMO_ADAPTER==='1')) throw new Error('manual recon requires ENABLE_DEMO_ADAPTER=1');
  ensureDir(E79_ROOT);
  writeMd(path.join(E79_ROOT,'EXEC_RECON_OBSERVED_MULTI.md'),lines.join('\n'));
}
quietLog(JSON.stringify({recon_fingerprint:recon.fingerprint,source_sha:recon.source_sha},null,2));
minimalLog(`verify:e79:recon PASSED recon_fingerprint=${recon.fingerprint}`);
