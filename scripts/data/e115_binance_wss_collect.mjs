#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { collectBinanceClosedKlines, replayBinanceFrames } from '../../core/data/binance_ws_kline.mjs';
import { modeE115, assertNetGateE115, runDirE115, writeMdAtomic } from '../verify/e115_lib.mjs';
import { sha256Text } from '../verify/e66_lib.mjs';

const mode=modeE115(); const run=runDirE115(); fs.mkdirSync(run,{recursive:true}); const framesPath=path.join(run,'wss_frames.jsonl');
let liveRows=[]; let status='SKIPPED';
if (mode!=='OFFLINE_ONLY') {
  try { assertNetGateE115(); liveRows=await collectBinanceClosedKlines({ symbol:'btcusdt', interval:'5m', maxMessages:3, timeoutMs:4000, recordPath:framesPath }); status='LIVE_OK'; }
  catch { status='LIVE_FAIL'; }
}
if (!liveRows.length && fs.existsSync(framesPath)) liveRows=replayBinanceFrames(fs.readFileSync(framesPath,'utf8'));
const replayRows = fs.existsSync(framesPath) ? replayBinanceFrames(fs.readFileSync(framesPath,'utf8')) : [];
const h1=sha256Text(liveRows.map(x=>JSON.stringify(x)).join('\n')); const h2=sha256Text(replayRows.map(x=>JSON.stringify(x)).join('\n'));
writeMdAtomic('reports/evidence/E115/BINANCE_WSS.md',['# E115 BINANCE WSS',`- mode: ${mode}`,`- live_status: ${status}`,`- live_rows: ${liveRows.length}`,`- replay_rows: ${replayRows.length}`,`- live_hash: ${h1}`,`- replay_hash: ${h2}`].join('\n'));
writeMdAtomic('reports/evidence/E115/WSS_REPLAY_X2.md',['# E115 WSS REPLAY X2',`- live_hash: ${h1}`,`- replay_hash: ${h2}`,`- verdict: ${h1===h2?'MATCH':'MISMATCH'}`].join('\n'));
if (status==='LIVE_OK' && h1!==h2) throw new Error('E115_WSS_REPLAY_PARITY_FAIL');
console.log('e115_binance_wss_collect: done');
