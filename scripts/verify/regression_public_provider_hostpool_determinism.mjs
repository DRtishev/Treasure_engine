import fs from 'node:fs';
import path from 'node:path';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';

const ROOT = path.resolve(process.cwd());
const REG_DIR = path.join(ROOT, 'reports', 'evidence', 'EDGE_PROFIT_00', 'registry');
const MANUAL_DIR = path.join(REG_DIR, 'gates', 'manual');
const NEXT_ACTION = 'npm run -s epoch:edge:profit:public:00:x2:node22';
fs.mkdirSync(MANUAL_DIR, { recursive: true });

const binanceProvider = fs.readFileSync(path.join(ROOT, 'scripts/edge/edge_lab/real_public/providers/binance_public.mjs'), 'utf8');
const selector = fs.readFileSync(path.join(ROOT, 'scripts/edge/edge_lab/real_public/real_public_provider_select.mjs'), 'utf8');

const hasPoolOrder = binanceProvider.includes("'https://api.binance.com'") && binanceProvider.includes("'https://api1.binance.com'") && binanceProvider.includes("'https://api2.binance.com'") && binanceProvider.includes("'https://api3.binance.com'") && binanceProvider.includes("'https://data-api.binance.vision'");
const hasPreferredOrder = selector.includes("const preferred = ['binance_public_data','binance','bybit','okx','kraken'];");

const status = hasPoolOrder && hasPreferredOrder ? 'PASS' : 'FAIL';
const reasonCode = status === 'PASS' ? 'NONE' : 'RG01';
writeMd(path.join(REG_DIR, 'REGRESSION_PUBLIC_PROVIDER_HOSTPOOL_DETERMINISM.md'), `# REGRESSION_PUBLIC_PROVIDER_HOSTPOOL_DETERMINISM.md\n\nSTATUS: ${status}\nREASON_CODE: ${reasonCode}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${NEXT_ACTION}\n\n- has_pool_order: ${hasPoolOrder}\n- has_provider_preferred_order: ${hasPreferredOrder}\n`);
writeJsonDeterministic(path.join(MANUAL_DIR, 'regression_public_provider_hostpool_determinism.json'), {
  schema_version:'1.0.0', status, reason_code: reasonCode, run_id: RUN_ID,
  message: status === 'PASS' ? 'Deterministic provider/hostpool ordering present.' : 'Provider/hostpool deterministic ordering missing.',
  next_action: NEXT_ACTION, has_pool_order: hasPoolOrder, has_provider_preferred_order: hasPreferredOrder,
});
console.log(`[${status}] regression_public_provider_hostpool_determinism — ${reasonCode}`);
process.exit(status === 'PASS' ? 0 : 1);
