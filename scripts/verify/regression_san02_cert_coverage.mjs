/**
 * regression_san02_cert_coverage.mjs — RG_SAN02_CERT_COVERAGE
 *
 * Gate: Extends RG_SAN01 coverage to include edge scripts NOT in data_organ subdir.
 *       Specifically scans scripts/edge/edge_*.mjs — the offline replay scripts
 *       (edge_liq_01_offline_replay.mjs, edge_okx_orderbook_*.mjs, etc.)
 *       that must also be free of wallclock time and network APIs.
 *
 * SAN01 scope:  scripts/ops/*.mjs + scripts/edge/data_organ/*.mjs
 * SAN02 scope:  scripts/edge/edge_*.mjs (replay/preflight scripts)
 *
 * Allowlisted (double-key acquire — live network intentional):
 *   scripts/edge/edge_liq_00_acquire_*.mjs
 *
 * Forbidden time APIs (non-deterministic in CERT mode):
 *   Date.now()  new Date(  process.hrtime  performance.now()
 *
 * Forbidden net APIs (offline-by-default):
 *   fetch(  node:http  node:https  node:net  node:tls  node:dns
 *   WebSocket(  from 'ws'  undici  axios  node-fetch
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

const NEXT_ACTION = 'npm run -s verify:regression:san02-cert-coverage';

const EDGE_DIR = path.join(ROOT, 'scripts', 'edge');

// Allowlisted double-key acquire scripts (live network + wallclock intentional)
const ALLOWLIST = new Set([
  path.join(ROOT, 'scripts', 'edge', 'edge_liq_00_acquire_binance_forceorder_ws.mjs'),
  path.join(ROOT, 'scripts', 'edge', 'edge_liq_00_acquire_bybit_ws_v5.mjs'),
  path.join(ROOT, 'scripts', 'edge', 'edge_liq_00_acquire_okx_ws_v5.mjs'),
]);

const FORBIDDEN_TIME = [
  { re: /\bDate\.now\s*\(/, label: 'Date.now()' },
  { re: /\bnew\s+Date\s*\(/, label: 'new Date(' },
  { re: /\bprocess\.hrtime\b/, label: 'process.hrtime' },
  { re: /\bperformance\.now\s*\(/, label: 'performance.now()' },
];

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

function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .split('\n')
    .map((l) => {
      const idx = l.indexOf('//');
      return idx >= 0 ? l.slice(0, idx) : l;
    })
    .join('\n');
}

function collectEdgeFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile() && /^edge_.*\.mjs$/.test(e.name))
    .map((e) => path.join(dir, e.name))
    .sort();
}

const files = collectEdgeFiles(EDGE_DIR);
const checks = [];
const violations = [];

checks.push({
  check: 'edge_scripts_found',
  pass: files.length > 0,
  detail: `found ${files.length} edge_*.mjs files in scripts/edge/`,
});

for (const filePath of files) {
  if (ALLOWLIST.has(filePath)) {
    checks.push({
      check: `allowlisted_${path.basename(filePath)}`,
      pass: true,
      detail: `allowlisted (double-key acquire) — skip`,
    });
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

checks.push({
  check: 'total_violations_zero',
  pass: violations.length === 0,
  detail: violations.length === 0
    ? `0 forbidden API usages across scripts/edge/edge_*.mjs (excl. allowlist)`
    : `TOTAL: ${violations.length} violation(s) — ${violations.map((v) => v.file + ':' + v.label).join('; ')}`,
});

const failed = checks.filter((c) => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'SAN02_FORBIDDEN_API';

const timeViolations = violations.filter((v) => v.kind === 'TIME');
const netViolations = violations.filter((v) => v.kind === 'NET');

writeMd(path.join(EXEC, 'REGRESSION_SAN02.md'), [
  '# REGRESSION_SAN02.md', '',
  `STATUS: ${status}`,
  `REASON_CODE: ${reason_code}`,
  `RUN_ID: ${RUN_ID}`,
  `NEXT_ACTION: ${NEXT_ACTION}`, '',
  '## SCAN_SCOPE',
  '- scripts/edge/edge_*.mjs (edge replay/preflight scripts, extends SAN01)', '',
  '## ALLOWLIST',
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

writeJsonDeterministic(path.join(MANUAL, 'regression_san02.json'), {
  schema_version: '1.0.0',
  gate_id: 'RG_SAN02_CERT_COVERAGE',
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: NEXT_ACTION,
  scan_scope: 'scripts/edge/edge_*.mjs',
  allowlisted: [...ALLOWLIST].map((f) => path.relative(ROOT, f)),
  files_scanned: files.length,
  violations,
  time_violations_n: timeViolations.length,
  net_violations_n: netViolations.length,
  checks,
  failed_checks: failed.map((c) => c.check),
});

console.log(`[${status}] regression_san02_cert_coverage — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
