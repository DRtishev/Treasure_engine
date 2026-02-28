/**
 * candidate_registry.mjs — WOW9 Candidate Registry
 *
 * Two output modes:
 *   1. Runtime registry (frequent):  reports/evidence/EPOCH-REGISTRY-<RUN_ID>/REGISTRY.json
 *   2. Promoted registry (rare, manual):
 *        reports/evidence/EXECUTOR/CANDIDATE_REGISTRY.json
 *      Requires: npm run -s ops:candidates -- --promote <config_id>
 *
 * Promotion contract (R14 / RG_REG03):
 *   - Explicit --promote <config_id> required
 *   - Never auto-promotes; refusal on implicit promote attempt
 *
 * Schema (RG_REG01 locked):
 *   { config_id, parents[], metrics{}, robustness{}, status, reason, evidence_paths[] }
 *
 * Write-scope (R5):
 *   - Runtime: reports/evidence/EPOCH-REGISTRY-<RUN_ID>/REGISTRY.json
 *   - Promoted: reports/evidence/EXECUTOR/CANDIDATE_REGISTRY.json (via --promote only)
 */

import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const PROMOTE_FLAG = args.includes('--promote');
const PROMOTE_ID = PROMOTE_FLAG ? (args[args.indexOf('--promote') + 1] ?? null) : null;
const EXECUTOR_DIR = path.join(ROOT, 'reports', 'evidence', 'EXECUTOR');
const EPOCH_DIR = path.join(ROOT, 'reports', 'evidence', `EPOCH-REGISTRY-${RUN_ID}`);
fs.mkdirSync(EPOCH_DIR, { recursive: true });
fs.mkdirSync(EXECUTOR_DIR, { recursive: true });

const PROMOTED_REGISTRY_PATH = path.join(EXECUTOR_DIR, 'CANDIDATE_REGISTRY.json');
const RUNTIME_REGISTRY_PATH = path.join(EPOCH_DIR, 'REGISTRY.json');

// ---------------------------------------------------------------------------
// Schema version — lock for RG_REG01
// ---------------------------------------------------------------------------
const SCHEMA_VERSION = '1.0.0';
const REQUIRED_ITEM_FIELDS = ['config_id', 'parents', 'metrics', 'robustness', 'status', 'evidence_paths'];
const VALID_STATUSES = ['CANDIDATE', 'REJECTED', 'PROMOTED'];

// ---------------------------------------------------------------------------
// Candidate item schema factory
// ---------------------------------------------------------------------------
function makeCandidate({ config_id, parents = [], metrics = {}, robustness = {}, status = 'CANDIDATE', reason = null, evidence_paths = [] }) {
  // Validate
  if (!config_id || typeof config_id !== 'string') throw new Error(`invalid config_id: ${config_id}`);
  if (!VALID_STATUSES.includes(status)) throw new Error(`invalid status: ${status}`);
  if (!Array.isArray(parents)) throw new Error(`parents must be array`);
  if (!Array.isArray(evidence_paths)) throw new Error(`evidence_paths must be array`);

  return {
    config_id,
    parents: [...parents].sort((a, b) => a.localeCompare(b)),
    metrics: {
      profit_factor: metrics.profit_factor ?? null,
      max_dd: metrics.max_dd ?? null,
      expectancy: metrics.expectancy ?? null,
      trades_n: metrics.trades_n ?? null,
      slippage_sensitivity: metrics.slippage_sensitivity ?? null,
    },
    robustness: {
      split_stats: robustness.split_stats ?? null,
      leakage_pass: robustness.leakage_pass ?? null,
    },
    status,
    reason: reason ?? null,
    evidence_paths: [...evidence_paths].sort((a, b) => a.localeCompare(b)),
  };
}

// ---------------------------------------------------------------------------
// Collect candidates from sweep outputs (if available)
// ---------------------------------------------------------------------------
function collectFromSweep() {
  const candidates = [];
  const evidence = path.join(ROOT, 'reports', 'evidence');
  if (!fs.existsSync(evidence)) return candidates;

  // Look for latest EPOCH-SWEEP-* (if exists)
  const sweepDirs = fs.readdirSync(evidence)
    .filter((d) => d.startsWith('EPOCH-SWEEP-') || d.startsWith('EPOCH-59')) // include known sweep epoch
    .sort((a, b) => a.localeCompare(b));

  for (const dir of sweepDirs.slice(-3)) { // last 3 sweep epochs
    const sweepReport = path.join(evidence, dir, 'gates', 'manual', 'epoch_sweep_report.json');
    if (!fs.existsSync(sweepReport)) continue;
    try {
      const data = JSON.parse(fs.readFileSync(sweepReport, 'utf8'));
      const items = data?.report?.candidates ?? data?.report?.live ?? [];
      for (const item of (Array.isArray(items) ? items : [])) {
        const cid = item.id ?? item.config_id ?? null;
        if (!cid) continue;
        candidates.push(makeCandidate({
          config_id: String(cid),
          parents: [],
          metrics: {},
          robustness: { split_stats: null, leakage_pass: null },
          status: 'CANDIDATE',
          reason: `sourced from sweep epoch ${dir}`,
          evidence_paths: [path.relative(ROOT, sweepReport)],
        }));
      }
    } catch {
      // Malformed sweep — skip
    }
  }
  return candidates;
}

// ---------------------------------------------------------------------------
// Validate registry schema (RG_REG01)
// ---------------------------------------------------------------------------
function validateSchema(registry) {
  const errors = [];
  if (registry.schema_version !== SCHEMA_VERSION) {
    errors.push(`schema_version mismatch: expected ${SCHEMA_VERSION}, got ${registry.schema_version}`);
  }
  if (!Array.isArray(registry.candidates)) {
    errors.push('candidates must be an array');
  } else {
    for (const item of registry.candidates) {
      for (const field of REQUIRED_ITEM_FIELDS) {
        if (!(field in item)) errors.push(`item ${item.config_id ?? '?'} missing field: ${field}`);
      }
      if (!VALID_STATUSES.includes(item.status)) {
        errors.push(`item ${item.config_id ?? '?'} invalid status: ${item.status}`);
      }
    }
  }
  return errors;
}

// ---------------------------------------------------------------------------
// Orphan check (RG_REG02): parents[] must reference known config_ids
// ---------------------------------------------------------------------------
function checkOrphans(candidates) {
  const known = new Set(candidates.map((c) => c.config_id));
  const orphans = [];
  for (const c of candidates) {
    for (const p of c.parents) {
      if (!known.has(p)) {
        orphans.push({ config_id: c.config_id, unknown_parent: p });
      }
    }
  }
  return orphans;
}

// ---------------------------------------------------------------------------
// Promotion logic (RG_REG03 — explicit only)
// ---------------------------------------------------------------------------
function promoteCandidates(candidates, promoteId) {
  if (!promoteId) return { promoted: null, error: 'no config_id given to --promote' };

  const target = candidates.find((c) => c.config_id === promoteId);
  if (!target) return { promoted: null, error: `config_id not found: ${promoteId}` };
  if (target.status !== 'CANDIDATE') return { promoted: null, error: `config_id ${promoteId} is not CANDIDATE (status=${target.status})` };

  // Promote in-place
  target.status = 'PROMOTED';
  target.reason = `promoted via --promote ${promoteId} run_id=${RUN_ID}`;
  return { promoted: promoteId, error: null };
}

// ---------------------------------------------------------------------------
// Load existing promoted registry (if present)
// ---------------------------------------------------------------------------
function loadPromotedRegistry() {
  if (!fs.existsSync(PROMOTED_REGISTRY_PATH)) return null;
  try {
    return JSON.parse(fs.readFileSync(PROMOTED_REGISTRY_PATH, 'utf8'));
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

// Collect candidates from sweep/leakage outputs
const sweepCandidates = collectFromSweep();

// Merge with existing promoted registry (to maintain lineage)
const existing = loadPromotedRegistry();
const existingMap = new Map((existing?.candidates ?? []).map((c) => [c.config_id, c]));

// Merge: existing promoted take precedence; new sweep candidates added if not already tracked
const allCandidates = [];
for (const [cid, c] of existingMap) {
  allCandidates.push(c);
}
for (const c of sweepCandidates) {
  if (!existingMap.has(c.config_id)) {
    allCandidates.push(c);
  }
}

// Sort for determinism (RG_REG04)
allCandidates.sort((a, b) => a.config_id.localeCompare(b.config_id));

// Handle promotion
let promotionResult = null;
let refusalReason = null;

if (PROMOTE_FLAG) {
  if (!PROMOTE_ID) {
    refusalReason = 'REG03_PROMOTION_ONLY: --promote requires a config_id argument';
  } else {
    promotionResult = promoteCandidates(allCandidates, PROMOTE_ID);
    if (promotionResult.error) {
      refusalReason = `REG03_PROMOTION_ONLY: ${promotionResult.error}`;
    }
  }
}

// Build runtime registry
const runtimeRegistry = {
  schema_version: SCHEMA_VERSION,
  gate_id: 'WOW9_CANDIDATE_REGISTRY',
  run_id: RUN_ID,
  mode: PROMOTE_FLAG ? 'PROMOTE' : 'RUNTIME',
  candidates: allCandidates,
  candidates_n: allCandidates.length,
  status_counts: {
    n_open: allCandidates.filter((c) => c.status === 'CANDIDATE').length,
    n_dropped: allCandidates.filter((c) => c.status === 'REJECTED').length,
    n_live: allCandidates.filter((c) => c.status === 'PROMOTED').length,
  },
  promotion_result: promotionResult,
  refusal_reason: refusalReason,
  next_action: 'npm run -s verify:fast',
};

// Schema validation
const schemaErrors = validateSchema(runtimeRegistry);
const orphans = checkOrphans(allCandidates);

// Determine status
let overallStatus = 'PASS';
let reason_code = 'NONE';

if (refusalReason) {
  overallStatus = 'BLOCKED';
  reason_code = 'REG03_PROMOTION_ONLY';
} else if (schemaErrors.length > 0) {
  overallStatus = 'FAIL';
  reason_code = 'REG01_SCHEMA_MISMATCH';
} else if (orphans.length > 0) {
  overallStatus = 'FAIL';
  reason_code = 'REG02_ORPHAN_CANDIDATE';
}

runtimeRegistry.status = overallStatus;
runtimeRegistry.reason_code = reason_code;
runtimeRegistry.schema_errors = schemaErrors;
runtimeRegistry.orphans = orphans;

// Write runtime registry
writeJsonDeterministic(RUNTIME_REGISTRY_PATH, runtimeRegistry);

// Write promoted registry to EXECUTOR (only when promotion succeeds)
if (PROMOTE_FLAG && !refusalReason && promotionResult?.promoted) {
  writeJsonDeterministic(PROMOTED_REGISTRY_PATH, {
    ...runtimeRegistry,
    mode: 'PROMOTED',
    promoted_via_run_id: RUN_ID,
  });
  console.log(`[PROMOTED] ${promotionResult.promoted} -> ${path.relative(ROOT, PROMOTED_REGISTRY_PATH)}`);
}

// Write refusal/report MD
const reportMd = [
  `# CANDIDATE REGISTRY — EPOCH-REGISTRY-${RUN_ID}`,
  '',
  `STATUS: ${overallStatus}`,
  `REASON_CODE: ${reason_code}`,
  `RUN_ID: ${RUN_ID}`,
  `MODE: ${PROMOTE_FLAG ? 'PROMOTE' : 'RUNTIME'}`,
  `CANDIDATES: ${allCandidates.length} (CANDIDATE=${runtimeRegistry.status_counts.n_open} REJECTED=${runtimeRegistry.status_counts.n_dropped} PROMOTED=${runtimeRegistry.status_counts.n_live})`,
  '',
  refusalReason ? `REFUSAL: ${refusalReason}` : '',
  schemaErrors.length > 0 ? `SCHEMA_ERRORS: ${schemaErrors.join('; ')}` : '',
  orphans.length > 0 ? `ORPHANS: ${orphans.map((o) => `${o.config_id}→${o.unknown_parent}`).join(', ')}` : '',
  '',
  '## CANDIDATES',
  '',
  allCandidates.length === 0
    ? '> No candidates. Run sweep to discover candidates.'
    : allCandidates.map((c) => `- [${c.status}] ${c.config_id} | pf=${c.metrics.profit_factor ?? '?'} dd=${c.metrics.max_dd ?? '?'}`).join('\n'),
  '',
  '## REGISTRY_PATH',
  `- runtime: ${path.relative(ROOT, RUNTIME_REGISTRY_PATH)}`,
  PROMOTE_FLAG && !refusalReason ? `- promoted: ${path.relative(ROOT, PROMOTED_REGISTRY_PATH)}` : '',
  '',
  '## NEXT_ACTION',
  'npm run -s verify:fast',
  '',
].filter((l) => l !== undefined).join('\n');

writeMd(path.join(EPOCH_DIR, 'REGISTRY.md'), reportMd);

console.log(`[${overallStatus}] ops:candidates — ${reason_code} [${PROMOTE_FLAG ? 'PROMOTE' : 'RUNTIME'}]`);
console.log(`  REGISTRY: ${path.relative(ROOT, RUNTIME_REGISTRY_PATH)}`);
console.log(`  TOTAL:    ${allCandidates.length} candidates (${runtimeRegistry.status_counts.n_open} CANDIDATE / ${runtimeRegistry.status_counts.n_live} PROMOTED)`);

process.exit(overallStatus === 'PASS' ? 0 : (overallStatus === 'BLOCKED' ? 2 : 1));
