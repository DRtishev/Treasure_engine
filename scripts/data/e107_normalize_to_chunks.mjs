#!/usr/bin/env node
// E107 Track 1: Normalize raw OHLCV data into chunked JSONL format
// Consistent with existing normalized fixture format (epoch46-mini pattern)

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const INPUT = process.env.E107_INPUT || '';
const OUTPUT_DIR = process.env.E107_OUTPUT_DIR || 'data/normalized/e107';
const CHUNK_SIZE = parseInt(process.env.E107_CHUNK_SIZE || '500', 10);

/**
 * Normalize raw OHLCV JSON into chunked JSONL
 * Input format: { meta: {...}, candles: [{ts_open, open, high, low, close, volume, ...}] }
 * Output format: JSONL with type=candle, matching epoch46-mini pattern
 */
export function normalizeOHLCV(candles, symbol = 'BTCUSDT') {
  return candles
    .sort((a, b) => a.ts_open - b.ts_open)
    .map(c => {
      const tsOpen = typeof c.ts_open === 'number' ? new Date(c.ts_open).toISOString() : c.ts_open;
      const tsClose = typeof c.ts_close === 'number' ? new Date(c.ts_close).toISOString() : c.ts_close;
      return {
        type: 'candle',
        symbol: c.symbol || symbol,
        ts_open: tsOpen,
        ts_close: tsClose,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
        volume: c.volume
      };
    });
}

/**
 * Write normalized rows to chunked JSONL files
 * Returns array of { path, rows, sha256 }
 */
export function writeChunks(rows, outDir, chunkSize = 500) {
  fs.mkdirSync(path.join(outDir, 'chunks'), { recursive: true });

  const chunks = [];
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const idx = String(Math.floor(i / chunkSize) + 1).padStart(4, '0');
    const fileName = `chunk_${idx}.jsonl`;
    const filePath = path.join(outDir, 'chunks', fileName);
    const content = chunk.map(r => JSON.stringify(r)).join('\n') + '\n';
    fs.writeFileSync(filePath, content, 'utf8');
    const hash = crypto.createHash('sha256').update(content).digest('hex');
    chunks.push({ path: fileName, rows: chunk.length, sha256: hash });
  }

  return chunks;
}

/**
 * Generate deterministic DATA_CAPSULE_MANIFEST from normalized chunks
 */
export function generateManifest(rows, chunks, symbol, timeframe) {
  const from = rows.length > 0 ? rows[0].ts_open : 'N/A';
  const to = rows.length > 0 ? rows[rows.length - 1].ts_close : 'N/A';

  const lines = [
    '# DATA_CAPSULE_MANIFEST',
    `- symbol: ${symbol}`,
    `- timeframe: ${timeframe}`,
    `- total_rows: ${rows.length}`,
    `- chunks: ${chunks.length}`,
    `- from: ${from}`,
    `- to: ${to}`,
    '',
    '## Chunk Hashes'
  ];

  for (const c of chunks) {
    lines.push(`- ${c.path}: rows=${c.rows} sha256=${c.sha256}`);
  }

  const manifestText = lines.join('\n') + '\n';
  const manifestHash = crypto.createHash('sha256').update(manifestText).digest('hex');
  lines.push('', `## Manifest Hash`, `- sha256: ${manifestHash}`);
  return lines.join('\n') + '\n';
}

// CLI entry point
if (INPUT) {
  const raw = JSON.parse(fs.readFileSync(path.resolve(INPUT), 'utf8'));
  const symbol = raw.meta?.symbol || 'BTCUSDT';
  const timeframe = raw.meta?.timeframe || '5m';
  const normalized = normalizeOHLCV(raw.candles, symbol);
  const outDir = path.resolve(OUTPUT_DIR);
  const chunks = writeChunks(normalized, outDir, CHUNK_SIZE);
  const manifest = generateManifest(normalized, chunks, symbol, timeframe);
  fs.writeFileSync(path.join(outDir, 'DATA_CAPSULE_MANIFEST.md'), manifest, 'utf8');
  console.log(`e107_normalize: Wrote ${normalized.length} rows in ${chunks.length} chunks to ${outDir}`);
}
