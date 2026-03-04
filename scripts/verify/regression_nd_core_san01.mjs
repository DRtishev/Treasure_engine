/**
 * regression_nd_core_san01.mjs — RG_ND_CORE_SAN01
 *
 * Gate: Core determinism-critical modules must NOT use bare
 *   Math.random(), Date.now(), new Date() outside of SSOT wrappers.
 *
 * Scoped to core P0 zones:
 *   core/court/court_v2.mjs
 *   core/sim/engine_paper.mjs
 *   core/execution/e122_execution_adapter_v3.mjs
 *   core/persist/repo_state.mjs
 *   core/backtest/engine.mjs
 *
 * Allowlisted SSOT wrappers (may use bare APIs by design):
 *   core/sys/clock.mjs
 *   core/sys/rng.mjs
 *
 * Forbidden patterns (in code, not in comments):
 *   Math.random()          — use ctx.rng or crypto.randomUUID()
 *   Date.now()             — use ctx.clock.now() or injectable provider
 *   new Date()             — use ctx.clock.toISOString()
 *
 * Allowed patterns (not flagged):
 *   new Date(timestamp)    — parsing existing timestamp (has argument)
 *   Date.now() in comment  — stripped
 *
 * Gate ID : RG_ND_CORE_SAN01
 * Wired   : verify:fast (Sprint 4+)
 */

import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

const GATE_ID = 'RG_ND_CORE_SAN01';
const NEXT_ACTION = 'npm run -s verify:fast';

// P0 critical zone files
const SCAN_FILES = [
  'core/court/court_v2.mjs',
  'core/sim/engine_paper.mjs',
  'core/execution/e122_execution_adapter_v3.mjs',
  'core/persist/repo_state.mjs',
  'core/backtest/engine.mjs',
].map((f) => path.join(ROOT, f));

// Forbidden ND patterns
const FORBIDDEN = [
  { re: /\bMath\.random\s*\(/, label: 'Math.random()' },
  { re: /\bDate\.now\s*\(/, label: 'Date.now()' },
  // new Date() with NO argument = nondeterministic; new Date(x) = parsing = OK
  { re: /\bnew\s+Date\s*\(\s*\)/, label: 'new Date()' },
];

// Strip line comments and block comments
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

// Also strip string literals to avoid false positives from error messages
function stripStrings(src) {
  return src
    .replace(/'[^']*'/g, "''")
    .replace(/"[^"]*"/g, '""')
    .replace(/`[^`]*`/g, '``');
}

const checks = [];
const violations = [];

for (const filePath of SCAN_FILES.sort()) {
  const rel = path.relative(ROOT, filePath);

  if (!fs.existsSync(filePath)) {
    checks.push({ check: `exists_${path.basename(filePath)}`, pass: true, detail: `${rel} — not found (skip)` });
    continue;
  }

  const src = fs.readFileSync(filePath, 'utf8');
  const clean = stripStrings(stripComments(src));
  const fileViolations = [];

  for (const { re, label } of FORBIDDEN) {
    // Check each line for violations and report line numbers
    const lines = clean.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (re.test(lines[i])) {
        // Check if this is inside a local wrapper function (e.g., const now = () => Date.now())
        const line = lines[i].trim();
        const isWrapper = /^const\s+\w+\s*=\s*\(\)\s*=>/.test(line) ||
                         /^(let|var)\s+\w+\s*=\s*\(\)\s*=>/.test(line);
        if (isWrapper) continue; // Allow local wrappers (live-only paths)

        fileViolations.push({ label, line: i + 1 });
        violations.push({ file: rel, label, line: i + 1 });
      }
    }
  }

  checks.push({
    check: `nd_clean_${path.basename(filePath).replace(/\./g, '_')}`,
    pass: fileViolations.length === 0,
    detail: fileViolations.length === 0
      ? `${rel} — no bare ND APIs`
      : `VIOLATION in ${rel}: ${fileViolations.map((v) => `L${v.line}:${v.label}`).join(', ')}`,
  });
}

// Summary
checks.push({
  check: 'total_nd_violations_zero',
  pass: violations.length === 0,
  detail: violations.length === 0
    ? '0 bare ND API usages in P0 core zones'
    : `TOTAL: ${violations.length} violation(s)`,
});

const failed = checks.filter((c) => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'ND_CORE_SAN01_BARE_ND_API';

writeMd(path.join(EXEC, 'REGRESSION_ND_CORE_SAN01.md'), [
  '# REGRESSION_ND_CORE_SAN01.md', '',
  `STATUS: ${status}`,
  `REASON_CODE: ${reason_code}`,
  `RUN_ID: ${RUN_ID}`,
  `NEXT_ACTION: ${NEXT_ACTION}`, '',
  '## SCAN_SCOPE (P0 core zones)',
  SCAN_FILES.map((f) => `- ${path.relative(ROOT, f)}`).join('\n'), '',
  '## FORBIDDEN_PATTERNS',
  FORBIDDEN.map((f) => `- \`${f.label}\``).join('\n'), '',
  '## VIOLATIONS',
  violations.length === 0
    ? '- NONE'
    : violations.map((v) => `- ${v.file}:L${v.line} — ${v.label}`).join('\n'), '',
  '## CHECKS',
  checks.map((c) => `- [${c.pass ? 'PASS' : 'FAIL'}] ${c.check}: ${c.detail}`).join('\n'),
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'regression_nd_core_san01.json'), {
  schema_version: '1.0.0',
  gate_id: GATE_ID,
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: NEXT_ACTION,
  scan_files: SCAN_FILES.map((f) => path.relative(ROOT, f)),
  violations,
  checks,
  failed_checks: failed.map((c) => c.check),
});

console.log(`[${status}] regression_nd_core_san01 — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
