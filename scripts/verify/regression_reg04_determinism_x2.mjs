/**
 * regression_reg04_determinism_x2.mjs — RG_REG04_DETERMINISM_X2
 *
 * Gate: Running ops:candidates twice on the same inputs must produce
 *       byte-identical REGISTRY.json (modulo RUN_ID and epoch dir name).
 *       Normalizes RUN_ID before comparing.
 * Surface: PROFIT
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
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

const checks = [];

// Check 1: Script exists
const scriptExists = fs.existsSync(REG_SCRIPT);
checks.push({ check: 'registry_script_exists', pass: scriptExists, detail: REG_SCRIPT });

// Normalize volatile fields for comparison
function normalizeRegistry(content) {
  return content
    .replace(/"run_id"\s*:\s*"[^"]*"/g, '"run_id":"NORMALIZED"')
    .replace(/"promoted_via_run_id"\s*:\s*"[^"]*"/g, '"promoted_via_run_id":"NORMALIZED"');
}

function runRegistry() {
  const r = spawnSync(process.execPath, [REG_SCRIPT], { cwd: ROOT, encoding: 'utf8', env: { ...process.env } });
  if (r.status !== 0 && r.status !== 2) return { ec: r.status ?? -1, content: null, hash: null };

  const dirs = fs.existsSync(EVIDENCE_DIR)
    ? fs.readdirSync(EVIDENCE_DIR).filter((d) => d.startsWith('EPOCH-REGISTRY-')).sort()
    : [];
  if (dirs.length === 0) return { ec: r.status, content: null, hash: null };

  const latest = dirs[dirs.length - 1];
  const regPath = path.join(EVIDENCE_DIR, latest, 'REGISTRY.json');
  if (!fs.existsSync(regPath)) return { ec: r.status, content: null, hash: null };

  const raw = fs.readFileSync(regPath, 'utf8');
  const normalized = normalizeRegistry(raw);
  const hash = crypto.createHash('sha256').update(normalized).digest('hex');
  return { ec: r.status, content: normalized, hash, epoch: latest };
}

if (scriptExists) {
  const run1 = runRegistry();
  const run2 = runRegistry();

  checks.push({ check: 'run1_succeeded', pass: run1.ec === 0 || run1.ec === 2, detail: `run1 EC=${run1.ec}` });
  checks.push({ check: 'run2_succeeded', pass: run2.ec === 0 || run2.ec === 2, detail: `run2 EC=${run2.ec}` });
  checks.push({ check: 'run1_produced_registry', pass: run1.content !== null, detail: `epoch=${run1.epoch ?? 'NONE'}` });
  checks.push({ check: 'run2_produced_registry', pass: run2.content !== null, detail: `epoch=${run2.epoch ?? 'NONE'}` });

  if (run1.hash && run2.hash) {
    const stable = run1.hash === run2.hash;
    checks.push({
      check: 'registry_byte_stable_x2',
      pass: stable,
      detail: stable
        ? `normalized hash stable: ${run1.hash.slice(0, 16)}...`
        : `hash drift! run1=${run1.hash.slice(0, 16)} run2=${run2.hash.slice(0, 16)}`,
    });
  } else {
    checks.push({ check: 'registry_byte_stable_x2', pass: false, detail: 'could not compare: one or both runs produced no REGISTRY.json' });
  }

  // Check: candidates arrays are in sorted order (for determinism)
  if (run1.content) {
    try {
      const reg = JSON.parse(run1.content);
      const ids = reg.candidates.map((c) => c.config_id);
      const sorted = [...ids].sort((a, b) => a.localeCompare(b));
      const isSorted = JSON.stringify(ids) === JSON.stringify(sorted);
      checks.push({ check: 'candidates_sorted_deterministically', pass: isSorted, detail: isSorted ? 'candidates[] sorted by config_id' : `order mismatch: ${ids.slice(0, 3)}` });
    } catch {
      checks.push({ check: 'candidates_sorted_deterministically', pass: false, detail: 'parse error on registry' });
    }
  }
}

const failed = checks.filter((c) => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'ND_BYTE01';

const mdContent = [
  '# REGRESSION_REG04_DETERMINISM_X2.md',
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

writeMd(path.join(EXEC, 'REGRESSION_REG04_DETERMINISM_X2.md'), mdContent);
writeJsonDeterministic(path.join(MANUAL, 'regression_reg04_determinism_x2.json'), {
  schema_version: '1.0.0',
  gate_id: 'RG_REG04_DETERMINISM_X2',
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: NEXT_ACTION,
  checks,
  failed_checks: failed.map((c) => c.check),
});

console.log(`[${status}] regression_reg04_determinism_x2 — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
