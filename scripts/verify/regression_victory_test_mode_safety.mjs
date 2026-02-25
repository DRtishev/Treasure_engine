import fs from 'node:fs';
import path from 'node:path';
import { runBounded } from '../executor/spawn_bounded.mjs';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = path.resolve(process.cwd());
const EXEC_DIR = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC_DIR, 'gates/manual');
const NEXT_ACTION = 'npm run -s verify:regression:victory-test-mode-safety';
const marker = path.join(EXEC_DIR, 'TEST_MODE_ACTIVE.md');

const ciRun = runBounded('VICTORY_TEST_MODE=1 CI=true npm run -s epoch:victory:seal', {
  cwd: ROOT,
  env: process.env,
  maxBuffer: 64 * 1024 * 1024,
  timeoutMs: 30000,
});
const rgTest01 = ciRun.ec !== 0 && /RG_TEST01/.test(`${ciRun.stdout}\n${ciRun.stderr}`);

const localRun = runBounded('VICTORY_TEST_MODE=1 npm run -s epoch:victory:seal', {
  cwd: ROOT,
  env: process.env,
  maxBuffer: 64 * 1024 * 1024,
  timeoutMs: 30000,
});
const markerExists = fs.existsSync(marker);
let testModeFlag = 'MISSING';
const victorySeal = path.join(MANUAL, 'victory_seal.json');
if (fs.existsSync(victorySeal)) {
  try { testModeFlag = String(Boolean(JSON.parse(fs.readFileSync(victorySeal, 'utf8')).test_mode)); } catch { testModeFlag = 'INVALID'; }
}
const rgTest02 = localRun.ec !== 0 && /RG_TEST02/.test(`${localRun.stdout}\n${localRun.stderr}`);

const ok = rgTest01 && markerExists && testModeFlag === 'true' && !rgTest02;
const status = ok ? 'PASS' : 'FAIL';
const reason_code = ok ? 'NONE' : 'RG_TEST02';

writeMd(path.join(EXEC_DIR, 'REGRESSION_VICTORY_TEST_MODE_SAFETY.md'), `# REGRESSION_VICTORY_TEST_MODE_SAFETY.md\n\nSTATUS: ${status}\nREASON_CODE: ${reason_code}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${NEXT_ACTION}\n\n- ci_run_ec: ${ciRun.ec}\n- rg_test01_detected: ${rgTest01}\n- local_run_ec: ${localRun.ec}\n- marker_exists: ${markerExists}\n- victory_seal_test_mode_flag: ${testModeFlag}\n- rg_test02_detected: ${rgTest02}\n`);
writeJsonDeterministic(path.join(MANUAL, 'regression_victory_test_mode_safety.json'), {
  schema_version: '1.0.0', status, reason_code, run_id: RUN_ID, next_action: NEXT_ACTION,
  ci_run_ec: ciRun.ec, rg_test01_detected: rgTest01, local_run_ec: localRun.ec,
  marker_exists: markerExists, victory_seal_test_mode_flag: testModeFlag, rg_test02_detected: rgTest02,
});
console.log(`[${status}] regression_victory_test_mode_safety — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
