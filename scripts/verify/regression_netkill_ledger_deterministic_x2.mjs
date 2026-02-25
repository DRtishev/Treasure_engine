import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { runBounded } from '../executor/spawn_bounded.mjs';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = path.resolve(process.cwd());
const EXEC_DIR = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC_DIR, 'gates/manual');
const NEXT_ACTION = 'npm run -s verify:regression:netkill-ledger-deterministic-x2';

function hashLedger() {
  const p = path.join(ROOT, 'reports/evidence/EXECUTOR/NETKILL_LEDGER.json');
  const summaryPath = path.join(ROOT, 'reports/evidence/EXECUTOR/NETKILL_LEDGER_SUMMARY.json');
  if (fs.existsSync(summaryPath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
      if (parsed.ledger_semantic_hash) return String(parsed.ledger_semantic_hash);
    } catch {}
  }
  if (!fs.existsSync(p)) return 'MISSING';
  try {
    const parsed = JSON.parse(fs.readFileSync(p, 'utf8'));
    const semantic = { execution_mode: parsed.execution_mode || 'FULL', records: parsed.records || [] };
    return crypto.createHash('sha256').update(JSON.stringify(semantic)).digest('hex');
  } catch {
    return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
  }
}

const deterministicEnv = { ...process.env, EXECUTOR_CHAIN_MINI: '1', VICTORY_TEST_MODE: '1' };
const r1 = runBounded('npm run -s executor:run:chain', { cwd: ROOT, env: deterministicEnv, maxBuffer: 64 * 1024 * 1024, timeoutMs: 60000 });
const h1 = r1.ec === 0 ? hashLedger() : 'NA';
const r2 = runBounded('npm run -s executor:run:chain', { cwd: ROOT, env: deterministicEnv, maxBuffer: 64 * 1024 * 1024, timeoutMs: 60000 });
const h2 = r2.ec === 0 ? hashLedger() : 'NA';
const stable = r1.ec === 0 && r2.ec === 0 && h1 === h2;
const status = stable ? 'PASS' : 'FAIL';
const reason_code = stable ? 'NONE' : 'RG_NET03';
writeMd(path.join(EXEC_DIR, 'REGRESSION_NETKILL_LEDGER_DETERMINISTIC_X2.md'), `# REGRESSION_NETKILL_LEDGER_DETERMINISTIC_X2.md\n\nSTATUS: ${status}\nREASON_CODE: ${reason_code}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${NEXT_ACTION}\n\n- run1_ec: ${r1.ec}\n- run2_ec: ${r2.ec}\n- sha_run1: ${h1}\n- sha_run2: ${h2}\n- stable_match: ${stable}\n`);
writeJsonDeterministic(path.join(MANUAL, 'regression_netkill_ledger_deterministic_x2.json'), { schema_version:'1.0.0', status, reason_code, run_id:RUN_ID, next_action:NEXT_ACTION, run1_ec:r1.ec, run2_ec:r2.ec, sha_run1:h1, sha_run2:h2, stable_match:stable });
console.log(`[${status}] regression_netkill_ledger_deterministic_x2 — ${reason_code}`);
process.exit(stable ? 0 : 1);
