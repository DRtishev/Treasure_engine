#!/usr/bin/env node
// scripts/profit/treasure_map_demo.mjs
// Live Treasure Map - Real-time opportunity visualization
// Shows the engine FINDING MONEY in real-time

import { OpportunityHunter, HUNT_MODES } from './OpportunityHunter.mjs';

const DEFAULT_SYMBOL = 'BTCUSDT';
const DEFAULT_DURATION = 120; // seconds
const DEFAULT_MODE = HUNT_MODES.BALANCED;

function formatPrice(price) {
  return price ? parseFloat(price).toFixed(2) : 'N/A';
}

function formatPercent(value) {
  return value ? (value * 100).toFixed(2) + '%' : 'N/A';
}

function formatScore(score) {
  return score ? (score * 100).toFixed(1) + '%' : 'N/A';
}

function getScoreIndicator(score) {
  if (score >= 0.9) return '🔥'; // HOT
  if (score >= 0.8) return '💎'; // EXCELLENT
  if (score >= 0.7) return '✨'; // GOOD
  if (score >= 0.6) return '⭐'; // DECENT
  return '•';
}

function formatTimestamp() {
  return new Date().toISOString().split('T')[1].split('.')[0];
}

async function main() {
  const args = process.argv.slice(2);
  const symbol = (args[0] || DEFAULT_SYMBOL).toUpperCase();
  const duration = parseInt(args[1] || DEFAULT_DURATION, 10);
  const modeArg = (args[2] || DEFAULT_MODE).toUpperCase();
  const mode = HUNT_MODES[modeArg] || DEFAULT_MODE;

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('💰 TREASURE ENGINE — OPPORTUNITY HUNTER');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Symbol:      ${symbol}`);
  console.log(`Duration:    ${duration}s`);
  console.log(`Hunt Mode:   ${mode}`);
  console.log(`Min Score:   ${mode === HUNT_MODES.AGGRESSIVE ? '60%' : mode === HUNT_MODES.BALANCED ? '70%' : '80%'}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('🔍 HUNTING FOR TREASURES:');
  console.log('   💎 Profit opportunities (real-time)');
  console.log('   📊 Risk/reward analysis');
  console.log('   🎯 Entry/exit levels');
  console.log('   💰 Expected profit calculations');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  const hunter = new OpportunityHunter({
    symbol,
    mode,
    verbose: process.env.HUNTER_VERBOSE === '1',
    fees: {
      maker: 0.001,
      taker: 0.001,
      slippage: 0.0005
    }
  });

  let treasuresFound = 0;
  let bestTreasure = null;
  const startTime = Date.now();

  // Event: Hunt started
  hunter.on('hunt_started', (info) => {
    console.log(`✓ Hunt started: ${info.symbol} (mode=${info.mode}, minScore=${formatScore(info.minScore)})`);
    console.log('');
    console.log('Time       Type              Score  Side   Entry      Target     Profit    RR    Description');
    console.log('───────────────────────────────────────────────────────────────────────────────────────────────────────────');
  });

  // Event: Opportunity found (TREASURE!)
  hunter.on('opportunity_found', (opp) => {
    treasuresFound++;

    const {
      type,
      score,
      side,
      entryPrice,
      targetPrice,
      profitPotential,
      riskReward,
      description,
      pnl
    } = opp;

    const timestamp = formatTimestamp();
    const indicator = getScoreIndicator(score);
    const typeStr = type.substring(0, 16).padEnd(16);
    const scoreStr = formatScore(score).padStart(6);
    const sideStr = side.padEnd(6);
    const entryStr = formatPrice(entryPrice).padStart(10);
    const targetStr = formatPrice(targetPrice).padStart(10);
    const profitStr = `${profitPotential.toFixed(2)}%`.padStart(9);
    const rrStr = `${riskReward.toFixed(1)}:1`.padStart(5);

    console.log(
      `${timestamp}  ${indicator} ${typeStr} ${scoreStr}  ${sideStr} ${entryStr} ${targetStr} ${profitStr} ${rrStr}  ${description}`
    );

    // Track best treasure
    if (!bestTreasure || score > bestTreasure.score) {
      bestTreasure = opp;
      console.log(`          🔥 NEW BEST OPPORTUNITY! Score=${formatScore(score)} NetROI=${pnl.netRoi.toFixed(2)}%`);
    }
  });

  // Event: Agent state change
  hunter.on('agent_state_change', (transition) => {
    if (transition.from !== transition.to) {
      console.log('');
      console.log(`⚡ Data Agent: ${transition.from} → ${transition.to} (${transition.reason})`);
      console.log('');
    }
  });

  // Event: Hunt failed
  hunter.on('hunt_failed', (err) => {
    console.error('');
    console.error('✗ Hunt initialization failed:', err.message);
    console.error('   Entering degraded mode...');
    console.error('');
  });

  try {
    // Start the hunt!
    console.log('🚀 Initializing hunter...');
    console.log('');
    await hunter.startHunting();

    // Hunt for specified duration
    await new Promise(resolve => setTimeout(resolve, duration * 1000));

    // Stop hunting
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('💰 TREASURE MAP — HUNT SUMMARY');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const performance = hunter.getPerformance();

    console.log(`Duration:              ${performance.elapsed.toFixed(2)}s`);
    console.log(`Price Updates:         ${performance.priceUpdates}`);
    console.log(`Opportunity Scans:     ${performance.scans}`);
    console.log(`Treasures Found:       ${performance.opportunitiesFound} 💎`);
    console.log(`Opportunities/Minute:  ${performance.opportunitiesPerMinute}`);
    console.log(`Hunt Mode:             ${performance.mode}`);

    if (bestTreasure) {
      console.log('');
      console.log('🔥 BEST OPPORTUNITY FOUND:');
      console.log(`   Type:          ${bestTreasure.type}`);
      console.log(`   Score:         ${formatScore(bestTreasure.score)} ${getScoreIndicator(bestTreasure.score)}`);
      console.log(`   Side:          ${bestTreasure.side}`);
      console.log(`   Entry:         ${formatPrice(bestTreasure.entryPrice)}`);
      console.log(`   Target:        ${formatPrice(bestTreasure.targetPrice)}`);
      console.log(`   Stop Loss:     ${formatPrice(bestTreasure.stopLoss)}`);
      console.log(`   Risk/Reward:   ${bestTreasure.riskReward.toFixed(2)}:1`);
      console.log(`   Gross Profit:  ${bestTreasure.profitPotential.toFixed(2)}%`);
      console.log(`   Net ROI:       ${bestTreasure.pnl.netRoi.toFixed(2)}%`);
      console.log(`   Fees:          ${formatPercent(bestTreasure.pnl.fees)}`);
      console.log(`   Slippage:      ${formatPercent(bestTreasure.pnl.slippage)}`);
      console.log(`   Break Even:    ${formatPrice(bestTreasure.pnl.breakEven)}`);
      console.log(`   Description:   ${bestTreasure.description}`);
    } else {
      console.log('');
      console.log('⚠  No opportunities met criteria during hunt period');
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    await hunter.stopHunting();

    console.log('');
    console.log('✓ Hunt complete. Treasure Engine shut down gracefully.');
    console.log('');
    console.log('💡 KEY INSIGHTS:');
    console.log('   - Autonomous opportunity detection');
    console.log('   - Real-time profit calculations');
    console.log('   - Risk/reward analysis');
    console.log('   - Fee and slippage awareness');
    console.log('   - Production-ready treasure hunting');
    console.log('');

    process.exit(0);

  } catch (err) {
    console.error('');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('✗ HUNT FAILED');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error(`Error: ${err.message}`);
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('');

    if (err.message.includes('EAI_AGAIN') || err.message.includes('ENOTFOUND')) {
      console.error('⚠  Network access required for treasure hunting');
      console.error('⚠  This is expected in sandbox environments');
      console.error('⚠  Run this demo in an environment with network access');
      console.error('');
      console.error('📝 What the hunter WOULD do with network:');
      console.error('   1. Connect to real-time price data');
      console.error('   2. Scan for profit opportunities');
      console.error('   3. Calculate risk/reward ratios');
      console.error('   4. Display treasures as they are found');
      console.error('   5. Track best opportunity');
      console.error('   6. Show detailed profit calculations');
    }

    await hunter.stopHunting().catch(() => {});
    process.exit(1);
  }
}

// Graceful shutdown on SIGINT (Ctrl+C)
process.on('SIGINT', async () => {
  console.log('');
  console.log('⚠  Interrupted. Stopping hunt...');
  process.exit(0);
});

main();
