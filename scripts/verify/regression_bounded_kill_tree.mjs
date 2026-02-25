import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { runBounded } from '../executor/spawn_bounded.mjs';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = path.resolve(process.cwd());
const EXEC_DIR = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC_DIR, 'gates/manual');
const NEXT_ACTION = 'npm run -s verify:regression:bounded-kill-tree';
fs.mkdirSync(MANUAL, { recursive: true });

const pidFile = path.join(os.tmpdir(), `treasure_killtree_${process.pid}.pid`);
try { fs.unlinkSync(pidFile); } catch {}

const cmd = `(sleep 120 & echo $! > ${JSON.stringify(pidFile)}; wait)`;
const r = runBounded(cmd, { cwd: ROOT, env: process.env, timeoutMs: 5000, maxBuffer: 4 * 1024 * 1024 });
let childPid = 0;
if (fs.existsSync(pidFile)) childPid = Number((fs.readFileSync(pidFile, 'utf8') || '').trim()) || 0;

let kill0 = 'unsupported';
let ps = 'unavailable';
let ps_state = 'unknown';
let status = 'PASS';
let reason_code = 'NONE';
if (process.platform === 'win32') {
  reason_code = 'SKIP_WIN32';
} else {
  if (!childPid) {
    status = 'BLOCKED';
    reason_code = 'RG_BKT01';
  } else {

    for (let i = 0; i < 10; i += 1) {
      try { process.kill(childPid, 0); kill0 = 'alive'; } catch { kill0 = 'gone'; }
      const p = spawnSync('ps', ['-p', String(childPid)], { encoding: 'utf8' });
      ps = (p.status === 0 && p.stdout.includes(String(childPid))) ? 'present' : 'gone';
      const pState = spawnSync('ps', ['-o', 'stat=', '-p', String(childPid)], { encoding: 'utf8' });
      ps_state = (pState.status === 0 ? String(pState.stdout || '').trim() : '') || 'unknown';
      if (/(^|\s)Z/.test(ps_state)) ps = 'gone';
      if (kill0 === 'gone' && ps !== 'present') break;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100);
    }
    if (kill0 === 'alive' && ps === 'present') { status = 'FAIL'; reason_code = 'RG_BKT02'; }
    if (ps === 'present') { status = 'FAIL'; reason_code = 'RG_BKT03'; }
  }
}
try { fs.unlinkSync(pidFile); } catch {}
if (r.ec !== 124 && status === 'PASS') { status = 'FAIL'; reason_code = 'TO01'; }

writeMd(path.join(EXEC_DIR, 'REGRESSION_BOUNDED_KILL_TREE.md'), `# REGRESSION_BOUNDED_KILL_TREE.md

STATUS: ${status}
REASON_CODE: ${reason_code}
RUN_ID: ${RUN_ID}
NEXT_ACTION: ${NEXT_ACTION}

- platform: ${process.platform}
- timeout_ec: ${r.ec}
- timed_out: ${r.timedOut}
- tree_kill_attempted: ${r.tree_kill_attempted}
- tree_kill_ok: ${r.tree_kill_ok}
- tree_kill_note: ${r.tree_kill_note || 'NONE'}
- child_pid: ${childPid || 0}
- kill0: ${kill0}
- ps: ${ps}
- ps_state: ${ps_state}
`);
writeJsonDeterministic(path.join(MANUAL, 'regression_bounded_kill_tree.json'), { schema_version:'1.0.0', status, reason_code, run_id:RUN_ID, next_action:NEXT_ACTION, platform:process.platform, timeout_ec:r.ec, timed_out:r.timedOut, tree_kill_attempted:Boolean(r.tree_kill_attempted), tree_kill_ok:Boolean(r.tree_kill_ok), tree_kill_note:r.tree_kill_note || 'NONE', child_pid: childPid || 0, kill0, ps, ps_state });
console.log(`[${status}] regression_bounded_kill_tree — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
