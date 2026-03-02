/**
 * san_research_net.mjs — SAN RESEARCH_NET zone scanner
 *
 * Scans RESEARCH_NET zone for mode:'CERT' emissions — semantic lie detector.
 * Gate ID: RG_SANZ02 · Wired: verify:doctor:policy
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

const GATE_ID = 'RG_SANZ02';
const NEXT_ACTION = 'npm run -s verify:doctor:policy';
const zone = loadKernel().zone_map.RESEARCH_NET;

const files = new Set();
for (const g of zone.include_globs || []) for (const f of globSync(g, { cwd: ROOT })) files.add(f);

const violations = [];
const scanned = [...files].sort();

for (const relPath of scanned) {
  const full = path.join(ROOT, relPath);
  if (!fs.existsSync(full)) continue;
  const lines = fs.readFileSync(full, 'utf8').split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*\/\//.test(line) || /^\s*\*/.test(line)) continue;
    if (/mode:\s*['"]CERT['"]/.test(line))
      violations.push({ path: `${relPath}:${i + 1}`, detail: `mode:'CERT' in RESEARCH_NET zone` });
  }
}

const status = violations.length === 0 ? 'PASS' : 'FAIL';
const reason_code = violations.length === 0 ? 'NONE' : 'RG_SANZ02_VIOLATION';

writeMd(path.join(EXEC, 'SAN_RESEARCH_NET.md'), [
  '# SAN_RESEARCH_NET.md — Mode truth scan', '',
  `STATUS: ${status}`, `REASON_CODE: ${reason_code}`, `RUN_ID: ${RUN_ID}`,
  `NEXT_ACTION: ${NEXT_ACTION}`, `FILES_SCANNED: ${scanned.length}`, `VIOLATIONS: ${violations.length}`, '',
  '## VIOLATIONS', violations.length === 0 ? '- NONE' : violations.map((v) => `- ${v.path}: ${v.detail}`).join('\n'),
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'san_research_net.json'), {
  schema_version: '1.0.0', gate_id: GATE_ID, status, reason_code,
  run_id: RUN_ID, next_action: NEXT_ACTION, files_scanned: scanned.length, violations,
});

console.log(`[${status}] san_research_net — ${reason_code} (scanned ${scanned.length} files)`);
if (violations.length > 0) for (const v of violations.slice(0, 10)) console.log(`  ${v.path}: ${v.detail}`);
process.exit(status === 'PASS' ? 0 : 1);
