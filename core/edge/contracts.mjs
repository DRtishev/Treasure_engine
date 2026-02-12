import crypto from 'node:crypto';
import Ajv from 'ajv';

const ajv = new Ajv({ allErrors: true, strict: false });

export const schemas = {
  FeatureFrame: { type: 'object', required: ['contract', 'symbol', 'ts', 'features', 'seed'], properties: { contract: { const: 'FeatureFrame' }, symbol: { type: 'string' }, ts: { type: 'string' }, seed: { type: 'integer' }, features: { type: 'object', additionalProperties: { type: 'number' } }, fingerprint: { type: 'string' } }, additionalProperties: false },
  StrategySpec: { type: 'object', required: ['contract', 'strategyId', 'version', 'compat'], properties: { contract: { const: 'StrategySpec' }, strategyId: { type: 'string' }, version: { type: 'string' }, compat: { type: 'array', items: { type: 'string' } } }, additionalProperties: false },
  Signal: { type: 'object', required: ['contract', 'strategyId', 'symbol', 'score'], properties: { contract: { const: 'Signal' }, strategyId: { type: 'string' }, symbol: { type: 'string' }, score: { type: 'number' } }, additionalProperties: false },
  Intent: { type: 'object', required: ['contract', 'symbol', 'side', 'size'], properties: { contract: { const: 'Intent' }, symbol: { type: 'string' }, side: { enum: ['BUY', 'SELL'] }, size: { type: 'number' } }, additionalProperties: false },
  AllocationPlan: { type: 'object', required: ['contract', 'capital', 'allocations'], properties: { contract: { const: 'AllocationPlan' }, capital: { type: 'number' }, allocations: { type: 'array', items: { type: 'object', required: ['symbol', 'fraction'], properties: { symbol: { type: 'string' }, fraction: { type: 'number' } }, additionalProperties: false } } }, additionalProperties: false },
  RiskDecision: { type: 'object', required: ['contract', 'state', 'allowed'], properties: { contract: { const: 'RiskDecision' }, state: { enum: ['NORMAL', 'CAUTIOUS', 'RESTRICTED', 'HALTED'] }, allowed: { type: 'boolean' } }, additionalProperties: false },
  SimReport: { type: 'object', required: ['contract', 'pnl', 'fills'], properties: { contract: { const: 'SimReport' }, pnl: { type: 'number' }, fills: { type: 'integer' } }, additionalProperties: false },
  RealityGapReport: { type: 'object', required: ['contract', 'gapBps', 'autoBrake'], properties: { contract: { const: 'RealityGapReport' }, gapBps: { type: 'number' }, autoBrake: { type: 'boolean' } }, additionalProperties: false },
  ShadowEvent: { type: 'object', required: ['contract', 'mode', 'event'], properties: { contract: { const: 'ShadowEvent' }, mode: { const: 'SHADOW' }, event: { type: 'string' } }, additionalProperties: false },
  CanaryPhaseState: { type: 'object', required: ['contract', 'phase', 'approved'], properties: { contract: { const: 'CanaryPhaseState' }, phase: { enum: ['P0', 'P1', 'P2', 'P3'] }, approved: { type: 'boolean' } }, additionalProperties: false }
};

const validators = Object.fromEntries(Object.entries(schemas).map(([k, v]) => [k, ajv.compile(v)]));

function normalize(value) {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('Non-finite number in contract');
    return Number(value.toFixed(8));
  }
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === 'object') {
    const out = {};
    for (const key of Object.keys(value).sort()) out[key] = normalize(value[key]);
    return out;
  }
  return value;
}

export function canonicalStringify(value) {
  return JSON.stringify(normalize(value));
}

export function fingerprint(value) {
  return crypto.createHash('sha256').update(canonicalStringify(value)).digest('hex');
}

export function validateContract(contractName, payload) {
  const validator = validators[contractName];
  if (!validator) throw new Error(`Unknown contract ${contractName}`);
  const ok = validator(payload);
  if (!ok) throw new Error(`${contractName} invalid: ${ajv.errorsText(validator.errors)}`);
  return true;
}
