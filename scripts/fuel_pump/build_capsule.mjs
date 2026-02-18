#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const out = process.argv.includes('--out') ? process.argv[process.argv.indexOf('--out') + 1] : 'artifacts/incoming/fuel_capsule';
fs.mkdirSync(out, { recursive: true });
const now = new Date().toISOString();
const rows = [
  { provider: 'BINANCE', channel: 'REST', ts: now, price: '0', note: 'operator_capture_required' },
  { provider: 'BYBIT', channel: 'REST', ts: now, price: '0', note: 'operator_capture_required' }
].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
const jsonl = rows.map((r) => JSON.stringify(r)).join('\n') + '\n';
const dataPath = path.join(out, 'capsule.jsonl');
fs.writeFileSync(dataPath, jsonl);
const dataHash = crypto.createHash('sha256').update(jsonl).digest('hex');
const manifest = { schema: 'e131-capsule-v1', generated_at: now, files: [{ path: 'capsule.jsonl', sha256: dataHash }] };
fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log(`capsule_path=${out}`);
console.log(`capsule_sha256=${dataHash}`);
