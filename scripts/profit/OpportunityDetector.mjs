#!/usr/bin/env node
// scripts/profit/OpportunityDetector.mjs
// Opportunity detection and scoring system
// Finds "treasures" in price data

import { ProfitCalculator } from './ProfitCalculator.mjs';

const OPPORTUNITY_TYPES = {
  PRICE_SPIKE: 'PRICE_SPIKE',         // Rapid price movement
  VOLATILITY: 'VOLATILITY',           // High volatility period
  TREND_REVERSAL: 'TREND_REVERSAL',   // Trend change
  BREAKOUT: 'BREAKOUT'                // Price breakout
};

const MIN_OPPORTUNITY_SCORE = 0.6; // Minimum score to report
const MIN_PROFIT_POTENTIAL = 0.5;  // Minimum 0.5% profit potential

export class OpportunityDetector {
  constructor(options = {}) {
    this.profitCalc = new ProfitCalculator(options.fees || {});
    this.priceHistory = [];
    this.maxHistorySize = options.maxHistorySize || 100;
    this.minOpportunityScore = options.minOpportunityScore || MIN_OPPORTUNITY_SCORE;
    this.minProfitPotential = options.minProfitPotential || MIN_PROFIT_POTENTIAL;
    
    // Opportunity tracking
    this.detectedOpportunities = [];
    this.opportunityCount = 0;
  }

  /**
   * Update price history
   * @param {Object} priceData - Price data with confidence
   */
  updatePrice(priceData) {
    this.priceHistory.push({
      price: priceData.price,
      confidence: priceData.confidence,
      timestamp: priceData.metadata?.timestamp || Date.now()
    });

    // Trim history
    if (this.priceHistory.length > this.maxHistorySize) {
      this.priceHistory.shift();
    }
  }

  /**
   * Detect opportunities in current market conditions
   * @returns {Array} Detected opportunities
   */
  detectOpportunities() {
    if (this.priceHistory.length < 10) {
      return []; // Need more data
    }

    const opportunities = [];

    // Check for price spikes
    const spikeOpp = this.detectPriceSpike();
    if (spikeOpp) opportunities.push(spikeOpp);

    // Check for volatility opportunities
    const volOpp = this.detectVolatility();
    if (volOpp) opportunities.push(volOpp);

    // Check for trend reversal
    const reversalOpp = this.detectTrendReversal();
    if (reversalOpp) opportunities.push(reversalOpp);

    // Filter by minimum score
    const filtered = opportunities.filter(opp => 
      opp.score >= this.minOpportunityScore &&
      opp.profitPotential >= this.minProfitPotential
    );

    // Track detected opportunities
    filtered.forEach(opp => {
      this.opportunityCount++;
      this.detectedOpportunities.push({
        ...opp,
        detectedAt: Date.now(),
        id: this.opportunityCount
      });
    });

    // Keep last 100 opportunities
    if (this.detectedOpportunities.length > 100) {
      this.detectedOpportunities = this.detectedOpportunities.slice(-100);
    }

    return filtered;
  }

  /**
   * Detect price spike opportunity
   * @returns {Object|null} Opportunity or null
   */
  detectPriceSpike() {
    const recent = this.priceHistory.slice(-5);
    if (recent.length < 5) return null;

    const currentPrice = recent[recent.length - 1].price;
    const avgPrice = recent.slice(0, -1).reduce((sum, p) => sum + p.price, 0) / (recent.length - 1);
    
    const priceChange = ((currentPrice - avgPrice) / avgPrice) * 100;
    
    // Spike: >1% change in short window
    if (Math.abs(priceChange) > 1.0) {
      const side = priceChange > 0 ? 'SHORT' : 'LONG'; // Counter-trend
      const entryPrice = currentPrice;
      const targetPrice = avgPrice; // Mean reversion
      const stopLoss = side === 'LONG' 
        ? currentPrice * 0.98  // 2% stop
        : currentPrice * 1.02;

      const rr = this.profitCalc.calculateRiskReward({
        entryPrice,
        targetPrice,
        stopLoss,
        side
      });

      const profitPotential = Math.abs(priceChange);
      const signalStrength = Math.min(Math.abs(priceChange) / 2, 1.0); // Max at 2%
      const avgConfidence = recent.reduce((sum, p) => sum + p.confidence, 0) / recent.length;

      const score = this.calculateOpportunityScore({
        profitPotential,
        priceConfidence: avgConfidence,
        signalStrength,
        riskReward: rr.ratio,
        executionCost: 0.2 // fees + slippage
      });

      return {
        type: OPPORTUNITY_TYPES.PRICE_SPIKE,
        score,
        side,
        entryPrice,
        targetPrice,
        stopLoss,
        profitPotential,
        riskReward: rr.ratio,
        signalStrength,
        confidence: avgConfidence,
        description: `${side} on ${priceChange > 0 ? 'spike up' : 'spike down'} ${Math.abs(priceChange).toFixed(2)}%`
      };
    }

    return null;
  }

  /**
   * Detect volatility opportunity
   * @returns {Object|null} Opportunity or null
   */
  detectVolatility() {
    const recent = this.priceHistory.slice(-20);
    if (recent.length < 20) return null;

    // Calculate volatility (standard deviation)
    const prices = recent.map(p => p.price);
    const avg = prices.reduce((sum, p) => sum + p, 0) / prices.length;
    const squaredDiffs = prices.map(p => Math.pow(p - avg, 2));
    const variance = squaredDiffs.reduce((sum, d) => sum + d, 0) / prices.length;
    const stdDev = Math.sqrt(variance);
    const volatility = (stdDev / avg) * 100;

    // High volatility: >0.5%
    if (volatility > 0.5) {
      const currentPrice = recent[recent.length - 1].price;
      const side = 'LONG'; // Assume long bias
      const entryPrice = currentPrice;
      const targetPrice = currentPrice * 1.015; // 1.5% target
      const stopLoss = currentPrice * 0.985;    // 1.5% stop

      const rr = this.profitCalc.calculateRiskReward({
        entryPrice,
        targetPrice,
        stopLoss,
        side
      });

      const profitPotential = 1.5;
      const signalStrength = Math.min(volatility / 1.0, 1.0); // Max at 1% volatility
      const avgConfidence = recent.reduce((sum, p) => sum + p.confidence, 0) / recent.length;

      const score = this.calculateOpportunityScore({
        profitPotential,
        priceConfidence: avgConfidence,
        signalStrength,
        riskReward: rr.ratio,
        executionCost: 0.2
      });

      return {
        type: OPPORTUNITY_TYPES.VOLATILITY,
        score,
        side,
        entryPrice,
        targetPrice,
        stopLoss,
        profitPotential,
        riskReward: rr.ratio,
        signalStrength,
        confidence: avgConfidence,
        volatility,
        description: `High volatility ${volatility.toFixed(2)}% - scalp opportunity`
      };
    }

    return null;
  }

  /**
   * Detect trend reversal opportunity
   * @returns {Object|null} Opportunity or null
   */
  detectTrendReversal() {
    const recent = this.priceHistory.slice(-15);
    if (recent.length < 15) return null;

    const first5 = recent.slice(0, 5);
    const last5 = recent.slice(-5);

    const firstAvg = first5.reduce((sum, p) => sum + p.price, 0) / 5;
    const lastAvg = last5.reduce((sum, p) => sum + p.price, 0) / 5;

    const trendChange = ((lastAvg - firstAvg) / firstAvg) * 100;

    // Reversal: trend changed >0.8%
    if (Math.abs(trendChange) > 0.8) {
      const side = trendChange > 0 ? 'LONG' : 'SHORT'; // Follow new trend
      const currentPrice = recent[recent.length - 1].price;
      const entryPrice = currentPrice;
      const targetPrice = side === 'LONG'
        ? currentPrice * 1.01  // 1% target
        : currentPrice * 0.99;
      const stopLoss = side === 'LONG'
        ? currentPrice * 0.995 // 0.5% stop
        : currentPrice * 1.005;

      const rr = this.profitCalc.calculateRiskReward({
        entryPrice,
        targetPrice,
        stopLoss,
        side
      });

      const profitPotential = 1.0;
      const signalStrength = Math.min(Math.abs(trendChange) / 1.5, 1.0);
      const avgConfidence = recent.reduce((sum, p) => sum + p.confidence, 0) / recent.length;

      const score = this.calculateOpportunityScore({
        profitPotential,
        priceConfidence: avgConfidence,
        signalStrength,
        riskReward: rr.ratio,
        executionCost: 0.2
      });

      return {
        type: OPPORTUNITY_TYPES.TREND_REVERSAL,
        score,
        side,
        entryPrice,
        targetPrice,
        stopLoss,
        profitPotential,
        riskReward: rr.ratio,
        signalStrength,
        confidence: avgConfidence,
        description: `Trend reversal ${trendChange > 0 ? 'bullish' : 'bearish'} ${Math.abs(trendChange).toFixed(2)}%`
      };
    }

    return null;
  }

  /**
   * Calculate overall opportunity score
   * @param {Object} factors
   * @returns {number} Score 0.0-1.0
   */
  calculateOpportunityScore(factors) {
    const {
      profitPotential,    // % expected profit
      priceConfidence,    // 0.0-1.0
      signalStrength,     // 0.0-1.0
      riskReward,         // RR ratio (e.g., 2.0)
      executionCost       // % cost
    } = factors;

    // Normalize profit potential (0.5% = 0.5, 2% = 1.0)
    const profitScore = Math.min(profitPotential / 2.0, 1.0);

    // Normalize risk/reward (2:1 = 0.5, 4:1 = 1.0)
    const rrScore = Math.min(riskReward / 4.0, 1.0);

    // Cost penalty (0.1% = 1.0, 0.5% = 0.5)
    const costScore = Math.max(1.0 - (executionCost / 0.5), 0);

    // Weighted average
    const score = (
      profitScore * 0.3 +
      priceConfidence * 0.25 +
      signalStrength * 0.25 +
      rrScore * 0.15 +
      costScore * 0.05
    );

    return Math.max(0, Math.min(1.0, score));
  }

  /**
   * Get detection statistics
   * @returns {Object} Stats
   */
  getStats() {
    return {
      totalDetected: this.opportunityCount,
      recentCount: this.detectedOpportunities.length,
      priceHistorySize: this.priceHistory.length,
      lastUpdate: this.priceHistory.length > 0
        ? this.priceHistory[this.priceHistory.length - 1].timestamp
        : null
    };
  }

  /**
   * Get recent opportunities
   * @param {number} count - Number to return
   * @returns {Array} Recent opportunities
   */
  getRecentOpportunities(count = 10) {
    return this.detectedOpportunities.slice(-count);
  }
}

export { OPPORTUNITY_TYPES };
export default OpportunityDetector;
