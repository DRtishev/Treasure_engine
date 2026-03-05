// Sprint 8: Canary Policy -- limits enforcement with fail-closed uncertainty
// Integration point with kill_switch and safety_loop

const DEFAULT_LIMITS = {
  micro_live: {
    max_exposure_usd: 100,
    max_orders_per_min: 5,
    max_daily_loss_usd: 10,
    max_daily_loss_pct: 0.02,
    max_open_positions: 1
  },
  small_live: {
    max_exposure_usd: 1000,
    max_orders_per_min: 10,
    max_daily_loss_usd: 100,
    max_daily_loss_pct: 0.03,
    max_open_positions: 3
  },
  live: {
    max_exposure_usd: 10000,
    max_orders_per_min: 20,
    max_daily_loss_usd: 500,
    max_daily_loss_pct: 0.05,
    max_open_positions: 10
  }
};

/**
 * Evaluate canary policy for current metrics against stage limits.
 * Fail-closed: any undefined metric -> PAUSE.
 *
 * @param {{
 *   metrics: {
 *     exposure_usd?: number,
 *     orders_per_min?: number,
 *     daily_loss_usd?: number,
 *     daily_loss_pct?: number,
 *     open_positions?: number
 *   },
 *   limits?: object,
 *   stage?: string,
 *   state?: { ordersPaused: boolean, currentTier: string }
 * }} params
 * @returns {CanaryResult}
 */
export function evaluateCanary({ metrics = {}, limits, stage = 'micro_live', state = {} }) {
  const stageLimits = limits || DEFAULT_LIMITS[stage] || DEFAULT_LIMITS.micro_live;
  const violations = [];
  let hasCritical = false;
  let hasWarning = false;
  let isDailyLoss = false;
  let isOrderRate = false;

  // Fail-closed: check for missing critical metrics
  const requiredMetrics = ['exposure_usd', 'daily_loss_usd', 'orders_per_min'];
  for (const m of requiredMetrics) {
    if (metrics[m] === undefined || metrics[m] === null) {
      return {
        action: 'PAUSE',
        violations: [{ limit_name: m, limit_value: 'required', actual_value: null, severity: 'CRITICAL' }],
        reason_code: 'MISSING_METRIC_FAILCLOSED',
        new_state: { ordersPaused: true, currentTier: state.currentTier || 'micro' }
      };
    }
  }

  // Check exposure
  if (metrics.exposure_usd > stageLimits.max_exposure_usd) {
    const severity = metrics.exposure_usd > stageLimits.max_exposure_usd * 1.5 ? 'CRITICAL' : 'WARNING';
    violations.push({
      limit_name: 'max_exposure_usd',
      limit_value: stageLimits.max_exposure_usd,
      actual_value: metrics.exposure_usd,
      severity
    });
    if (severity === 'CRITICAL') hasCritical = true;
    else hasWarning = true;
  }

  // Check orders per minute
  if (metrics.orders_per_min > stageLimits.max_orders_per_min) {
    violations.push({
      limit_name: 'max_orders_per_min',
      limit_value: stageLimits.max_orders_per_min,
      actual_value: metrics.orders_per_min,
      severity: 'CRITICAL'
    });
    hasCritical = true;
    isOrderRate = true;
  }

  // Check daily loss USD
  if (metrics.daily_loss_usd > stageLimits.max_daily_loss_usd) {
    violations.push({
      limit_name: 'max_daily_loss_usd',
      limit_value: stageLimits.max_daily_loss_usd,
      actual_value: metrics.daily_loss_usd,
      severity: 'CRITICAL'
    });
    hasCritical = true;
    isDailyLoss = true;
  }

  // Check daily loss percentage
  if (metrics.daily_loss_pct !== undefined && metrics.daily_loss_pct > stageLimits.max_daily_loss_pct) {
    violations.push({
      limit_name: 'max_daily_loss_pct',
      limit_value: stageLimits.max_daily_loss_pct,
      actual_value: metrics.daily_loss_pct,
      severity: 'CRITICAL'
    });
    hasCritical = true;
    isDailyLoss = true;
  }

  // Check open positions
  if (metrics.open_positions !== undefined && metrics.open_positions > stageLimits.max_open_positions) {
    violations.push({
      limit_name: 'max_open_positions',
      limit_value: stageLimits.max_open_positions,
      actual_value: metrics.open_positions,
      severity: 'WARNING'
    });
    hasWarning = true;
  }

  // Determine action
  let action = 'CONTINUE';
  let reason_code = 'NONE';

  if (hasCritical) {
    if (isDailyLoss) {
      action = 'FLATTEN';
      reason_code = 'DAILY_LOSS_EXCEEDED';
    } else if (isOrderRate) {
      action = 'PAUSE';
      reason_code = 'ORDER_RATE_EXCEEDED';
    } else {
      action = 'PAUSE';
      reason_code = 'CRITICAL_VIOLATION';
    }
  } else if (hasWarning) {
    action = 'REDUCE';
    reason_code = 'WARNING_VIOLATION';
  }

  const new_state = {
    ordersPaused: action === 'PAUSE' || action === 'FLATTEN',
    currentTier: action === 'REDUCE' ? 'micro' : (state.currentTier || 'micro')
  };

  return { action, violations, reason_code, new_state };
}

/** Required fields in CanaryResult */
export const CANARY_RESULT_REQUIRED_FIELDS = [
  'action', 'violations', 'reason_code', 'new_state'
];

/** Valid actions */
export const VALID_ACTIONS = ['CONTINUE', 'REDUCE', 'PAUSE', 'FLATTEN'];

/** Default limits (for contract checks) */
export { DEFAULT_LIMITS as CANARY_DEFAULT_LIMITS };
