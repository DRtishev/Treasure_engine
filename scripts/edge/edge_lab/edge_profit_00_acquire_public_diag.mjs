import dns from 'node:dns/promises';
import net from 'node:net';
import tls from 'node:tls';
import { URL } from 'node:url';
import path from 'node:path';
import { writeJsonDeterministic } from '../../lib/write_json_deterministic.mjs';
import { RUN_ID, writeMd } from './canon.mjs';
import { providersFromAllowlist } from './real_public/real_public_provider_select.mjs';

const ROOT = path.resolve(process.cwd());
const REG_DIR = path.join(ROOT, 'reports', 'evidence', 'EDGE_PROFIT_00', 'registry');
const MANUAL_DIR = path.join(REG_DIR, 'gates', 'manual');
const NEXT_ACTION = 'npm run -s epoch:edge:profit:public:00:x2:node22';
const allowlistRaw = process.env.PROVIDER_ALLOWLIST || 'binance,bybit,okx,kraken';
const order = providersFromAllowlist(allowlistRaw);
const forcedFamily = process.env.NET_FAMILY === '4' ? 4 : process.env.NET_FAMILY === '6' ? 6 : 0;

const endpointByProvider = {
  binance_public_data: 'https://data.binance.vision',
  binance: 'https://api.binance.com/api/v3/time',
  bybit: 'https://api.bybit.com/v5/market/time',
  okx: 'https://www.okx.com/api/v5/public/time',
  kraken: 'https://api.kraken.com/0/public/Time',
};

async function checkTcp(host, port, family) {
  await new Promise((resolve, reject) => {
    const s = net.connect({ host, port, family: family || undefined, timeout: 5000 }, () => { s.end(); resolve(true); });
    s.on('timeout', () => { s.destroy(new Error('TCP timeout')); });
    s.on('error', (e) => reject(e));
  });
}

async function checkTls(host, port, family) {
  await new Promise((resolve, reject) => {
    const s = tls.connect({ host, port, family: family || undefined, servername: host, timeout: 7000 }, () => { s.end(); resolve(true); });
    s.on('timeout', () => { s.destroy(new Error('TLS timeout')); });
    s.on('error', (e) => reject(e));
  });
}

function classifyHttp(status) {
  if (status === 429) return 'RL01';
  if (status === 418) return 'PB01';
  if (status >= 200 && status < 300) return 'NONE';
  return 'HTTP01';
}

async function probeFamily(provider, endpoint, family) {
  const u = new URL(endpoint);
  const row = { provider, endpoint, family: family || 0, dns_ok: false, tcp_ok: false, tls_ok: false, http_ok: false, error_class: 'NONE', node_error_code: 'NONE', http_status: null, volatile_error: '' };
  try { await dns.lookup(u.hostname, { family: family || undefined }); row.dns_ok = true; } catch (e) { row.error_class='DNS01'; row.node_error_code=String(e?.code||'NONE'); row.volatile_error=String(e?.message||''); return row; }
  try { await checkTcp(u.hostname, 443, family); row.tcp_ok = true; } catch (e) { row.error_class='TCP01'; row.node_error_code=String(e?.code||'NONE'); row.volatile_error=String(e?.message||''); return row; }
  try { await checkTls(u.hostname, 443, family); row.tls_ok = true; } catch (e) { row.error_class='TLS01'; row.node_error_code=String(e?.code||'NONE'); row.volatile_error=String(e?.message||''); return row; }
  try { const r = await fetch(endpoint); row.http_status=r.status; row.http_ok=r.ok; row.error_class=classifyHttp(r.status); } catch (e) { row.error_class='HTTP01'; row.node_error_code=String(e?.code||'NONE'); row.volatile_error=String(e?.message||''); }
  return row;
}

const families = forcedFamily ? [forcedFamily] : [4, 6];
const checks = [];
for (const provider of order) {
  const endpoint = endpointByProvider[provider] || '';
  for (const fam of families) checks.push(await probeFamily(provider, endpoint, fam));
}

const pass = checks.some((x) => x.http_ok);
const rootCause = checks.find((x) => x.error_class !== 'NONE')?.error_class || 'NONE';
const status = pass ? 'PASS' : 'NEEDS_DATA';
const reasonCode = pass ? 'NONE' : 'ACQ02';

writeMd(path.join(REG_DIR, 'NET_DIAG.md'), `# NET_DIAG.md\n\nSTATUS: ${status}\nREASON_CODE: ${reasonCode}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${NEXT_ACTION}\n\n- root_cause_code: ${rootCause}\n- net_family_override: ${forcedFamily || 'AUTO(4,6)'}\n\n| provider | endpoint | family | dns_ok | tcp_ok | tls_ok | http_ok | error_class | node_error_code | http_status |\n|---|---|---:|---:|---:|---:|---:|---|---|---:|\n${checks.map((r) => `| ${r.provider} | ${r.endpoint} | ${r.family} | ${r.dns_ok} | ${r.tcp_ok} | ${r.tls_ok} | ${r.http_ok} | ${r.error_class} | ${r.node_error_code} | ${r.http_status ?? 'NA'} |`).join('\n') || '| NONE | NONE | 0 | false | false | false | false | DNS01 | NONE | NA |'}\n\n## VOLATILE_DIAGNOSTICS (NON-SSOT)\n\n${checks.map((r)=>`- ${r.provider}[fam=${r.family}] volatile_error=${r.volatile_error || 'NONE'}`).join('\n') || '- NONE'}\n`);

writeJsonDeterministic(path.join(MANUAL_DIR, 'net_diag.json'), {
  schema_version: '1.0.0',
  status,
  reason_code: reasonCode,
  run_id: RUN_ID,
  message: pass ? 'At least one provider reached HTTP_OK.' : 'No provider reached HTTP_OK.',
  next_action: NEXT_ACTION,
  allowlist: order,
  net_family: forcedFamily || 0,
  root_cause_code: rootCause,
  checks: checks.map((r) => ({ provider: r.provider, endpoint: r.endpoint, family: r.family, dns_ok: r.dns_ok, tcp_ok: r.tcp_ok, tls_ok: r.tls_ok, http_ok: r.http_ok, error_class: r.error_class, node_error_code: r.node_error_code, http_status: r.http_status })),
});

console.log(`[${status}] edge_profit_00_acquire_public_diag — ${reasonCode}`);
process.exit(pass ? 0 : 1);
