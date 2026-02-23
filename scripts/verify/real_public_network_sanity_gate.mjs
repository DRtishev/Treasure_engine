import fs from 'node:fs';
import path from 'node:path';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { probeSelectProvider, providersFromAllowlist } from '../edge/edge_lab/real_public/real_public_provider_select.mjs';

const ROOT = path.resolve(process.cwd());
const REG_DIR = path.join(ROOT, 'reports', 'evidence', 'EDGE_PROFIT_00', 'registry');
const MANUAL_DIR = path.join(REG_DIR, 'gates', 'manual');
const OUT_MD = path.join(REG_DIR, 'REAL_PUBLIC_NET_SANITY.md');
const OUT_JSON = path.join(MANUAL_DIR, 'real_public_net_sanity.json');
const NEXT_ACTION = 'npm run -s verify:real-public:net';

fs.mkdirSync(MANUAL_DIR, { recursive: true });

const allowlistRaw = process.env.PROVIDER_ALLOWLIST || 'binance,bybit,okx,kraken';
const allowlist = providersFromAllowlist(allowlistRaw);
const symbol = process.env.REAL_PUBLIC_SYMBOL || 'BTCUSDT';
const tf = process.env.REAL_PUBLIC_TF || '5m';

const selected = await probeSelectProvider({ allowlistRaw, symbol, tf });
const status = selected.selected ? 'PASS' : 'BLOCKED';
const reasonCode = selected.selected ? 'NONE' : 'ACQ02';
const message = selected.selected
  ? `Reachable provider selected: ${selected.selected}`
  : 'No allowlisted providers reachable in probe stage.';

const rows = selected.attempts.length
  ? selected.attempts.map((a) => `| ${a.provider_id} | ${a.class} | ${a.code || 'NA'} | ${String(a.message).slice(0, 160)} |`).join('\n')
  : '| NONE | NONE | NONE | NONE |';

writeMd(OUT_MD, `# REAL_PUBLIC_NET_SANITY.md\n\nSTATUS: ${status}\nREASON_CODE: ${reasonCode}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${NEXT_ACTION}\n\n- allowlist: ${allowlist.join(',')}\n- symbol: ${symbol}\n- tf: ${tf}\n- selected_provider: ${selected.selected || 'NONE'}\n\n| provider | class | code | message |\n|---|---|---|---|\n${rows}\n`);

writeJsonDeterministic(OUT_JSON, {
  schema_version: '1.0.0',
  status,
  reason_code: reasonCode,
  run_id: RUN_ID,
  message,
  next_action: NEXT_ACTION,
  allowlist,
  symbol,
  tf,
  selected_provider: selected.selected || null,
  attempts: selected.attempts,
});

console.log(`[${status}] real_public_network_sanity_gate — ${reasonCode}`);
process.exit(status === 'PASS' ? 0 : 1);
