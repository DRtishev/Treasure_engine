// core/edge_lab/pipeline.mjs — EDGE LAB Validation Pipeline
// Doctrine: deterministic, fail-closed, evidence-driven.
// Every court runs in fixed order. No court omission possible.
// Supports double-run verification for determinism guarantee.

import crypto from 'node:crypto';
import { VERDICTS, REASON_CODES, COURT_ORDER } from './verdicts.mjs';
import {
  validateManifest,
  verifyDeterminism,
  fingerprintCourtReport,
  buildBlockedReport,
} from './manifest.mjs';
import { runDatasetCourt } from './courts/dataset_court.mjs';
import { runExecutionCourt } from './courts/execution_court.mjs';
import { runExecutionSensitivityCourt } from './courts/execution_sensitivity_court.mjs';
import { runRiskCourt } from './courts/risk_court.mjs';
import { runOverfitCourt } from './courts/overfit_court.mjs';
import { runRedTeamCourt } from './courts/red_team_court.mjs';
import { runSREReliabilityCourt } from './courts/sre_reliability_court.mjs';

// Map court name → runner function
const COURT_RUNNERS = {
  DatasetCourt: runDatasetCourt,
  ExecutionCourt: runExecutionCourt,
  ExecutionSensitivityCourt: runExecutionSensitivityCourt,
  RiskCourt: runRiskCourt,
  OverfitCourt: runOverfitCourt,
  RedTeamCourt: runRedTeamCourt,
  SREReliabilityCourt: runSREReliabilityCourt,
};

// Verdicts that terminate the pipeline early (fail-closed)
const TERMINAL_VERDICTS = new Set([
  VERDICTS.NOT_ELIGIBLE,
  VERDICTS.NEEDS_DATA,
  VERDICTS.BLOCKED,
]);

/**
 * Determine final pipeline verdict from all court verdicts.
 * Precedence (worst wins):
 *   BLOCKED > NOT_ELIGIBLE > NEEDS_DATA > PIPELINE_ELIGIBLE > TESTING_SET_ELIGIBLE > LIVE_ELIGIBLE
 */
function aggregateVerdict(courtReports) {
  const verdicts = courtReports.map((r) => r.verdict);
  if (verdicts.includes(VERDICTS.BLOCKED)) return VERDICTS.BLOCKED;
  if (verdicts.includes(VERDICTS.NOT_ELIGIBLE)) return VERDICTS.NOT_ELIGIBLE;
  if (verdicts.includes(VERDICTS.NEEDS_DATA)) return VERDICTS.NEEDS_DATA;
  // All courts passed — final verdict is the best court's claim
  // SRE court sets LIVE_ELIGIBLE; Overfit court sets TESTING_SET_ELIGIBLE
  if (verdicts.includes(VERDICTS.LIVE_ELIGIBLE)) return VERDICTS.LIVE_ELIGIBLE;
  if (verdicts.includes(VERDICTS.TESTING_SET_ELIGIBLE)) return VERDICTS.TESTING_SET_ELIGIBLE;
  return VERDICTS.PIPELINE_ELIGIBLE;
}

/**
 * Run the full pipeline once.
 * @param {Object} edge - Edge descriptor
 * @param {Object} ssot - SSOT config
 * @param {Object} opts - { fail_fast: boolean }
 * @returns {{ courts: Array, verdict: string, reason_codes: string[] }}
 */
function runPipelineOnce(edge, ssot, opts = {}) {
  const failFast = opts.fail_fast ?? true;
  const courtReports = [];
  let earlyExitVerdict = null;

  for (const courtName of COURT_ORDER) {
    const runner = COURT_RUNNERS[courtName];
    if (!runner) {
      // Contract drift: runner not registered
      return {
        courts: courtReports,
        verdict: VERDICTS.BLOCKED,
        reason_codes: [REASON_CODES.COURT_OMISSION],
        block_reason: `Runner not registered for court: ${courtName}`,
      };
    }

    let report;
    try {
      report = runner(edge, ssot);
    } catch (err) {
      report = {
        court: courtName,
        verdict: VERDICTS.BLOCKED,
        reason_codes: [REASON_CODES.CONTRACT_DRIFT],
        warnings: [`Court threw exception: ${err.message}`],
        evidence_summary: { exception: err.message },
        next_actions: [`Fix exception in ${courtName}: ${err.message}`],
      };
    }

    // Normalize court name
    report.court = courtName;
    courtReports.push(report);

    // Fail-fast: stop pipeline on terminal verdict
    if (failFast && TERMINAL_VERDICTS.has(report.verdict)) {
      earlyExitVerdict = report.verdict;
      break;
    }
  }

  // Validate manifest integrity only when all courts have run (fail_fast=false or no early exit)
  if (!earlyExitVerdict) {
    const manifestCheck = validateManifest(courtReports);
    if (!manifestCheck.ok) {
      return {
        courts: courtReports,
        verdict: VERDICTS.BLOCKED,
        reason_codes: [REASON_CODES.CONTRACT_DRIFT],
        block_reason: manifestCheck.reason,
      };
    }
  }

  const verdict = aggregateVerdict(courtReports);
  const reason_codes = [...new Set(courtReports.flatMap((r) => r.reason_codes || []))];

  return { courts: courtReports, verdict, reason_codes };
}

/**
 * Compute a deterministic fingerprint of a full pipeline run.
 */
function fingerprintRun(runResult) {
  const courtFingerprints = runResult.courts.map(fingerprintCourtReport);
  return crypto
    .createHash('sha256')
    .update(JSON.stringify({ verdict: runResult.verdict, courts: courtFingerprints }))
    .digest('hex');
}

/**
 * Run the EDGE LAB pipeline with double-run determinism verification.
 * @param {Object} edge - Edge descriptor (see courts for field definitions)
 * @param {Object} ssot - SSOT config (from spec/ssot.json)
 * @param {Object} opts
 *   opts.fail_fast       {boolean} - stop pipeline on first failure (default: true)
 *   opts.double_run      {boolean} - run twice and compare fingerprints (default: true)
 *   opts.edge_id         {string}  - identifier for the edge under evaluation
 * @returns {Object} pipeline result with courts, verdict, evidence manifest
 */
export function runEdgeLabPipeline(edge, ssot, opts = {}) {
  const doubleRun = opts.double_run ?? true;
  const edgeId = opts.edge_id ?? 'unknown';

  // RUN 1
  const run1 = runPipelineOnce(edge, ssot, opts);
  const fingerprint1 = fingerprintRun(run1);

  let deterministicOk = true;
  let deterministicMismatches = [];

  if (doubleRun) {
    // RUN 2 — must produce identical fingerprint
    const run2 = runPipelineOnce(edge, ssot, opts);
    const fingerprint2 = fingerprintRun(run2);

    if (fingerprint1 !== fingerprint2) {
      const check = verifyDeterminism([fingerprint1], [fingerprint2]);
      deterministicOk = false;
      deterministicMismatches = check.mismatches;

      return buildBlockedReport(
        `DETERMINISM FAILURE: run fingerprints do not match. Mismatches: ${deterministicMismatches.join('; ')}`,
        REASON_CODES.DETERMINISM_FAILURE
      );
    }
  }

  // Build evidence manifest
  const manifest = {
    edge_id: edgeId,
    court_order: COURT_ORDER,
    double_run: doubleRun,
    deterministic: deterministicOk,
    run_fingerprint: fingerprint1,
    courts_executed: run1.courts.map((r) => r.court),
    court_verdicts: run1.courts.map((r) => ({ court: r.court, verdict: r.verdict })),
  };

  return {
    verdict: run1.verdict,
    reason_codes: run1.reason_codes,
    block_reason: run1.block_reason ?? null,
    courts: run1.courts,
    evidence_manifest: manifest,
  };
}

export { VERDICTS, REASON_CODES, COURT_ORDER };
