/**
 * regression_policy02_mode_truth.mjs — RG_POLICY02
 *
 * Scans RESEARCH_NET zone for mode:'CERT' — locked regression for Mine A.
 * Gate ID: RG_POLICY02 · Wired: verify:doctor:policy
 */

import fs from 'node:fs';
import path from 'node:path';
import { globSync } from 'node:fs';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';
import { loadKernel } from '../gov/policy_engine.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

const GATE_ID = 'RG_POLICY02';
const NEXT_ACTION = 'npm run -s verify:doctor:policy';
const violations = [];

try {
  const zone = loadKernel().zone_map.RESEARCH_NET;
  if (!zone) { violations.push({ path: 'policy_kernel', detail: 'RESEARCH_NET zone missing' }); }
  else {
    const files = new Set();
    for (const g of zone.include_globs || []) for (const f of globSync(g, { cwd: ROOT })) files.add(f);
    for (const relPath of [...files].sort()) {
      if (!fs.existsSync(path.join(ROOT, relPath))) continue;
      const lines = fs.readFileSync(path.join(ROOT, relPath), 'utf8').split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (/^\s*\/\//.test(lines[i]) || /^\s*\*/.test(lines[i])) continue;
        if (/mode:\s*['"]CERT['"]/.test(lines[i]))
          violations.push({ path: `${relPath}:${i + 1}`, detail: `mode:'CERT' in RESEARCH_NET zone` });
      }
    }
  }
} catch (e) { violations.push({ path: 'policy_engine', detail: e.message }); }

const status = violations.length === 0 ? 'PASS' : 'FAIL';
const reason_code = violations.length === 0 ? 'NONE' : 'RG_POLICY02_VIOLATION';

writeMd(path.join(EXEC, 'REGRESSION_POLICY02.md'), [
  '# REGRESSION_POLICY02.md — Mode truth', '',
  `STATUS: ${status}`, `REASON_CODE: ${reason_code}`, `RUN_ID: ${RUN_ID}`,
  `NEXT_ACTION: ${NEXT_ACTION}`, `VIOLATIONS: ${violations.length}`, '',
  '## VIOLATIONS', violations.length === 0 ? '- NONE' : violations.map((v) => `- ${v.path}: ${v.detail}`).join('\n'),
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'regression_policy02_mode_truth.json'), {
  schema_version: '1.0.0', gate_id: GATE_ID, status, reason_code, run_id: RUN_ID, next_action: NEXT_ACTION, violations,
});

console.log(`[${status}] regression_policy02_mode_truth — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
