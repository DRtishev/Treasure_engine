export function assertNetworkAllowed(provider) {
  const enabled = process.env.ENABLE_NETWORK === '1';
  const allow = (process.env.PROVIDER_ALLOWLIST || '')
    .split(',')
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean);
  if (!enabled || !allow.includes(String(provider).toLowerCase())) {
    const err = new Error(`NETWORK_DISABLED:${provider}`);
    err.code = 'NETWORK_DISABLED';
    throw err;
  }
}
