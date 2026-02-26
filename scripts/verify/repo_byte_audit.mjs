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

const ALLOWED_UNTRACKED = new Set(['reports/evidence/EXECUTOR/REPO_BYTE_AUDIT_SCOPE.json', 'reports/evidence/EXECUTOR/REPO_SHA256SUMS.txt']);
const EXCLUDE_EXACT = new Set(['reports/evidence/EXECUTOR/REPO_BYTE_AUDIT.md','reports/evidence/EXECUTOR/REPO_SHA256SUMS.txt','reports/evidence/EXECUTOR/REPO_BYTE_AUDIT_SCOPE.json','reports/evidence/EXECUTOR/gates/manual/repo_byte_audit.json']);

const EXCLUDE_PREFIXES = [
  'node_modules/',
  'artifacts/incoming/',
  'reports/evidence/EPOCH-',
  'reports/evidence/RG_EPOCH',
  '.git/',
  'tmp/',
  '.tmp/',
];

function excluded(rel) { return EXCLUDE_EXACT.has(rel) || EXCLUDE_PREFIXES.some((p) => rel.startsWith(p)); }
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


const untracked = spawnSync('git', ['ls-files', '--others', '--exclude-standard'], { encoding: 'utf8' }).stdout
  .split('\n').map((v) => v.trim()).filter(Boolean)
  .filter((f) => !excluded(f))
  .filter((f) => !ALLOWED_UNTRACKED.has(f));
if (untracked.length) {
  writeMd(path.join(EXEC, 'REPO_BYTE_AUDIT.md'), `# REPO_BYTE_AUDIT.md\n\nSTATUS: FAIL\nREASON_CODE: RG_BYTE_UNTRACKED\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: npm run -s verify:repo:byte-audit\n\n${untracked.map((f) => `- untracked: ${f}`).join('\n')}\n`);
  writeJsonDeterministic(path.join(MANUAL, 'repo_byte_audit.json'), { schema_version: '1.0.0', status: 'FAIL', reason_code: 'RG_BYTE_UNTRACKED', run_id: RUN_ID, untracked });
  console.log('[FAIL] repo_byte_audit — RG_BYTE_UNTRACKED');
  process.exit(1);
}

const files = walk(ROOT).sort((a, b) => a.localeCompare(b));
const lines = [];
for (const rel of files) {
  const h = crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT, rel))).digest('hex');
  lines.push(`${h}  ${rel}`);
}
const manifest = lines.join('\n') + '\n';
const manifestSha = crypto.createHash('sha256').update(manifest).digest('hex');

fs.writeFileSync(path.join(EXEC, 'REPO_SHA256SUMS.txt'), manifest);
writeJsonDeterministic(path.join(EXEC, 'REPO_BYTE_AUDIT_SCOPE.json'), { schema_version: '1.0.0', run_id: RUN_ID, excludes: EXCLUDE_PREFIXES, file_count: files.length, manifest_sha256: manifestSha });
writeMd(path.join(EXEC, 'REPO_BYTE_AUDIT.md'), `# REPO_BYTE_AUDIT.md\n\nSTATUS: PASS\nREASON_CODE: NONE\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: npm run -s verify:repo:byte-audit:x2\n\n- file_count: ${files.length}\n- manifest_sha256: ${manifestSha}\n`);
writeJsonDeterministic(path.join(MANUAL, 'repo_byte_audit.json'), { schema_version: '1.0.0', status: 'PASS', reason_code: 'NONE', run_id: RUN_ID, manifest_sha256: manifestSha, file_count: files.length });
console.log(`[PASS] repo_byte_audit manifest_sha256=${manifestSha}`);
