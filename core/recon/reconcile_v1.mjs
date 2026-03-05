/**
 * TREASURE ENGINE: Reconciliation Engine v1 (EPOCH-14)
 * 
 * Purpose: Compare adapter-reported fills vs expected fills
 * Output: Mismatch codes for price, fee, duplicates, missing fills, state drift
 * 
 * CRITICAL: Network-isolated, deterministic, evidence-driven
 */

/**
 * Mismatch codes
 */
export const MismatchCode = {
  PRICE_MISMATCH: 'PRICE_MISMATCH',
  FEE_MISMATCH: 'FEE_MISMATCH',
  QTY_MISMATCH: 'QTY_MISMATCH',
  DUP_FILL: 'DUP_FILL',
  MISSING_FILL: 'MISSING_FILL',
  ORDER_STATE_DRIFT: 'ORDER_STATE_DRIFT',
  UNEXPECTED_FILL: 'UNEXPECTED_FILL',
  TIMESTAMP_DRIFT: 'TIMESTAMP_DRIFT',
  FUNDING_MISMATCH: 'FUNDING_MISMATCH'   // R2.4
};

/**
 * R2.4: Reconciliation action codes
 */
export const ReconAction = {
  RECON_OK: 'RECON_OK',
  RECON_WARN_DRIFT: 'RECON_WARN_DRIFT',
  RECON_HALT_MISMATCH: 'RECON_HALT_MISMATCH'
};

/**
 * Reconciliation result
 */
export class ReconciliationResult {
  constructor() {
    this.ok = true;
    this.mismatches = [];
    this.summary = {
      orders_checked: 0,
      fills_checked: 0,
      mismatches_found: 0
    };
  }

  addMismatch(code, details) {
    this.ok = false;
    this.mismatches.push({
      code,
      ...details,
      timestamp: Date.now()
    });
    this.summary.mismatches_found++;
  }

  toJSON() {
    return {
      ok: this.ok,
      mismatches: this.mismatches,
      summary: this.summary
    };
  }
}

/**
 * Reconciliation Engine
 */
export class ReconciliationEngine {
  constructor(options = {}) {
    this.options = {
      price_tolerance: options.price_tolerance || 0.001, // 0.1% tolerance
      fee_tolerance: options.fee_tolerance || 0.0001,     // 0.01% tolerance
      timestamp_tolerance_ms: options.timestamp_tolerance_ms || 1000, // 1s tolerance
      ...options
    };
  }

  /**
   * Reconcile a single order
   * 
   * @param {Object} expected - Expected order state
   * @param {Object} actual - Actual order state from adapter
   * @returns {ReconciliationResult}
   */
  reconcileOrder(expected, actual) {
    const result = new ReconciliationResult();
    result.summary.orders_checked = 1;

    // Check order status
    if (expected.status !== actual.status) {
      result.addMismatch(MismatchCode.ORDER_STATE_DRIFT, {
        order_id: expected.order_id || actual.order_id,
        expected_status: expected.status,
        actual_status: actual.status,
        message: `Order status mismatch: expected ${expected.status}, got ${actual.status}`
      });
    }

    // Reconcile fills if order is filled
    if (actual.status === 'FILLED' || actual.status === 'PARTIALLY_FILLED') {
      this._reconcileFills(expected, actual, result);
    }

    return result;
  }

  /**
   * Reconcile multiple orders
   * 
   * @param {Array} expectedOrders - Array of expected orders
   * @param {Array} actualOrders - Array of actual orders
   * @returns {ReconciliationResult}
   */
  reconcileOrders(expectedOrders, actualOrders) {
    const result = new ReconciliationResult();

    // Create maps for efficient lookup
    const expectedMap = new Map(expectedOrders.map(o => [o.order_id, o]));
    const actualMap = new Map(actualOrders.map(o => [o.order_id, o]));

    // Check for missing orders (expected but not actual)
    for (const [order_id, expected] of expectedMap) {
      if (!actualMap.has(order_id)) {
        result.addMismatch(MismatchCode.MISSING_FILL, {
          order_id,
          message: `Order ${order_id} expected but not found in actual results`
        });
      } else {
        // Reconcile this order
        const orderResult = this.reconcileOrder(expected, actualMap.get(order_id));
        this._mergeResults(result, orderResult);
      }
    }

    // Check for unexpected orders (actual but not expected)
    for (const [order_id, actual] of actualMap) {
      if (!expectedMap.has(order_id)) {
        result.addMismatch(MismatchCode.UNEXPECTED_FILL, {
          order_id,
          message: `Order ${order_id} found in actual but not expected`
        });
      }
    }

    result.summary.orders_checked = Math.max(expectedOrders.length, actualOrders.length);

    return result;
  }

  /**
   * Reconcile fills for a single order
   * @private
   */
  _reconcileFills(expected, actual, result) {
    const expectedFills = expected.fills || [];
    const actualFills = actual.fills || [];

    result.summary.fills_checked += Math.max(expectedFills.length, actualFills.length);

    // Check fill count
    if (expectedFills.length !== actualFills.length) {
      result.addMismatch(MismatchCode.QTY_MISMATCH, {
        order_id: expected.order_id || actual.order_id,
        expected_fill_count: expectedFills.length,
        actual_fill_count: actualFills.length,
        message: `Fill count mismatch: expected ${expectedFills.length}, got ${actualFills.length}`
      });
    }

    // Create fill maps for comparison
    const expectedFillMap = new Map(expectedFills.map((f, i) => [f.fill_id || `fill_${i}`, f]));
    const actualFillMap = new Map(actualFills.map((f, i) => [f.fill_id || `fill_${i}`, f]));

    // Check for duplicate fills (same fill_id appears multiple times)
    const actualFillIds = actualFills.map(f => f.fill_id).filter(Boolean);
    const uniqueFillIds = new Set(actualFillIds);
    if (actualFillIds.length !== uniqueFillIds.size) {
      result.addMismatch(MismatchCode.DUP_FILL, {
        order_id: actual.order_id,
        message: `Duplicate fill IDs detected in actual results`
      });
    }

    // Compare individual fills
    for (const [fill_id, expectedFill] of expectedFillMap) {
      const actualFill = actualFillMap.get(fill_id);

      if (!actualFill) {
        result.addMismatch(MismatchCode.MISSING_FILL, {
          order_id: expected.order_id,
          fill_id,
          message: `Fill ${fill_id} expected but not found`
        });
        continue;
      }

      // Compare price
      if (expectedFill.price !== undefined && actualFill.price !== undefined) {
        const priceDiff = Math.abs(expectedFill.price - actualFill.price);
        const priceRatio = priceDiff / expectedFill.price;

        if (priceRatio > this.options.price_tolerance) {
          result.addMismatch(MismatchCode.PRICE_MISMATCH, {
            order_id: expected.order_id,
            fill_id,
            expected_price: expectedFill.price,
            actual_price: actualFill.price,
            diff: priceDiff,
            diff_pct: (priceRatio * 100).toFixed(4),
            message: `Price mismatch: expected ${expectedFill.price}, got ${actualFill.price}`
          });
        }
      }

      // Compare fee
      if (expectedFill.fee !== undefined && actualFill.fee !== undefined) {
        const feeDiff = Math.abs(expectedFill.fee - actualFill.fee);
        const expectedFeeAbs = Math.abs(expectedFill.fee);
        const feeRatio = expectedFeeAbs > 0 ? feeDiff / expectedFeeAbs : 0;

        if (feeRatio > this.options.fee_tolerance && feeDiff > 0.000001) {
          result.addMismatch(MismatchCode.FEE_MISMATCH, {
            order_id: expected.order_id,
            fill_id,
            expected_fee: expectedFill.fee,
            actual_fee: actualFill.fee,
            diff: feeDiff,
            diff_pct: (feeRatio * 100).toFixed(4),
            message: `Fee mismatch: expected ${expectedFill.fee}, got ${actualFill.fee}`
          });
        }
      }

      // Compare quantity
      if (expectedFill.qty !== undefined && actualFill.qty !== undefined) {
        if (Math.abs(expectedFill.qty - actualFill.qty) > 0.00000001) {
          result.addMismatch(MismatchCode.QTY_MISMATCH, {
            order_id: expected.order_id,
            fill_id,
            expected_qty: expectedFill.qty,
            actual_qty: actualFill.qty,
            message: `Quantity mismatch: expected ${expectedFill.qty}, got ${actualFill.qty}`
          });
        }
      }

      // Compare timestamp (if provided)
      if (expectedFill.timestamp && actualFill.timestamp) {
        const timeDiff = Math.abs(expectedFill.timestamp - actualFill.timestamp);

        if (timeDiff > this.options.timestamp_tolerance_ms) {
          result.addMismatch(MismatchCode.TIMESTAMP_DRIFT, {
            order_id: expected.order_id,
            fill_id,
            expected_timestamp: expectedFill.timestamp,
            actual_timestamp: actualFill.timestamp,
            diff_ms: timeDiff,
            message: `Timestamp drift: ${timeDiff}ms`
          });
        }
      }
    }
  }

  /**
   * Merge results
   * @private
   */
  _mergeResults(target, source) {
    if (!source.ok) {
      target.ok = false;
    }

    target.mismatches.push(...source.mismatches);
    target.summary.orders_checked += source.summary.orders_checked;
    target.summary.fills_checked += source.summary.fills_checked;
    target.summary.mismatches_found += source.summary.mismatches_found;
  }

  /**
   * Generate reconciliation report
   * 
   * @param {ReconciliationResult} result - Reconciliation result
   * @returns {Object} Report object
   */
  generateReport(result) {
    return {
      reconciliation_status: result.ok ? 'PASS' : 'FAIL',
      summary: result.summary,
      mismatches: result.mismatches,
      mismatch_codes: this._groupMismatchesByCode(result.mismatches),
      timestamp: Date.now()
    };
  }

  /**
   * Group mismatches by code
   * @private
   */
  _groupMismatchesByCode(mismatches) {
    const groups = {};

    for (const mismatch of mismatches) {
      if (!groups[mismatch.code]) {
        groups[mismatch.code] = 0;
      }
      groups[mismatch.code]++;
    }

    return groups;
  }
}

/**
 * Create reconciliation engine with default options
 */
export function createReconciliationEngine(options = {}) {
  return new ReconciliationEngine(options);
}

/**
 * SPRINT-3: Lightweight fill reconciliation (pure function).
 * Compares ledger fills vs exchange fills by order_id.
 * Detects: MISSING_ON_EXCHANGE, MISSING_IN_LEDGER, PRICE_DRIFT, SIZE_DRIFT.
 *
 * @param {Array<{order_id: string, price: number, size: number}>} ledgerFills
 * @param {Array<{order_id: string, price: number, size: number}>} exchangeFills
 * @param {number} tolerancePct — max acceptable drift fraction (e.g. 0.01 = 1%)
 * @returns {{ ok: boolean, drifts: Object[], total_checked: number }}
 */
export function reconcile(ledgerFills, exchangeFills, tolerancePct = 0.01) {
  const drifts = [];

  for (const lf of ledgerFills) {
    const ef = exchangeFills.find(e => e.order_id === lf.order_id);
    if (!ef) {
      drifts.push({ type: 'MISSING_ON_EXCHANGE', order_id: lf.order_id });
      continue;
    }
    const priceDrift = Math.abs(lf.price - ef.price) / Math.max(lf.price, 1e-12);
    const sizeDrift = Math.abs(lf.size - ef.size) / Math.max(lf.size, 1e-12);
    if (priceDrift > tolerancePct) {
      drifts.push({ type: 'PRICE_DRIFT', order_id: lf.order_id, expected: lf.price, actual: ef.price, drift: priceDrift });
    }
    if (sizeDrift > tolerancePct) {
      drifts.push({ type: 'SIZE_DRIFT', order_id: lf.order_id, expected: lf.size, actual: ef.size, drift: sizeDrift });
    }
  }

  for (const ef of exchangeFills) {
    if (!ledgerFills.find(l => l.order_id === ef.order_id)) {
      drifts.push({ type: 'MISSING_IN_LEDGER', order_id: ef.order_id });
    }
  }

  return { ok: drifts.length === 0, drifts, total_checked: ledgerFills.length + exchangeFills.length };
}

/**
 * R2.4: Incremental (per-fill) reconciliation for streaming use.
 *
 * @param {Object} newFill — { order_id, price, size, fee, funding }
 * @param {Object} expected — { price, size, fee, funding } from cost model prediction
 * @param {number} tolerancePct — max acceptable drift (default 1%)
 * @returns {{ action: string, drifts: Object[] }}
 */
export function reconcileIncremental(newFill, expected, tolerancePct = 0.01) {
  const drifts = [];

  if (expected.price !== undefined) {
    const priceDrift = Math.abs(newFill.price - expected.price) / Math.max(expected.price, 1e-12);
    if (priceDrift > tolerancePct) {
      drifts.push({ type: 'PRICE_DRIFT', actual: newFill.price, expected: expected.price, drift: priceDrift });
    }
  }

  if (expected.size !== undefined) {
    const sizeDrift = Math.abs(newFill.size - expected.size) / Math.max(expected.size, 1e-12);
    if (sizeDrift > tolerancePct) {
      drifts.push({ type: 'SIZE_DRIFT', actual: newFill.size, expected: expected.size, drift: sizeDrift });
    }
  }

  if (expected.fee !== undefined) {
    const feeDrift = Math.abs((newFill.fee || 0) - expected.fee) / Math.max(expected.fee, 1e-12);
    if (feeDrift > tolerancePct * 10) { // fees have higher tolerance
      drifts.push({ type: 'FEE_DRIFT', actual: newFill.fee, expected: expected.fee, drift: feeDrift });
    }
  }

  // R2.4: Funding reconciliation
  if (expected.funding !== undefined && newFill.funding !== undefined) {
    const fundingDrift = Math.abs(newFill.funding - expected.funding) / Math.max(Math.abs(expected.funding), 1e-12);
    if (fundingDrift > tolerancePct * 5) { // funding has medium tolerance
      drifts.push({ type: 'FUNDING_DRIFT', actual: newFill.funding, expected: expected.funding, drift: fundingDrift });
    }
  }

  // Determine action
  let action = ReconAction.RECON_OK;
  if (drifts.length > 0) {
    const hasCritical = drifts.some(d => d.type === 'PRICE_DRIFT' || d.type === 'SIZE_DRIFT');
    action = hasCritical ? ReconAction.RECON_HALT_MISMATCH : ReconAction.RECON_WARN_DRIFT;
  }

  return { action, drifts, ok: drifts.length === 0 };
}
