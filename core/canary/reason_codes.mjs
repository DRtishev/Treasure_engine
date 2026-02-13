export const CANARY_REASON_CODES = {
  PAUSE_REALITY_GAP: {
    metric: 'reality_gap',
    threshold_key: 'max_reality_gap',
    strictness: 'PAUSE',
    required_context_fields: ['mode', 'scenario', 'calibration_mode']
  },
  PAUSE_DD_SPEED: {
    metric: 'dd_speed',
    threshold_key: 'max_dd_speed',
    strictness: 'PAUSE',
    required_context_fields: ['mode', 'scenario']
  },
  PAUSE_VOL_SPIKE: {
    metric: 'vol_spike',
    threshold_key: 'max_vol_spike',
    strictness: 'PAUSE',
    required_context_fields: ['mode', 'scenario']
  },
  PAUSE_DATA_GAP: {
    metric: 'data_gap_count',
    threshold_key: 'max_data_gap_count',
    strictness: 'PAUSE',
    required_context_fields: ['mode', 'scenario']
  },
  PAUSE_RISK_HARDSTOP: {
    metric: 'risk_events_count',
    threshold_key: 'max_risk_events',
    strictness: 'PAUSE',
    required_context_fields: ['mode', 'risk_state']
  },
  FAIL_OVERFIT_UNKNOWN_STRICT: {
    metric: 'overfit_status',
    threshold_key: 'strict_overfit_required',
    strictness: 'FAIL',
    required_context_fields: ['mode', 'overfit_metrics_path']
  },
  WARN_HEURISTIC_DEDUP_USED: {
    metric: 'heuristic_dedup_used',
    threshold_key: 'strict_dedup_ids_required',
    strictness: 'WARN',
    required_context_fields: ['provider', 'dataset_id']
  }
};

export function listReasonCodes() {
  return Object.keys(CANARY_REASON_CODES).sort();
}
