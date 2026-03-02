/**
 * regression_rg_reason02_in_taxonomy.mjs — RG_REASON02_IN_TAXONOMY
 *
 * Gate: all observed reason_code tokens in gate JSON files under reports/evidence/**
 *       must exist in the SSOT taxonomy: specs/reason_code_taxonomy.json.
 *
 * Unknown tokens indicate either a new code that needs taxonomy registration
 * or a typo/fabrication. Gate FAILs on any unregistered token.
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
const EVIDENCE_DIR = path.join(ROOT, 'reports/evidence');
const TAXONOMY_PATH = path.join(ROOT, 'specs/reason_code_taxonomy.json');

// Load taxonomy
let taxonomy;
try {
  taxonomy = JSON.parse(fs.readFileSync(TAXONOMY_PATH, 'utf8'));
} catch (e) {
  console.error(`[FAIL] regression_rg_reason02_in_taxonomy — TAXONOMY_MISSING: ${e.message}`);
  process.exit(1);
}
const validTokens = new Set(taxonomy.tokens);
const patterns = (taxonomy.patterns || []).map((p) => new RegExp(p));
const nonFoundationPatterns = patterns.filter((p) => !p.source.startsWith('^FOUNDATION_'));

function isValidToken(token) {
  if (validTokens.has(token)) return true;
  // Check patterns
  for (const re of patterns) {
    if (!re.test(token)) continue;
    // FOUNDATION_* bounded: suffix must itself be valid (in tokens or matches non-FOUNDATION pattern)
    if (/^FOUNDATION_/.test(token)) {
      const suffix = token.replace(/^FOUNDATION_/, '');
      if (validTokens.has(suffix)) return true;
      for (const nfp of nonFoundationPatterns) {
        if (nfp.test(suffix)) return true;
      }
      return false; // fail-closed: suffix not valid
    }
    return true;
  }
  return false;
}

// Collect all gate JSON files (skip run-scoped EPOCH-* dirs — gitignored, ephemeral)
function collectJsonFiles(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  function walk(d) {
    for (const ent of fs.readdirSync(d, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const full = path.join(d, ent.name);
      if (ent.isDirectory()) {
        if (d === dir && ent.name.startsWith('EPOCH-')) continue;
        walk(full);
      } else if (ent.isFile() && ent.name.endsWith('.json') &&
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
const observedSet = new Set();

for (const f of files) {
  let data;
  try { data = JSON.parse(fs.readFileSync(f, 'utf8')); } catch { continue; }
  const rc = data.reason_code;
  if (rc === undefined || rc === null || rc === '') continue;
  const token = String(rc);
  observedSet.add(token);
  if (!isValidToken(token)) {
    violations.push({ path: path.relative(ROOT, f), reason_code: token });
  }
}

const observed = [...observedSet].sort();
const status = violations.length === 0 ? 'PASS' : 'FAIL';
const reason_code = violations.length === 0 ? 'NONE' : 'RG_REASON02_VIOLATION';

writeMd(path.join(EXEC, 'REGRESSION_RG_REASON02.md'), [
  '# REGRESSION_RG_REASON02.md — Taxonomy Coverage', '',
  `STATUS: ${status}`,
  `REASON_CODE: ${reason_code}`,
  `RUN_ID: ${RUN_ID}`,
  `NEXT_ACTION: ${NEXT_ACTION}`,
  `FILES_SCANNED: ${files.length}`,
  `OBSERVED_TOKENS: ${observed.length}`,
  `VIOLATIONS: ${violations.length}`, '',
  '## OBSERVED TOKENS',
  observed.map((t) => `- ${t}`).join('\n') || '- NONE', '',
  '## VIOLATIONS (unknown tokens)',
  violations.length === 0
    ? '- NONE'
    : violations.map((v) => `- ${v.path}: reason_code=${v.reason_code}`).join('\n'),
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'regression_rg_reason02_in_taxonomy.json'), {
  schema_version: '1.0.0',
  gate_id: 'RG_REASON02_IN_TAXONOMY',
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: NEXT_ACTION,
  taxonomy_path: 'specs/reason_code_taxonomy.json',
  taxonomy_version: taxonomy.schema_version,
  files_scanned: files.length,
  observed_tokens: observed,
  violations,
});

console.log(`[${status}] regression_rg_reason02_in_taxonomy — ${reason_code}`);
if (violations.length > 0) {
  for (const v of violations.slice(0, 10)) console.log(`  UNKNOWN: ${v.path} reason_code=${v.reason_code}`);
}
process.exit(status === 'PASS' ? 0 : 1);
