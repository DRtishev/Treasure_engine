/**
 * san_cert_offline.mjs — SAN CERT_OFFLINE zone scanner
 *
 * Scans CERT_OFFLINE zone from policy_kernel.json for forbidden network imports.
 * Gate ID: RG_SANZ01 · Wired: verify:doctor:policy
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

const GATE_ID = 'RG_SANZ01';
const NEXT_ACTION = 'npm run -s verify:doctor:policy';

const kernel = loadKernel();
const zone = kernel.zone_map.CERT_OFFLINE;
const forbiddenImports = zone.forbidden_imports || [];
const forbiddenRequires = zone.forbidden_requires || [];

const includeFiles = new Set();
for (const g of zone.include_globs || []) for (const f of globSync(g, { cwd: ROOT })) includeFiles.add(f);
for (const g of zone.exclude_globs || []) for (const f of globSync(g, { cwd: ROOT })) includeFiles.delete(f);

const violations = [];
const scanned = [...includeFiles].sort();

for (const relPath of scanned) {
  const full = path.join(ROOT, relPath);
  if (!fs.existsSync(full)) continue;
  const lines = fs.readFileSync(full, 'utf8').split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*\/\//.test(line) || /^\s*\*/.test(line)) continue;
    // Only match actual import statements (line starts with import)
    if (/^\s*import\b/.test(line)) {
      for (const mod of forbiddenImports) {
        if (new RegExp(`from\\s+['"]${mod}['"]`).test(line))
          violations.push({ path: `${relPath}:${i + 1}`, detail: `forbidden import: ${mod}` });
      }
    }
    // Only match actual require() calls — skip string/regex/template contexts
    if (/\brequire\s*\(/.test(line) && /^\s*(const|let|var|module)\b/.test(line) && !/`/.test(line)) {
      for (const mod of forbiddenRequires) {
        if (new RegExp(`require\\s*\\(\\s*['"]${mod.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]\\s*\\)`).test(line))
          violations.push({ path: `${relPath}:${i + 1}`, detail: `forbidden require: ${mod}` });
      }
    }
  }
}

const status = violations.length === 0 ? 'PASS' : 'FAIL';
const reason_code = violations.length === 0 ? 'NONE' : 'RG_SANZ01_VIOLATION';

writeMd(path.join(EXEC, 'SAN_CERT_OFFLINE.md'), [
  '# SAN_CERT_OFFLINE.md — Zone-aware network scan', '',
  `STATUS: ${status}`, `REASON_CODE: ${reason_code}`, `RUN_ID: ${RUN_ID}`,
  `NEXT_ACTION: ${NEXT_ACTION}`, `FILES_SCANNED: ${scanned.length}`, `VIOLATIONS: ${violations.length}`, '',
  '## VIOLATIONS', violations.length === 0 ? '- NONE' : violations.map((v) => `- ${v.path}: ${v.detail}`).join('\n'),
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'san_cert_offline.json'), {
  schema_version: '1.0.0', gate_id: GATE_ID, status, reason_code,
  run_id: RUN_ID, next_action: NEXT_ACTION, files_scanned: scanned.length, violations,
});

console.log(`[${status}] san_cert_offline — ${reason_code} (scanned ${scanned.length} files)`);
if (violations.length > 0) for (const v of violations.slice(0, 10)) console.log(`  ${v.path}: ${v.detail}`);
process.exit(status === 'PASS' ? 0 : 1);
