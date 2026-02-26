import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

const OWN_OUTPUTS = [
  'reports/evidence/EXECUTOR/REPO_BYTE_AUDIT.md',
  'reports/evidence/EXECUTOR/REPO_SHA256SUMS.txt',
  'reports/evidence/EXECUTOR/REPO_BYTE_AUDIT_SCOPE.json',
  'reports/evidence/EXECUTOR/gates/manual/repo_byte_audit.json',
  'reports/evidence/EXECUTOR/REGRESSION_REPO_BYTE_AUDIT_ANTI_RECURSION.md',
  'reports/evidence/EXECUTOR/gates/manual/regression_repo_byte_audit_anti_recursion.json',
].sort((a, b) => a.localeCompare(b));
const OWN_OUTPUTS_SET = new Set(OWN_OUTPUTS);
const EXCLUDE_PREFIXES = [
  'node_modules/',
  'artifacts/incoming/',
  'reports/evidence/EPOCH-',
  '.git/',
  'tmp/',
  '.tmp/',
];

function excluded(rel) {
  return OWN_OUTPUTS_SET.has(rel) || EXCLUDE_PREFIXES.some((p) => rel.startsWith(p));
}

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, e.name);
    const rel = path.relative(ROOT, abs).replace(/\\/g, '/');
    if (!rel || excluded(rel)) continue;
    if (e.isDirectory()) walk(abs, out);
    else if (e.isFile()) out.push(rel);
  }
  return out;
}

function computeManifest() {
  const files = walk(ROOT).sort((a, b) => a.localeCompare(b));
  const lines = [];
  for (const rel of files) {
    const h = crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT, rel))).digest('hex');
    lines.push(`${h}  ${rel}`);
  }
  const manifest = lines.join('\n') + '\n';
  const manifest_sha256 = crypto.createHash('sha256').update(manifest).digest('hex');
  return { files, manifest, manifest_sha256 };
}

const untracked = spawnSync('git', ['ls-files', '--others', '--exclude-standard'], { encoding: 'utf8' }).stdout
  .split('\n').map((v) => v.trim()).filter(Boolean)
  .filter((f) => !excluded(f));

if (untracked.length) {
  writeMd(path.join(EXEC, 'REPO_BYTE_AUDIT.md'), `# REPO_BYTE_AUDIT.md\n\nSTATUS: FAIL\nREASON_CODE: RG_BYTE_UNTRACKED\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: npm run -s verify:repo:byte-audit\n\n${untracked.map((f) => `- untracked: ${f}`).join('\n')}\n`);
  writeJsonDeterministic(path.join(MANUAL, 'repo_byte_audit.json'), {
    schema_version: '1.0.0',
    status: 'FAIL',
    reason_code: 'RG_BYTE_UNTRACKED',
    run_id: RUN_ID,
    excluded_paths: OWN_OUTPUTS,
    untracked,
  });
  console.log('[FAIL] repo_byte_audit — RG_BYTE_UNTRACKED');
  process.exit(1);
}

const { files, manifest, manifest_sha256 } = computeManifest();
const forbidden_hits = files.filter((f) => OWN_OUTPUTS_SET.has(f));
if (forbidden_hits.length) {
  writeMd(path.join(EXEC, 'REPO_BYTE_AUDIT.md'), `# REPO_BYTE_AUDIT.md\n\nSTATUS: FAIL\nREASON_CODE: RG_BYTE03\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: npm run -s verify:repo:byte-audit\n\n${forbidden_hits.map((f) => `- forbidden_hit: ${f}`).join('\n')}\n`);
  writeJsonDeterministic(path.join(MANUAL, 'repo_byte_audit.json'), {
    schema_version: '1.0.0', status: 'FAIL', reason_code: 'RG_BYTE03', run_id: RUN_ID,
    excluded_paths: OWN_OUTPUTS, forbidden_hits,
  });
  console.log('[FAIL] repo_byte_audit — RG_BYTE03');
  process.exit(1);
}

fs.writeFileSync(path.join(EXEC, 'REPO_SHA256SUMS.txt'), manifest);
writeJsonDeterministic(path.join(EXEC, 'REPO_BYTE_AUDIT_SCOPE.json'), {
  schema_version: '1.0.0',
  run_id: RUN_ID,
  excludes_prefixes: EXCLUDE_PREFIXES,
  excluded_paths: OWN_OUTPUTS,
  file_count: files.length,
  forbidden_hits,
  manifest_sha256,
});
writeMd(path.join(EXEC, 'REPO_BYTE_AUDIT.md'), `# REPO_BYTE_AUDIT.md\n\nSTATUS: PASS\nREASON_CODE: NONE\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: npm run -s verify:repo:byte-audit:x2\n\n- file_count: ${files.length}\n- manifest_sha256: ${manifest_sha256}\n- forbidden_hits: ${forbidden_hits.length}\n`);
writeJsonDeterministic(path.join(MANUAL, 'repo_byte_audit.json'), {
  schema_version: '1.0.0',
  status: 'PASS',
  reason_code: 'NONE',
  run_id: RUN_ID,
  excluded_paths: OWN_OUTPUTS,
  file_count: files.length,
  forbidden_hits,
  manifest_sha256,
});
console.log(`[PASS] repo_byte_audit manifest_sha256=${manifest_sha256}`);
