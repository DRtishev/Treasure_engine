import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = path.resolve(process.cwd());
const EXEC_DIR = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC_DIR, 'gates/manual');
const NEXT_ACTION = 'npm run -s export:evidence-bundle:portable';
const manifest = path.join(ROOT, 'reports/evidence/EPOCH-EDGE-RC-STRICT-01/artifacts/FINAL_VALIDATED.filelist.txt');
const checks = { manifest_exists: fs.existsSync(manifest), env_free: false, host_free: false, home_free: false };
let bad = [];
if (checks.manifest_exists) {
  const txt = fs.readFileSync(manifest, 'utf8');
  const lines = txt.split(/\r?\n/).filter(Boolean);
  bad = lines.filter((l) => /(\b[A-Z_]+=[^\s]+)|\/home\/|^[A-Za-z]:\\\\|\/Users\/|localhost|127\.0\.0\.1/.test(l));
  checks.env_free = !/(\b[A-Z_]+=[^\s]+)/.test(txt);
  checks.host_free = !/(localhost|127\.0\.0\.1)/.test(txt);
  checks.home_free = !(/\/home\/|\/Users\//.test(txt));
}
const ok = checks.manifest_exists && checks.env_free && checks.host_free && checks.home_free;
const status = ok ? 'PASS' : 'FAIL';
const reason_code = ok ? 'NONE' : 'RG_BDL02';
writeMd(path.join(EXEC_DIR, 'REGRESSION_PORTABLE_MANIFEST_ENV_BYTE_FREE_STRICT.md'), `# REGRESSION_PORTABLE_MANIFEST_ENV_BYTE_FREE_STRICT.md\n\nSTATUS: ${status}\nREASON_CODE: ${reason_code}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${NEXT_ACTION}\n\n${Object.entries(checks).map(([k,v])=>`- ${k}: ${v}`).join('\n')}\n- bad_lines: ${bad.length}\n`);
writeJsonDeterministic(path.join(MANUAL, 'regression_portable_manifest_env_byte_free_strict.json'), { schema_version:'1.0.0', status, reason_code, run_id:RUN_ID, next_action:NEXT_ACTION, checks, bad_lines: bad.slice(0, 50) });
console.log(`[${status}] regression_portable_manifest_env_byte_free_strict — ${reason_code}`);
process.exit(ok ? 0 : 1);
