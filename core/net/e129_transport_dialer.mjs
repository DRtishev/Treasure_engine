import dns from 'node:dns';
import dnsPromises from 'node:dns/promises';
import net from 'node:net';
import tls from 'node:tls';
import https from 'node:https';
import { request, ProxyAgent, EnvHttpProxyAgent, setGlobalDispatcher } from 'undici';
import { WebSocket } from 'ws';
import { resolveTransportConfig } from '../transport/e130_transport_config.mjs';

let dispatcherReady = false;
function ensureDispatcher(cfg) {
  if (dispatcherReady) return;
  if (cfg.proxy_present) {
    setGlobalDispatcher(cfg.proxy_url ? new ProxyAgent(cfg.proxy_url) : new EnvHttpProxyAgent());
  }
  dispatcherReady = true;
}

async function connectViaProxy(targetHost, targetPort, proxyUrl, timeoutMs = 5000) {
  const p = new URL(proxyUrl);
  const proxyPort = Number(p.port || (p.protocol === 'https:' ? 443 : 80));
  return new Promise((resolve, reject) => {
    const baseSocket = net.connect({ host: p.hostname, port: proxyPort, timeout: timeoutMs }, () => {
      const auth = p.username || p.password ? `Proxy-Authorization: Basic ${Buffer.from(`${decodeURIComponent(p.username)}:${decodeURIComponent(p.password)}`).toString('base64')}\r\n` : '';
      baseSocket.write(`CONNECT ${targetHost}:${targetPort} HTTP/1.1\r\nHost: ${targetHost}:${targetPort}\r\n${auth}Connection: keep-alive\r\n\r\n`);
    });

    baseSocket.on('timeout', () => { baseSocket.destroy(); reject(new Error('E_PROXY_CONNECT_FAIL')); });
    baseSocket.once('error', () => reject(new Error('E_PROXY_CONNECT_FAIL')));

    let buff = '';
    const onData = (chunk) => {
      buff += chunk.toString('utf8');
      if (!buff.includes('\r\n\r\n')) return;
      baseSocket.off('data', onData);
      const [head] = buff.split('\r\n\r\n');
      const status = Number((/^HTTP\/1\.[01]\s+(\d+)/.exec(head) || [])[1] || 0);
      if (status === 407) { baseSocket.destroy(); reject(new Error('E_PROXY_AUTH_REQUIRED')); return; }
      if (status < 200 || status > 299) { baseSocket.destroy(); reject(new Error('E_PROXY_TUNNEL_FAIL')); return; }
      resolve(baseSocket);
    };
    baseSocket.on('data', onData);
  });
}

export function detectProxyShape(env = process.env) {
  const cfg = resolveTransportConfig(env);
  return { raw: cfg.proxy_url, scheme: cfg.proxy_scheme, no_proxy: cfg.no_proxy };
}

export function httpRequestFallback(url, family) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request({ hostname: u.hostname, path: u.pathname + u.search, port: u.port || 443, method: 'GET', timeout: 5000, family, headers: { accept: 'application/json', 'user-agent': 'treasure-e129/1.0' } }, (res) => {
      const chunks = []; res.on('data', (c) => chunks.push(c)); res.on('end', () => resolve({ status: res.statusCode || 0, body: Buffer.concat(chunks).toString('utf8'), date: res.headers.date || '' }));
    });
    req.on('timeout', () => { req.destroy(); reject(new Error('E_TIMEOUT')); });
    req.on('error', () => reject(new Error('E_HTTP_STACK_FAIL')));
    req.end();
  });
}

export async function dialTarget({ target, mode, enabled, forceNetDown, forceIpv4, preferIpv6 }) {
  const cfg = resolveTransportConfig(process.env);
  ensureDispatcher(cfg);
  const out = { dns_ok: false, tcp_ok: false, tls_ok: false, http_ok: false, ws_handshake_ok: false, ws_event_ok: false, rest_payload_ok: false, handshake_rtt_ms: 'NA', first_event_rtt_ms: 'NA', rtt_ms: 0, bytes: 0, err_code: 'NONE', reason_code: 'E_NET_BLOCKED', rest_stack: 'NA', family: 'auto', clock_drift_sec: 'NA', tcp_to_proxy_ok: !cfg.proxy_present, connect_tunnel_ok: !cfg.proxy_present, tls_over_tunnel_ok: !cfg.proxy_present, http_over_tunnel_ok: !cfg.proxy_present, ws_over_tunnel_ok: !cfg.proxy_present, dispatcher_mode: cfg.proxy_present ? 'env_proxy' : 'direct' };
  const start = Date.now();
  if (mode === 'OFFLINE_ONLY' || !enabled || forceNetDown) { out.rtt_ms = Date.now() - start; return out; }

  const u = new URL(target.endpoint);
  const host = u.hostname;
  const port = Number(u.port || ((u.protocol === 'https:' || u.protocol === 'wss:') ? 443 : 80));
  const family = forceIpv4 ? 4 : (preferIpv6 ? 6 : 0); out.family = family === 4 ? 'ipv4' : family === 6 ? 'ipv6' : 'auto';

  try {
    if (forceIpv4) dns.setDefaultResultOrder('ipv4first');
    const lookup = family === 6 ? await dnsPromises.resolve6(host) : family === 4 ? await dnsPromises.resolve4(host) : await dnsPromises.lookup(host);
    out.dns_ok = Array.isArray(lookup) ? lookup.length > 0 : Boolean(lookup?.address);
    if (!out.dns_ok) throw new Error('E_DNS_FAIL');

    if (cfg.proxy_present && cfg.proxy_url) {
      const ps = new URL(cfg.proxy_url);
      await new Promise((resolve, reject) => {
        const s = net.connect({ host: ps.hostname, port: Number(ps.port || 8080), timeout: 4500 }, () => { out.tcp_to_proxy_ok = true; s.destroy(); resolve(); });
        s.on('timeout', () => { s.destroy(); reject(new Error('E_PROXY_CONNECT_FAIL')); });
        s.on('error', () => reject(new Error('E_PROXY_CONNECT_FAIL')));
      });
      out.tcp_ok = out.tcp_to_proxy_ok;
    } else {
      await new Promise((resolve, reject) => {
        const s = net.connect({ host, port, family, timeout: 4500 }, () => { out.tcp_ok = true; s.destroy(); resolve(); });
        s.on('timeout', () => { s.destroy(); reject(new Error(family === 6 ? 'E_IPV6_BLACKHOLE' : 'E_TCP_FAIL')); });
        s.on('error', (e) => reject(new Error(family === 4 ? 'E_IPV4_BLOCKED' : (e?.code || 'E_TCP_FAIL'))));
      });
    }

    if (cfg.proxy_present && cfg.proxy_url) {
      const socket = await connectViaProxy(host, port, cfg.proxy_url, 4500);
      out.connect_tunnel_ok = true;
      if (u.protocol === 'https:' || u.protocol === 'wss:') {
        await new Promise((resolve, reject) => {
          const secure = tls.connect({ socket, servername: host, timeout: 4500 }, () => { out.tls_ok = true; out.tls_over_tunnel_ok = true; secure.destroy(); resolve(); });
          secure.on('error', () => reject(new Error('E_TLS_FAIL')));
          secure.on('timeout', () => { secure.destroy(); reject(new Error('E_TLS_FAIL')); });
        });
      } else {
        out.tls_ok = true;
      }
    } else {
      await new Promise((resolve, reject) => {
        const s = tls.connect({ host, port, servername: host, family, timeout: 4500 }, () => { out.tls_ok = true; s.destroy(); resolve(); });
        s.on('timeout', () => { s.destroy(); reject(new Error('E_TLS_FAIL')); });
        s.on('error', () => reject(new Error('E_TLS_FAIL')));
      });
    }

    if (target.channel === 'REST') {
      let res;
      try {
        const r = await request(target.endpoint, { method: 'GET', headers: { accept: 'application/json', 'user-agent': 'treasure-e129/1.0' } });
        const body = await r.body.text();
        res = { status: r.statusCode, body, date: r.headers.date || '' };
        out.rest_stack = 'undici';
      } catch {
        out.rest_stack = 'https_request';
        res = await httpRequestFallback(target.endpoint, family);
      }
      if (cfg.proxy_present) out.http_over_tunnel_ok = true;
      out.bytes = Buffer.byteLength(res.body); out.http_ok = res.status >= 200 && res.status < 300;
      if (res.date) out.clock_drift_sec = Math.round(Math.abs(Date.now() - Date.parse(res.date)) / 1000);
      if (!out.http_ok) throw new Error('E_HTTP_FAIL');
      try { JSON.parse(res.body); out.rest_payload_ok = true; out.reason_code = 'E_OK'; }
      catch { out.reason_code = 'E_BAD_SCHEMA'; }
    } else {
      await new Promise((resolve, reject) => {
        const wsStart = Date.now();
        const opts = { handshakeTimeout: 5000, family };
        if (cfg.proxy_present) {
          out.ws_over_tunnel_ok = out.connect_tunnel_ok;
        }
        const ws = new WebSocket(target.endpoint, opts);
        const timer = setTimeout(() => { ws.terminate(); reject(new Error('E_WS_EVENT_TIMEOUT')); }, 7000);
        ws.once('open', () => { out.ws_handshake_ok = true; out.handshake_rtt_ms = Date.now() - wsStart; if (cfg.proxy_present) out.ws_over_tunnel_ok = true; });
        ws.once('message', (d) => { out.ws_event_ok = true; out.first_event_rtt_ms = Date.now() - wsStart; out.bytes += Buffer.byteLength(String(d)); out.reason_code = 'E_OK'; clearTimeout(timer); ws.close(); resolve(); });
        ws.once('error', () => { clearTimeout(timer); reject(new Error('E_WS_HANDSHAKE_FAIL')); });
      });
    }
  } catch (e) {
    const msg = String(e.message || 'E_TIMEOUT');
    out.err_code = msg;
    const known = ['E_DNS_FAIL', 'E_TCP_FAIL', 'E_TLS_FAIL', 'E_HTTP_FAIL', 'E_TIMEOUT', 'E_PROXY_CONNECT_FAIL', 'E_PROXY_TUNNEL_FAIL', 'E_PROXY_AUTH_REQUIRED', 'E_BAD_SCHEMA', 'E_WS_HANDSHAKE_FAIL', 'E_WS_HANDSHAKE_OK_BUT_NO_EVENT', 'E_WS_EVENT_TIMEOUT', 'E_IPV6_BLACKHOLE', 'E_IPV4_BLOCKED'];
    out.reason_code = known.includes(msg) ? msg : (msg.includes('ECONN') ? 'E_TCP_FAIL' : 'E_TIMEOUT');
  }
  out.rtt_ms = Date.now() - start;
  return out;
}
