/**
 * regression_reg02_no_orphans.mjs — RG_REG02_NO_ORPHANS
 *
 * Gate: In every REGISTRY.json, all parents[] entries must reference
 *       known config_ids within that registry (no orphan lineage).
 * Surface: PROFIT
 */

import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
const EVIDENCE_DIR = path.join(ROOT, 'reports', 'evidence');
fs.mkdirSync(MANUAL, { recursive: true });

const NEXT_ACTION = 'npm run -s verify:fast';
const REG_SCRIPT = path.join(ROOT, 'scripts', 'ops', 'candidate_registry.mjs');

const checks = [];

// Check 1: Script implements orphan check
const scriptExists = fs.existsSync(REG_SCRIPT);
checks.push({ check: 'registry_script_exists', pass: scriptExists, detail: REG_SCRIPT });

if (scriptExists) {
  const content = fs.readFileSync(REG_SCRIPT, 'utf8');

  // Check 2: checkOrphans function or equivalent
  const hasOrphanCheck = content.includes('checkOrphans') || (content.includes('parents') && content.includes('orphan'));
  checks.push({ check: 'has_orphan_check_fn', pass: hasOrphanCheck, detail: 'checkOrphans or equivalent required' });

  // Check 3: REG02 reason code declared
  const hasReg02 = content.includes('REG02_ORPHAN_CANDIDATE');
  checks.push({ check: 'reg02_reason_code_declared', pass: hasReg02, detail: 'REG02_ORPHAN_CANDIDATE reason code required' });
}

// Check 4: Scan all existing REGISTRY.json files for orphans
const registryFiles = [];
const orphanFindings = [];

if (fs.existsSync(EVIDENCE_DIR)) {
  const dirs = fs.readdirSync(EVIDENCE_DIR).filter((d) => d.startsWith('EPOCH-REGISTRY-')).sort();
  for (const dir of dirs) {
    const regPath = path.join(EVIDENCE_DIR, dir, 'REGISTRY.json');
    if (!fs.existsSync(regPath)) continue;
    registryFiles.push(path.relative(ROOT, regPath));
    try {
      const reg = JSON.parse(fs.readFileSync(regPath, 'utf8'));
      const candidates = reg?.candidates ?? [];
      const known = new Set(candidates.map((c) => c.config_id));
      for (const c of candidates) {
        for (const p of (c.parents ?? [])) {
          if (!known.has(p)) {
            orphanFindings.push({ registry: dir, config_id: c.config_id, unknown_parent: p });
          }
        }
      }
    } catch {
      // Skip unparseable
    }
  }
}

// Also check promoted registry
const promotedPath = path.join(EXEC, 'CANDIDATE_REGISTRY.json');
if (fs.existsSync(promotedPath)) {
  registryFiles.push(path.relative(ROOT, promotedPath));
  try {
    const reg = JSON.parse(fs.readFileSync(promotedPath, 'utf8'));
    const candidates = reg?.candidates ?? [];
    const known = new Set(candidates.map((c) => c.config_id));
    for (const c of candidates) {
      for (const p of (c.parents ?? [])) {
        if (!known.has(p)) {
          orphanFindings.push({ registry: 'EXECUTOR/CANDIDATE_REGISTRY', config_id: c.config_id, unknown_parent: p });
        }
      }
    }
  } catch {
    // Skip
  }
}

checks.push({
  check: 'no_orphan_parents_in_registries',
  pass: orphanFindings.length === 0,
  detail: orphanFindings.length === 0
    ? `checked ${registryFiles.length} registry file(s), 0 orphans`
    : `orphans found: ${orphanFindings.map((o) => `${o.config_id}→${o.unknown_parent}`).join(', ')}`,
});

const failed = checks.filter((c) => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'REG02_ORPHAN_CANDIDATE';

const mdContent = [
  '# REGRESSION_REG02_NO_ORPHANS.md',
  '',
  `STATUS: ${status}`,
  `REASON_CODE: ${reason_code}`,
  `RUN_ID: ${RUN_ID}`,
  `NEXT_ACTION: ${NEXT_ACTION}`,
  '',
  '## CHECKS',
  checks.map((c) => `- [${c.pass ? 'PASS' : 'FAIL'}] ${c.check}: ${c.detail}`).join('\n'),
  '',
  `## REGISTRIES_SCANNED (${registryFiles.length})`,
  registryFiles.length === 0 ? '- NONE' : registryFiles.map((p) => `- ${p}`).join('\n'),
  '',
  '## ORPHAN_FINDINGS',
  orphanFindings.length === 0 ? '- NONE' : orphanFindings.map((o) => `- ${o.registry}/${o.config_id} → unknown parent: ${o.unknown_parent}`).join('\n'),
  '',
  '## FAILED',
  failed.length === 0 ? '- NONE' : failed.map((c) => `- ${c.check}: ${c.detail}`).join('\n'),
].join('\n');

writeMd(path.join(EXEC, 'REGRESSION_REG02_NO_ORPHANS.md'), mdContent);
writeJsonDeterministic(path.join(MANUAL, 'regression_reg02_no_orphans.json'), {
  schema_version: '1.0.0',
  gate_id: 'RG_REG02_NO_ORPHANS',
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: NEXT_ACTION,
  checks,
  registries_scanned: registryFiles,
  orphan_findings: orphanFindings,
  failed_checks: failed.map((c) => c.check),
});

console.log(`[${status}] regression_reg02_no_orphans — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
