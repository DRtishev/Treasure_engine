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
  'reports/evidence/EXECUTOR/REGRESSION_REPO_BYTE_AUDIT_ANTI_RECURSION.md',
  'reports/evidence/EXECUTOR/REPO_BYTE_AUDIT_X2.md',
  'reports/evidence/EXECUTOR/gates/manual/repo_byte_audit.json',
  'reports/evidence/EXECUTOR/gates/manual/repo_byte_audit_x2.json',
  'reports/evidence/EXECUTOR/gates/manual/regression_repo_byte_audit_anti_recursion.json',
].sort((a, b) => a.localeCompare(b));
const OWN_OUTPUTS_SET = new Set(OWN_OUTPUTS);

const EXCLUDE_RULES = [
  { prefix: 'node_modules/', reason: 'VOLATILE_DEPENDENCY_TREE' },
  { prefix: 'reports/evidence/EPOCH-', reason: 'RUN_SCOPED_EPOCH_EVIDENCE' },
  { prefix: 'reports/evidence/EPOCH-NODEAUTH-', reason: 'RUN_SCOPED_NODEAUTH_EVIDENCE' },
  { prefix: 'reports/evidence/EXECUTOR/', reason: 'VOLATILE_EXECUTOR_EVIDENCE' },
  { prefix: 'reports/evidence/EDGE_PROFIT_00/', reason: 'VOLATILE_EDGE_PROFIT_EVIDENCE' },
  { prefix: 'reports/evidence/EDGE_PROFIT_00/stub/', reason: 'VOLATILE_STUB_EVIDENCE' },
  { prefix: 'reports/evidence/EDGE_PROFIT_00/sandbox/', reason: 'VOLATILE_SANDBOX_EVIDENCE' },
  { prefix: 'reports/evidence/EDGE_PROFIT_00/PROFILES_INDEX.md', reason: 'VOLATILE_PROFILE_INDEX' },
  { prefix: 'reports/evidence/EDGE_PROFIT_00/registry/', reason: 'VOLATILE_REGISTRY_EVIDENCE' },
  { prefix: 'reports/evidence/EXECUTOR/COMMANDS_RUN.md', reason: 'VOLATILE_COMMAND_LOG' },
  { prefix: 'reports/evidence/EXECUTOR/NETKILL_LEDGER.json', reason: 'VOLATILE_NETKILL_LEDGER' },
  { prefix: 'reports/evidence/EXECUTOR/NETKILL_LEDGER_SUMMARY.json', reason: 'VOLATILE_NETKILL_LEDGER' },
  { prefix: '.git/', reason: 'GIT_INTERNALS' },
  { prefix: 'tmp/', reason: 'TEMP_WORKSPACE' },
  { prefix: '.tmp/', reason: 'TEMP_WORKSPACE' },
  { prefix: 'artifacts/incoming/', reason: 'VOLATILE_INCOMING_ARTIFACTS' },
];

function normalizeRel(rel) {
  return String(rel || '').replace(/\\/g, '/').replace(/^\.\//, '');
}

function exclusionReason(rel) {
  const norm = normalizeRel(rel);
  if (OWN_OUTPUTS_SET.has(norm)) return 'SELF_OUTPUT';
  const matched = EXCLUDE_RULES.find((r) => norm.startsWith(r.prefix));
  return matched ? matched.reason : '';
}

function excluded(rel) {
  return Boolean(exclusionReason(rel));
}

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, e.name);
    const rel = normalizeRel(path.relative(ROOT, abs));
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
  const manifest = `${lines.join('\n')}\n`;
  const manifest_sha256 = crypto.createHash('sha256').update(manifest).digest('hex');
  return { files, manifest, manifest_sha256 };
}

function summarizeExcludedPaths() {
  return OWN_OUTPUTS.map((rel) => ({ path: rel, excluded_reason: 'SELF_OUTPUT' }));
}

const untracked = spawnSync('git', ['ls-files', '--others', '--exclude-standard'], { encoding: 'utf8' }).stdout
  .split('\n').map((v) => v.trim()).filter(Boolean)
  .map((f) => normalizeRel(f))
  .filter((f) => !excluded(f));

if (untracked.length) {
  writeMd(path.join(EXEC, 'REPO_BYTE_AUDIT.md'), `# REPO_BYTE_AUDIT.md\n\nSTATUS: FAIL\nREASON_CODE: RG_BYTE_UNTRACKED\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: npm run -s verify:repo:byte-audit\n\n${untracked.map((f) => `- untracked: ${f}`).join('\n')}\n`);
  writeJsonDeterministic(path.join(MANUAL, 'repo_byte_audit.json'), {
    schema_version: '1.1.0',
    status: 'FAIL',
    reason_code: 'RG_BYTE_UNTRACKED',
    run_id: RUN_ID,
    excluded_paths: summarizeExcludedPaths(),
    exclude_rules: EXCLUDE_RULES,
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
    schema_version: '1.1.0',
    status: 'FAIL',
    reason_code: 'RG_BYTE03',
    run_id: RUN_ID,
    excluded_paths: summarizeExcludedPaths(),
    exclude_rules: EXCLUDE_RULES,
    forbidden_hits,
  });
  console.log('[FAIL] repo_byte_audit — RG_BYTE03');
  process.exit(1);
}

fs.writeFileSync(path.join(EXEC, 'REPO_SHA256SUMS.txt'), manifest);
writeJsonDeterministic(path.join(EXEC, 'REPO_BYTE_AUDIT_SCOPE.json'), {
  schema_version: '1.1.0',
  run_id: RUN_ID,
  exclude_rules: EXCLUDE_RULES,
  excluded_paths: summarizeExcludedPaths(),
  file_count: files.length,
  forbidden_hits,
  manifest_sha256,
});
writeMd(path.join(EXEC, 'REPO_BYTE_AUDIT.md'), `# REPO_BYTE_AUDIT.md\n\nSTATUS: PASS\nREASON_CODE: NONE\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: npm run -s verify:repo:byte-audit:x2\n\n- file_count: ${files.length}\n- manifest_sha256: ${manifest_sha256}\n- forbidden_hits: ${forbidden_hits.length}\n`);
writeJsonDeterministic(path.join(MANUAL, 'repo_byte_audit.json'), {
  schema_version: '1.1.0',
  status: 'PASS',
  reason_code: 'NONE',
  run_id: RUN_ID,
  excluded_paths: summarizeExcludedPaths(),
  exclude_rules: EXCLUDE_RULES,
  file_count: files.length,
  forbidden_hits,
  manifest_sha256,
});
console.log(`[PASS] repo_byte_audit manifest_sha256=${manifest_sha256}`);
