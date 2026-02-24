import fs from 'node:fs';
import path from 'node:path';
import { deflateRawSync } from 'node:zlib';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { provider } from '../edge/edge_lab/real_public/providers/binance_public_data.mjs';
import { sha256Buffer } from '../edge/edge_lab/real_public/real_public_checksum.mjs';

const ROOT = path.resolve(process.cwd());
const REG_DIR = path.join(ROOT, 'reports', 'evidence', 'EDGE_PROFIT_00', 'registry');
const MANUAL_DIR = path.join(REG_DIR, 'gates', 'manual');
const NEXT_ACTION = 'npm run -s epoch:edge:profit:public:00:x2:node22';
fs.mkdirSync(MANUAL_DIR, { recursive: true });

function zipCsv(csvText) {
  const data = Buffer.from(csvText, 'utf8');
  const compressed = deflateRawSync(data);
  const name = Buffer.from('BTCUSDT-5m-2025-01-01.csv', 'utf8');
  const h = Buffer.alloc(30);
  h.writeUInt32LE(0x04034b50, 0); h.writeUInt16LE(20, 4); h.writeUInt16LE(0, 6); h.writeUInt16LE(8, 8);
  h.writeUInt16LE(0, 10); h.writeUInt16LE(0, 12); h.writeUInt32LE(0, 14);
  h.writeUInt32LE(compressed.length, 18); h.writeUInt32LE(data.length, 22);
  h.writeUInt16LE(name.length, 26); h.writeUInt16LE(0, 28);
  return Buffer.concat([h, name, compressed]);
}

const csv = '1735689600000,1,2,0.5,1.5,10\n173568990000000,1,2,0.5,1.5,10\n';
const zip = zipCsv(csv);
const checksum = sha256Buffer(zip);
global.fetch = async (url) => String(url).endsWith('.CHECKSUM')
  ? { ok: true, text: async () => `${checksum} *BTCUSDT-5m-2025-01-01.zip` }
  : { ok: true, status: 200, arrayBuffer: async () => zip };

let code = 'NONE';
try { await provider.fetchCandles('BTCUSDT', '5m', Date.UTC(2025,0,1), 2); }
catch (e) { code = String(e?.code || 'ERR'); }

const pass = code === 'TSU01';
const status = pass ? 'PASS' : 'FAIL';
const reasonCode = pass ? 'NONE' : 'RG01';
writeMd(path.join(REG_DIR, 'REGRESSION_TSU01_MIXED_UNITS.md'), `# REGRESSION_TSU01_MIXED_UNITS.md\n\nSTATUS: ${status}\nREASON_CODE: ${reasonCode}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${NEXT_ACTION}\n\n- observed_code: ${code}\n`);
writeJsonDeterministic(path.join(MANUAL_DIR, 'regression_tsu01_mixed_units.json'), {
  schema_version:'1.0.0', status, reason_code: reasonCode, run_id: RUN_ID,
  message: pass ? 'Mixed units correctly blocked with TSU01.' : 'Expected TSU01 for mixed units.', next_action: NEXT_ACTION,
  observed_code: code,
});
console.log(`[${status}] regression_tsu01_mixed_units — ${reasonCode}`);
process.exit(pass ? 0 : 1);
