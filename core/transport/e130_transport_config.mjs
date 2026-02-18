import { createHash } from 'node:crypto';

export function resolveTransportConfig(env=process.env){
  const proxy = env.HTTPS_PROXY || env.HTTP_PROXY || env.ALL_PROXY || '';
  let proxy_scheme='NONE';
  try{ proxy_scheme = proxy ? new URL(proxy).protocol.replace(':','').toUpperCase() : 'NONE'; }catch{ proxy_scheme='INVALID'; }
  const proxy_shape_hash = proxy ? createHash('sha256').update(proxy).digest('hex') : 'NONE';
  const force_ipv4 = env.FORCE_IPV4==='1';
  const ip_family = force_ipv4 ? 'ipv4' : 'auto';
  const ca_present = Boolean(env.NODE_EXTRA_CA_CERTS);
  const proxy_profile = String(env.PROXY_PROFILE||'auto');
  return { proxy_scheme, proxy_shape_hash, force_ipv4, ip_family, ca_present, proxy_profile, no_proxy: env.NO_PROXY?'SET':'NONE' };
}
