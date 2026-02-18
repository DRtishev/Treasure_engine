import crypto from 'node:crypto';
import { createBybitExchange } from '../live/exchanges/bybit_rest_testnet.mjs';

function hid(v) { return crypto.createHash('sha256').update(String(v)).digest('hex').slice(0, 16); }

export async function runE122ExecutionAdapterV3(input = {}) {
  const mode = input.mode || 'OFFLINE_ONLY';
  const limits = input.limits || {};
  const symbol = input.symbol || 'BTCUSDT';
  const allowLive = process.env.ENABLE_NET === '1' && process.env.I_UNDERSTAND_LIVE_RISK === '1' && mode === 'ONLINE_REQUIRED' && process.env.ARM_LIVE_PLACEMENT === '1' && process.env.CONFIRM_LIVE_PLACEMENT === 'YES';
  const dryRun = process.env.DRY_RUN === '0' ? false : true;

  const out = {
    status: 'SKIP',
    reason_code: 'E_DRY_RUN',
    live_attempted: false,
    intent: { symbol, side: 'BUY', order_type: 'LIMIT', target_notional_usd: 5 },
    sanitized: { order_ref: 'NONE', client_ref: 'NONE' },
    transitions: []
  };

  if (!allowLive || dryRun) return out;
  if (process.env.FORCE_NET_DOWN === '1') return { ...out, reason_code: 'E_NET_BLOCKED' };

  try {
    const adapter = createBybitExchange({ mode: 'testnet', dryRun: false });
    const px = Number(await adapter.getPrice(symbol) || 0);
    if (px <= 0) return { ...out, reason_code: 'E_EMPTY' };
    const qty = Number((Math.max(5, Math.min(10, Number(limits.MAX_NOTIONAL_USD || 10))) / px).toFixed(6));
    const notional = qty * px;
    if (notional > Number(limits.MAX_NOTIONAL_USD || 25)) return { ...out, reason_code: 'E_LIMIT_NOTIONAL' };

    const placed = await adapter.placeOrder({ symbol, side: 'BUY', type: 'LIMIT', qty, price: px });
    const orderRef = placed.orderId || placed.order_id || `order-${Date.now()}`;
    out.live_attempted = true;
    out.sanitized = { order_ref: hid(orderRef), client_ref: hid(`c-${orderRef}`) };
    out.transitions.push({ state: 'PLACED', ts: new Date().toISOString() });

    const retries = Number(process.env.E122_STATUS_RETRIES || 3);
    for (let i = 0; i < retries; i += 1) {
      const fills = await adapter.fetchFills(Date.now() - 10 * 60 * 1000);
      const f = fills.find((x) => x.orderId === orderRef) || fills[0];
      if (f) {
        out.transitions.push({ state: 'FILLED', ts: new Date().toISOString() });
        out.status = 'FILLED';
        out.reason_code = 'OK';
        out.fill = { qty: Number(f.qty || qty), price: Number(f.price || px), fee: Number(f.fee || 0), ts: f.ts || Date.now(), fill_ref: hid(f.fillId || `${orderRef}-f`) };
        return out;
      }
      out.transitions.push({ state: 'POLL', ts: new Date().toISOString() });
    }
    out.status = 'TIMEOUT';
    out.reason_code = 'E_TIMEOUT';
    return out;
  } catch {
    return { ...out, reason_code: 'E_HTTP_NOK', status: 'ERROR' };
  }
}
