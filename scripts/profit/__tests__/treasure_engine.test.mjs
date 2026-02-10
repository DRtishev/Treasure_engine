#!/usr/bin/env node
// scripts/profit/__tests__/treasure_engine.test.mjs
// Comprehensive tests for Treasure Engine profit system

import { ProfitCalculator } from '../ProfitCalculator.mjs';
import { OpportunityDetector, OPPORTUNITY_TYPES } from '../OpportunityDetector.mjs';

let passed = 0;
let failed = 0;

function assert(condition, msg) {
  if (condition) {
    passed++;
    console.log(`✓ ${msg}`);
  } else {
    failed++;
    console.error(`✗ ${msg}`);
  }
}

// ━━━ PROFIT CALCULATOR TESTS ━━━

function testPnLCalculation() {
  console.log('\n━━━ PROFIT/LOSS CALCULATION ━━━');

  const calc = new ProfitCalculator();

  // LONG profitable trade
  const longTrade = calc.calculatePnL({
    entryPrice: 100,
    exitPrice: 105,
    size: 1,
    side: 'LONG',
    includeFees: true,
    includeSlippage: true
  });

  assert(longTrade.grossPnL === 5, 'LONG gross PnL correct');
  assert(longTrade.netPnL < longTrade.grossPnL, 'Fees/slippage reduce net PnL');
  assert(longTrade.profitable === true, 'LONG trade is profitable');

  // SHORT profitable trade
  const shortTrade = calc.calculatePnL({
    entryPrice: 100,
    exitPrice: 95,
    size: 1,
    side: 'SHORT',
    includeFees: true,
    includeSlippage: true
  });

  assert(shortTrade.grossPnL === 5, 'SHORT gross PnL correct');
  assert(shortTrade.profitable === true, 'SHORT trade is profitable');

  // Losing trade
  const losingTrade = calc.calculatePnL({
    entryPrice: 100,
    exitPrice: 99,
    size: 1,
    side: 'LONG'
  });

  assert(losingTrade.profitable === false, 'Losing trade identified');
}

function testBreakEvenCalculation() {
  console.log('\n━━━ BREAK-EVEN CALCULATION ━━━');

  const calc = new ProfitCalculator();

  const result = calc.calculatePnL({
    entryPrice: 100,
    exitPrice: 100.3,
    size: 1,
    side: 'LONG',
    includeFees: true,
    includeSlippage: true
  });

  assert(result.breakEvenExit > 100, 'Break-even price above entry');
  assert(result.breakEvenExit < 101, 'Break-even price reasonable');
}

function testTargetExitCalculation() {
  console.log('\n━━━ TARGET EXIT CALCULATION ━━━');

  const calc = new ProfitCalculator();

  const targetExit = calc.calculateTargetExit({
    entryPrice: 100,
    targetRoi: 2.0, // 2%
    side: 'LONG',
    includeFees: true,
    includeSlippage: true
  });

  assert(targetExit > 102, 'Target exit accounts for ROI + costs');
  assert(targetExit < 103, 'Target exit reasonable');
}

function testPositionSizing() {
  console.log('\n━━━ POSITION SIZING ━━━');

  const calc = new ProfitCalculator();

  const sizing = calc.calculatePositionSize({
    capital: 10000,
    riskPercent: 1,
    entryPrice: 100,
    stopLoss: 98,
    side: 'LONG'
  });

  assert(sizing.riskAmount === 100, 'Risk amount is 1% of capital');
  assert(sizing.priceDistance === 2, 'Price distance to stop correct');
  assert(sizing.size === 50, 'Position size correct (100 / 2)');
}

function testRiskRewardRatio() {
  console.log('\n━━━ RISK/REWARD RATIO ━━━');

  const calc = new ProfitCalculator();

  const rr = calc.calculateRiskReward({
    entryPrice: 100,
    targetPrice: 106,
    stopLoss: 98,
    side: 'LONG'
  });

  assert(rr.rewardDistance === 6, 'Reward distance correct');
  assert(rr.riskDistance === 2, 'Risk distance correct');
  assert(rr.ratio === 3.0, 'RR ratio correct (3:1)');
  assert(rr.acceptable === true, 'RR ratio acceptable (>=2:1)');
}

function testFeeConfiguration() {
  console.log('\n━━━ FEE CONFIGURATION ━━━');

  const calc = new ProfitCalculator({
    makerFee: 0.0005,
    takerFee: 0.001,
    slippage: 0.0003
  });

  const fees = calc.getFees();
  assert(fees.maker === 0.0005, 'Custom maker fee set');
  assert(fees.taker === 0.001, 'Custom taker fee set');
  assert(fees.slippage === 0.0003, 'Custom slippage set');
}

// ━━━ OPPORTUNITY DETECTOR TESTS ━━━

function testOpportunityDetectorInit() {
  console.log('\n━━━ OPPORTUNITY DETECTOR INIT ━━━');

  const detector = new OpportunityDetector({
    minOpportunityScore: 0.7,
    minProfitPotential: 1.0
  });

  assert(detector.minOpportunityScore === 0.7, 'Min score configured');
  assert(detector.minProfitPotential === 1.0, 'Min profit configured');
  assert(detector.priceHistory.length === 0, 'Price history starts empty');
}

function testPriceHistoryManagement() {
  console.log('\n━━━ PRICE HISTORY MANAGEMENT ━━━');

  const detector = new OpportunityDetector({ maxHistorySize: 10 });

  // Add prices
  for (let i = 0; i < 15; i++) {
    detector.updatePrice({
      price: 100 + i,
      confidence: 1.0,
      metadata: { timestamp: Date.now() }
    });
  }

  assert(detector.priceHistory.length === 10, 'History trimmed to max size');
  assert(detector.priceHistory[0].price === 105, 'Oldest prices removed');
}

function testOpportunityScoring() {
  console.log('\n━━━ OPPORTUNITY SCORING ━━━');

  const detector = new OpportunityDetector();

  // Excellent opportunity
  const excellentScore = detector.calculateOpportunityScore({
    profitPotential: 2.0,
    priceConfidence: 1.0,
    signalStrength: 0.9,
    riskReward: 3.0,
    executionCost: 0.1
  });

  assert(excellentScore > 0.8, 'Excellent opportunity scores high');

  // Poor opportunity
  const poorScore = detector.calculateOpportunityScore({
    profitPotential: 0.3,
    priceConfidence: 0.5,
    signalStrength: 0.4,
    riskReward: 1.0,
    executionCost: 0.5
  });

  assert(poorScore < 0.5, 'Poor opportunity scores low');
}

function testDetectorStats() {
  console.log('\n━━━ DETECTOR STATISTICS ━━━');

  const detector = new OpportunityDetector();
  
  const stats = detector.getStats();
  
  assert(typeof stats.totalDetected === 'number', 'Stats include total detected');
  assert(typeof stats.recentCount === 'number', 'Stats include recent count');
  assert(typeof stats.priceHistorySize === 'number', 'Stats include history size');
}

// ━━━ OPPORTUNITY TYPES ━━━

function testOpportunityTypes() {
  console.log('\n━━━ OPPORTUNITY TYPES ━━━');

  assert(OPPORTUNITY_TYPES.PRICE_SPIKE === 'PRICE_SPIKE', 'PRICE_SPIKE type exists');
  assert(OPPORTUNITY_TYPES.VOLATILITY === 'VOLATILITY', 'VOLATILITY type exists');
  assert(OPPORTUNITY_TYPES.TREND_REVERSAL === 'TREND_REVERSAL', 'TREND_REVERSAL type exists');
  assert(OPPORTUNITY_TYPES.BREAKOUT === 'BREAKOUT', 'BREAKOUT type exists');
}

// ━━━ EDGE CASES ━━━

function testEdgeCases() {
  console.log('\n━━━ EDGE CASES ━━━');

  const calc = new ProfitCalculator();

  // Invalid side
  try {
    calc.calculatePnL({
      entryPrice: 100,
      exitPrice: 105,
      size: 1,
      side: 'INVALID'
    });
    assert(false, 'Should throw on invalid side');
  } catch (err) {
    assert(true, 'Throws on invalid side');
  }

  // Invalid stop loss for LONG
  try {
    calc.calculatePositionSize({
      capital: 10000,
      riskPercent: 1,
      entryPrice: 100,
      stopLoss: 102, // Above entry for LONG
      side: 'LONG'
    });
    assert(false, 'Should throw on invalid stop loss');
  } catch (err) {
    assert(true, 'Throws on invalid stop loss');
  }

  // Zero fees and slippage
  const noFees = calc.calculatePnL({
    entryPrice: 100,
    exitPrice: 105,
    size: 1,
    side: 'LONG',
    includeFees: false,
    includeSlippage: false
  });

  assert(noFees.netPnL === noFees.grossPnL, 'No fees/slippage = gross equals net');
}

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TREASURE ENGINE PROFIT SYSTEM TESTS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  try {
    // Profit Calculator tests
    testPnLCalculation();
    testBreakEvenCalculation();
    testTargetExitCalculation();
    testPositionSizing();
    testRiskRewardRatio();
    testFeeConfiguration();

    // Opportunity Detector tests
    testOpportunityDetectorInit();
    testPriceHistoryManagement();
    testOpportunityScoring();
    testDetectorStats();

    // General tests
    testOpportunityTypes();
    testEdgeCases();

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('RESULTS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✓ PASSED: ${passed}`);
    console.log(`✗ FAILED: ${failed}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    if (failed > 0) {
      console.error(`\n✗ ${failed} tests failed`);
      process.exit(1);
    }

    console.log('\n✓ All treasure engine tests passed');
    console.log('\n💰 TREASURE ENGINE CAPABILITIES VERIFIED:');
    console.log('   ✓ Profit/loss calculations (with fees/slippage)');
    console.log('   ✓ Risk/reward analysis');
    console.log('   ✓ Position sizing');
    console.log('   ✓ Break-even calculations');
    console.log('   ✓ Opportunity detection');
    console.log('   ✓ Opportunity scoring');
    console.log('');

    process.exit(0);
  } catch (err) {
    console.error('\n✗ Unexpected error:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

main();
