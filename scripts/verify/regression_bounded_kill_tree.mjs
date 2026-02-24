import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runBounded } from '../executor/spawn_bounded.mjs';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = path.resolve(process.cwd());
const EXEC_DIR = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC_DIR, 'gates/manual');
const NEXT_ACTION = 'npm run -s epoch:mega:proof:x2';
fs.mkdirSync(MANUAL, { recursive: true });

const pidFile = path.join(os.tmpdir(), `treasure_killtree_${process.pid}.pid`);
try { fs.unlinkSync(pidFile); } catch {}

const cmd = `bash -lc '(sleep 120 & echo $! > ${JSON.stringify(pidFile)}; wait)'`;
const r = runBounded(cmd, { cwd: ROOT, env: process.env, timeoutMs: 800, maxBuffer: 4 * 1024 * 1024 });
let childPid = 0;
if (fs.existsSync(pidFile)) {
  childPid = Number((fs.readFileSync(pidFile, 'utf8') || '').trim()) || 0;
}
let killCheck = 'no-child-pid';
if (childPid > 1) {
  try {
    process.kill(childPid, 0);
    killCheck = 'alive';
  } catch {
    killCheck = 'gone';
  }
}
try { fs.unlinkSync(pidFile); } catch {}

const pass = r.ec === 124 && (!childPid || killCheck === 'gone' || process.platform === 'win32');
const status = pass ? 'PASS' : 'FAIL';
const reason_code = pass ? 'NONE' : 'TO01';
const note = process.platform === 'win32' ? 'win32-skip-group-check' : 'unix-group-check';
writeMd(path.join(EXEC_DIR, 'REGRESSION_BOUNDED_KILL_TREE.md'), `# REGRESSION_BOUNDED_KILL_TREE.md\n\nSTATUS: ${status}\nREASON_CODE: ${reason_code}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${NEXT_ACTION}\n\n- platform: ${process.platform}\n- timeout_ec: ${r.ec}\n- timed_out: ${r.timedOut}\n- tree_kill_attempted: ${r.tree_kill_attempted}\n- tree_kill_ok: ${r.tree_kill_ok}\n- child_pid: ${childPid || 0}\n- child_state_after_timeout: ${killCheck}\n- note: ${note}\n`);
writeJsonDeterministic(path.join(MANUAL, 'regression_bounded_kill_tree.json'), { schema_version:'1.0.0', status, reason_code, run_id:RUN_ID, next_action:NEXT_ACTION, platform:process.platform, timeout_ec:r.ec, timed_out:r.timedOut, tree_kill_attempted:Boolean(r.tree_kill_attempted), tree_kill_ok:Boolean(r.tree_kill_ok), child_pid: childPid || 0, child_state_after_timeout: killCheck, note });
console.log(`[${status}] regression_bounded_kill_tree — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
