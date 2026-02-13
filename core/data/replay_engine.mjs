import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

function parseJsonl(file) {
  const lines = fs.readFileSync(file, 'utf8').trim().split('\n').filter(Boolean);
  return lines.map((l) => JSON.parse(l));
}

export function replayNormalizedDataset({ provider = 'fixture', datasetId, symbol, tsStart, tsEnd } = {}) {
  const dir = path.join(process.cwd(), 'data/normalized', provider, datasetId, 'chunks');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.jsonl')).sort();
  let stream = [];
  for (const f of files) stream = stream.concat(parseJsonl(path.join(dir, f)));
  stream = stream.filter((r) => (!symbol || r.symbol === symbol)
    && (!tsStart || r.ts_open >= tsStart)
    && (!tsEnd || r.ts_close <= tsEnd));
  stream.sort((a, b) => a.ts_open.localeCompare(b.ts_open) || a.symbol.localeCompare(b.symbol));
  const fingerprint = crypto.createHash('sha256').update(JSON.stringify(stream)).digest('hex');
  return { count: stream.length, stream, fingerprint };
}
