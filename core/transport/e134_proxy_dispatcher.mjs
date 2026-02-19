import { createHash } from 'node:crypto';
import { EnvHttpProxyAgent, setGlobalDispatcher } from 'undici';

function redactProxy(env = process.env) {
  const raw = env.HTTPS_PROXY || env.HTTP_PROXY || env.ALL_PROXY || '';
  if (!raw) return { present: false, scheme: 'NONE', shape_hash: 'NONE' };
  try {
    const u = new URL(raw);
    const port = u.port || (u.protocol === 'https:' ? '443' : '80');
    return {
      present: true,
      scheme: u.protocol.replace(':', '').toUpperCase(),
      shape_hash: createHash('sha256').update(`${u.hostname}:${port}`).digest('hex')
    };
  } catch {
    return { present: true, scheme: 'INVALID', shape_hash: createHash('sha256').update('INVALID').digest('hex') };
  }
}

export function configureProxyDispatcher(env = process.env) {
  const modeEnabled = env.ONLINE_OPTIONAL === '1' || env.ONLINE_REQUIRED === '1';
  const netEnabled = env.ENABLE_NET === '1' && env.I_UNDERSTAND_LIVE_RISK === '1';
  const p = redactProxy(env);
  let dispatcher_mode = 'direct';
  if (modeEnabled && netEnabled && p.present) {
    setGlobalDispatcher(new EnvHttpProxyAgent());
    dispatcher_mode = 'env_proxy';
  }
  const ca_present = Boolean(env.NODE_EXTRA_CA_CERTS || env.SSL_CERT_FILE || env.SSL_CERT_DIR || env.REQUESTS_CA_BUNDLE || env.CURL_CA_BUNDLE);
  return { proxy_scheme: p.scheme, proxy_shape_hash: p.shape_hash, ca_present, dispatcher_mode };
}
