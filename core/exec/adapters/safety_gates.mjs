#!/usr/bin/env node
// core/exec/adapters/safety_gates.mjs
// CRITICAL SAFETY LAYER - Every real order passes through these gates
// FAIL-SAFE DESIGN: Block orders on ANY doubt

/**
 * Validate order intent - reject invalid inputs
 * @param {Object} intent - Order intent
 * @throws {Error} If intent is invalid
 */
export function validateIntent(intent) {
  if (!intent) {
    throw new Error('SAFETY: Intent is required');
  }

  // Validate side
  if (!['BUY', 'SELL'].includes(intent.side)) {
    throw new Error(`SAFETY: Invalid side: ${intent.side}. Must be BUY or SELL`);
  }

  // Validate size - reject NaN, Infinity, negative, zero
  if (!Number.isFinite(intent.size)) {
    throw new Error(`SAFETY: Invalid size (not finite): ${intent.size}`);
  }
  if (intent.size <= 0) {
    throw new Error(`SAFETY: Invalid size (must be positive): ${intent.size}`);
  }
  if (intent.size > 1e12) {
    throw new Error(`SAFETY: Invalid size (too large): ${intent.size}`);
  }

  // Validate price
  if (!Number.isFinite(intent.price)) {
    throw new Error(`SAFETY: Invalid price (not finite): ${intent.price}`);
  }
  if (intent.price <= 0) {
    throw new Error(`SAFETY: Invalid price (must be positive): ${intent.price}`);
  }
  if (intent.price > 1e12) {
    throw new Error(`SAFETY: Invalid price (too large): ${intent.price}`);
  }

  // Validate type
  if (!['MARKET', 'LIMIT'].includes(intent.type)) {
    throw new Error(`SAFETY: Invalid type: ${intent.type}. Must be MARKET or LIMIT`);
  }

  return true;
}

/**
 * Check position cap - enforce maximum position size
 * @param {number} currentPosition - Current position size (USD)
 * @param {number} orderSize - Order size (USD)
 * @param {number} maxPositionUsd - Maximum position size
 * @throws {Error} If position cap would be exceeded
 */
export function checkPositionCap(currentPosition, orderSize, maxPositionUsd) {
  // Validate inputs
  if (!Number.isFinite(currentPosition)) {
    throw new Error('SAFETY: Current position must be finite number');
  }
  if (!Number.isFinite(orderSize)) {
    throw new Error('SAFETY: Order size must be finite number');
  }
  if (!Number.isFinite(maxPositionUsd) || maxPositionUsd <= 0) {
    throw new Error('SAFETY: Max position must be positive finite number');
  }

  // Calculate new position (absolute value for long/short)
  const newPosition = Math.abs(currentPosition + orderSize);

  // Check cap
  if (newPosition > maxPositionUsd) {
    throw new Error(
      `SAFETY: Position cap exceeded. ` +
      `Current: ${currentPosition.toFixed(2)}, ` +
      `Order: ${orderSize.toFixed(2)}, ` +
      `New: ${newPosition.toFixed(2)}, ` +
      `Cap: ${maxPositionUsd.toFixed(2)}`
    );
  }

  return true;
}

/**
 * Check daily loss cap - enforce maximum daily loss
 * @param {number} dailyPnL - Daily P&L (negative = loss)
 * @param {number} maxDailyLossUsd - Maximum daily loss (positive number)
 * @throws {Error} If daily loss cap exceeded
 */
export function checkDailyLossCap(dailyPnL, maxDailyLossUsd) {
  // Validate inputs
  if (!Number.isFinite(dailyPnL)) {
    throw new Error('SAFETY: Daily PnL must be finite number');
  }
  if (!Number.isFinite(maxDailyLossUsd) || maxDailyLossUsd <= 0) {
    throw new Error('SAFETY: Max daily loss must be positive finite number');
  }

  // Check cap (dailyPnL is negative for losses)
  if (dailyPnL < -maxDailyLossUsd) {
    throw new Error(
      `SAFETY: Daily loss cap exceeded. ` +
      `Current PnL: ${dailyPnL.toFixed(2)}, ` +
      `Cap: -${maxDailyLossUsd.toFixed(2)}`
    );
  }

  return true;
}

/**
 * Require confirmation for live mode
 * @param {boolean} liveMode - Whether live mode is enabled
 * @param {boolean} confirmationGiven - Whether confirmation was given
 * @throws {Error} If confirmation not given for live mode
 */
export function requireConfirmation(liveMode, confirmationGiven) {
  if (liveMode && !confirmationGiven) {
    throw new Error(
      'SAFETY: LIVE MODE requires explicit confirmation. ' +
      'This will place REAL ORDERS with REAL MONEY. ' +
      'Set confirmationGiven=true ONLY if you understand the risks.'
    );
  }

  return true;
}

/**
 * Audit log entry for real orders
 * @param {Object} intent - Order intent
 * @param {Object} context - Execution context
 * @param {Object} eventLog - Event logger
 */
export function auditLog(intent, context, eventLog) {
  if (!eventLog) {
    console.warn('SAFETY: No event log provided for audit');
    return;
  }

  // Create audit entry
  const auditEntry = {
    timestamp: Date.now(),
    intent: {
      side: intent.side,
      size: intent.size,
      price: intent.price,
      type: intent.type
    },
    context: {
      run_id: context.run_id,
      hack_id: context.hack_id,
      mode: context.mode,
      bar_idx: context.bar_idx
    },
    warning: '⚠️ REAL ORDER - THIS USES REAL MONEY'
  };

  // Log to event system
  eventLog.sys('audit_real_order', auditEntry);

  // Also log to console for visibility
  console.warn('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.warn('⚠️  AUDIT: REAL ORDER PLACED');
  console.warn('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.warn(`Side: ${intent.side}`);
  console.warn(`Size: ${intent.size} USD`);
  console.warn(`Price: ${intent.price}`);
  console.warn(`Type: ${intent.type}`);
  console.warn(`Run ID: ${context.run_id}`);
  console.warn('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

/**
 * Validate environment for live trading
 * @param {string} apiKey - Binance API key
 * @param {string} apiSecret - Binance API secret
 * @throws {Error} If environment is not ready for live trading
 */
export function validateEnvironment(apiKey, apiSecret) {
  // Check API keys present
  if (!apiKey || apiKey.trim() === '') {
    throw new Error('SAFETY: BINANCE_API_KEY not set in environment');
  }
  if (!apiSecret || apiSecret.trim() === '') {
    throw new Error('SAFETY: BINANCE_API_SECRET not set in environment');
  }

  // Check API keys not placeholder
  if (apiKey === 'your_api_key_here' || apiKey.includes('placeholder')) {
    throw new Error('SAFETY: BINANCE_API_KEY appears to be placeholder');
  }
  if (apiSecret === 'your_api_secret_here' || apiSecret.includes('placeholder')) {
    throw new Error('SAFETY: BINANCE_API_SECRET appears to be placeholder');
  }

  // Check minimum length (Binance keys are typically 64 chars)
  if (apiKey.length < 32) {
    throw new Error('SAFETY: BINANCE_API_KEY too short (possible corruption)');
  }
  if (apiSecret.length < 32) {
    throw new Error('SAFETY: BINANCE_API_SECRET too short (possible corruption)');
  }

  return true;
}

/**
 * Sanitize sensitive data for logging
 * @param {string} text - Text that may contain sensitive data
 * @returns {string} Sanitized text
 */
export function sanitize(text) {
  if (!text) return text;

  // Redact API keys (look for common patterns)
  let sanitized = text;

  // Redact long alphanumeric strings (likely keys)
  sanitized = sanitized.replace(/[A-Za-z0-9]{32,}/g, '[REDACTED]');

  // Redact common key patterns
  sanitized = sanitized.replace(/apiKey[=:]?\s*['"]?[^'"}\s]+['"]?/gi, 'apiKey=[REDACTED]');
  sanitized = sanitized.replace(/apiSecret[=:]?\s*['"]?[^'"}\s]+['"]?/gi, 'apiSecret=[REDACTED]');
  sanitized = sanitized.replace(/api_key[=:]?\s*['"]?[^'"}\s]+['"]?/gi, 'api_key=[REDACTED]');
  sanitized = sanitized.replace(/api_secret[=:]?\s*['"]?[^'"}\s]+['"]?/gi, 'api_secret=[REDACTED]');

  return sanitized;
}

/**
 * Emergency stop - block ALL orders
 * @param {Object} state - Adapter state
 * @param {string} reason - Reason for emergency stop
 * @param {Object} eventLog - Event logger
 */
export function emergencyStop(state, reason, eventLog) {
  // Set emergency flag
  state.emergencyStop = true;
  state.emergencyReason = reason;

  // Log emergency
  if (eventLog) {
    eventLog.sys('emergency_stop', {
      reason,
      timestamp: Date.now(),
      warning: '🚨 EMERGENCY STOP ACTIVATED - ALL TRADING HALTED'
    });
  }

  // Console alert
  console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.error('🚨 EMERGENCY STOP ACTIVATED');
  console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.error(`Reason: ${reason}`);
  console.error('ALL TRADING HALTED');
  console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

/**
 * Check if emergency stop is active
 * @param {Object} state - Adapter state
 * @throws {Error} If emergency stop is active
 */
export function checkEmergencyStop(state) {
  if (state.emergencyStop) {
    throw new Error(
      `SAFETY: Emergency stop is active. Reason: ${state.emergencyReason}. ` +
      'NO ORDERS ALLOWED. Manual intervention required.'
    );
  }
  return true;
}

export default {
  validateIntent,
  checkPositionCap,
  checkDailyLossCap,
  requireConfirmation,
  auditLog,
  validateEnvironment,
  sanitize,
  emergencyStop,
  checkEmergencyStop
};
