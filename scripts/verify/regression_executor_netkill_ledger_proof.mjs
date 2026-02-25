import fs from 'node:fs';
import path from 'node:path';
import { runBounded } from '../executor/spawn_bounded.mjs';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = path.resolve(process.cwd());
const EXEC_DIR = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC_DIR, 'gates/manual');
const NEXT_ACTION = 'npm run -s verify:regression:executor-netkill-ledger-proof';
fs.mkdirSync(MANUAL, { recursive: true });

const ledgerPath = path.join(EXEC_DIR, 'NETKILL_LEDGER.json');
try { fs.unlinkSync(ledgerPath); } catch {}

const chainEnv = { ...process.env, EXECUTOR_CHAIN_MINI: '1', VICTORY_TEST_MODE: '1' };
const chainRun = runBounded('npm run -s executor:run:chain', { cwd: ROOT, env: chainEnv, maxBuffer: 64 * 1024 * 1024, timeoutMs: 20000 });
const ledger = fs.existsSync(ledgerPath) ? JSON.parse(fs.readFileSync(ledgerPath, 'utf8')) : { records: [] };
const recs = Array.isArray(ledger.records) ? ledger.records : [];
const classifyVerify = (cmd) => /(npm run -s (verify:|gov:|p0:all|edge:profit:0[12]:|export:final-validated))/i.test(String(cmd || ''));
const verifyLike = recs.filter((r) => classifyVerify(r.cmd));
const nonVerifyLike = recs.filter((r) => !classifyVerify(r.cmd));
const verifyOk = verifyLike.every((r) => r.force_net_kill && r.env_treasure_net_kill && r.node_options_has_preload);
const nonVerifyOk = nonVerifyLike.every((r) => !r.force_net_kill);
const status = chainRun.ec === 0 && verifyLike.length > 0 && nonVerifyLike.length > 0 && verifyOk && nonVerifyOk ? 'PASS' : 'FAIL';
const reason_code = status === 'PASS' ? 'NONE' : 'RG_NET02';

writeMd(path.join(EXEC_DIR, 'REGRESSION_EXECUTOR_NETKILL_LEDGER_PROOF.md'), `# REGRESSION_EXECUTOR_NETKILL_LEDGER_PROOF.md\n\nSTATUS: ${status}\nREASON_CODE: ${reason_code}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${NEXT_ACTION}\n\n- chain_ec: ${chainRun.ec}\n- ledger_records: ${recs.length}\n- verify_records: ${verifyLike.length}\n- non_verify_records: ${nonVerifyLike.length}\n- verify_ok: ${verifyOk}\n- non_verify_ok: ${nonVerifyOk}\n`);
writeJsonDeterministic(path.join(MANUAL, 'regression_executor_netkill_ledger_proof.json'), {
  schema_version: '1.0.0', status, reason_code, run_id: RUN_ID, next_action: NEXT_ACTION,
  chain_ec: chainRun.ec, ledger_records: recs.length, verify_records: verifyLike.length, non_verify_records: nonVerifyLike.length,
  verify_ok: verifyOk, non_verify_ok: nonVerifyOk,
});
console.log(`[${status}] regression_executor_netkill_ledger_proof — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
