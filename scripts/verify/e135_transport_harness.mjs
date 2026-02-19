#!/usr/bin/env node
/**
 * E135 Transport Harness — offline, deterministic.
 * Tests: direct HTTP, direct WS, proxy-CONNECT HTTP, proxy-CONNECT WS.
 * No external network I/O. All servers bind to 127.0.0.1:0.
 */
import net from 'node:net';
import http from 'node:http';
import { randomBytes } from 'node:crypto';
import { WebSocket } from 'ws';
import { startHttpEchoServer } from '../fixtures/e135_http_echo_server.mjs';
import { startWsEchoServer } from '../fixtures/e135_ws_echo_server.mjs';
import { startConnectProxy } from '../fixtures/e135_http_connect_proxy.mjs';
import { E135_ROOT, writeMdAtomic } from './e135_lib.mjs';

// ── helpers ──────────────────────────────────────────────────────────────────

function emptyStages() {
  return {
    tcp_ok: false,
    tls_ok: false,
    http_ok: false,
    ws_handshake_ok: false,
    ws_event_ok: false,
    tcp_to_proxy_ok: false,
    connect_tunnel_ok: false,
    tls_over_tunnel_ok: false,
    http_over_tunnel_ok: false,
    ws_over_tunnel_ok: false,
    reason_code: 'E_TCP_FAIL',
    rtt_ms: 0,
  };
}

const KNOWN_CODES = new Set([
  'OK', 'E_TCP_FAIL', 'E_TLS_FAIL', 'E_HTTP_FAIL',
  'E_WS_HANDSHAKE_FAIL', 'E_WS_EVENT_FAIL', 'E_PROXY_CONNECT_FAIL',
]);

function normalizeReason(msg) {
  const m = String(msg || '');
  for (const k of KNOWN_CODES) if (m.includes(k)) return k;
  if (m.includes('ECONN') || m.includes('EREFUSED')) return 'E_TCP_FAIL';
  return 'E_TCP_FAIL';
}

function tcpConnect(host, port, timeoutMs = 3000) {
  return new Promise((res, rej) => {
    const s = net.connect({ host, port, timeout: timeoutMs }, () => res(s));
    s.on('timeout', () => { s.destroy(); rej(new Error('E_TCP_FAIL')); });
    s.on('error', () => rej(new Error('E_TCP_FAIL')));
  });
}

function httpGetRaw(host, port, path = '/', timeoutMs = 3000) {
  return new Promise((res, rej) => {
    const req = http.request(
      { host, port, path, method: 'GET', timeout: timeoutMs },
      (r) => {
        const chunks = [];
        r.on('data', (c) => chunks.push(c));
        r.on('end', () => res({ status: r.statusCode, body: Buffer.concat(chunks).toString() }));
      },
    );
    req.on('timeout', () => { req.destroy(); rej(new Error('E_HTTP_FAIL')); });
    req.on('error', () => rej(new Error('E_HTTP_FAIL')));
    req.end();
  });
}

function wsConnect(url, timeoutMs = 4000) {
  return new Promise((res, rej) => {
    const ws = new WebSocket(url, { handshakeTimeout: timeoutMs });
    const timer = setTimeout(() => { ws.terminate(); rej(new Error('E_WS_HANDSHAKE_FAIL')); }, timeoutMs);
    ws.once('open', () => { clearTimeout(timer); res(ws); });
    ws.once('error', () => { clearTimeout(timer); rej(new Error('E_WS_HANDSHAKE_FAIL')); });
  });
}

function wsEchoRoundtrip(ws, message = 'PING', timeoutMs = 3000) {
  return new Promise((res, rej) => {
    const timer = setTimeout(() => { ws.terminate(); rej(new Error('E_WS_EVENT_FAIL')); }, timeoutMs);
    ws.once('message', (data) => {
      clearTimeout(timer);
      ws.close();
      res(String(data) === message);
    });
    ws.once('error', () => { clearTimeout(timer); rej(new Error('E_WS_EVENT_FAIL')); });
    ws.send(message);
  });
}

// CONNECT tunnel: returns a paused net.Socket tunnelled to targetHost:targetPort through proxy.
// Caller must call socket.resume() after setting up data listeners.
function connectViaTunnel(proxyHost, proxyPort, targetHost, targetPort, timeoutMs = 3000) {
  return new Promise((res, rej) => {
    const s = net.connect({ host: proxyHost, port: proxyPort, timeout: timeoutMs }, () => {
      s.write(
        `CONNECT ${targetHost}:${targetPort} HTTP/1.1\r\nHost: ${targetHost}:${targetPort}\r\n\r\n`,
      );
    });
    s.on('timeout', () => { s.destroy(); rej(new Error('E_PROXY_CONNECT_FAIL')); });
    s.on('error', () => rej(new Error('E_PROXY_CONNECT_FAIL')));

    let buf = Buffer.alloc(0);
    const onData = (chunk) => {
      buf = Buffer.concat([buf, chunk]);
      const str = buf.toString('latin1');
      if (!str.includes('\r\n\r\n')) return;
      s.off('data', onData);
      const status = Number((/HTTP\/1\.[01] (\d+)/.exec(str) || [])[1] || 0);
      if (status >= 200 && status < 300) {
        s.pause(); // prevent data loss before caller registers listeners
        res(s);
      } else {
        s.destroy();
        rej(new Error('E_PROXY_CONNECT_FAIL'));
      }
    };
    s.on('data', onData);
  });
}

// HTTP GET over a pre-established paused socket (tunnel).
// Resumes the socket after registering listeners.
function httpGetOverSocket(socket, host, port, urlPath = '/', timeoutMs = 3000) {
  return new Promise((res, rej) => {
    let resolved = false;
    const timer = setTimeout(() => {
      if (!resolved) { resolved = true; socket.destroy(); rej(new Error('E_HTTP_FAIL')); }
    }, timeoutMs);
    const chunks = [];
    const onData = (chunk) => chunks.push(chunk);
    const finish = () => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timer);
      socket.off('data', onData);
      const raw = Buffer.concat(chunks).toString();
      const sepIdx = raw.indexOf('\r\n\r\n');
      if (sepIdx === -1) { rej(new Error('E_HTTP_FAIL')); return; }
      const head = raw.slice(0, sepIdx);
      const body = raw.slice(sepIdx + 4);
      const status = Number((/HTTP\/1\.[01] (\d+)/.exec(head) || [])[1] || 0);
      res({ status, body });
    };
    socket.on('data', onData);
    socket.once('end', finish);
    socket.once('close', finish);
    socket.on('error', () => { if (!resolved) { resolved = true; clearTimeout(timer); rej(new Error('E_HTTP_FAIL')); } });
    socket.write(`GET ${urlPath} HTTP/1.1\r\nHost: ${host}:${port}\r\nConnection: close\r\n\r\n`);
    socket.resume(); // safe: listeners are now registered
  });
}

// Manual WebSocket upgrade + echo roundtrip over a raw socket
function wsOverSocket(socket, host, port, message = 'PING', timeoutMs = 4000) {
  return new Promise((res, rej) => {
    const timer = setTimeout(() => { socket.destroy(); rej(new Error('E_WS_EVENT_FAIL')); }, timeoutMs);

    const wsKey = randomBytes(16).toString('base64');
    const handshake = [
      `GET / HTTP/1.1`,
      `Host: ${host}:${port}`,
      `Upgrade: websocket`,
      `Connection: Upgrade`,
      `Sec-WebSocket-Key: ${wsKey}`,
      `Sec-WebSocket-Version: 13`,
      ``, ``,
    ].join('\r\n');

    let phase = 'handshake';
    let recvBuf = Buffer.alloc(0);

    const onData = (chunk) => {
      recvBuf = Buffer.concat([recvBuf, chunk]);

      if (phase === 'handshake') {
        const str = recvBuf.toString('latin1');
        if (!str.includes('\r\n\r\n')) return;
        const status = Number((/HTTP\/1\.[01] (\d+)/.exec(str) || [])[1] || 0);
        if (status !== 101) {
          socket.off('data', onData);
          clearTimeout(timer);
          socket.destroy();
          rej(new Error('E_WS_HANDSHAKE_FAIL'));
          return;
        }
        // Handshake done; send a masked text frame for "PING"
        phase = 'frame';
        const payload = Buffer.from(message);
        const maskKey = randomBytes(4);
        const masked = Buffer.from(payload);
        for (let i = 0; i < masked.length; i++) masked[i] ^= maskKey[i % 4];
        // FIN=1, opcode=text(1), mask=1
        const frame = Buffer.concat([
          Buffer.from([0x81, 0x80 | payload.length]),
          maskKey,
          masked,
        ]);
        // Discard header bytes from recvBuf, keep any trailing data
        const sepIdx = recvBuf.indexOf('\r\n\r\n');
        recvBuf = recvBuf.slice(sepIdx + 4);
        socket.write(frame);
        // Re-process any bytes already in buffer
        if (recvBuf.length > 0) onData(Buffer.alloc(0));

      } else if (phase === 'frame') {
        // Minimal frame parser (payload ≤ 125 bytes, no masking from server)
        if (recvBuf.length < 2) return;
        const opcode = recvBuf[0] & 0x0f;
        const masked = (recvBuf[1] & 0x80) !== 0;
        const payLen = recvBuf[1] & 0x7f;
        const dataStart = masked ? 6 : 2;
        if (payLen > 125 || recvBuf.length < dataStart + payLen) return;
        socket.off('data', onData);
        clearTimeout(timer);
        let payload = recvBuf.slice(dataStart, dataStart + payLen);
        if (masked) {
          const key = recvBuf.slice(2, 6);
          payload = Buffer.from(payload);
          for (let i = 0; i < payload.length; i++) payload[i] ^= key[i % 4];
        }
        const echo = payload.toString();
        socket.destroy();
        res(opcode === 1 && echo === message);
      }
    };

    socket.on('data', onData);
    socket.on('error', () => { clearTimeout(timer); rej(new Error('E_WS_HANDSHAKE_FAIL')); });
    socket.write(handshake);
    socket.resume(); // safe: listener registered; was paused by connectViaTunnel
  });
}

// ── scenarios ─────────────────────────────────────────────────────────────────

async function scenarioDirectHttp(echoPort) {
  const r = emptyStages();
  r.tls_ok = true; // plain HTTP, no TLS stage
  const t0 = Date.now();
  try {
    // TCP probe
    const s = await tcpConnect('127.0.0.1', echoPort);
    r.tcp_ok = true;
    s.destroy();
    // HTTP GET
    const { status, body } = await httpGetRaw('127.0.0.1', echoPort, '/ping');
    r.http_ok = status >= 200 && status < 300 && body.includes('ECHO:OK');
    if (!r.http_ok) throw new Error('E_HTTP_FAIL');
    r.reason_code = 'OK';
  } catch (e) {
    r.reason_code = normalizeReason(e.message);
  }
  r.rtt_ms = Date.now() - t0;
  return r;
}

async function scenarioDirectWs(wsPort) {
  const r = emptyStages();
  r.tls_ok = true; // plain ws://, no TLS
  const t0 = Date.now();
  try {
    const s = await tcpConnect('127.0.0.1', wsPort);
    r.tcp_ok = true;
    s.destroy();
    const ws = await wsConnect(`ws://127.0.0.1:${wsPort}`);
    r.ws_handshake_ok = true;
    const matched = await wsEchoRoundtrip(ws, 'PING');
    r.ws_event_ok = matched;
    if (!r.ws_event_ok) throw new Error('E_WS_EVENT_FAIL');
    r.reason_code = 'OK';
  } catch (e) {
    r.reason_code = normalizeReason(e.message);
  }
  r.rtt_ms = Date.now() - t0;
  return r;
}

async function scenarioProxyHttp(echoPort, proxyPort) {
  const r = emptyStages();
  r.tls_over_tunnel_ok = true; // plain HTTP through tunnel, no TLS needed
  const t0 = Date.now();
  try {
    // TCP to proxy
    const s0 = await tcpConnect('127.0.0.1', proxyPort);
    r.tcp_to_proxy_ok = true;
    r.tcp_ok = true;
    s0.destroy();
    // CONNECT tunnel
    const tunnel = await connectViaTunnel('127.0.0.1', proxyPort, '127.0.0.1', echoPort);
    r.connect_tunnel_ok = true;
    // HTTP GET over tunnel
    const { status, body } = await httpGetOverSocket(tunnel, '127.0.0.1', echoPort, '/ping');
    r.http_ok = status >= 200 && status < 300 && body.includes('ECHO:OK');
    r.http_over_tunnel_ok = r.http_ok;
    if (!r.http_ok) throw new Error('E_HTTP_FAIL');
    r.reason_code = 'OK';
    tunnel.destroy();
  } catch (e) {
    r.reason_code = normalizeReason(e.message);
  }
  r.rtt_ms = Date.now() - t0;
  return r;
}

async function scenarioProxyWs(wsPort, proxyPort) {
  const r = emptyStages();
  r.tls_over_tunnel_ok = true; // plain ws:// through tunnel, no TLS needed
  const t0 = Date.now();
  try {
    // TCP to proxy
    const s0 = await tcpConnect('127.0.0.1', proxyPort);
    r.tcp_to_proxy_ok = true;
    r.tcp_ok = true;
    s0.destroy();
    // CONNECT tunnel
    const tunnel = await connectViaTunnel('127.0.0.1', proxyPort, '127.0.0.1', wsPort);
    r.connect_tunnel_ok = true;
    // WS handshake + roundtrip over tunnel
    r.ws_handshake_ok = true; // will be confirmed or reset inside
    const matched = await wsOverSocket(tunnel, '127.0.0.1', wsPort, 'PING');
    r.ws_handshake_ok = true;
    r.ws_over_tunnel_ok = true;
    r.ws_event_ok = matched;
    if (!r.ws_event_ok) throw new Error('E_WS_EVENT_FAIL');
    r.reason_code = 'OK';
  } catch (e) {
    if (r.connect_tunnel_ok && e.message.includes('WS_HANDSHAKE')) {
      r.ws_handshake_ok = false;
    }
    r.reason_code = normalizeReason(e.message);
  }
  r.rtt_ms = Date.now() - t0;
  return r;
}

// ── main ──────────────────────────────────────────────────────────────────────

export async function runHarness() {
  // Start servers
  const [httpServer, wsServer, proxy] = await Promise.all([
    startHttpEchoServer(),
    startWsEchoServer(),
    startConnectProxy(),
  ]);

  let results;
  try {
    results = await Promise.all([
      scenarioDirectHttp(httpServer.port).then((r) => ({ scenario: 'direct_http', ...r })),
      scenarioDirectWs(wsServer.port).then((r) => ({ scenario: 'direct_ws', ...r })),
      scenarioProxyHttp(httpServer.port, proxy.port).then((r) => ({ scenario: 'proxy_http_connect', ...r })),
      scenarioProxyWs(wsServer.port, proxy.port).then((r) => ({ scenario: 'proxy_ws_connect', ...r })),
    ]);
  } finally {
    await Promise.allSettled([httpServer.close(), wsServer.close(), proxy.close()]);
  }

  return results;
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const results = await runHarness();
  const allOk = results.every((r) => r.reason_code === 'OK');
  process.stdout.write(JSON.stringify(results, null, 2) + '\n');
  process.exit(allOk ? 0 : 1);
}
