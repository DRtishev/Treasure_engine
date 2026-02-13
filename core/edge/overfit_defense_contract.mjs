import crypto from 'node:crypto';
import Ajv from 'ajv';

const ajv = new Ajv({ allErrors: true, strict: true });

const schema = {
  type: 'object',
  required: ['schema_version', 'input', 'output', 'input_fingerprint', 'output_fingerprint'],
  additionalProperties: false,
  properties: {
    schema_version: { const: '1.0.0' },
    input_fingerprint: { type: 'string', pattern: '^[a-f0-9]{64}$' },
    output_fingerprint: { type: 'string', pattern: '^[a-f0-9]{64}$' },
    input: {
      type: 'object',
      required: ['dataset_id', 'timeline', 'strategies', 'cpcv', 'selection_metric'],
      additionalProperties: false,
      properties: {
        dataset_id: { type: 'string', minLength: 1 },
        timeline: { type: 'array', minItems: 8, items: { type: 'string' } },
        strategies: {
          type: 'array', minItems: 2,
          items: {
            type: 'object', required: ['id', 'params_hash', 'returns'], additionalProperties: false,
            properties: {
              id: { type: 'string', minLength: 1 },
              params_hash: { type: 'string', minLength: 1 },
              returns: { type: 'array', minItems: 8, items: { type: 'number' } }
            }
          }
        },
        cpcv: {
          type: 'object', required: ['k', 'purge', 'embargo', 'seed'], additionalProperties: false,
          properties: {
            k: { type: 'integer', minimum: 2 },
            purge: { type: 'integer', minimum: 0 },
            embargo: { type: 'integer', minimum: 0 },
            seed: { type: 'integer', minimum: 0 }
          }
        },
        selection_metric: { enum: ['SHARPE', 'MEAN_RETURN'] }
      }
    },
    output: { type: 'object' }
  }
};

const validate = ajv.compile(schema);

function normalize(value) {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('Non-finite number in overfit contract');
    return Object.is(value, -0) ? 0 : Number(value.toFixed(10));
  }
  if (Array.isArray(value)) return value.map((v) => normalize(v));
  if (value && typeof value === 'object') {
    const out = {};
    for (const k of Object.keys(value).sort((a, b) => a.localeCompare(b))) {
      if (value[k] === undefined) throw new Error(`Undefined at key ${k}`);
      out[k] = normalize(value[k]);
    }
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

export function buildOverfitDefensePayload(input, output) {
  const normalizedInput = normalize(input);
  const normalizedOutput = normalize(output);
  const payload = {
    schema_version: '1.0.0',
    input: normalizedInput,
    output: normalizedOutput,
    input_fingerprint: fingerprint(normalizedInput),
    output_fingerprint: fingerprint(normalizedOutput)
  };
  if (!validate(payload)) {
    throw new Error(`OverfitDefense contract validation failed: ${ajv.errorsText(validate.errors)}`);
  }
  return payload;
}

export function assertFiniteArray(arr, label) {
  for (let i = 0; i < arr.length; i += 1) {
    if (!Number.isFinite(arr[i])) throw new Error(`${label}[${i}] is non-finite`);
  }
}
