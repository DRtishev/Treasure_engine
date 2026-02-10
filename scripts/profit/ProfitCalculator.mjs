#!/usr/bin/env node
// scripts/profit/ProfitCalculator.mjs
// Mathematical profit/loss calculator with fees, slippage, and costs
// Zero assumptions - pure math

const DEFAULT_FEES = {
  maker: 0.001,  // 0.1% maker fee (Binance standard)
  taker: 0.001   // 0.1% taker fee
};

const DEFAULT_SLIPPAGE = 0.0005; // 0.05% slippage estimate

export class ProfitCalculator {
  constructor(options = {}) {
    this.makerFee = options.makerFee || DEFAULT_FEES.maker;
    this.takerFee = options.takerFee || DEFAULT_FEES.taker;
    this.slippage = options.slippage || DEFAULT_SLIPPAGE;
  }

  /**
   * Calculate profit/loss for a trade
   * @param {Object} trade
   * @param {number} trade.entryPrice - Entry price
   * @param {number} trade.exitPrice - Exit price
   * @param {number} trade.size - Position size (in base currency)
   * @param {string} trade.side - 'LONG' or 'SHORT'
   * @param {boolean} trade.includeFees - Include trading fees
   * @param {boolean} trade.includeSlippage - Include slippage estimate
   * @returns {Object} PnL details
   */
  calculatePnL(trade) {
    const {
      entryPrice,
      exitPrice,
      size,
      side = 'LONG',
      includeFees = true,
      includeSlippage = true
    } = trade;

    // Gross P&L (before fees/slippage)
    let grossPnL;
    if (side === 'LONG') {
      grossPnL = (exitPrice - entryPrice) * size;
    } else if (side === 'SHORT') {
      grossPnL = (entryPrice - exitPrice) * size;
    } else {
      throw new Error(`Invalid side: ${side}. Must be 'LONG' or 'SHORT'`);
    }

    // Entry cost
    const entryCost = entryPrice * size;
    
    // Exit value
    const exitValue = exitPrice * size;

    // Fees
    let entryFee = 0;
    let exitFee = 0;
    if (includeFees) {
      // Assume taker fees for both entry and exit (conservative)
      entryFee = entryCost * this.takerFee;
      exitFee = exitValue * this.takerFee;
    }

    // Slippage
    let entrySlippage = 0;
    let exitSlippage = 0;
    if (includeSlippage) {
      entrySlippage = entryCost * this.slippage;
      exitSlippage = exitValue * this.slippage;
    }

    // Net P&L
    const totalFees = entryFee + exitFee;
    const totalSlippage = entrySlippage + exitSlippage;
    const totalCosts = totalFees + totalSlippage;
    const netPnL = grossPnL - totalCosts;

    // ROI
    const roi = (netPnL / entryCost) * 100;
    const grossRoi = (grossPnL / entryCost) * 100;

    // Break-even exit price (including costs)
    let breakEvenExit;
    if (side === 'LONG') {
      breakEvenExit = entryPrice * (1 + (totalCosts / entryCost));
    } else {
      breakEvenExit = entryPrice * (1 - (totalCosts / entryCost));
    }

    return {
      grossPnL,
      netPnL,
      roi,
      grossRoi,
      fees: {
        entry: entryFee,
        exit: exitFee,
        total: totalFees
      },
      slippage: {
        entry: entrySlippage,
        exit: exitSlippage,
        total: totalSlippage
      },
      costs: {
        fees: totalFees,
        slippage: totalSlippage,
        total: totalCosts
      },
      breakEvenExit,
      profitable: netPnL > 0
    };
  }

  /**
   * Calculate required exit price for target profit
   * @param {Object} params
   * @param {number} params.entryPrice - Entry price
   * @param {number} params.targetRoi - Target ROI (%)
   * @param {string} params.side - 'LONG' or 'SHORT'
   * @param {boolean} params.includeFees - Include fees
   * @param {boolean} params.includeSlippage - Include slippage
   * @returns {number} Required exit price
   */
  calculateTargetExit(params) {
    const {
      entryPrice,
      targetRoi,
      side = 'LONG',
      includeFees = true,
      includeSlippage = true
    } = params;

    const targetRoiDecimal = targetRoi / 100;
    
    // Calculate total cost factor
    let costFactor = 0;
    if (includeFees) {
      costFactor += this.takerFee * 2; // Entry + exit
    }
    if (includeSlippage) {
      costFactor += this.slippage * 2; // Entry + exit
    }

    if (side === 'LONG') {
      // exitPrice = entryPrice * (1 + targetRoi + costs)
      return entryPrice * (1 + targetRoiDecimal + costFactor);
    } else {
      // exitPrice = entryPrice * (1 - targetRoi - costs)
      return entryPrice * (1 - targetRoiDecimal - costFactor);
    }
  }

  /**
   * Calculate position size for risk amount
   * @param {Object} params
   * @param {number} params.capital - Available capital
   * @param {number} params.riskPercent - Risk as % of capital
   * @param {number} params.entryPrice - Entry price
   * @param {number} params.stopLoss - Stop loss price
   * @param {string} params.side - 'LONG' or 'SHORT'
   * @returns {Object} Position sizing details
   */
  calculatePositionSize(params) {
    const {
      capital,
      riskPercent,
      entryPrice,
      stopLoss,
      side = 'LONG'
    } = params;

    const riskAmount = capital * (riskPercent / 100);
    
    // Price distance to stop loss
    const priceDistance = side === 'LONG' 
      ? entryPrice - stopLoss
      : stopLoss - entryPrice;

    if (priceDistance <= 0) {
      throw new Error('Invalid stop loss: must be below entry for LONG, above for SHORT');
    }

    // Size = risk amount / price distance
    const size = riskAmount / priceDistance;
    
    // Position value
    const positionValue = size * entryPrice;
    
    // Leverage required (if using margin)
    const leverage = positionValue / capital;

    return {
      size,
      positionValue,
      riskAmount,
      priceDistance,
      leverage,
      capital,
      riskPercent
    };
  }

  /**
   * Calculate risk/reward ratio
   * @param {Object} params
   * @param {number} params.entryPrice - Entry price
   * @param {number} params.targetPrice - Target profit price
   * @param {number} params.stopLoss - Stop loss price
   * @param {string} params.side - 'LONG' or 'SHORT'
   * @returns {Object} Risk/reward analysis
   */
  calculateRiskReward(params) {
    const {
      entryPrice,
      targetPrice,
      stopLoss,
      side = 'LONG'
    } = params;

    let rewardDistance, riskDistance;
    
    if (side === 'LONG') {
      rewardDistance = targetPrice - entryPrice;
      riskDistance = entryPrice - stopLoss;
    } else {
      rewardDistance = entryPrice - targetPrice;
      riskDistance = stopLoss - entryPrice;
    }

    if (riskDistance <= 0) {
      throw new Error('Invalid stop loss');
    }

    const ratio = rewardDistance / riskDistance;
    const rewardPercent = (rewardDistance / entryPrice) * 100;
    const riskPercent = (riskDistance / entryPrice) * 100;

    return {
      ratio,
      rewardDistance,
      riskDistance,
      rewardPercent,
      riskPercent,
      acceptable: ratio >= 2.0 // Minimum 2:1 RR
    };
  }

  /**
   * Get fee configuration
   * @returns {Object} Fee settings
   */
  getFees() {
    return {
      maker: this.makerFee,
      taker: this.takerFee,
      slippage: this.slippage
    };
  }
}

export default ProfitCalculator;
