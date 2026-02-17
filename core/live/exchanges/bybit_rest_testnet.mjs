// E109 Track B3: Bybit Testnet REST Adapter (operator-only)
// HARD-FAILS unless ENABLE_NET=1 AND CI not truthy.
// Secrets from env only; NEVER writes secrets to evidence.
// Provides dry-run mode that validates requests but does not send.

import crypto from 'node:crypto';
import { isCIMode } from '../../../scripts/verify/foundation_ci.mjs';
import { createExchangeLogger } from '../exchange_interface.mjs';

const BASE_URL_TESTNET = 'https://api-testnet.bybit.com';
const BASE_URL_MAINNET = 'https://api.bybit.com';

function enforceNetGuard() {
  if (isCIMode()) throw new Error('BYBIT_BLOCKED_IN_CI: live adapter requires CI=false');
  if (process.env.ENABLE_NET !== '1') throw new Error('BYBIT_BLOCKED: set ENABLE_NET=1');
}

function getSecrets() {
  const key = process.env.BYBIT_API_KEY;
  const secret = process.env.BYBIT_API_SECRET;
  if (!key || !secret) throw new Error('BYBIT_API_KEY and BYBIT_API_SECRET required');
  return { key, secret };
}

function sign(params, secret, timestamp, recvWindow = '5000') {
  const ordered = Object.keys(params).sort().map(k => `${k}=${params[k]}`).join('&');
  const preSign = `${timestamp}${process.env.BYBIT_API_KEY}${recvWindow}${ordered}`;
  return crypto.createHmac('sha256', secret).update(preSign).digest('hex');
}

/**
 * Create Bybit REST adapter.
 * @param {Object} opts
 * @param {string} opts.mode - 'testnet' | 'mainnet'
 * @param {boolean} opts.dryRun - if true, signs/validates but does NOT send
 * @returns {Object} Exchange adapter
 */
export function createBybitExchange(opts = {}) {
  enforceNetGuard();
  const modeStr = opts.mode || 'testnet';
  if (modeStr !== 'testnet' && modeStr !== 'mainnet') throw new Error('mode must be testnet or mainnet');
  if (modeStr === 'mainnet' && process.env.I_UNDERSTAND_LIVE_RISK !== '1') {
    throw new Error('MAINNET requires I_UNDERSTAND_LIVE_RISK=1');
  }

  const baseUrl = modeStr === 'testnet' ? BASE_URL_TESTNET : BASE_URL_MAINNET;
  const { key, secret } = getSecrets();
  const dryRun = !!opts.dryRun;
  const logger = createExchangeLogger();

  async function apiCall(method, endpoint, params = {}) {
    const timestamp = String(Date.now());
    const recvWindow = '5000';
    const signature = sign(params, secret, timestamp, recvWindow);

    const headers = {
      'X-BAPI-API-KEY': key,
      'X-BAPI-SIGN': signature,
      'X-BAPI-SIGN-TYPE': '2',
      'X-BAPI-TIMESTAMP': timestamp,
      'X-BAPI-RECV-WINDOW': recvWindow,
      'Content-Type': 'application/json'
    };

    const url = `${baseUrl}${endpoint}`;

    if (dryRun) {
      logger.log('DRY_RUN', { method, endpoint, params, signature: signature.slice(0, 16) + '...' });
      return { retCode: 0, retMsg: 'DRY_RUN', result: {} };
    }

    const fetchOpts = method === 'GET'
      ? { method, headers }
      : { method, headers, body: JSON.stringify(params) };

    const res = await fetch(url, { ...fetchOpts, signal: AbortSignal.timeout(10000) });
    const data = await res.json();
    logger.log('API_CALL', { method, endpoint, retCode: data.retCode });
    return data;
  }

  return {
    async getTime() {
      const data = await apiCall('GET', '/v5/market/time');
      return Number(data.result?.timeSecond || 0) * 1000;
    },

    async getBalance() {
      const data = await apiCall('GET', '/v5/account/wallet-balance', { accountType: 'UNIFIED' });
      const coins = data.result?.list?.[0]?.coin || [];
      const usdt = coins.find(c => c.coin === 'USDT') || {};
      return {
        total: Number(usdt.walletBalance || 0),
        available: Number(usdt.availableToWithdraw || 0),
        currency: 'USDT'
      };
    },

    async getPrice(symbol) {
      const data = await apiCall('GET', `/v5/market/tickers?category=linear&symbol=${symbol}`);
      return Number(data.result?.list?.[0]?.lastPrice || 0);
    },

    async placeOrder({ symbol, side, type, qty, price }) {
      const params = {
        category: 'linear',
        symbol,
        side: side.charAt(0).toUpperCase() + side.slice(1).toLowerCase(),
        orderType: type === 'LIMIT' ? 'Limit' : 'Market',
        qty: String(qty)
      };
      if (type === 'LIMIT' && price) params.price = String(price);

      const data = await apiCall('POST', '/v5/order/create', params);
      const orderId = data.result?.orderId || 'UNKNOWN';
      return {
        orderId,
        symbol,
        side,
        type,
        qty,
        price: price || 0,
        status: data.retCode === 0 ? 'SUBMITTED' : 'FAILED',
        ts: Date.now()
      };
    },

    async cancelAll(symbol) {
      const data = await apiCall('POST', '/v5/order/cancel-all', { category: 'linear', symbol });
      return { cancelled: data.result?.list?.length || 0 };
    },

    async fetchFills(since = 0) {
      const data = await apiCall('GET', '/v5/execution/list', {
        category: 'linear',
        startTime: String(since)
      });
      return (data.result?.list || []).map(f => ({
        fillId: f.execId,
        orderId: f.orderId,
        symbol: f.symbol,
        side: f.side,
        qty: Number(f.execQty),
        price: Number(f.execPrice),
        fee: Number(f.execFee),
        ts: Number(f.execTime)
      }));
    },

    mode() {
      return modeStr;
    },

    getLogger() { return logger; },
    isDryRun() { return dryRun; }
  };
}
