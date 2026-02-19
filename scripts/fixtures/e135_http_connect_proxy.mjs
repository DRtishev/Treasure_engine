#!/usr/bin/env node
// E135 HTTP CONNECT Proxy — binds 127.0.0.1:0 (ephemeral port), offline fixture only.
// Supports CONNECT tunnelling only (no plain proxy forward needed for offline harness).
import net from 'node:net';

/**
 * Start a minimal HTTP CONNECT-only proxy.
 * @returns {Promise<{port:number, close:()=>Promise<void>}>}
 */
export async function startConnectProxy() {
  return new Promise((resolve, reject) => {
    const server = net.createServer((clientSocket) => {
      clientSocket.on('error', () => clientSocket.destroy());

      let headerBuf = Buffer.alloc(0);

      const onData = (chunk) => {
        headerBuf = Buffer.concat([headerBuf, chunk]);
        const str = headerBuf.toString('latin1');
        const sep = str.indexOf('\r\n\r\n');
        if (sep === -1) return; // header not complete yet

        // Remove data listener — header fully received.
        clientSocket.off('data', onData);

        const head = str.slice(0, sep);
        const firstLine = head.split('\r\n')[0];
        const m = /^CONNECT ([^:\s]+):(\d+) HTTP\/1\.[01]$/.exec(firstLine);
        if (!m) {
          clientSocket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
          clientSocket.destroy();
          return;
        }

        const targetHost = m[1];
        const targetPort = Number(m[2]);

        const targetSocket = net.connect({ host: targetHost, port: targetPort, timeout: 5000 });
        targetSocket.once('connect', () => {
          clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
          // Pipe both directions; let pipe handle EOF propagation naturally.
          clientSocket.pipe(targetSocket);
          targetSocket.pipe(clientSocket);
          // Replay any bytes that arrived after the CONNECT header separator.
          const remaining = headerBuf.slice(sep + 4);
          if (remaining.length > 0) targetSocket.write(remaining);
        });
        targetSocket.on('timeout', () => {
          targetSocket.destroy();
          clientSocket.destroy();
        });
        // Only destroy on errors — let pipe handle normal EOF.
        targetSocket.on('error', () => clientSocket.destroy());
        clientSocket.on('error', () => targetSocket.destroy());
      };

      clientSocket.on('data', onData);
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
