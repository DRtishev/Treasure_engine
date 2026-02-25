import fs from 'node:fs';
import path from 'node:path';
import { runBounded } from '../executor/spawn_bounded.mjs';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = path.resolve(process.cwd());
const EXEC_DIR = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC_DIR, 'gates/manual');
const NEXT_ACTION = 'npm run -s verify:regression:victory-seal-deterministic-x2';

const lock = path.join(ROOT, 'artifacts/incoming/bybit_liq.lock.json');
const raw = path.join(ROOT, 'artifacts/incoming/bybit_liq.raw.json');
const lockBak = `${lock}.bak`; const rawBak = `${raw}.bak`;
if (fs.existsSync(lock)) fs.renameSync(lock, lockBak);
if (fs.existsSync(raw)) fs.renameSync(raw, rawBak);

function readSemanticHash() {
  const p = path.join(MANUAL, 'victory_seal.json');
  if (!fs.existsSync(p)) return 'MISSING';
  try { return String(JSON.parse(fs.readFileSync(p, 'utf8')).semantic_hash || 'MISSING'); } catch { return 'INVALID'; }
}

const env = { ...process.env, TREASURE_NET_KILL: '1', VICTORY_TEST_MODE: '1' };
const r1 = runBounded('npm run -s epoch:victory:seal', { cwd: ROOT, env, maxBuffer: 32 * 1024 * 1024, timeoutMs: 30000 });
const h1 = readSemanticHash();
const r2 = runBounded('npm run -s epoch:victory:seal', { cwd: ROOT, env, maxBuffer: 32 * 1024 * 1024, timeoutMs: 30000 });
const h2 = readSemanticHash();

if (fs.existsSync(lockBak)) fs.renameSync(lockBak, lock);
if (fs.existsSync(rawBak)) fs.renameSync(rawBak, raw);

const stable = h1 !== 'MISSING' && h1 !== 'INVALID' && h1 === h2;
const status = stable ? 'PASS' : 'FAIL';
const reason_code = stable ? 'NONE' : 'RG_VIC02';

writeMd(path.join(EXEC_DIR, 'REGRESSION_VICTORY_SEAL_DETERMINISTIC_X2.md'), `# REGRESSION_VICTORY_SEAL_DETERMINISTIC_X2.md\n\nSTATUS: ${status}\nREASON_CODE: ${reason_code}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${NEXT_ACTION}\n\n- run1_ec: ${r1.ec}\n- run2_ec: ${r2.ec}\n- semantic_hash_run1: ${h1}\n- semantic_hash_run2: ${h2}\n- stable_match: ${stable}\n`);
writeJsonDeterministic(path.join(MANUAL, 'regression_victory_seal_deterministic_x2.json'), { schema_version:'1.0.0', status, reason_code, run_id:RUN_ID, next_action:NEXT_ACTION, run1_ec:r1.ec, run2_ec:r2.ec, semantic_hash_run1:h1, semantic_hash_run2:h2, stable_match:stable });
console.log(`[${status}] regression_victory_seal_deterministic_x2 — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
