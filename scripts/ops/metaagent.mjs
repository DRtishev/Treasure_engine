/**
 * metaagent.mjs — MetaAgent — Fleet Consciousness
 *
 * EPOCH-72: THE METAAGENT
 *
 * The MetaAgent is the "cortex" of the organism. It sees ALL candidate FSMs
 * simultaneously and makes fleet-level decisions:
 *   - Auto-quarantine on risk_score > threshold
 *   - Graduation readiness detection
 *   - Fleet rebalancing (park lowest performers if over capacity)
 *   - Exploration trigger (pipeline dry)
 *
 * Exports:
 *   MetaAgent          — class
 *   loadFleetPolicy    — load fleet_policy.json
 */

import fs from 'node:fs';
import path from 'node:path';
import { CandidateFSM, loadCandidateKernel } from './candidate_fsm.mjs';
import { evaluate as courtEvaluate } from './graduation_court.mjs';

const ROOT = process.cwd();

// ---------------------------------------------------------------------------
// Load fleet policy
// ---------------------------------------------------------------------------
export function loadFleetPolicy() {
  const policyPath = path.join(ROOT, 'specs', 'fleet_policy.json');
  try {
    return JSON.parse(fs.readFileSync(policyPath, 'utf8'));
  } catch {
    return {
      schema_version: '1.0.0',
      max_active_candidates: 10,
      max_quarantined: 5,
      max_graduated: 5,
      risk_budget_total: 1.0,
      risk_per_candidate_max: 0.3,
      graduation_criteria: {},
      quarantine_triggers: { risk_score_threshold: 0.8 },
      exploration_policy: { min_pipeline_candidates: 3 },
    };
  }
}

// ---------------------------------------------------------------------------
// MetaAgent — Fleet Consciousness
// ---------------------------------------------------------------------------
export class MetaAgent {
  constructor(candidatesData, bus, tickTs, mode) {
    this.bus = bus;
    this.mode = mode ?? 'CERT';
    this.tickTs = tickTs ?? 'UNKNOWN';
    this.policy = loadFleetPolicy();
    this.kernel = loadCandidateKernel();
    this.candidateFSMs = new Map();

    // Initialize CandidateFSMs for each candidate
    for (const c of candidatesData) {
      const id = c.id ?? c.config_id;
      if (!id) continue;
      // Default missing fsm_state to DRAFT (AC-14: backward compat)
      if (!c.fsm_state) c.fsm_state = this.kernel.initial_state;
      this.candidateFSMs.set(id, new CandidateFSM(c, this.kernel, this.policy, this.tickTs));
    }
  }

  /** Count candidates by state */
  countByState() {
    const counts = {};
    for (const state of Object.keys(this.kernel.states)) {
      counts[state] = 0;
    }
    for (const [, fsm] of this.candidateFSMs) {
      counts[fsm.state] = (counts[fsm.state] ?? 0) + 1;
    }
    return counts;
  }

  /** Count quarantined */
  countQuarantined() {
    let n = 0;
    for (const [, fsm] of this.candidateFSMs) {
      if (fsm.state === 'QUARANTINED') n++;
    }
    return n;
  }

  /** Compute fleet health: ratio of non-degraded candidates */
  computeFleetHealth() {
    if (this.candidateFSMs.size === 0) return 1.0;
    let healthy = 0;
    for (const [, fsm] of this.candidateFSMs) {
      if (!['QUARANTINED', 'REJECTED'].includes(fsm.state)) healthy++;
    }
    return Math.round((healthy / this.candidateFSMs.size) * 100) / 100;
  }

  /** Get graduation pipeline counts */
  getGraduationPipeline() {
    const counts = { draft: 0, backtested: 0, paper_proven: 0, canary_deployed: 0 };
    for (const [, fsm] of this.candidateFSMs) {
      if (fsm.state === 'DRAFT') counts.draft++;
      else if (fsm.state === 'BACKTESTED') counts.backtested++;
      else if (fsm.state === 'PAPER_PROVEN') counts.paper_proven++;
      else if (fsm.state === 'CANARY_DEPLOYED') counts.canary_deployed++;
    }
    return counts;
  }

  /** Compute total risk budget used */
  computeRiskBudgetUsed() {
    let total = 0;
    for (const [, fsm] of this.candidateFSMs) {
      if (!['PARKED', 'REJECTED', 'QUARANTINED'].includes(fsm.state)) {
        total += fsm.riskScore();
      }
    }
    return Math.round(total * 100) / 100;
  }

  /** Compute exploration ratio: early pipeline / total */
  computeExplorationRatio() {
    if (this.candidateFSMs.size === 0) return 0;
    let exploring = 0;
    for (const [, fsm] of this.candidateFSMs) {
      if (['DRAFT', 'BACKTESTED'].includes(fsm.state)) exploring++;
    }
    return Math.round((exploring / this.candidateFSMs.size) * 100) / 100;
  }

  /** Fleet-level proprioception — pure read */
  scan() {
    return Object.freeze({
      total_candidates: this.candidateFSMs.size,
      by_state: this.countByState(),
      fleet_health: this.computeFleetHealth(),
      graduation_pipeline: this.getGraduationPipeline(),
      quarantine_count: this.countQuarantined(),
      risk_budget_used: this.computeRiskBudgetUsed(),
      exploration_ratio: this.computeExplorationRatio(),
    });
  }

  /** One MetaAgent decision cycle */
  tick() {
    const decisions = [];

    // 1. Auto-quarantine: risk_score > threshold (ARCH-08: enforce max_quarantined)
    const qThreshold = this.policy.quarantine_triggers?.risk_score_threshold ?? 0.8;
    const maxQuarantined = this.policy.max_quarantined ?? 5;
    for (const [id, fsm] of this.candidateFSMs) {
      if (this.countQuarantined() >= maxQuarantined) break;
      if (fsm.riskScore() > qThreshold && fsm.state !== 'QUARANTINED' && fsm.state !== 'REJECTED') {
        const result = fsm.transition('CT08_ANY_TO_QUARANTINED');
        decisions.push({
          action: 'QUARANTINE',
          candidate: id,
          reason: 'risk_score_exceeded',
          success: result.success,
          detail: result.detail,
        });
      }
    }

    // 2. Graduation: run GraduationCourt for CANARY_DEPLOYED candidates (CRIT-03)
    for (const [id, fsm] of this.candidateFSMs) {
      if (fsm.state === 'CANARY_DEPLOYED') {
        // Run 5-exam court evaluation
        const verdict = courtEvaluate(id, fsm.data, this.policy, this.tickTs);
        // Store verdict on candidate data for guard_graduation_court
        if (!fsm.data.court_verdicts) fsm.data.court_verdicts = [];
        fsm.data.court_verdicts.push(verdict);

        if (verdict.verdict === 'GRADUATED') {
          const result = fsm.transition('CT04_CANARY_DEPLOYED_TO_GRADUATED');
          decisions.push({
            action: 'GRADUATE',
            candidate: id,
            reason: 'graduation_court_passed',
            success: result.success,
            detail: `court_score=${verdict.overall_score} ${result.detail}`,
          });
        } else {
          decisions.push({
            action: 'DEFER_GRADUATION',
            candidate: id,
            reason: `court_deferred: ${verdict.exams_failed} exam(s) failed`,
            success: true,
            detail: verdict.exams.filter(e => !e.pass).map(e => e.exam).join(', '),
          });
        }
      }
    }

    // 3. Fleet rebalancing: park lowest-performing if over capacity
    const maxActive = this.policy.max_active_candidates ?? 10;
    const active = [...this.candidateFSMs.values()]
      .filter(f => !['PARKED', 'REJECTED', 'QUARANTINED'].includes(f.state));
    if (active.length > maxActive) {
      const sorted = active.sort((a, b) => a.performanceScore() - b.performanceScore());
      for (const fsm of sorted.slice(0, active.length - maxActive)) {
        const result = fsm.transition('CT05_ANY_TO_PARKED');
        decisions.push({
          action: 'PARK',
          candidate: fsm.id,
          reason: 'fleet_capacity_exceeded',
          success: result.success,
          detail: result.detail,
        });
      }
    }

    // ARCH-07: Refresh scan AFTER all mutations for accurate context
    const ctx = this.scan();

    // 4. Exploration trigger: pipeline dry (PV-05: use exploration_ratio)
    const minPipeline = this.policy.exploration_policy?.min_pipeline_candidates ?? 3;
    const earlyPipeline = ctx.graduation_pipeline.draft + ctx.graduation_pipeline.backtested;
    if (earlyPipeline < minPipeline) {
      decisions.push({
        action: 'EXPLORE',
        candidate: 'fleet',
        reason: 'pipeline_dry',
        success: true,
        detail: `draft+backtested=${earlyPipeline} < ${minPipeline}, exploration_ratio=${ctx.exploration_ratio}`,
      });
    }

    // Emit all decisions to bus
    if (this.bus) {
      for (const d of decisions) {
        this.bus.append({
          mode: this.mode,
          component: 'METAAGENT',
          event: 'FLEET_DECISION',
          reason_code: 'METAAGENT_FLEET_DECISION',
          surface: 'CONTRACT',
          attrs: {
            action: d.action,
            candidate: d.candidate ?? 'fleet',
            reason: d.reason,
            success: String(d.success),
          },
        });
      }

      // Emit METAAGENT_TICK summary
      this.bus.append({
        mode: this.mode,
        component: 'METAAGENT',
        event: 'METAAGENT_TICK',
        reason_code: 'METAAGENT_FLEET_DECISION',
        surface: 'CONTRACT',
        attrs: {
          total_candidates: String(ctx.total_candidates),
          fleet_health: String(ctx.fleet_health),
          risk_budget_used: String(ctx.risk_budget_used),
          decisions_count: String(decisions.length),
          quarantine_count: String(ctx.quarantine_count),
          exploration_ratio: String(ctx.exploration_ratio),
        },
      });
    }

    return { decisions, fleet_context: ctx };
  }

  /** Get all candidate data for serialization */
  getCandidatesData() {
    const result = [];
    for (const [, fsm] of this.candidateFSMs) {
      result.push(fsm.toJSON());
    }
    return result;
  }
}
