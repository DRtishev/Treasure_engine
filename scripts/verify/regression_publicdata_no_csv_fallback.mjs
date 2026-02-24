import fs from 'node:fs';
import path from 'node:path';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';

const ROOT = path.resolve(process.cwd());
const REG_DIR = path.join(ROOT, 'reports', 'evidence', 'EDGE_PROFIT_00', 'registry');
const MANUAL_DIR = path.join(REG_DIR, 'gates', 'manual');
const NEXT_ACTION = 'npm run -s epoch:edge:profit:public:00:x2:node22';
fs.mkdirSync(MANUAL_DIR, { recursive: true });

const providerPath = path.join(ROOT, 'scripts', 'edge', 'edge_lab', 'real_public', 'providers', 'binance_public_data.mjs');
const src = fs.readFileSync(providerPath, 'utf8');
const hasCsvFetch = /fetch\([^\n]*\.csv/i.test(src) || src.includes('CSV fallback');
const hasZipAuthority = src.includes('extractCsvFromZip(zipBuf)');
const status = !hasCsvFetch && hasZipAuthority ? 'PASS' : 'FAIL';
const reasonCode = status === 'PASS' ? 'NONE' : 'ZIP01';

writeMd(path.join(REG_DIR, 'REGRESSION_PUBLICDATA_NO_CSV_FALLBACK.md'), `# REGRESSION_PUBLICDATA_NO_CSV_FALLBACK.md\n\nSTATUS: ${status}\nREASON_CODE: ${reasonCode}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${NEXT_ACTION}\n\n- has_csv_fetch_pattern: ${hasCsvFetch}\n- has_zip_authority_extract: ${hasZipAuthority}\n`);
writeJsonDeterministic(path.join(MANUAL_DIR, 'regression_publicdata_no_csv_fallback.json'), {
  schema_version:'1.0.0', status, reason_code: reasonCode, run_id: RUN_ID,
  message: status === 'PASS' ? 'No CSV fallback fetch detected in public data provider.' : 'CSV fallback path detected; ZIP authority violated.', next_action: NEXT_ACTION,
  has_csv_fetch_pattern: hasCsvFetch,
  has_zip_authority_extract: hasZipAuthority,
});
console.log(`[${status}] regression_publicdata_no_csv_fallback — ${reasonCode}`);
process.exit(status === 'PASS' ? 0 : 1);
