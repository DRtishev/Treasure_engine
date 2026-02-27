import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

function runAudit() {
  const r = spawnSync(process.execPath, ['scripts/verify/repo_byte_audit.mjs'], { cwd: ROOT, encoding: 'utf8' });
  const scope = JSON.parse(fs.readFileSync(path.join(EXEC, 'REPO_BYTE_AUDIT_SCOPE.json'), 'utf8'));
  return { ec: r.status ?? 1, scope };
}

const a = runAudit();
const b = runAudit();
const stable = a.ec === 0 && b.ec === 0 && a.scope.manifest_sha256 === b.scope.manifest_sha256;
const hasExcludedPaths = Array.isArray(a.scope.excluded_paths) && a.scope.excluded_paths.length >= 6;
const ok = stable && hasExcludedPaths;
const status = ok ? 'PASS' : 'FAIL';
const reason_code = ok ? 'NONE' : 'ND_BYTE01';

writeMd(path.join(EXEC, 'REGRESSION_REPO_BYTE_AUDIT_ANTI_RECURSION.md'), `# REGRESSION_REPO_BYTE_AUDIT_ANTI_RECURSION.md\n\nSTATUS: ${status}\nREASON_CODE: ${reason_code}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: npm run -s verify:regression:repo-byte-audit-anti-recursion\n\n- run_a_ec: ${a.ec}\n- run_b_ec: ${b.ec}\n- run_a_manifest_sha256: ${a.scope.manifest_sha256}\n- run_b_manifest_sha256: ${b.scope.manifest_sha256}\n- excluded_paths_n: ${Array.isArray(a.scope.excluded_paths) ? a.scope.excluded_paths.length : 0}\n`);
writeJsonDeterministic(path.join(MANUAL, 'regression_repo_byte_audit_anti_recursion.json'), {
  schema_version: '1.0.0', status, reason_code, run_id: RUN_ID,
  run_a_ec: a.ec, run_b_ec: b.ec,
  run_a_manifest_sha256: a.scope.manifest_sha256,
  run_b_manifest_sha256: b.scope.manifest_sha256,
  excluded_paths: a.scope.excluded_paths,
});
console.log(`[${status}] regression_repo_byte_audit_anti_recursion — ${reason_code}`);
process.exit(ok ? 0 : 1);
