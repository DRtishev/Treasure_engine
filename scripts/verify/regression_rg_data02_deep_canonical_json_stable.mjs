import crypto from 'node:crypto';

function canonicalizeDeep(value) {
  if (Array.isArray(value)) return value.map((item) => canonicalizeDeep(item));
  if (value && typeof value === 'object') {
    const out = {};
    for (const key of Object.keys(value).sort((a, b) => a.localeCompare(b))) out[key] = canonicalizeDeep(value[key]);
    return out;
  }
  return value;
}

const a = { z: 1, nested: { b: 2, a: 3 }, arr: [{ y: 9, x: 8 }] };
const b = { arr: [{ x: 8, y: 9 }], nested: { a: 3, b: 2 }, z: 1 };
const ca = JSON.stringify(canonicalizeDeep(a));
const cb = JSON.stringify(canonicalizeDeep(b));
const ha = crypto.createHash('sha256').update(ca).digest('hex');
const hb = crypto.createHash('sha256').update(cb).digest('hex');
if (ca !== cb || ha !== hb) {
  console.error('[FAIL] RG_DATA02 canonical deep stringify is unstable');
  process.exit(1);
}
console.log('[PASS] RG_DATA02 deep canonical JSON stable stringify');
