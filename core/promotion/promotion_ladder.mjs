// Sprint 8: Promotion Ladder -- court-style evaluation for stage transitions
// Fail-closed: missing metrics -> INSUFFICIENT_DATA

const DEFAULT_CRITERIA = {
  paper_to_micro_live: {
    min_trades: 100,
    stability_window_days: 14,
    max_drawdown: 0.05,
    sharpe: 0.5,
    win_rate: 0.45
  },
  micro_live_to_small_live: {
    min_trades: 200,
    stability_window_days: 7,
    max_drawdown: 0.03,
    sharpe: 0.8,
    robustness_score: 0.6
  },
  small_live_to_live: {
    min_trades: 500,
    stability_window_days: 30,
    max_drawdown: 0.02,
    sharpe: 1.0,
    robustness_score: 0.7,
    deflated_sharpe: 0.3
  }
};

const STAGE_ORDER = ['paper', 'micro_live', 'small_live', 'live'];

function getTransitionKey(from, to) {
  return `${from}_to_${to}`;
}

function getNextStage(current) {
  const idx = STAGE_ORDER.indexOf(current);
  if (idx < 0 || idx >= STAGE_ORDER.length - 1) return null;
  return STAGE_ORDER[idx + 1];
}

/**
 * Evaluate whether a strategy is eligible for promotion.
 *
 * @param {{
 *   current_stage: string,
 *   metrics: object,
 *   config?: object
 * }} params
 * @returns {PromotionResult}
 */
export function evaluatePromotion({ current_stage, metrics, config = {} }) {
  const target_stage = getNextStage(current_stage);

  if (!target_stage) {
    return {
      eligible: false,
      verdict: 'BLOCKED',
      target_stage: null,
      criteria_results: [],
      reason_code: 'ALREADY_AT_MAX_STAGE',
      evidence_summary: `Stage '${current_stage}' is the highest stage`
    };
  }

  const key = getTransitionKey(current_stage, target_stage);
  const criteria = { ...DEFAULT_CRITERIA[key], ...(config[key] || {}) };

  if (!criteria || Object.keys(criteria).length === 0) {
    return {
      eligible: false,
      verdict: 'BLOCKED',
      target_stage,
      criteria_results: [],
      reason_code: 'NO_CRITERIA_DEFINED',
      evidence_summary: `No criteria for ${key}`
    };
  }

  const criteria_results = [];
  let hasInsufficientData = false;

  for (const [criterion, required] of Object.entries(criteria)) {
    const actual = metrics[criterion];

    // Fail-closed: missing data
    if (actual === undefined || actual === null) {
      hasInsufficientData = true;
      criteria_results.push({
        criterion,
        required,
        actual: null,
        pass: false
      });
      continue;
    }

    let pass;
    if (criterion === 'max_drawdown') {
      pass = actual <= required;
    } else {
      pass = actual >= required;
    }

    criteria_results.push({ criterion, required, actual, pass });
  }

  if (hasInsufficientData) {
    return {
      eligible: false,
      verdict: 'INSUFFICIENT_DATA',
      target_stage,
      criteria_results,
      reason_code: 'MISSING_METRICS',
      evidence_summary: `Missing metrics: ${criteria_results.filter(c => c.actual === null).map(c => c.criterion).join(', ')}`
    };
  }

  const allPassed = criteria_results.every(c => c.pass);
  const failed = criteria_results.filter(c => !c.pass);

  return {
    eligible: allPassed,
    verdict: allPassed ? 'PROMOTE_ELIGIBLE' : 'BLOCKED',
    target_stage,
    criteria_results,
    reason_code: allPassed ? 'NONE' : 'CRITERIA_NOT_MET',
    evidence_summary: allPassed
      ? `All ${criteria_results.length} criteria passed for ${key}`
      : `Failed: ${failed.map(c => `${c.criterion} (need ${c.required}, got ${c.actual})`).join(', ')}`
  };
}

/** Required fields in PromotionResult */
export const PROMOTION_RESULT_REQUIRED_FIELDS = [
  'eligible', 'verdict', 'target_stage',
  'criteria_results', 'reason_code', 'evidence_summary'
];

/** Valid verdicts */
export const VALID_VERDICTS = ['PROMOTE_ELIGIBLE', 'BLOCKED', 'INSUFFICIENT_DATA'];

/** Stage list (for contract checks) */
export const STAGES = STAGE_ORDER;
