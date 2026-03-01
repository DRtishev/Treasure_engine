/**
 * decimal_sort.mjs — Decimal string total-order comparator (no parseFloat)
 *
 * Purpose: Price canonicalization for OKX/Binance/Bybit orderbook digests.
 *          parseFloat introduces floating-point imprecision and non-determinism
 *          for long decimal strings. This module uses lexicographic string ops only.
 *
 * Algorithm:
 *   1. Handle sign: negative < non-negative; two negatives compare inverse absolute.
 *   2. Split on '.': integer part + optional fraction part.
 *   3. Compare integer parts: longer (more digits) = larger. If same length, lex compare.
 *   4. Compare fraction parts: right-pad shorter with '0', then lex compare.
 *
 * Assumption: no leading zeros in integer part (exchange prices invariant).
 * Edge case: "50000.00" == "50000" (fracs pad to same "00").
 *
 * Surface: DATA (pure — no time, no net)
 * Tested by: RG_DEC01_DECIMAL_SORT_TOTAL_ORDER
 */

/**
 * Compare two decimal price strings without parseFloat.
 * Returns: < 0 if a < b, 0 if a === b, > 0 if a > b.
 * Suitable as a sort comparator.
 *
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
export function compareDecimalStr(a, b) {
  if (a === b) return 0;

  const aNeg = a.length > 0 && a[0] === '-';
  const bNeg = b.length > 0 && b[0] === '-';

  if (aNeg && !bNeg) return -1;
  if (!aNeg && bNeg) return 1;

  // Both same sign — compare absolute values
  const aAbs = aNeg ? a.slice(1) : a;
  const bAbs = aNeg ? b.slice(1) : b;
  const cmp = _cmpPositive(aAbs, bAbs);
  return aNeg ? -cmp : cmp;
}

/**
 * Compare two non-negative decimal strings.
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
function _cmpPositive(a, b) {
  if (a === b) return 0;

  const aDot = a.indexOf('.');
  const bDot = b.indexOf('.');

  const aInt = aDot === -1 ? a : a.slice(0, aDot);
  const bInt = bDot === -1 ? b : b.slice(0, bDot);
  const aFrac = aDot === -1 ? '' : a.slice(aDot + 1);
  const bFrac = bDot === -1 ? '' : b.slice(bDot + 1);

  // Step 1: longer integer part = larger number (no leading zeros assumed)
  if (aInt.length !== bInt.length) {
    return aInt.length > bInt.length ? 1 : -1;
  }

  // Step 2: same integer length — lexicographic compare
  if (aInt !== bInt) {
    return aInt > bInt ? 1 : -1;
  }

  // Step 3: integer parts equal — compare fractions right-padded with '0'
  const maxLen = Math.max(aFrac.length, bFrac.length);
  if (maxLen === 0) return 0;

  const aPad = aFrac.padEnd(maxLen, '0');
  const bPad = bFrac.padEnd(maxLen, '0');

  if (aPad === bPad) return 0;
  return aPad > bPad ? 1 : -1;
}
