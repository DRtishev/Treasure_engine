import crypto from 'node:crypto';

export const DataContracts = {
  TradeEvent: ['type', 'symbol', 'ts', 'price', 'qty', 'side', 'trade_id'],
  Candle: ['type', 'symbol', 'ts_open', 'ts_close', 'open', 'high', 'low', 'close', 'volume'],
  OrderBookSnapshot: ['type', 'symbol', 'ts', 'bids', 'asks'],
  OrderBookDelta: ['type', 'symbol', 'ts', 'bids', 'asks'],
  FillRecord: ['fill_id', 'symbol', 'side', 'qty', 'price', 'ts']
};

export function validateContract(kind, payload) {
  const req = DataContracts[kind];
  if (!req) throw new Error(`Unknown contract: ${kind}`);
  for (const f of req) {
    if (!(f in payload)) throw new Error(`${kind} missing field ${f}`);
  }
  return true;
}

export function fingerprintRecord(payload) {
  return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}
