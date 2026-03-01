/**
 * regression_san01_global_forbidden_apis.mjs — RG_SAN01_GLOBAL_FORBIDDEN_APIS
 *
 * Gate: CERT-backbone scripts must not use wallclock time APIs or network APIs.
 *
 * Scoped to CERT-backbone paths:
 *   scripts/ops/*.mjs  (EXCEPT node_toolchain_acquire.mjs — double-key network script)
 *   scripts/edge/data_organ/*.mjs
 *
 * Forbidden time APIs (non-deterministic in CERT mode):
 *   Date.now()  new Date(  process.hrtime  performance.now()
 *
 * Forbidden net APIs (offline-by-default):
 *   fetch(  node:http  node:https  node:net  node:tls  node:dns
 *   WebSocket(  from 'ws'  undici  axios  node-fetch
 *
 * Allowed exceptions (double-key acquire paths):
 *   scripts/ops/node_toolchain_acquire.mjs
 *
 * Surface: OFFLINE_AUTHORITY
 */

import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

const NEXT_ACTION = 'npm run -s verify:regression:san01-global-forbidden-apis';

// CERT-backbone scan dirs
const SCAN_PATHS = [
  { dir: path.join(ROOT, 'scripts', 'ops'), pattern: /\.mjs$/ },
  { dir: path.join(ROOT, 'scripts', 'edge', 'data_organ'), pattern: /\.mjs$/ },
];

// Files explicitly allowlisted (double-key acquire — network is intentional)
const ALLOWLIST = new Set([
  path.join(ROOT, 'scripts', 'ops', 'node_toolchain_acquire.mjs'),
]);

// Forbidden time API patterns
const FORBIDDEN_TIME = [
  { re: /\bDate\.now\s*\(/, label: 'Date.now()' },
  { re: /\bnew\s+Date\s*\(/, label: 'new Date(' },
  { re: /\bprocess\.hrtime\b/, label: 'process.hrtime' },
  { re: /\bperformance\.now\s*\(/, label: 'performance.now()' },
];

// Forbidden net API patterns
const FORBIDDEN_NET = [
  { re: /\bfetch\s*\(/, label: 'fetch(' },
  { re: /from\s+['"]node:http['"]/, label: 'node:http import' },
  { re: /from\s+['"]node:https['"]/, label: 'node:https import' },
  { re: /from\s+['"]node:net['"]/, label: 'node:net import' },
  { re: /from\s+['"]node:tls['"]/, label: 'node:tls import' },
  { re: /from\s+['"]node:dns['"]/, label: 'node:dns import' },
  { re: /\bnew\s+WebSocket\s*\(/, label: 'new WebSocket(' },
  { re: /from\s+['"]ws['"]/, label: "from 'ws' import" },
  { re: /from\s+['"]undici['"]/, label: "from 'undici' import" },
  { re: /from\s+['"]axios['"]/, label: "from 'axios' import" },
  { re: /from\s+['"]node-fetch['"]/, label: "from 'node-fetch' import" },
];

const ALL_FORBIDDEN = [
  ...FORBIDDEN_TIME.map((f) => ({ ...f, kind: 'TIME' })),
  ...FORBIDDEN_NET.map((f) => ({ ...f, kind: 'NET' })),
];

// Strip line comments (// ...) and block comments (/* ... */)
function stripComments(src) {
  // Remove block comments first, then line comments
  return src
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .split('\n')
    .map((l) => {
      const idx = l.indexOf('//');
      return idx >= 0 ? l.slice(0, idx) : l;
    })
    .join('\n');
}

function collectFiles(dir, pattern) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((f) => pattern.test(f))
    .map((f) => path.join(dir, f));
}

const checks = [];
const violations = [];

for (const { dir, pattern } of SCAN_PATHS) {
  const files = collectFiles(dir, pattern);
  for (const filePath of files.sort()) {
    if (ALLOWLIST.has(filePath)) {
      checks.push({ check: `allowlisted_${path.basename(filePath)}`, pass: true, detail: `allowlisted (double-key acquire) — skip` });
      continue;
    }

    const rel = path.relative(ROOT, filePath);
    const src = fs.readFileSync(filePath, 'utf8');
    const stripped = stripComments(src);
    const fileViolations = [];

    for (const { re, label, kind } of ALL_FORBIDDEN) {
      if (re.test(stripped)) {
        fileViolations.push({ label, kind });
        violations.push({ file: rel, label, kind });
      }
    }

    checks.push({
      check: `clean_${path.basename(filePath).replace(/\./g, '_')}`,
      pass: fileViolations.length === 0,
      detail: fileViolations.length === 0
        ? `${rel} — no forbidden APIs`
        : `VIOLATION in ${rel}: ${fileViolations.map((v) => `${v.kind}:${v.label}`).join(', ')}`,
    });
  }
}

// Summary check
checks.push({
  check: 'total_violations_zero',
  pass: violations.length === 0,
  detail: violations.length === 0
    ? `0 forbidden API usages across CERT-backbone`
    : `TOTAL: ${violations.length} violation(s) — ${violations.map((v) => v.file + ':' + v.label).join('; ')}`,
});

const failed = checks.filter((c) => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'SAN01_FORBIDDEN_API';

const timeViolations = violations.filter((v) => v.kind === 'TIME');
const netViolations = violations.filter((v) => v.kind === 'NET');

writeMd(path.join(EXEC, 'REGRESSION_SAN01.md'), [
  '# REGRESSION_SAN01.md', '',
  `STATUS: ${status}`,
  `REASON_CODE: ${reason_code}`,
  `RUN_ID: ${RUN_ID}`,
  `NEXT_ACTION: ${NEXT_ACTION}`, '',
  '## SCAN_SCOPE',
  SCAN_PATHS.map((p) => `- ${path.relative(ROOT, p.dir)}/*.mjs`).join('\n'), '',
  `## ALLOWLIST`,
  [...ALLOWLIST].map((f) => `- ${path.relative(ROOT, f)} (double-key acquire)`).join('\n'), '',
  '## FORBIDDEN_TIME_APIS',
  FORBIDDEN_TIME.map((f) => `- \`${f.label}\``).join('\n'), '',
  '## FORBIDDEN_NET_APIS',
  FORBIDDEN_NET.map((f) => `- \`${f.label}\``).join('\n'), '',
  '## VIOLATIONS',
  `time_violations_n: ${timeViolations.length}`,
  `net_violations_n: ${netViolations.length}`,
  violations.length === 0
    ? '- NONE'
    : violations.map((v) => `- [${v.kind}] ${v.file}: ${v.label}`).join('\n'), '',
  '## CHECKS',
  checks.map((c) => `- [${c.pass ? 'PASS' : 'FAIL'}] ${c.check}: ${c.detail}`).join('\n'), '',
  '## FAILED',
  failed.length === 0 ? '- NONE' : failed.map((c) => `- ${c.check}: ${c.detail}`).join('\n'),
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'regression_san01.json'), {
  schema_version: '1.0.0',
  gate_id: 'RG_SAN01_GLOBAL_FORBIDDEN_APIS',
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: NEXT_ACTION,
  scan_paths: SCAN_PATHS.map((p) => path.relative(ROOT, p.dir)),
  allowlisted: [...ALLOWLIST].map((f) => path.relative(ROOT, f)),
  violations,
  time_violations_n: timeViolations.length,
  net_violations_n: netViolations.length,
  checks,
  failed_checks: failed.map((c) => c.check),
});

console.log(`[${status}] regression_san01_global_forbidden_apis — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
