// core/exec/signal_converter.mjs
// EPOCH-18: convert strategy signals into execution intents.

export function signalToIntent(signal, options = {}) {
  if (!signal || !signal.strategy_id) {
    throw new Error('signal.strategy_id is required');
  }
  if (!signal.symbol || !signal.side) {
    throw new Error('signal.symbol and signal.side are required');
  }

  const side = String(signal.side).toUpperCase();
  if (!['BUY', 'SELL'].includes(side)) {
    throw new Error(`invalid signal side: ${signal.side}`);
  }

  const mode = options.mode || 'DRY_RUN';
  const bar_idx = Number.isFinite(options.bar_idx) ? options.bar_idx : 0;
  const order_seq = Number.isFinite(options.order_seq) ? options.order_seq : 0;

  const price = Number.isFinite(signal.price) ? signal.price : (Number.isFinite(options.default_price) ? options.default_price : 1);
  const notional = Number.isFinite(signal.notional_usd)
    ? signal.notional_usd
    : (Number.isFinite(options.default_notional_usd) ? options.default_notional_usd : 100);

  const size = price > 0 ? notional / price : 0;

  return {
    intent_id: `${signal.strategy_id}_${signal.symbol}_${bar_idx}_${order_seq}`,
    strategy_id: signal.strategy_id,
    symbol: signal.symbol,
    side,
    type: signal.type || 'MARKET',
    price,
    size,
    size_usd: notional,
    reason: signal.reason || 'strategy_signal',
    mode,
    confidence: Number.isFinite(signal.confidence) ? signal.confidence : 0,
    freshness: signal.freshness || null,
  };
}

export default signalToIntent;
