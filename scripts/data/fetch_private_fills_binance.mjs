#!/usr/bin/env node
const allowNet = process.env.ENABLE_NETWORK === '1';
const allowPrivate = process.env.PRIVATE_DATA_ALLOW === '1';
const allow = (process.env.PROVIDER_ALLOWLIST || '').split(',').map((x) => x.trim().toLowerCase());
if (!allowNet || !allowPrivate || !allow.includes('binance')) {
  console.error('fetch_private_fills_binance blocked by policy flags');
  process.exit(1);
}
console.error('Not implemented for CI/offline mode; use file ingest path for deterministic operation.');
process.exit(1);
