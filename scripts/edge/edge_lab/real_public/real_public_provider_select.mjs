import { parseAllowlist, classifyError, normalizeRows } from './providers/_provider_interface.mjs';
import { provider as binance } from './providers/binance_public.mjs';
import { provider as bybit } from './providers/bybit_public.mjs';
import { provider as okx } from './providers/okx_public.mjs';
import { provider as kraken } from './providers/kraken_public.mjs';

const REGISTRY = new Map([
  ['binance', binance],
  ['bybit', bybit],
  ['okx', okx],
  ['kraken', kraken],
]);

export function providersFromAllowlist(raw) {
  return parseAllowlist(raw).filter((id, idx, arr) => arr.indexOf(id) === idx).filter((id) => REGISTRY.has(id));
}

export function providerById(id) {
  return REGISTRY.get(String(id || '').toLowerCase()) || null;
}

export async function probeSelectProvider({ allowlistRaw, symbol, tf }) {
  const order = providersFromAllowlist(allowlistRaw);
  const attempts = [];
  for (const id of order) {
    const p = providerById(id);
    if (!p) continue;
    try {
      const out = await p.probe(symbol, tf);
      const rows = normalizeRows(out.rows || []);
      if (rows.length < 3) throw new Error(`PARSE_probe_rows_lt_3:${rows.length}`);
      return {
        selected: id,
        provider: p,
        serverTimeMs: Number(out.serverTimeMs || 0),
        probeRows: rows,
        attempts,
      };
    } catch (err) {
      attempts.push({ provider_id: id, class: classifyError(err), code: String(err?.code || ''), message: String(err?.message || 'UNKNOWN') });
    }
  }
  return { selected: '', provider: null, serverTimeMs: 0, probeRows: [], attempts };
}
