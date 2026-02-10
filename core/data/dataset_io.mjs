// core/data/dataset_io.mjs
// Dataset IO + integrity helpers (Phase 2.3 groundwork: REAL data pipeline)

import fs from 'fs';
import crypto from 'crypto';

export function sha256Text(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

// FNV-1a-ish 32-bit hash for stable seeding
export function hash32(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function loadDatasetWithSha(datasetPath) {
  const text = fs.readFileSync(datasetPath, 'utf8');
  const sha256 = sha256Text(text);
  const dataset = JSON.parse(text);

  if (!dataset || typeof dataset !== 'object') {
    throw new Error(`Dataset parse error: not an object (${datasetPath})`);
  }
  if (!Array.isArray(dataset.bars)) {
    throw new Error(`Dataset invalid: missing bars[] (${datasetPath})`);
  }

  // Normalize meta
  if (!dataset.meta || typeof dataset.meta !== 'object') dataset.meta = {};

  // Source inference: prefer explicit meta.source; fallback via filename heuristics
  if (!dataset.meta.source) {
    dataset.meta.source = datasetPath.includes('synthetic') ? 'SYNTHETIC' : 'REAL';
  }

  // Seed: prefer explicit meta.seed; otherwise derive from dataset sha
  if (dataset.meta.seed === undefined || dataset.meta.seed === null) {
    dataset.meta.seed = hash32(sha256);
  }

  // Disclaimer: synthetic should shout; real should still warn
  if (!dataset.meta.disclaimer) {
    dataset.meta.disclaimer = dataset.meta.source === 'SYNTHETIC'
      ? 'SYNTHETIC DATA ONLY — not representative of real execution.'
      : 'REAL MARKET DATA — still a simulation of execution (fees/slippage/latency models).';
  }

  return { dataset, sha256 };
}

export function datasetSummary(dataset) {
  const n = Array.isArray(dataset?.bars) ? dataset.bars.length : 0;
  const hasT = n > 0 && dataset.bars.some(b => b && b.t_ms !== undefined);
  const firstT = hasT ? dataset.bars.find(b => b && b.t_ms !== undefined)?.t_ms : null;
  const lastT = hasT ? [...dataset.bars].reverse().find(b => b && b.t_ms !== undefined)?.t_ms : null;
  return {
    source: dataset?.meta?.source || 'UNKNOWN',
    bars: n,
    has_t_ms: hasT,
    t_first_ms: firstT,
    t_last_ms: lastT
  };
}
