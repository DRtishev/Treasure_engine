import { spawnSync } from 'node:child_process';

export const DEFAULT_TIMEOUT_MS = Number(process.env.EXEC_TIMEOUT_MS || 900000);

export function runBounded(cmd, { cwd, env, timeoutMs = DEFAULT_TIMEOUT_MS, maxBuffer = 64 * 1024 * 1024 } = {}) {
  const startedAt = new Date().toISOString();
  const r = spawnSync('bash', ['-lc', cmd], {
    cwd,
    encoding: 'utf8',
    env,
    maxBuffer,
    timeout: timeoutMs,
    killSignal: 'SIGKILL',
  });
  const completedAt = new Date().toISOString();
  const timedOut = !!(r.error && (r.error.code === 'ETIMEDOUT' || /timed out/i.test(String(r.error.message || ''))));
  const ec = timedOut ? 124 : (Number.isInteger(r.status) ? r.status : 1);
  return { ec, timedOut, startedAt, completedAt, stdout: r.stdout || '', stderr: r.stderr || '', signal: r.signal || null, timeout_ms: timeoutMs };
}
