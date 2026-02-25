import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { runBounded } from '../executor/spawn_bounded.mjs';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = path.resolve(process.cwd());
const EXEC_DIR = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC_DIR, 'gates/manual');
const NEXT_ACTION = 'npm run -s verify:regression:evidence-bundle-portable-mode';
fs.mkdirSync(MANUAL, { recursive: true });

function tarSha() {
  const p = path.join(ROOT, 'artifacts/incoming/evidence_chain.tar.gz');
  if (!fs.existsSync(p)) return 'MISSING';
  return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
}

const env = { ...process.env, EVIDENCE_BUNDLE_PORTABLE: '1' };
const r1 = runBounded('npm run -s export:evidence-bundle', { cwd: ROOT, env, maxBuffer: 16 * 1024 * 1024 });
const h1 = r1.ec === 0 ? tarSha() : 'NA';
const r2 = runBounded('npm run -s export:evidence-bundle', { cwd: ROOT, env, maxBuffer: 16 * 1024 * 1024 });
const h2 = r2.ec === 0 ? tarSha() : 'NA';
const stable = r1.ec === 0 && r2.ec === 0 && h1 === h2;
const status = stable ? 'PASS' : 'FAIL';
const reason_code = stable ? 'NONE' : (r1.ec !== 0 || r2.ec !== 0 ? 'EC01' : 'ND01');
writeMd(path.join(EXEC_DIR, 'REGRESSION_EVIDENCE_BUNDLE_PORTABLE_MODE.md'), `# REGRESSION_EVIDENCE_BUNDLE_PORTABLE_MODE.md\n\nSTATUS: ${status}\nREASON_CODE: ${reason_code}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${NEXT_ACTION}\n\n- run1_ec: ${r1.ec}\n- run2_ec: ${r2.ec}\n- sha_run1: ${h1}\n- sha_run2: ${h2}\n- stable_match: ${stable}\n`);
writeJsonDeterministic(path.join(MANUAL, 'regression_evidence_bundle_portable_mode.json'), { schema_version:'1.0.0', status, reason_code, run_id:RUN_ID, next_action:NEXT_ACTION, run1_ec:r1.ec, run2_ec:r2.ec, sha_run1:h1, sha_run2:h2, stable_match:stable });
console.log(`[${status}] regression_evidence_bundle_portable_mode — ${reason_code}`);
process.exit(stable ? 0 : 1);
