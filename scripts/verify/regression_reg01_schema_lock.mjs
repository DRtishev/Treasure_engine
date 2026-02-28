/**
 * regression_reg01_schema_lock.mjs — RG_REG01_SCHEMA_LOCK
 *
 * Gate: candidate_registry.mjs must implement schema version 1.0.0
 *       and all required item fields must be declared.
 * Surface: PROFIT
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
const EVIDENCE_DIR = path.join(ROOT, 'reports', 'evidence');
fs.mkdirSync(MANUAL, { recursive: true });

const NEXT_ACTION = 'npm run -s verify:fast';
const REG_SCRIPT = path.join(ROOT, 'scripts', 'ops', 'candidate_registry.mjs');

const REQUIRED_ITEM_FIELDS = ['config_id', 'parents', 'metrics', 'robustness', 'status', 'evidence_paths'];
const REQUIRED_METRIC_FIELDS = ['profit_factor', 'max_dd', 'expectancy', 'trades_n', 'slippage_sensitivity'];
const REQUIRED_ROBUSTNESS_FIELDS = ['split_stats', 'leakage_pass'];
const VALID_STATUSES = ['CANDIDATE', 'REJECTED', 'PROMOTED'];

const checks = [];

// Check 1: Script exists
const scriptExists = fs.existsSync(REG_SCRIPT);
checks.push({ check: 'registry_script_exists', pass: scriptExists, detail: REG_SCRIPT });

if (scriptExists) {
  const content = fs.readFileSync(REG_SCRIPT, 'utf8');

  // Check 2: Schema version 1.0.0 declared
  const hasSchemaV = content.includes("'1.0.0'") || content.includes('"1.0.0"');
  checks.push({ check: 'schema_version_1_0_0_declared', pass: hasSchemaV, detail: 'SCHEMA_VERSION = "1.0.0" required' });

  // Check field presence: accept bare identifier, quoted, or dotted access patterns
  function fieldPresent(c, f) {
    return c.includes(`'${f}'`) || c.includes(`"${f}"`) || c.includes(`${f}:`) || c.includes(`.${f}`);
  }

  // Check 3: All required item fields declared
  for (const f of REQUIRED_ITEM_FIELDS) {
    const has = fieldPresent(content, f);
    checks.push({ check: `required_field_${f}`, pass: has, detail: `item field "${f}" must be declared` });
  }

  // Check 4: Metric fields declared
  for (const f of REQUIRED_METRIC_FIELDS) {
    const has = fieldPresent(content, f);
    checks.push({ check: `metric_field_${f}`, pass: has, detail: `metric field "${f}" required` });
  }

  // Check 5: Robustness fields declared
  for (const f of REQUIRED_ROBUSTNESS_FIELDS) {
    const has = fieldPresent(content, f);
    checks.push({ check: `robustness_field_${f}`, pass: has, detail: `robustness field "${f}" required` });
  }

  // Check 6: Valid statuses declared
  for (const s of VALID_STATUSES) {
    const has = content.includes(`'${s}'`) || content.includes(`"${s}"`);
    checks.push({ check: `status_${s}_declared`, pass: has, detail: `status value "${s}" required` });
  }

  // Check 7: validateSchema function exists (schema enforcement)
  const hasValidate = content.includes('validateSchema') || content.includes('SCHEMA_VERSION');
  checks.push({ check: 'has_schema_validation', pass: hasValidate, detail: 'validateSchema or SCHEMA_VERSION check required' });

  // Check 8: Runtime registry writes to EPOCH-REGISTRY-*
  const hasEpochRegistry = content.includes('EPOCH-REGISTRY-');
  checks.push({ check: 'runtime_registry_epoch_pattern', pass: hasEpochRegistry, detail: 'output under EPOCH-REGISTRY-<RUN_ID>' });

  // Check 9: Run registry script and check output schema
  const r = spawnSync(process.execPath, [REG_SCRIPT], { cwd: ROOT, encoding: 'utf8', env: { ...process.env } });
  const ranOk = r.status === 0 || r.status === 2; // 0=PASS 2=BLOCKED both valid
  checks.push({ check: 'registry_runs_without_crash', pass: ranOk, detail: `exit code=${r.status ?? 'null'}: ${(r.stdout || '').slice(0, 120)}` });

  if (ranOk) {
    // Find latest EPOCH-REGISTRY-*
    const registryDirs = fs.existsSync(EVIDENCE_DIR)
      ? fs.readdirSync(EVIDENCE_DIR).filter((d) => d.startsWith('EPOCH-REGISTRY-')).sort()
      : [];
    const latest = registryDirs.length > 0 ? registryDirs[registryDirs.length - 1] : null;

    if (latest) {
      const regPath = path.join(EVIDENCE_DIR, latest, 'REGISTRY.json');
      const regExists = fs.existsSync(regPath);
      checks.push({ check: 'registry_json_produced', pass: regExists, detail: path.relative(ROOT, regPath) });

      if (regExists) {
        try {
          const reg = JSON.parse(fs.readFileSync(regPath, 'utf8'));
          checks.push({ check: 'registry_schema_version', pass: reg.schema_version === '1.0.0', detail: `schema_version=${reg.schema_version}` });
          checks.push({ check: 'registry_has_candidates_array', pass: Array.isArray(reg.candidates), detail: 'candidates must be array' });
          checks.push({ check: 'registry_has_gate_id', pass: reg.gate_id === 'WOW9_CANDIDATE_REGISTRY', detail: `gate_id=${reg.gate_id}` });

          // Validate each item has required fields
          if (Array.isArray(reg.candidates)) {
            const itemErrors = [];
            for (const item of reg.candidates) {
              for (const f of REQUIRED_ITEM_FIELDS) {
                if (!(f in item)) itemErrors.push(`${item.config_id ?? '?'}.${f} missing`);
              }
            }
            checks.push({ check: 'all_items_have_required_fields', pass: itemErrors.length === 0, detail: itemErrors.length === 0 ? 'OK' : itemErrors.join('; ') });
          }
        } catch (e) {
          checks.push({ check: 'registry_json_parseable', pass: false, detail: `parse error: ${e.message}` });
        }
      }
    } else {
      checks.push({ check: 'registry_epoch_dir_created', pass: false, detail: 'No EPOCH-REGISTRY-* dir found' });
    }
  }
}

const failed = checks.filter((c) => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'REG01_SCHEMA_MISMATCH';

const mdContent = [
  '# REGRESSION_REG01_SCHEMA_LOCK.md',
  '',
  `STATUS: ${status}`,
  `REASON_CODE: ${reason_code}`,
  `RUN_ID: ${RUN_ID}`,
  `NEXT_ACTION: ${NEXT_ACTION}`,
  '',
  '## CHECKS',
  checks.map((c) => `- [${c.pass ? 'PASS' : 'FAIL'}] ${c.check}: ${c.detail}`).join('\n'),
  '',
  '## FAILED',
  failed.length === 0 ? '- NONE' : failed.map((c) => `- ${c.check}: ${c.detail}`).join('\n'),
].join('\n');

writeMd(path.join(EXEC, 'REGRESSION_REG01_SCHEMA_LOCK.md'), mdContent);
writeJsonDeterministic(path.join(MANUAL, 'regression_reg01_schema_lock.json'), {
  schema_version: '1.0.0',
  gate_id: 'RG_REG01_SCHEMA_LOCK',
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: NEXT_ACTION,
  checks,
  failed_checks: failed.map((c) => c.check),
});

console.log(`[${status}] regression_reg01_schema_lock — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
