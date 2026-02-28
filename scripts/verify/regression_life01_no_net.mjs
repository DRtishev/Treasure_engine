/**
 * regression_life01_no_net.mjs — RG_LIFE01_NO_NET
 *
 * Gate: life.mjs must not use network (no fetch, http, https, enable-network flag).
 *       All 6 steps run offline. Life output must not reference network APIs.
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

const NEXT_ACTION = 'npm run -s verify:fast';
const LIFE_SCRIPT = path.join(ROOT, 'scripts', 'ops', 'life.mjs');

const checks = [];

const scriptExists = fs.existsSync(LIFE_SCRIPT);
checks.push({ check: 'life_script_exists', pass: scriptExists, detail: LIFE_SCRIPT });

if (scriptExists) {
  const content = fs.readFileSync(LIFE_SCRIPT, 'utf8');
  const nonComment = content.split('\n').filter((l) => {
    const t = l.trim();
    return !t.startsWith('//') && !t.startsWith('*');
  }).join('\n');

  // Check: no fetch()
  const hasFetch = nonComment.includes('fetch(') || nonComment.includes('global.fetch');
  checks.push({ check: 'no_fetch_call', pass: !hasFetch, detail: hasFetch ? 'FORBIDDEN: fetch() in life.mjs' : 'no fetch — OK' });

  // Check: no http/https require
  const hasHttp = nonComment.includes("require('http')") || nonComment.includes("require('https')")
    || nonComment.includes('node:http') || nonComment.includes('node:https');
  checks.push({ check: 'no_http_https_import', pass: !hasHttp, detail: hasHttp ? 'FORBIDDEN: http/https in life.mjs' : 'no http/https — OK' });

  // Check: no --enable-network flag passed to sub-scripts
  const hasEnableNetwork = nonComment.includes('--enable-network') || nonComment.includes('ALLOW_NETWORK');
  checks.push({ check: 'no_enable_network_flag', pass: !hasEnableNetwork, detail: hasEnableNetwork ? 'FORBIDDEN: --enable-network in life.mjs' : 'no enable-network — OK' });

  // Check: no XMLHttpRequest
  const hasXHR = nonComment.includes('XMLHttpRequest') || nonComment.includes('axios');
  checks.push({ check: 'no_xhr_or_axios', pass: !hasXHR, detail: hasXHR ? 'FORBIDDEN: XHR/axios in life.mjs' : 'no XHR — OK' });

  // Check: imports are all node: builtins or local scripts
  const importLines = content.split('\n').filter((l) => l.trim().startsWith('import'));
  const badImports = importLines.filter((l) => {
    return !l.includes('node:') && !l.includes('./') && !l.includes('../') && l.includes('from ');
  });
  checks.push({
    check: 'only_local_and_builtin_imports',
    pass: badImports.length === 0,
    detail: badImports.length === 0 ? 'all imports are local/builtin' : `external imports: ${badImports.join('; ')}`,
  });

  // Check: no networking in step commands (steps don't pass --enable-network)
  const hasNetworkStep = nonComment.includes("'--enable-network'") || nonComment.includes('"--enable-network"');
  checks.push({ check: 'steps_no_network_flag', pass: !hasNetworkStep, detail: hasNetworkStep ? 'FORBIDDEN: --enable-network in steps' : 'steps are offline — OK' });

  // Check: LIFE_SUMMARY.json must exist from a previous run (proves life ran)
  const lifeDirs = fs.existsSync(path.join(ROOT, 'reports', 'evidence'))
    ? fs.readdirSync(path.join(ROOT, 'reports', 'evidence')).filter((d) => d.startsWith('EPOCH-LIFE-')).sort()
    : [];
  const latestLife = lifeDirs.length > 0 ? lifeDirs[lifeDirs.length - 1] : null;
  const lifeSummaryPath = latestLife ? path.join(ROOT, 'reports', 'evidence', latestLife, 'LIFE_SUMMARY.json') : null;
  const lifeSummaryExists = lifeSummaryPath ? fs.existsSync(lifeSummaryPath) : false;
  checks.push({
    check: 'life_summary_json_exists',
    pass: lifeSummaryExists,
    detail: lifeSummaryExists ? path.relative(ROOT, lifeSummaryPath) : 'No LIFE_SUMMARY.json found — run ops:life first',
  });

  if (lifeSummaryExists) {
    const summary = JSON.parse(fs.readFileSync(lifeSummaryPath, 'utf8'));
    // Check: life ran 6 steps total (not fewer)
    checks.push({
      check: 'life_ran_6_steps',
      pass: (summary.steps_total ?? 0) >= 6,
      detail: `steps_total=${summary.steps_total}`,
    });
  }
}

const failed = checks.filter((c) => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'LIFE01_NETWORK_USAGE_DETECTED';

writeMd(path.join(EXEC, 'REGRESSION_LIFE01_NO_NET.md'), [
  '# REGRESSION_LIFE01_NO_NET.md', '',
  `STATUS: ${status}`, `REASON_CODE: ${reason_code}`, `RUN_ID: ${RUN_ID}`, `NEXT_ACTION: ${NEXT_ACTION}`, '',
  '## CHECKS', checks.map((c) => `- [${c.pass ? 'PASS' : 'FAIL'}] ${c.check}: ${c.detail}`).join('\n'), '',
  '## FAILED', failed.length === 0 ? '- NONE' : failed.map((c) => `- ${c.check}: ${c.detail}`).join('\n'),
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'regression_life01_no_net.json'), {
  schema_version: '1.0.0',
  gate_id: 'RG_LIFE01_NO_NET',
  status, reason_code, run_id: RUN_ID, next_action: NEXT_ACTION,
  checks, failed_checks: failed.map((c) => c.check),
});

console.log(`[${status}] regression_life01_no_net — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
