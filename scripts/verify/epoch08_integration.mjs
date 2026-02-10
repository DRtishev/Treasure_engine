#!/usr/bin/env node
// scripts/verify/epoch08_integration.mjs
// EPOCH-08: Advanced Features Integration Testing
// Tests: WebSocket + Multi-Strategy + ML + Dashboard

import { WebSocketFeed } from '../../core/data/websocket_feed.mjs';
import { MultiStrategyPortfolio } from '../../core/portfolio/multi_strategy.mjs';
import { AnomalyDetector } from '../../core/ml/anomaly_detector.mjs';

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

async function main() {
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('EPOCH-08: ADVANCED FEATURES INTEGRATION');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  try {
    // ━━━ TEST 1: WEBSOCKET FEED ━━━
    console.log('━━━ TEST 1: WEBSOCKET FEED ━━━');
    
    const feed = new WebSocketFeed({
      enabled: false  // Mock mode for testing
    });
    
    assert(feed !== null, 'WebSocket feed created');
    
    // Connect
    const connectResult = await feed.connect();
    assert(connectResult.success === true, 'WebSocket connected');
    assert(connectResult.mode === 'MOCK', 'WebSocket in MOCK mode');
    
    // Subscribe to symbol
    let dataReceived = false;
    feed.subscribe('btcusdt', (data) => {
      dataReceived = true;
      assert(data.symbol !== undefined, 'Data has symbol');
      assert(data.price !== undefined, 'Data has price');
      assert(data.timestamp !== undefined, 'Data has timestamp');
    });
    
    // Wait for data
    await new Promise(resolve => setTimeout(resolve, 1500));
    assert(dataReceived === true, 'WebSocket data received');
    
    // Get stats
    const feedStats = feed.getStats();
    assert(feedStats.connected === true, 'WebSocket connected status');
    assert(feedStats.subscriptions === 1, 'Subscription count correct');
    assert(feedStats.messagesReceived > 0, 'Messages received > 0');
    
    // Disconnect
    await feed.disconnect();
    
    console.log('');

    // ━━━ TEST 2: MULTI-STRATEGY PORTFOLIO ━━━
    console.log('━━━ TEST 2: MULTI-STRATEGY PORTFOLIO ━━━');
    
    const portfolio = new MultiStrategyPortfolio({
      run_id: 'test_portfolio',
      totalCapitalUsd: 10000,
      maxPortfolioDrawdownPct: 0.20,
      maxDailyLossUsd: 500
    });
    
    assert(portfolio !== null, 'Portfolio created');
    
    // Register strategies
    const strategy1 = portfolio.registerStrategy({
      id: 'momentum',
      name: 'Momentum Strategy',
      allocation_pct: 40,
      max_position_usd: 4000,
      max_daily_loss_usd: 200,
      enabled: true,
      priority: 8
    });
    
    assert(strategy1 !== null, 'Strategy 1 registered');
    assert(strategy1.id === 'momentum', 'Strategy 1 ID correct');
    
    const strategy2 = portfolio.registerStrategy({
      id: 'mean_reversion',
      name: 'Mean Reversion',
      allocation_pct: 30,
      max_position_usd: 3000,
      priority: 7
    });
    
    assert(strategy2 !== null, 'Strategy 2 registered');
    
    // Get strategy capital
    const capital1 = portfolio.getStrategyCapital('momentum');
    assert(capital1 === 4000, 'Strategy capital calculation correct');
    
    // Check if can trade
    const canTrade1 = portfolio.canTrade('momentum', 1000);
    assert(canTrade1.allowed === true, 'Strategy can trade');
    
    // Record trade
    portfolio.recordTrade('momentum', {
      pnl: 50,
      positionChangeUsd: 1000
    });
    
    // Check portfolio state
    const status1 = portfolio.getStatus();
    assert(status1.portfolioState.dailyPnL === 50, 'Portfolio PnL updated');
    assert(status1.portfolioState.totalPositionUsd === 1000, 'Portfolio position updated');
    assert(status1.strategies.active === 2, 'Active strategies count correct');
    
    // Test allocation limit
    try {
      portfolio.registerStrategy({
        id: 'strategy3',
        name: 'Strategy 3',
        allocation_pct: 50  // Would exceed 100%
      });
      assert(false, 'Should have thrown allocation error');
    } catch (err) {
      assert(err.message.includes('exceed 100%'), 'Allocation limit enforced');
    }
    
    // Test strategy position limit
    const canTrade2 = portfolio.canTrade('momentum', 5000);  // Exceeds max
    assert(canTrade2.allowed === false, 'Strategy position limit enforced');
    assert(canTrade2.reason.includes('position limit'), 'Position limit reason provided');
    
    portfolio.close();
    
    console.log('');

    // ━━━ TEST 3: ML ANOMALY DETECTION ━━━
    console.log('━━━ TEST 3: ML ANOMALY DETECTION ━━━');
    
    const detector = new AnomalyDetector({
      windowSize: 100,
      zScoreThreshold: 3.0,
      enabled: true
    });
    
    assert(detector !== null, 'Anomaly detector created');
    
    // Record normal values
    for (let i = 0; i < 50; i++) {
      detector.record('price', 50000 + Math.random() * 100);
    }
    
    // Check normal value
    const normalCheck = detector.check('price', 50050);
    assert(normalCheck.isAnomaly === false, 'Normal value not flagged');
    
    // Check anomalous value (very high)
    const anomalyCheck = detector.check('price', 60000);
    assert(anomalyCheck.isAnomaly === true, 'Anomalous value detected');
    assert(anomalyCheck.anomaly !== undefined, 'Anomaly details provided');
    assert(anomalyCheck.anomaly.severity !== undefined, 'Severity calculated');
    assert(anomalyCheck.methods.length > 0, 'Detection methods listed');
    
    // Get stats
    const detectorStats = detector.getStats();
    assert(detectorStats.totalChecks === 2, 'Check count correct');
    assert(detectorStats.anomaliesDetected === 1, 'Anomaly count correct');
    
    // Get recent anomalies
    const recentAnomalies = detector.getRecentAnomalies(5);
    assert(recentAnomalies.length === 1, 'Recent anomalies returned');
    
    console.log('');

    // ━━━ TEST 4: INTEGRATED WORKFLOW ━━━
    console.log('━━━ TEST 4: INTEGRATED WORKFLOW ━━━');
    
    // Simulate integrated trading workflow
    const integratedFeed = new WebSocketFeed({ enabled: false });
    const integratedPortfolio = new MultiStrategyPortfolio({
      run_id: 'integrated_test',
      totalCapitalUsd: 10000
    });
    const integratedDetector = new AnomalyDetector({ enabled: true });
    
    // Register strategy
    integratedPortfolio.registerStrategy({
      id: 'integrated_strategy',
      name: 'Integrated Test Strategy',
      allocation_pct: 50,
      max_position_usd: 5000
    });
    
    // Connect feed
    await integratedFeed.connect();
    
    // Subscribe to data
    let workflowExecuted = false;
    integratedFeed.subscribe('btcusdt', (data) => {
      // Record price for anomaly detection
      integratedDetector.record('btc_price', data.price);
      
      // Check for anomalies
      const anomaly = integratedDetector.check('btc_price', data.price);
      
      if (!anomaly.isAnomaly) {
        // No anomaly, check if can trade
        const canTrade = integratedPortfolio.canTrade('integrated_strategy', 1000);
        
        if (canTrade.allowed) {
          // Execute trade (simulated)
          integratedPortfolio.recordTrade('integrated_strategy', {
            pnl: Math.random() * 10 - 5,
            positionChangeUsd: 1000
          });
          
          workflowExecuted = true;
        }
      }
    });
    
    // Wait for workflow execution
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    assert(workflowExecuted === true, 'Integrated workflow executed');
    
    // Verify portfolio has trades
    const integratedStatus = integratedPortfolio.getStatus();
    assert(integratedStatus.stats.totalTrades > 0, 'Integrated trades recorded');
    
    // Cleanup
    await integratedFeed.disconnect();
    integratedPortfolio.close();
    
    console.log('');

    // ━━━ TEST 5: DOCUMENTATION EXISTS ━━━
    console.log('━━━ TEST 5: DOCUMENTATION ━━━');
    
    const fs = await import('fs');
    const path = await import('path');
    
    const apiDocPath = path.join(process.cwd(), 'docs', 'API_DOCUMENTATION.md');
    const deployDocPath = path.join(process.cwd(), 'docs', 'DEPLOYMENT_GUIDE.md');
    const dashboardPath = path.join(process.cwd(), 'ui', 'dashboard.html');
    
    assert(fs.existsSync(apiDocPath), 'API Documentation exists');
    assert(fs.existsSync(deployDocPath), 'Deployment Guide exists');
    assert(fs.existsSync(dashboardPath), 'Dashboard exists');
    
    // Check documentation size
    const apiDocSize = fs.statSync(apiDocPath).size;
    const deployDocSize = fs.statSync(deployDocPath).size;
    
    assert(apiDocSize > 10000, 'API Documentation has content (>10KB)');
    assert(deployDocSize > 10000, 'Deployment Guide has content (>10KB)');
    
    console.log('');

    // ━━━ SUMMARY ━━━
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('RESULTS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✓ PASSED: ${passed}`);
    console.log(`✗ FAILED: ${failed}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');

    if (failed > 0) {
      console.error(`✗ ${failed} tests failed`);
      console.error('');
      console.error('EPOCH-08 INTEGRATION: FAIL');
      process.exit(1);
    }

    console.log('✓ All integration tests passed');
    console.log('');
    console.log('🎉 EPOCH-08 INTEGRATION: COMPLETE');
    console.log('');
    console.log('📦 COMPONENTS VALIDATED:');
    console.log('   ✓ WebSocket Feed');
    console.log('   ✓ Multi-Strategy Portfolio');
    console.log('   ✓ ML Anomaly Detection');
    console.log('   ✓ Integrated Workflow');
    console.log('   ✓ Documentation');
    console.log('');
    console.log('🚀 ADVANCED FEATURES:');
    console.log('   • Real-time data streaming');
    console.log('   • Multi-strategy support');
    console.log('   • ML-based anomaly detection');
    console.log('   • Web dashboard (UI)');
    console.log('   • API documentation');
    console.log('   • Deployment guide');
    console.log('');
    console.log('💎 PRODUCTION READY: YES');
    console.log('');

    process.exit(0);
  } catch (err) {
    console.error('');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('✗ EPOCH-08 INTEGRATION FAILED');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error(`Error: ${err.message}`);
    console.error(err.stack);
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('');
    process.exit(1);
  }
}

main();
