#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { sha256File, sha256Text } from '../verify/e66_lib.mjs';
import { modeE116, wsDirE116, pinDirE116, runDirE116, writeMdAtomic, writeInputBinding, stampE116 } from '../verify/e116_lib.mjs';

const mode = modeE116();
const wsCanonical = path.join(wsDirE116(), 'canonical_ohlcv.jsonl');
const pinDir = pinDirE116();
fs.mkdirSync(pinDir, { recursive: true });
const pinFile = path.join(pinDir, 'canonical_ohlcv.jsonl');
let source = 'fallback_fixture';
let reason = 'NO_CHANNEL_SUCCESS';
let promoted = false;

if (fs.existsSync(wsCanonical) && fs.readFileSync(wsCanonical, 'utf8').trim()) {
  fs.copyFileSync(wsCanonical, pinFile);
  source = 'ws_canonical';
  reason = 'PROMOTED_FROM_WS';
  promoted = true;
} else {
  const base = JSON.parse(fs.readFileSync('dataset/BTCUSDT_5m_100bars.json', 'utf8')).bars;
  const start = 1700000000000;
  const rows = [];
  for (let i = 0; i < 200; i += 1) {
    const x = base[i % base.length];
    rows.push({ symbol: 'BTCUSDT', timeframe: '5m', ts: start + i * 300000, o: x.o, h: x.h, l: x.l, c: x.c, v: x.v, fallback: true });
  }
  fs.writeFileSync(pinFile, `${rows.map((r) => JSON.stringify(r)).join('\n')}\n`, 'utf8');
  reason = mode === 'ONLINE_REQUIRED' ? 'ONLINE_REQUIRED_NO_PROOF' : 'FALLBACK_PINNED';
}
const hash = fs.existsSync(pinFile) ? sha256File(pinFile) : sha256Text('EMPTY');
const marker = path.join(runDirE116(), 'promotion_marker.md');
writeMdAtomic(marker, ['# E116 PROMOTION MARKER', `- promoted: ${promoted ? 'yes' : 'no'}`, `- source: ${source}`, `- reason_code: ${reason}`, `- sha256: ${hash}`].join('\n'));
writeInputBinding({ stamp: stampE116(), mode, promoted, source, pinned_capsule_dir: path.relative(process.cwd(), pinDir).replace(/\\/g, '/'), created_at: '1700000000', reason_code: reason });
writeMdAtomic('reports/evidence/E116/PROMOTION_REPORT.md', ['# E116 PROMOTION REPORT', `- mode: ${mode}`, `- promoted: ${promoted ? 'yes' : 'no'}`, `- source: ${source}`, `- reason_code: ${reason}`, `- pinned_capsule_dir: <REPO_ROOT>/${path.relative(process.cwd(), pinDir).replace(/\\/g, '/')}`, `- canonical_sha256: ${hash}`].join('\n'));
console.log(`e116_promotion: ${reason}`);
