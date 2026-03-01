/**
 * regression_rg_reason01_token_purity.mjs — RG_REASON01_TOKEN_PURITY
 *
 * Gate: all reason_code values in gate JSON files under reports/evidence/**
 *       must match the token regex ^[A-Z0-9_]+$  (no human prose in reason_code).
 *
 * Scans: reports/evidence/**\/gates/manual\/*.json + *\/receipt.json
 * Fix:   human message belongs in detail/message field, not reason_code.
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
const TOKEN_RE = /^[A-Z0-9_]+$/;
const EVIDENCE_DIR = path.join(ROOT, 'reports/evidence');

// Collect all gate JSON files to scan
function collectJsonFiles(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  function walk(d) {
    for (const ent of fs.readdirSync(d, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const full = path.join(d, ent.name);
      if (ent.isDirectory()) { walk(full); }
      else if (ent.isFile() && ent.name.endsWith('.json') &&
               (d.includes('gates/manual') || ent.name === 'receipt.json')) {
        results.push(full);
      }
    }
  }
  walk(dir);
  return results;
}

const files = collectJsonFiles(EVIDENCE_DIR);
const violations = [];

for (const f of files) {
  let data;
  try { data = JSON.parse(fs.readFileSync(f, 'utf8')); } catch { continue; }
  const rc = data.reason_code;
  if (rc === undefined || rc === null) continue;
  if (!TOKEN_RE.test(String(rc))) {
    violations.push({ path: path.relative(ROOT, f), reason_code: String(rc) });
  }
}

const status = violations.length === 0 ? 'PASS' : 'FAIL';
const reason_code = violations.length === 0 ? 'NONE' : 'RG_REASON01_VIOLATION';

writeMd(path.join(EXEC, 'REGRESSION_RG_REASON01.md'), [
  '# REGRESSION_RG_REASON01.md — Token Purity', '',
  `STATUS: ${status}`,
  `REASON_CODE: ${reason_code}`,
  `RUN_ID: ${RUN_ID}`,
  `NEXT_ACTION: ${NEXT_ACTION}`,
  `FILES_SCANNED: ${files.length}`,
  `VIOLATIONS: ${violations.length}`, '',
  '## VIOLATIONS',
  violations.length === 0
    ? '- NONE'
    : violations.map((v) => `- ${v.path}: reason_code=${JSON.stringify(v.reason_code)}`).join('\n'),
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'regression_rg_reason01_token_purity.json'), {
  schema_version: '1.0.0',
  gate_id: 'RG_REASON01_TOKEN_PURITY',
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: NEXT_ACTION,
  files_scanned: files.length,
  violations,
});

console.log(`[${status}] regression_rg_reason01_token_purity — ${reason_code}`);
if (violations.length > 0) {
  for (const v of violations) console.log(`  IMPURE: ${v.path} reason_code=${JSON.stringify(v.reason_code)}`);
}
process.exit(status === 'PASS' ? 0 : 1);
