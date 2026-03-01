import fs from 'node:fs';
import path from 'node:path';

const target = path.join(process.cwd(), 'DATA_AUTHORITY_MODEL.md');
const doc = fs.readFileSync(target, 'utf8');
const required = [
  'provider_id',
  'schema_version',
  'time_unit_sentinel',
  'raw_capture_sha256',
  'normalized_schema_sha256',
  'liquidations.bybit_ws_v5.v2',
  'artifacts/incoming/liquidations/bybit_ws_v5/<RUN_ID>/lock.json',
];
const missing = required.filter((x) => !doc.includes(x));
if (missing.length) {
  console.error('[FAIL] RG_DATA01 missing tokens:\n' + missing.map((m) => `- ${m}`).join('\n'));
  process.exit(1);
}
console.log('[PASS] RG_DATA01 lock schema contract stable');
