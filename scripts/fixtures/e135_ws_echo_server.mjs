#!/usr/bin/env node
// E135 WebSocket Echo Server — binds 127.0.0.1:0 (ephemeral port), offline fixture only.
import { WebSocketServer } from 'ws';

/**
 * Start a WebSocket echo server.
 * @returns {Promise<{port:number, close:()=>Promise<void>}>}
 */
export async function startWsEchoServer() {
  return new Promise((resolve, reject) => {
    const wss = new WebSocketServer({ host: '127.0.0.1', port: 0 });
    wss.once('error', reject);
    wss.on('listening', () => {
      const { port } = wss.address();
      resolve({
        port,
        close: () => new Promise((r, e) => wss.close((err) => err ? e(err) : r())),
      });
    });
    wss.on('connection', (ws) => {
      ws.on('message', (data, isBinary) => {
        // Echo back exactly what was received.
        ws.send(isBinary ? data : data.toString(), { binary: isBinary });
      });
      ws.on('error', () => {}); // swallow client errors silently
    });
  });
}
