import { createHash } from 'node:crypto';

function parseProxy(raw) {
  if (!raw) return { present: false, scheme: 'NONE', shape: '' };
  try {
    const u = new URL(raw);
    const port = u.port || (u.protocol === 'https:' ? '443' : '80');
    return { present: true, scheme: u.protocol.replace(':', '').toUpperCase(), shape: `${u.hostname}:${port}` };
  } catch {
    return { present: true, scheme: 'INVALID', shape: 'INVALID' };
  }
}

export function resolveTransportConfig(env = process.env) {
  const rawProxy = env.HTTPS_PROXY || env.HTTP_PROXY || env.ALL_PROXY || '';
  const parsed = parseProxy(rawProxy);
  const force_ipv4 = env.FORCE_IPV4 === '1';
  const ip_family = force_ipv4 ? 'ipv4' : 'auto';
  const ca_present = Boolean(env.NODE_EXTRA_CA_CERTS || env.SSL_CERT_FILE || env.SSL_CERT_DIR || env.REQUESTS_CA_BUNDLE || env.CURL_CA_BUNDLE);
  const proxy_profile = String(env.PROXY_PROFILE || 'auto');
  return {
    proxy_url: rawProxy,
    proxy_present: parsed.present,
    proxy_scheme: parsed.scheme,
    proxy_shape_hash: parsed.present ? createHash('sha256').update(parsed.shape).digest('hex') : 'NONE',
    force_ipv4,
    ip_family,
    ca_present,
    proxy_profile,
    no_proxy: env.NO_PROXY ? 'SET' : 'NONE'
  };
}
