#!/usr/bin/env node
// E109 Track A3: Deterministic Capsule Builder
// Input: raw fetch files OR E108 fixture data
// Output: data/capsules/<CAPSULE_ID>/ chunks + manifest
// Normalization: stable ordering, fixed chunk size, sha256 per chunk.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { writeMd, sha256Text } from '../verify/e66_lib.mjs';
import { stableFormatNumber } from '../verify/foundation_render.mjs';

const CHUNK_SIZE = 500; // bars per chunk (stable policy)

function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

/**
 * Build a capsule from raw candle data
 * @param {Object} opts - { capsuleId, symbol, interval, bars, source, outDir }
 * @returns {Object} { capsuleId, chunks, manifest }
 */
export function buildCapsule(opts) {
  const { capsuleId, symbol, interval, bars, source = 'unknown', outDir } = opts;
  if (!capsuleId || !bars || bars.length === 0) throw new Error('capsuleId and non-empty bars required');

  // Normalize: sort by ts_open ascending, deduplicate
  const sorted = [...bars].sort((a, b) => a.ts_open - b.ts_open);
  const deduped = [];
  for (const bar of sorted) {
    if (deduped.length === 0 || bar.ts_open !== deduped[deduped.length - 1].ts_open) {
      deduped.push({
        ts_open: bar.ts_open,
        open: Math.round(bar.open * 100) / 100,
        high: Math.round(bar.high * 100) / 100,
        low: Math.round(bar.low * 100) / 100,
        close: Math.round(bar.close * 100) / 100,
        volume: Math.round(bar.volume * 10) / 10,
        ts_close: bar.ts_close,
        symbol: bar.symbol || symbol,
        interval: bar.interval || interval
      });
    }
  }

  // Chunk into fixed-size pieces
  const chunks = [];
  for (let i = 0; i < deduped.length; i += CHUNK_SIZE) {
    const chunkBars = deduped.slice(i, i + CHUNK_SIZE);
    const chunkId = String(Math.floor(i / CHUNK_SIZE)).padStart(4, '0');
    const chunkData = chunkBars.map(b => JSON.stringify(b)).join('\n') + '\n';
    const chunkHash = sha256(chunkData);
    chunks.push({
      chunkId,
      bars: chunkBars.length,
      firstTs: chunkBars[0].ts_open,
      lastTs: chunkBars[chunkBars.length - 1].ts_open,
      hash: chunkHash,
      data: chunkData
    });
  }

  // Write chunks to disk
  const capsuleDir = outDir || path.resolve(`data/capsules/${capsuleId}`);
  fs.mkdirSync(capsuleDir, { recursive: true });
  for (const chunk of chunks) {
    fs.writeFileSync(path.join(capsuleDir, `chunk_${chunk.chunkId}.ndjson`), chunk.data, 'utf8');
  }

  // Write capsule meta
  const meta = {
    capsule_id: capsuleId,
    symbol,
    interval,
    source,
    total_bars: deduped.length,
    chunks: chunks.length,
    chunk_size: CHUNK_SIZE,
    first_ts: deduped[0].ts_open,
    last_ts: deduped[deduped.length - 1].ts_open,
    first_date: new Date(deduped[0].ts_open).toISOString(),
    last_date: new Date(deduped[deduped.length - 1].ts_open).toISOString()
  };
  fs.writeFileSync(path.join(capsuleDir, 'meta.json'), JSON.stringify(meta, null, 2), 'utf8');

  return { capsuleId, meta, chunks: chunks.map(c => ({ chunkId: c.chunkId, bars: c.bars, firstTs: c.firstTs, lastTs: c.lastTs, hash: c.hash })) };
}

/**
 * Load capsule bars from disk
 * @param {string} capsuleDir - path to capsule directory
 * @returns {Array} sorted bars
 */
export function loadCapsuleBars(capsuleDir) {
  const files = fs.readdirSync(capsuleDir)
    .filter(f => f.startsWith('chunk_') && f.endsWith('.ndjson'))
    .sort();
  const bars = [];
  for (const file of files) {
    const content = fs.readFileSync(path.join(capsuleDir, file), 'utf8');
    for (const line of content.trim().split('\n')) {
      if (line.trim()) bars.push(JSON.parse(line));
    }
  }
  return bars.sort((a, b) => a.ts_open - b.ts_open);
}

/**
 * Generate capsule manifest as markdown
 */
export function capsuleManifestToMarkdown(capsuleResult) {
  const m = capsuleResult.meta;
  const lines = [
    `## Capsule: ${m.capsule_id}`,
    `- symbol: ${m.symbol}`,
    `- interval: ${m.interval}`,
    `- source: ${m.source}`,
    `- total_bars: ${m.total_bars}`,
    `- chunks: ${m.chunks}`,
    `- chunk_size: ${CHUNK_SIZE}`,
    `- first_date: ${m.first_date}`,
    `- last_date: ${m.last_date}`,
    '',
    '### Chunk Hashes'
  ];
  for (const chunk of capsuleResult.chunks) {
    lines.push(`- chunk_${chunk.chunkId}: ${chunk.hash} (${chunk.bars} bars, ${new Date(chunk.firstTs).toISOString()} - ${new Date(chunk.lastTs).toISOString()})`);
  }
  lines.push('');
  return lines.join('\n');
}

// Build fixture capsule from E108 data (always available, no net)
export function buildFixtureCapsule() {
  const fixturePath = path.resolve('data/fixtures/e108/e108_ohlcv_200bar.json');
  if (!fs.existsSync(fixturePath)) throw new Error('E108 fixture not found');
  const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
  return buildCapsule({
    capsuleId: 'fixture_btcusdt_5m_200bar',
    symbol: fixture.meta.symbol,
    interval: fixture.meta.timeframe,
    bars: fixture.candles,
    source: 'FIXTURE_E108'
  });
}

// CLI mode
const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.url.replace('file://', ''));
if (isMain) {
  const mode = process.argv[2] || 'fixture';
  if (mode === 'fixture') {
    const result = buildFixtureCapsule();
    console.log(`Built capsule ${result.capsuleId}: ${result.meta.total_bars} bars in ${result.chunks.length} chunks`);
  } else {
    console.log('Usage: node e109_capsule_build.mjs [fixture|<raw-file>]');
  }
}
