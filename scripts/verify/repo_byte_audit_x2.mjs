import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

function parseManifestLines(text) {
  return String(text || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
}

function diffLines(a, b) {
  const setA = new Set(a);
  const setB = new Set(b);
  return [...new Set([...a.filter((x) => !setB.has(x)), ...b.filter((x) => !setA.has(x))])]
    .sort((x, y) => x.localeCompare(y));
}

function run() {
  const r = spawnSync(process.execPath, ['scripts/verify/repo_byte_audit.mjs'], { cwd: ROOT, encoding: 'utf8' });
  if (r.status !== 0) return { ec: r.status || 1, manifest_sha256: '', manifest_lines: [] };
  const scope = JSON.parse(fs.readFileSync(path.join(EXEC, 'REPO_BYTE_AUDIT_SCOPE.json'), 'utf8'));
  const manifestText = fs.readFileSync(path.join(EXEC, 'REPO_SHA256SUMS.txt'), 'utf8');
  return {
    ec: 0,
    manifest_sha256: String(scope.manifest_sha256 || ''),
    manifest_lines: parseManifestLines(manifestText),
  };
}

const run1 = run();
const run2 = run();
const manifest_diff_paths = [...new Set(diffLines(run1.manifest_lines, run2.manifest_lines)
  .map((line) => line.replace(/^[0-9a-f]{64}\s{2}/, '')))]
  .sort((a, b) => a.localeCompare(b));

const stable = run1.ec === 0 && run2.ec === 0 && run1.manifest_sha256 === run2.manifest_sha256;
const status = stable ? 'PASS' : 'FAIL';
const reason_code = stable ? 'NONE' : 'ND_BYTE01';

writeMd(path.join(EXEC, 'REPO_BYTE_AUDIT_X2.md'), `# REPO_BYTE_AUDIT_X2.md\n\nSTATUS: ${status}\nREASON_CODE: ${reason_code}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: npm run -s verify:repo:byte-audit:x2\n\n- run1_ec: ${run1.ec}\n- run2_ec: ${run2.ec}\n- manifest_sha256_run1: ${run1.manifest_sha256 || 'MISSING'}\n- manifest_sha256_run2: ${run2.manifest_sha256 || 'MISSING'}\n- manifest_diff_paths_n: ${manifest_diff_paths.length}\n\n## MANIFEST_DIFF_PATHS\n${manifest_diff_paths.map((p) => `- ${p}`).join('\n') || '- NONE'}\n`);

writeJsonDeterministic(path.join(MANUAL, 'repo_byte_audit_x2.json'), {
  schema_version: '1.0.0',
  status,
  reason_code,
  run_id: RUN_ID,
  run1_ec: run1.ec,
  run2_ec: run2.ec,
  manifest_sha256_run1: run1.manifest_sha256 || null,
  manifest_sha256_run2: run2.manifest_sha256 || null,
  manifest_diff_paths,
});

if (!stable) {
  console.error(`[FAIL] ND_BYTE01 manifest drift x2 a=${run1.manifest_sha256} b=${run2.manifest_sha256}`);
  process.exit(1);
}
console.log('[PASS] RG_ND_BYTE02 repo manifest stable x2');
