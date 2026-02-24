import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = path.resolve(process.cwd());
const REG_DIR = path.join(ROOT, 'reports/evidence/EDGE_PROFIT_00/registry');
const MANUAL = path.join(REG_DIR, 'gates/manual');
const NEXT_ACTION = 'npm run -s epoch:edge:profit:public:00:x2:node22';
fs.mkdirSync(MANUAL, { recursive: true });
const src = fs.readFileSync(path.join(ROOT, 'scripts/edge/edge_lab/edge_profit_00_acquire_public_diag.mjs'), 'utf8');
const hasFetchAbort = src.includes('AbortController') && src.includes('fetchWithTimeout');
const hasDnsTimeout = src.includes('lookupWithTimeout') && src.includes('DNS_TIMEOUT_MS');
const status = hasFetchAbort && hasDnsTimeout ? 'PASS' : 'BLOCKED';
const reason_code = status === 'PASS' ? 'NONE' : 'TO01';
writeMd(path.join(REG_DIR, 'REGRESSION_PUBLIC_DIAG_BOUNDED.md'), `# REGRESSION_PUBLIC_DIAG_BOUNDED.md\n\nSTATUS: ${status}\nREASON_CODE: ${reason_code}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${NEXT_ACTION}\n\n- has_fetch_abort: ${hasFetchAbort}\n- has_dns_timeout: ${hasDnsTimeout}\n`);
writeJsonDeterministic(path.join(MANUAL, 'regression_public_diag_bounded.json'), { schema_version:'1.0.0', status, reason_code, run_id:RUN_ID, next_action:NEXT_ACTION, has_fetch_abort: hasFetchAbort, has_dns_timeout: hasDnsTimeout });
console.log(`[${status}] regression_public_diag_bounded — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
