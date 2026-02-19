#!/usr/bin/env node
// E135 HTTP Echo Server — binds 127.0.0.1:0 (ephemeral port), offline fixture only.
import http from 'node:http';

/**
 * Start an HTTP echo server.
 * @returns {Promise<{port:number, close:()=>Promise<void>}>}
 */
export async function startHttpEchoServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const chunks = [];
      req.on('data', (c) => chunks.push(c));
      req.on('end', () => {
        const body = Buffer.concat(chunks).toString();
        res.writeHead(200, { 'content-type': 'text/plain', 'x-echo': 'ok' });
        res.end(`ECHO:OK method=${req.method} path=${req.url} body=${body}`);
      });
      req.on('error', () => { res.writeHead(400); res.end('BAD_REQUEST'); });
    });
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({
        port,
        close: () => new Promise((r, e) => server.close((err) => err ? e(err) : r())),
      });
    });
  });
}
