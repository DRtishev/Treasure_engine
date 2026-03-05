/**
 * regression_script_index_fast01.mjs — RG_SCRIPT_INDEX_FAST01
 *
 * R3: Verifies script index exists and total count matches reality (±10 tolerance).
 */

import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

const checks = [];

try {
  const indexPath = path.join(ROOT, 'artifacts', 'script_index.json');

  // Check 1: index file exists
  const p1 = fs.existsSync(indexPath);
  checks.push({ check: 'index_exists', pass: p1,
    detail: p1 ? 'OK' : 'FAIL: artifacts/script_index.json missing — run npm run -s ops:script-index' });

  if (p1) {
    const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));

    // Check 2: has total_scripts field
    const p2 = typeof index.total_scripts === 'number' && index.total_scripts > 0;
    checks.push({ check: 'has_total_scripts', pass: p2,
      detail: `total_scripts=${index.total_scripts}` });

    // Check 3: count matches actual file count (±10)
    let actualCount = 0;
    for (const dir of ['scripts/verify', 'scripts/ops']) {
      const fullDir = path.join(ROOT, dir);
      if (fs.existsSync(fullDir)) {
        actualCount += fs.readdirSync(fullDir).filter(f => f.endsWith('.mjs') || f.endsWith('.sh')).length;
      }
    }
    const diff = Math.abs(index.total_scripts - actualCount);
    const p3 = diff <= 10;
    checks.push({ check: 'count_matches_reality', pass: p3,
      detail: `index=${index.total_scripts}, actual=${actualCount}, diff=${diff} (tolerance ±10)` });

    // Check 4: has categories
    const p4 = index.categories && Object.keys(index.categories).length > 0;
    checks.push({ check: 'has_categories', pass: p4,
      detail: p4 ? `categories: ${Object.keys(index.categories).join(', ')}` : 'FAIL: no categories' });
  }

} catch (err) {
  checks.push({ check: 'read_index', pass: false, detail: `FAIL: ${err.message}` });
}

const failed = checks.filter(c => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'RG_SCRIPT_INDEX_FAST01_VIOLATION';

writeMd(path.join(EXEC, 'REGRESSION_SCRIPT_INDEX_FAST01.md'), [
  '# RG_SCRIPT_INDEX_FAST01: Script Index Freshness', '',
  `STATUS: ${status}`, `REASON_CODE: ${reason_code}`, `RUN_ID: ${RUN_ID}`,
  `CHECKS: ${checks.length}`, `VIOLATIONS: ${failed.length}`, '',
  checks.map(c => `- [${c.pass ? 'PASS' : 'FAIL'}] ${c.check}: ${c.detail}`).join('\n'),
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'regression_script_index_fast01.json'), {
  schema_version: '1.0.0', gate_id: 'RG_SCRIPT_INDEX_FAST01', status, reason_code, run_id: RUN_ID, checks_total: checks.length, violations: failed.length, checks, failed_checks: failed.map(c => c.check),
});

console.log(`[${status}] regression_script_index_fast01 — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
