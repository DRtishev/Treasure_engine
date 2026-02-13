import crypto from 'node:crypto';
import Ajv from 'ajv';

const ajv = new Ajv({ allErrors: true, strict: true });

const MODES = ['NORMAL', 'CAUTIOUS', 'RESTRICTED', 'HALTED'];

export const contractSchemas = {
  FeatureFrame: {
    type: 'object',
    required: ['schema_version', 'symbol', 'ts_event', 'features', 'feature_vector_order', 'source_snapshot_id', 'deterministic_fingerprint'],
    additionalProperties: false,
    properties: {
      schema_version: { const: '1.0.0' },
      symbol: { type: 'string', minLength: 1 },
      ts_event: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}Z$' },
      features: { type: 'object', minProperties: 1, additionalProperties: { type: 'number' } },
      feature_vector_order: { type: 'array', minItems: 1, items: { type: 'string' } },
      source_snapshot_id: { type: 'string', minLength: 1 },
      deterministic_fingerprint: { type: 'string', pattern: '^[a-f0-9]{64}$' }
    }
  },
  StrategySpec: {
    type: 'object',
    required: ['schema_version', 'strategy_id', 'semver', 'params_schema', 'default_params', 'compatibility', 'artifact_hashes', 'deterministic_fingerprint'],
    additionalProperties: false,
    properties: {
      schema_version: { const: '1.0.0' },
      strategy_id: { type: 'string', minLength: 1 },
      semver: { type: 'string', pattern: '^\\d+\\.\\d+\\.\\d+$' },
      params_schema: { type: 'object' },
      default_params: { type: 'object' },
      compatibility: { type: 'object', required: ['feature_schema'], properties: { feature_schema: { type: 'string', minLength: 1 } }, additionalProperties: true },
      artifact_hashes: { type: 'object', minProperties: 1, additionalProperties: { type: 'string', pattern: '^sha256:' } },
      deterministic_fingerprint: { type: 'string', pattern: '^[a-f0-9]{64}$' }
    }
  },
  Signal: {
    type: 'object',
    required: ['schema_version', 'signal_id', 'strategy_id', 'symbol', 'timestamp', 'side_hint', 'confidence', 'reasons', 'deterministic_fingerprint'],
    additionalProperties: false,
    properties: {
      schema_version: { const: '1.0.0' },
      signal_id: { type: 'string' },
      strategy_id: { type: 'string' },
      symbol: { type: 'string' },
      timestamp: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}Z$' },
      side_hint: { enum: ['LONG', 'SHORT', 'FLAT'] },
      confidence: { type: 'number', minimum: 0, maximum: 1 },
      reasons: { type: 'array', items: { type: 'string' } },
      deterministic_fingerprint: { type: 'string', pattern: '^[a-f0-9]{64}$' }
    }
  },
  Intent: {
    type: 'object',
    required: ['schema_version', 'intent_id', 'signal_id', 'symbol', 'timestamp', 'side', 'size_units', 'limit_price', 'max_slippage_bps', 'deterministic_fingerprint'],
    additionalProperties: false,
    properties: {
      schema_version: { const: '1.0.0' },
      intent_id: { type: 'string' },
      signal_id: { type: 'string' },
      symbol: { type: 'string' },
      timestamp: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}Z$' },
      side: { enum: ['BUY', 'SELL'] },
      size_units: { type: 'number', minimum: 0 },
      limit_price: { type: 'number', minimum: 0 },
      max_slippage_bps: { type: 'number', minimum: 0 },
      deterministic_fingerprint: { type: 'string', pattern: '^[a-f0-9]{64}$' }
    }
  },
  AllocationPlan: {
    type: 'object',
    required: ['schema_version', 'plan_id', 'timestamp', 'target_weights', 'max_leverage', 'constraints_applied', 'deterministic_fingerprint'],
    additionalProperties: false,
    properties: {
      schema_version: { const: '1.0.0' },
      plan_id: { type: 'string' },
      timestamp: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}Z$' },
      target_weights: { type: 'object', minProperties: 1, additionalProperties: { type: 'number' } },
      max_leverage: { type: 'number', minimum: 0 },
      constraints_applied: { type: 'array', items: { type: 'string' } },
      deterministic_fingerprint: { type: 'string', pattern: '^[a-f0-9]{64}$' }
    }
  },
  RiskDecision: {
    type: 'object',
    required: ['schema_version', 'decision_id', 'timestamp', 'from_mode', 'to_mode', 'trigger_ids', 'action', 'deterministic_fingerprint'],
    additionalProperties: false,
    properties: {
      schema_version: { const: '1.0.0' },
      decision_id: { type: 'string' },
      timestamp: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}Z$' },
      from_mode: { enum: MODES },
      to_mode: { enum: MODES },
      trigger_ids: { type: 'array', minItems: 1, items: { type: 'string' } },
      action: { enum: ['KEEP', 'REDUCE', 'HALT'] },
      deterministic_fingerprint: { type: 'string', pattern: '^[a-f0-9]{64}$' }
    }
  },
  SimReport: {
    type: 'object',
    required: ['schema_version', 'sim_run_id', 'slippage_model', 'fee_model', 'latency_model', 'inputs_fingerprint', 'output_metrics', 'deterministic_fingerprint'],
    additionalProperties: false,
    properties: {
      schema_version: { const: '1.0.0' },
      sim_run_id: { type: 'string' },
      slippage_model: { type: 'string' },
      fee_model: { type: 'string' },
      latency_model: { type: 'string' },
      inputs_fingerprint: { type: 'string', pattern: '^sha256:' },
      output_metrics: { type: 'object', minProperties: 1, additionalProperties: { type: 'number' } },
      deterministic_fingerprint: { type: 'string', pattern: '^[a-f0-9]{64}$' }
    }
  },
  RealityGapReport: {
    type: 'object',
    required: ['schema_version', 'report_id', 'timestamp', 'sim_ref', 'shadow_ref', 'component_deltas', 'gap_score', 'brake_action', 'deterministic_fingerprint'],
    additionalProperties: false,
    properties: {
      schema_version: { const: '1.0.0' },
      report_id: { type: 'string' },
      timestamp: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}Z$' },
      sim_ref: { type: 'string' },
      shadow_ref: { type: 'string' },
      component_deltas: { type: 'object', minProperties: 1, additionalProperties: { type: 'number' } },
      gap_score: { type: 'number', minimum: 0 },
      brake_action: { enum: ['NONE', 'REDUCE', 'HALT'] },
      deterministic_fingerprint: { type: 'string', pattern: '^[a-f0-9]{64}$' }
    }
  },
  ShadowEvent: {
    type: 'object',
    required: ['schema_version', 'event_id', 'timestamp', 'intents_emitted', 'orders_submitted', 'guards', 'deterministic_fingerprint'],
    additionalProperties: false,
    properties: {
      schema_version: { const: '1.0.0' },
      event_id: { type: 'string' },
      timestamp: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}Z$' },
      intents_emitted: { type: 'integer', minimum: 0 },
      orders_submitted: { type: 'integer', minimum: 0 },
      guards: { type: 'object', required: ['adapter_disabled'], properties: { adapter_disabled: { type: 'boolean' } }, additionalProperties: true },
      deterministic_fingerprint: { type: 'string', pattern: '^[a-f0-9]{64}$' }
    }
  },
  CanaryPhaseState: {
    type: 'object',
    required: ['schema_version', 'timestamp', 'phase_percent', 'previous_phase_percent', 'rollback_armed', 'transition_reason', 'deterministic_fingerprint'],
    additionalProperties: false,
    properties: {
      schema_version: { const: '1.0.0' },
      timestamp: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}Z$' },
      phase_percent: { enum: [5, 15, 35, 70, 100] },
      previous_phase_percent: { enum: [5, 15, 35, 70, 100] },
      rollback_armed: { type: 'boolean' },
      transition_reason: { type: 'string' },
      deterministic_fingerprint: { type: 'string', pattern: '^[a-f0-9]{64}$' }
    }
  },
  CertificationReport: {
    type: 'object',
    required: ['schema_version', 'release_id', 'epoch_gate_results', 'ledger_snapshot_hash', 'spec_hash', 'evidence_hash', 'approvals', 'deterministic_fingerprint'],
    additionalProperties: false,
    properties: {
      schema_version: { const: '1.0.0' },
      release_id: { type: 'string' },
      epoch_gate_results: { type: 'object', additionalProperties: { enum: ['PASS', 'FAIL', 'BLOCKED'] } },
      ledger_snapshot_hash: { type: 'string', pattern: '^sha256:' },
      spec_hash: { type: 'string', pattern: '^sha256:' },
      evidence_hash: { type: 'string', pattern: '^sha256:' },
      approvals: { type: 'object', minProperties: 1, additionalProperties: { type: 'string' } },
      deterministic_fingerprint: { type: 'string', pattern: '^[a-f0-9]{64}$' }
    }
  }
};

const validators = Object.fromEntries(Object.entries(contractSchemas).map(([name, schema]) => [name, ajv.compile(schema)]));

const numberScaleByKey = {
  confidence: 6,
  size_units: 8,
  limit_price: 8,
  max_slippage_bps: 4,
  max_leverage: 6,
  gap_score: 6,
  phase_percent: 0,
  previous_phase_percent: 0
};

function scaleForPath(path) {
  if (path.includes('.features.')) return 6;
  if (path.includes('.target_weights.')) return 6;
  if (path.includes('.component_deltas.')) return 4;
  return numberScaleByKey[path.split('.').at(-1)] ?? 8;
}

export function truncateTowardZero(value, scale) {
  if (!Number.isFinite(value)) throw new Error('Non-finite number in deterministic payload');
  const factor = 10 ** scale;
  const truncated = value < 0 ? Math.ceil(value * factor) : Math.floor(value * factor);
  return truncated / factor;
}

function toPlainDecimal(numberValue) {
  if (!Number.isFinite(numberValue)) throw new Error('Non-finite number in deterministic payload');
  if (Object.is(numberValue, -0)) return '0';
  const raw = String(numberValue);
  if (!/[eE]/.test(raw)) return raw;

  const sign = raw.startsWith('-') ? '-' : '';
  const unsigned = raw.replace(/^[+-]/, '');
  const [mantissa, exponentPart] = unsigned.split(/[eE]/);
  const exponent = Number(exponentPart);
  const mantissaDigits = mantissa.replace('.', '');
  const decimalIndex = mantissa.includes('.') ? mantissa.indexOf('.') : mantissa.length;
  const shiftedIndex = decimalIndex + exponent;

  let plain;
  if (shiftedIndex <= 0) {
    plain = `0.${'0'.repeat(Math.abs(shiftedIndex))}${mantissaDigits}`;
  } else if (shiftedIndex >= mantissaDigits.length) {
    plain = `${mantissaDigits}${'0'.repeat(shiftedIndex - mantissaDigits.length)}`;
  } else {
    plain = `${mantissaDigits.slice(0, shiftedIndex)}.${mantissaDigits.slice(shiftedIndex)}`;
  }

  const [intPartRaw, fracPartRaw = ''] = plain.split('.');
  const intPart = intPartRaw.replace(/^0+(?=\d)/, '') || '0';
  const fracPart = fracPartRaw.replace(/0+$/, '');
  const normalized = fracPart ? `${intPart}.${fracPart}` : intPart;
  return normalized === '0' ? '0' : `${sign}${normalized}`;
}

function normalizeDeterministic(value, path = '') {
  if (typeof value === 'number') {
    const normalized = truncateTowardZero(value, scaleForPath(path));
    return Object.is(normalized, -0) ? 0 : normalized;
  }
  if (Array.isArray(value)) {
    return value.map((item, index) => normalizeDeterministic(item, `${path}[${index}]`));
  }
  if (value && typeof value === 'object') {
    const out = {};
    for (const key of Object.keys(value).sort((a, b) => a.localeCompare(b))) {
      if (value[key] === undefined) throw new Error(`Undefined not allowed at ${path}.${key}`);
      out[key] = normalizeDeterministic(value[key], path ? `${path}.${key}` : key);
    }
    return out;
  }
  return value;
}

export function canonicalStringify(value) {
  const normalized = normalizeDeterministic(value);
  const render = (node) => {
    if (typeof node === 'number') return toPlainDecimal(node);
    if (node === null) return 'null';
    if (typeof node === 'boolean') return node ? 'true' : 'false';
    if (typeof node === 'string') return JSON.stringify(node);
    if (Array.isArray(node)) return `[${node.map((item) => render(item)).join(',')}]`;
    if (typeof node === 'object') {
      const entries = Object.keys(node).sort((a, b) => a.localeCompare(b)).map((key) => `${JSON.stringify(key)}:${render(node[key])}`);
      return `{${entries.join(',')}}`;
    }
    throw new Error(`Unsupported canonical type: ${typeof node}`);
  };
  return render(normalized);
}

export function deterministicFingerprint(contractName, payload) {
  const fpPayload = { ...payload };
  delete fpPayload.deterministic_fingerprint;
  const digest = crypto.createHash('sha256').update(Buffer.from(canonicalStringify(fpPayload), 'utf8')).digest('hex');
  return digest;
}

function assertInvariants(contractName, payload) {
  const serialized = canonicalStringify(payload);
  if (serialized.includes('NaN') || serialized.includes('Infinity')) throw new Error(`${contractName} includes forbidden numeric tokens`);
  if (contractName === 'FeatureFrame') {
    const keys = Object.keys(payload.features);
    if (keys.join('|') !== payload.feature_vector_order.join('|')) throw new Error('feature_vector_order does not match features key order');
    if (keys.some((k) => !Number.isFinite(payload.features[k]))) throw new Error('FeatureFrame features contain non-finite values');
  }
  if (contractName === 'ShadowEvent' && payload.orders_submitted !== 0) throw new Error('ShadowEvent orders_submitted must be 0 in shadow mode');
  if (contractName === 'Signal' && (payload.confidence < 0 || payload.confidence > 1)) throw new Error('Signal confidence outside [0,1]');
  if (contractName === 'RiskDecision') {
    const transitions = new Set(['NORMAL>CAUTIOUS', 'CAUTIOUS>RESTRICTED', 'RESTRICTED>HALTED', 'NORMAL>NORMAL', 'CAUTIOUS>CAUTIOUS', 'RESTRICTED>RESTRICTED', 'HALTED>HALTED']);
    if (!transitions.has(`${payload.from_mode}>${payload.to_mode}`)) throw new Error(`Invalid risk transition ${payload.from_mode}->${payload.to_mode}`);
  }
}

export function withFingerprint(contractName, payload) {
  const normalized = normalizeDeterministic(payload);
  normalized.deterministic_fingerprint = deterministicFingerprint(contractName, normalized);
  return normalized;
}

export function validateContract(contractName, payload) {
  const validator = validators[contractName];
  if (!validator) throw new Error(`Unknown contract ${contractName}`);
  if (!validator(payload)) throw new Error(`${contractName} schema invalid: ${ajv.errorsText(validator.errors)}`);
  assertInvariants(contractName, payload);
  const expected = deterministicFingerprint(contractName, payload);
  if (payload.deterministic_fingerprint !== expected) throw new Error(`${contractName} deterministic_fingerprint mismatch`);
  return true;
}
