#!/usr/bin/env node
// scripts/profit/OpportunityHunter.mjs
// Autonomous Opportunity Hunter Agent
// Continuously scans for profitable opportunities

import { EventEmitter } from 'events';
import { DataAgent } from '../data/DataAgent.mjs';
import { OpportunityDetector } from './OpportunityDetector.mjs';
import { ProfitCalculator } from './ProfitCalculator.mjs';

const HUNT_MODES = {
  AGGRESSIVE: 'AGGRESSIVE',   // Detect all opportunities (min score 0.6)
  BALANCED: 'BALANCED',       // Moderate selectivity (min score 0.7)
  CONSERVATIVE: 'CONSERVATIVE' // High selectivity (min score 0.8)
};

export class OpportunityHunter extends EventEmitter {
  constructor(options = {}) {
    super();

    this.symbol = options.symbol || 'BTCUSDT';
    this.mode = options.mode || HUNT_MODES.BALANCED;
    this.verbose = options.verbose || false;

    // Components
    this.dataAgent = new DataAgent({
      symbol: this.symbol,
      verbose: this.verbose,
      autonomous: true,
      autoRecovery: true
    });

    const minScore = this.getMinScoreForMode(this.mode);
    this.detector = new OpportunityDetector({
      minOpportunityScore: minScore,
      minProfitPotential: 0.5,
      fees: options.fees
    });

    this.profitCalc = new ProfitCalculator(options.fees);

    // Hunting state
    this.isHunting = false;
    this.startTime = null;
    this.opportunitiesFound = 0;
    this.bestOpportunity = null;

    // Performance tracking
    this.priceUpdates = 0;
    this.scanCount = 0;
  }

  log(msg) {
    if (this.verbose) {
      console.log(`[OpportunityHunter] ${msg}`);
    }
  }

  warn(msg) {
    console.warn(`[OpportunityHunter] WARNING: ${msg}`);
  }

  getMinScoreForMode(mode) {
    const scores = {
      [HUNT_MODES.AGGRESSIVE]: 0.6,
      [HUNT_MODES.BALANCED]: 0.7,
      [HUNT_MODES.CONSERVATIVE]: 0.8
    };
    return scores[mode] || 0.7;
  }

  /**
   * Start hunting for opportunities
   */
  async startHunting() {
    this.log('Starting opportunity hunt...');
    this.startTime = Date.now();
    this.isHunting = true;

    // Setup data agent event handlers
    this.setupDataAgentHandlers();

    // Initialize data agent
    try {
      await this.dataAgent.initialize();
      this.emit('hunt_started', {
        symbol: this.symbol,
        mode: this.mode,
        minScore: this.detector.minOpportunityScore
      });
    } catch (err) {
      this.warn(`Failed to initialize: ${err.message}`);
      this.emit('hunt_failed', err);
      throw err;
    }
  }

  /**
   * Setup data agent event handlers
   */
  setupDataAgentHandlers() {
    // Price updates
    this.dataAgent.on('price_update', (priceData) => {
      this.handlePriceUpdate(priceData);
    });

    // State changes
    this.dataAgent.on('state_change', (transition) => {
      this.log(`Data agent state: ${transition.from} → ${transition.to}`);
      this.emit('agent_state_change', transition);
    });

    // Health checks
    this.dataAgent.on('health_check', (health) => {
      this.emit('health_check', health);
    });
  }

  /**
   * Handle price update from data agent
   */
  handlePriceUpdate(priceData) {
    this.priceUpdates++;

    // Only process high-confidence data
    if (!priceData.tradeable) {
      this.log(`Skipping scan: low confidence ${priceData.confidence.toFixed(2)}`);
      return;
    }

    // Update detector with new price
    this.detector.updatePrice(priceData);

    // Scan for opportunities
    this.scanCount++;
    const opportunities = this.detector.detectOpportunities();

    if (opportunities.length > 0) {
      this.handleOpportunities(opportunities, priceData);
    }
  }

  /**
   * Handle detected opportunities
   */
  handleOpportunities(opportunities, priceData) {
    opportunities.forEach(opp => {
      this.opportunitiesFound++;

      // Calculate detailed PnL
      const pnl = this.profitCalc.calculatePnL({
        entryPrice: opp.entryPrice,
        exitPrice: opp.targetPrice,
        size: 1.0, // Normalized
        side: opp.side,
        includeFees: true,
        includeSlippage: true
      });

      // Enrich opportunity with PnL data
      const enrichedOpp = {
        ...opp,
        id: this.opportunitiesFound,
        symbol: this.symbol,
        detectedAt: Date.now(),
        priceData: {
          price: priceData.price,
          confidence: priceData.confidence,
          source: priceData.metadata.source
        },
        pnl: {
          netRoi: pnl.roi,
          grossRoi: pnl.grossRoi,
          fees: pnl.fees.total,
          slippage: pnl.slippage.total,
          breakEven: pnl.breakEvenExit
        }
      };

      // Track best opportunity
      if (!this.bestOpportunity || opp.score > this.bestOpportunity.score) {
        this.bestOpportunity = enrichedOpp;
      }

      this.log(`TREASURE FOUND #${enrichedOpp.id}: ${opp.type} (score=${opp.score.toFixed(2)})`);
      this.emit('opportunity_found', enrichedOpp);
    });
  }

  /**
   * Stop hunting
   */
  async stopHunting() {
    this.log('Stopping hunt...');
    this.isHunting = false;

    await this.dataAgent.shutdown();

    this.emit('hunt_stopped', this.getPerformance());
  }

  /**
   * Get hunting performance
   */
  getPerformance() {
    const elapsed = this.startTime ? Date.now() - this.startTime : 0;
    const elapsedSec = elapsed / 1000;

    return {
      elapsed: elapsedSec,
      priceUpdates: this.priceUpdates,
      scans: this.scanCount,
      opportunitiesFound: this.opportunitiesFound,
      scansPerUpdate: this.priceUpdates > 0
        ? (this.scanCount / this.priceUpdates).toFixed(2)
        : 0,
      opportunitiesPerMinute: elapsedSec > 0
        ? ((this.opportunitiesFound / elapsedSec) * 60).toFixed(2)
        : 0,
      bestOpportunity: this.bestOpportunity,
      mode: this.mode,
      symbol: this.symbol
    };
  }

  /**
   * Get current status
   */
  getStatus() {
    return {
      isHunting: this.isHunting,
      mode: this.mode,
      symbol: this.symbol,
      performance: this.getPerformance(),
      dataAgent: this.dataAgent.getStatus(),
      detector: this.detector.getStats()
    };
  }
}

export { HUNT_MODES };
export default OpportunityHunter;
