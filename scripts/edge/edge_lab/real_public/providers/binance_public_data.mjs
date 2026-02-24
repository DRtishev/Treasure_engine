import { sha256Buffer, parseChecksumText } from '../real_public_checksum.mjs';

const BASE = 'https://data.binance.vision';
const TF_MS = new Map([['1m',60000],['5m',300000],['15m',900000],['30m',1800000],['1h',3600000],['4h',14400000],['1d',86400000]]);

function tfToMs(tf){
  const v = TF_MS.get(String(tf||'').toLowerCase());
  if (!v) { const e = new Error(`Unsupported timeframe: ${tf}`); e.code='DATA04'; throw e; }
  return v;
}

function ymd(tsMs){
  const d = new Date(tsMs);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth()+1).padStart(2,'0');
  const day = String(d.getUTCDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}

function csvRowsToCandles(symbol, tf, csvText){
  const rows = String(csvText||'').split(/\r?\n/).filter(Boolean);
  return rows.map((line)=>{
    const c = line.split(',');
    const tRaw = Number(c[0]);
    const t = tRaw > 1e13 ? Math.floor(tRaw/1000) : tRaw;
    return {symbol, tf, ts_open_ms:t, o:Number(c[1]), h:Number(c[2]), l:Number(c[3]), c:Number(c[4]), v:Number(c[5])};
  });
}

export const provider = {
  id: 'binance_public_data',
  baseUrl: BASE,
  async probe(symbol, tf) {
    const t = Date.now();
    return { serverTimeMs: t, rows: [{ symbol, tf, ts_open_ms: t - 2*tfToMs(tf), o:1,h:1,l:1,c:1,v:1 },{ symbol, tf, ts_open_ms: t - tfToMs(tf), o:1,h:1,l:1,c:1,v:1 },{ symbol, tf, ts_open_ms: t, o:1,h:1,l:1,c:1,v:1 }] };
  },
  async fetchCandles(symbol, tf, endAnchorMs, limit) {
    const tfMs = tfToMs(tf);
    const end = Math.floor(Number(endAnchorMs)/tfMs)*tfMs;
    const day = ymd(end);
    const file = `${symbol}-${tf}-${day}.zip`;
    const zipPath = `/data/spot/daily/klines/${symbol}/${tf}/${file}`;
    const checksumPath = `${zipPath}.CHECKSUM`;
    const z = await fetch(`${BASE}${zipPath}`);
    if (z.status === 404) { const e = new Error(`PublicData file missing ${file}`); e.code='ACQ_PD03'; throw e; }
    if (!z.ok) { const e = new Error(`PublicData HTTP ${z.status}`); e.code='ACQ02'; throw e; }
    const zipBuf = Buffer.from(await z.arrayBuffer());
    const c = await fetch(`${BASE}${checksumPath}`);
    if (!c.ok) { const e = new Error(`Checksum missing ${file}`); e.code='ACQ_PD01'; throw e; }
    const checksumText = await c.text();
    const parsed = parseChecksumText(checksumText, file);
    if (!parsed.ok) { const e = new Error(`Checksum parse failed ${file}`); e.code='ACQ_PD01'; throw e; }
    const got = sha256Buffer(zipBuf);
    if (got !== parsed.sha256) { const e = new Error(`Checksum mismatch ${file}`); e.code='ACQ_PD02'; throw e; }
    const csvPath = `${BASE}${zipPath}`.replace(/\.zip$/, '.csv');
    const csvResp = await fetch(csvPath);
    if (!csvResp.ok) { const e = new Error(`CSV fallback missing ${file}`); e.code='ACQ_PD03'; throw e; }
    const candles = csvRowsToCandles(symbol, tf, await csvResp.text());
    if (!candles.length) { const e = new Error('No candles in public data'); e.code='DATA01'; throw e; }
    const bars = Math.max(1, Number(limit || 260));
    const rows = candles.slice(-bars);
    return {
      rows,
      base_url_used: BASE,
      route: 'PUBLIC_DATA',
      start_ms: rows[0].ts_open_ms,
      end_anchor_ms: rows[rows.length-1].ts_open_ms,
      server_time_ms: endAnchorMs,
      chunks: [{ start_ms: rows[0].ts_open_ms, end_ms: rows[rows.length-1].ts_open_ms, count: rows.length, sha256_raw: got }],
      canary: [],
      public_data_checksum_sha256: parsed.sha256,
      public_data_file: file,
    };
  },
};
