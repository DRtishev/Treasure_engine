import { spawnSync } from 'node:child_process';

export const DEFAULT_TIMEOUT_MS = Number(process.env.EXEC_TIMEOUT_MS || 900000);

export function runBounded(cmd, { cwd, env, timeoutMs = DEFAULT_TIMEOUT_MS, maxBuffer = 64 * 1024 * 1024 } = {}) {
  const startedAt = new Date().toISOString();
  const unixDetached = process.platform !== 'win32';
  const r = spawnSync('bash', ['-lc', cmd], {
    cwd,
    encoding: 'utf8',
    env,
    maxBuffer,
    timeout: timeoutMs,
    killSignal: 'SIGKILL',
    detached: unixDetached,
  });
  const completedAt = new Date().toISOString();
  const timedOut = !!(r.error && (r.error.code === 'ETIMEDOUT' || /timed out/i.test(String(r.error.message || ''))));

  let treeKillAttempted = false;
  let treeKillOk = false;
  let treeKillNote = 'not-needed';
  if (timedOut && unixDetached && Number.isInteger(r.pid) && r.pid > 1) {
    treeKillAttempted = true;
    try {
      process.kill(-r.pid, 'SIGKILL');
      treeKillOk = true;
      treeKillNote = 'group-killed';
    } catch (e) {
      treeKillOk = false;
      treeKillNote = `group-kill-failed:${String(e?.code || 'ERR')}`;
    }
  }

  const ec = timedOut ? 124 : (Number.isInteger(r.status) ? r.status : 1);
  return {
    ec,
    timedOut,
    startedAt,
    completedAt,
    stdout: r.stdout || '',
    stderr: r.stderr || '',
    signal: r.signal || null,
    timeout_ms: timeoutMs,
    tree_kill_attempted: treeKillAttempted,
    tree_kill_ok: treeKillOk,
    tree_kill_note: treeKillNote,
  };
}
