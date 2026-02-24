import crypto from 'node:crypto';

const BASE = 'https://api.binance.com';
const RETRY_DELAYS_MS = [1000, 2000, 4000, 8000, 16000];
const REQUEST_TIMEOUT_MS = 30000;
const TF_MS = new Map([
  ['1m', 60_000],
  ['5m', 300_000],
  ['15m', 900_000],
  ['30m', 1_800_000],
  ['1h', 3_600_000],
  ['4h', 14_400_000],
  ['1d', 86_400_000],
]);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sha256Text(text) {
  return crypto.createHash('sha256').update(String(text)).digest('hex');
}

function tfToMs(tf) {
  const out = TF_MS.get(String(tf || '').toLowerCase());
  if (!out) {
    const e = new Error(`Unsupported timeframe: ${tf}`);
    e.code = 'DATA04';
    throw e;
  }
  return out;
}

function mapKlines(symbol, tf, rows) {
  return rows.map((k) => ({
    symbol,
    tf,
    ts_open_ms: Number(k[0]),
    o: Number(k[1]),
    h: Number(k[2]),
    l: Number(k[3]),
    c: Number(k[4]),
    v: Number(k[5]),
  }));
}

function createAcqError(code, message) {
  const e = new Error(message);
  e.code = code;
  return e;
}

async function fetchJsonDeterministic(url) {
  let lastErr = null;
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const r = await fetch(url, { signal: controller.signal });
      const text = await r.text();
      if (r.status === 429) {
        if (attempt === RETRY_DELAYS_MS.length) {
          throw createAcqError('ACQ03', `HTTP 429 ${url}`);
        }
        const retryAfter = Number(r.headers.get('retry-after') || 0);
        const waitMs = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : RETRY_DELAYS_MS[attempt];
        await sleep(waitMs);
        continue;
      }
      if (r.status >= 500) {
        if (attempt === RETRY_DELAYS_MS.length) throw createAcqError('ACQ04', `HTTP ${r.status} ${url}`);
        await sleep(RETRY_DELAYS_MS[attempt]);
        continue;
      }
      if (!r.ok) throw createAcqError('DATA04', `HTTP ${r.status} ${url}`);
      let json;
      try { json = JSON.parse(text); } catch { throw createAcqError('DATA04', `Invalid JSON ${url}`); }
      return { json, text, base_url_used: BASE };
    } catch (err) {
      lastErr = err;
      const name = String(err?.name || '');
      const code = String(err?.code || '');
      if (code === 'ACQ03' || code === 'ACQ04' || code === 'DATA04') throw err;
      if (attempt === RETRY_DELAYS_MS.length) {
        throw createAcqError('ACQ02', `Network error ${name || 'ERR'} ${url}`);
      }
      await sleep(RETRY_DELAYS_MS[attempt]);
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastErr || createAcqError('ACQ02', `Network error ${url}`);
}

function alignEnd(anchorMs, tfMs) {
  return Math.floor(Number(anchorMs) / tfMs) * tfMs;
}

export const provider = {
  id: 'binance',
  baseUrl: BASE,
  async getServerTime() {
    const out = await fetchJsonDeterministic(`${BASE}/api/v3/time`);
    return Number(out.json.serverTime);
  },
  async probe(symbol, tf) {
    const tfMs = tfToMs(tf);
    const serverTimeMs = await this.getServerTime();
    const end = alignEnd(serverTimeMs, tfMs);
    const start = end - (2 * tfMs);
    const out = await fetchJsonDeterministic(`${BASE}/api/v3/klines?symbol=${symbol}&interval=${tf}&startTime=${start}&endTime=${end}&limit=3`);
    return { serverTimeMs, rows: mapKlines(symbol, tf, out.json || []) };
  },
  async fetchCandles(symbol, tf, endAnchorMs, limit) {
    const tfMs = tfToMs(tf);
    const endAlignedMs = alignEnd(endAnchorMs, tfMs);
    const bars = Math.max(1, Number(limit || 260));
    const startMs = endAlignedMs - ((bars - 1) * tfMs);

    const rows = [];
    const chunks = [];
    const canary = [];
    let chunkStartMs = startMs;
    let prevChunkEndMs = null;

    while (chunkStartMs <= endAlignedMs) {
      const remainingBars = Math.floor((endAlignedMs - chunkStartMs) / tfMs) + 1;
      const barsThisChunk = Math.min(1000, remainingBars);
      const chunkEndMs = chunkStartMs + ((barsThisChunk - 1) * tfMs);
      const url = `${BASE}/api/v3/klines?symbol=${symbol}&interval=${tf}&startTime=${chunkStartMs}&endTime=${chunkEndMs}&limit=1000`;
      const out = await fetchJsonDeterministic(url);
      const mapped = mapKlines(symbol, tf, out.json || []);
      rows.push(...mapped);
      chunks.push({ start_ms: chunkStartMs, end_ms: chunkEndMs, count: mapped.length, sha256_raw: sha256Text(out.text) });

      if (prevChunkEndMs !== null) {
        const overlapStart = Math.max(startMs, prevChunkEndMs - (4 * tfMs));
        const overlapEnd = prevChunkEndMs;
        const canaryUrl = `${BASE}/api/v3/klines?symbol=${symbol}&interval=${tf}&startTime=${overlapStart}&endTime=${overlapEnd}&limit=5`;
        const a = await fetchJsonDeterministic(canaryUrl);
        const b = await fetchJsonDeterministic(canaryUrl);
        const shaA = sha256Text(a.text);
        const shaB = sha256Text(b.text);
        canary.push({ overlap_start_ms: overlapStart, overlap_end_ms: overlapEnd, sha256_raw_a: shaA, sha256_raw_b: shaB });
        if (shaA !== shaB) throw createAcqError('DATA02', `Overlap canary mismatch ${overlapStart}-${overlapEnd}`);
      }

      prevChunkEndMs = chunkEndMs;
      chunkStartMs = chunkEndMs + tfMs;
    }

    return {
      rows,
      base_url_used: BASE,
      start_ms: startMs,
      end_anchor_ms: endAlignedMs,
      server_time_ms: Number(endAnchorMs),
      chunks,
      canary,
    };
  },
};
