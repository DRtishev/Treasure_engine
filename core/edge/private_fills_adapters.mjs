import { normalizePrivateFill } from './private_fill_contracts.mjs';

const MAP = {
  fill_id: ['fill_id', 'tradeId', 'execId', 'id'],
  order_id: ['order_id', 'orderId', 'orderID'],
  ts_ms: ['ts_ms', 'execTime', 'time', 'timestamp'],
  symbol: ['symbol', 'instId'],
  side: ['side', 'direction'],
  qty: ['qty', 'executedQty', 'size'],
  price: ['price', 'execPrice'],
  fee: ['fee', 'commission'],
  fee_asset: ['fee_asset', 'commissionAsset', 'feeCurrency'],
  liquidity_flag: ['liquidity_flag', 'makerTaker', 'liquidity']
};

function pick(row, names) {
  for (const n of names) {
    if (row[n] !== undefined && row[n] !== null && row[n] !== '') return row[n];
  }
  return undefined;
}

export function adaptPrivateFillRow(row, { provider = 'binance', strict = false, account_label = 'acct-redacted', venue = provider } = {}) {
  const adapted = {
    fill_id: pick(row, MAP.fill_id),
    order_id: pick(row, MAP.order_id),
    ts_ms: pick(row, MAP.ts_ms),
    symbol: pick(row, MAP.symbol),
    side: pick(row, MAP.side),
    qty: pick(row, MAP.qty),
    price: pick(row, MAP.price),
    fee: pick(row, MAP.fee) ?? 0,
    fee_asset: pick(row, MAP.fee_asset) ?? 'USDT',
    liquidity_flag: pick(row, MAP.liquidity_flag) ?? 'UNKNOWN'
  };

  const required = ['ts_ms', 'symbol', 'side', 'qty', 'price'];
  for (const k of required) {
    if (adapted[k] === undefined) throw new Error(`adapter missing required field: ${k}`);
  }

  if (strict && (adapted.fill_id === undefined || adapted.fill_id === '')) {
    throw new Error('strict adapter requires fill_id or stable provider id');
  }

  return normalizePrivateFill(adapted, { provider, account_label, venue }, strict);
}

export function adapterMappingTable() {
  return MAP;
}
