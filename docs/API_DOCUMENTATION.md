# NEURO-MEV API DOCUMENTATION

**Version**: 3.0.0  
**Date**: 2026-02-10  
**Status**: Production Ready

---

## TABLE OF CONTENTS

1. [Overview](#overview)
2. [Master Control System API](#master-control-system-api)
3. [Truth Engine API](#truth-engine-api)
4. [Multi-Strategy Portfolio API](#multi-strategy-portfolio-api)
5. [WebSocket Feed API](#websocket-feed-api)
6. [Anomaly Detection API](#anomaly-detection-api)
7. [Safety Monitor API](#safety-monitor-api)
8. [Court v2 API](#court-v2-api)
9. [Error Handling](#error-handling)
10. [Rate Limits](#rate-limits)

---

## OVERVIEW

NEURO-MEV provides a production-grade trading system with authoritative Truth Layer governance, multi-strategy support, real-time data feeds, ML-based anomaly detection, and comprehensive safety mechanisms.

**Core Principles**:
- Hierarchy: Safety > Truth > Profit
- HALT is terminal (requires manual reset)
- Deterministic decision-making
- Production-ready architecture

---

## MASTER CONTROL SYSTEM API

### Constructor

```javascript
import { MasterControlSystem } from './core/control/master_system.mjs';

const masterControl = new MasterControlSystem(ssot, {
  run_id: 'production_001',
  initialMode: MODES.OFF,
  enableSafetyMonitor: true,
  safetyCheckIntervalMs: 1000,
  log_dir: 'logs/events'
});
```

**Parameters**:
- `ssot` (Object, required): Single Source of Truth configuration
- `options` (Object, optional):
  - `run_id` (string): Unique identifier for this run
  - `initialMode` (string): Starting mode (default: 'OFF')
  - `enableSafetyMonitor` (boolean): Enable real-time safety monitoring
  - `safetyCheckIntervalMs` (number): Safety check interval in milliseconds
  - `log_dir` (string): Directory for event logs

### Methods

#### start()

Start the Master Control System.

```javascript
const result = await masterControl.start();
```

**Returns**: `Promise<Object>`
```javascript
{
  success: true,
  status: 'RUNNING',
  mode: 'OFF',
  timestamp: 1770710000000
}
```

#### stop()

Stop the Master Control System gracefully.

```javascript
const result = await masterControl.stop();
```

**Returns**: `Promise<Object>`
```javascript
{
  success: true,
  status: 'STOPPED',
  timestamp: 1770710001000
}
```

#### evaluate()

Evaluate system state and update Truth verdict.

```javascript
const result = await masterControl.evaluate();
```

**Returns**: `Promise<Object>`
```javascript
{
  verdict: {
    verdict: 'ALLOW',
    mode: 'PAPER',
    confidence: 0.95,
    reason_codes: ['ALLOW_OK'],
    actions: { kill_switch: false, reduce_risk_pct: 0, cooldown_s: 0 }
  },
  mode: 'PAPER',
  transition: { success: true, from: 'OFF', to: 'PAPER' },
  health: { healthy: true, checks: [...] }
}
```

#### requestMode(newMode)

Request mode transition.

```javascript
const result = await masterControl.requestMode(MODES.PAPER);
```

**Parameters**:
- `newMode` (string, required): Target mode ('OFF' | 'PAPER' | 'LIVE_SMALL' | 'LIVE' | 'DIAGNOSTIC')

**Returns**: `Promise<Object>` - Same as evaluate()

**Example**:
```javascript
// Request PAPER mode
const result = await masterControl.requestMode(MODES.PAPER);

if (result.mode === MODES.PAPER) {
  console.log('Mode change successful');
} else {
  console.log(`Mode blocked: ${result.verdict.reason_codes}`);
}
```

#### activateKillSwitch(reason)

Activate emergency halt (kill switch).

```javascript
const result = await masterControl.activateKillSwitch('Critical error detected');
```

**Parameters**:
- `reason` (string, required): Reason for activation

**Returns**: `Promise<Object>` - Evaluation result with HALT verdict

**Side Effects**:
- Sets kill_switch = true
- Sets emergency_stop = true
- Forces mode to OFF
- Verdict = HALT

#### requestManualReset()

Request manual reset to exit HALT state.

```javascript
const result = await masterControl.requestManualReset();
```

**Returns**: `Promise<Object>`
```javascript
{
  fsm_reset: { success: true, message: '...' },
  evaluation: { verdict: {...}, mode: '...' }
}
```

**Requirements**:
- System must be in HALT state
- Kill switch and emergency stop will be cleared
- FSM manual reset flag will be set

#### updateSystemState(updates)

Update system state (from external sources).

```javascript
masterControl.updateSystemState({
  reality_gap: 0.15,
  current_drawdown_pct: 0.05,
  daily_loss_usd: -10,
  perf_p99_ms: 200,
  rejection_rate: 0.05
});
```

**Parameters**:
- `updates` (Object, required): State updates

**Common State Fields**:
- `kill_switch` (boolean): Kill switch status
- `emergency_stop` (boolean): Emergency stop status
- `reality_gap` (number): Reality gap (0-1)
- `current_drawdown_pct` (number): Current drawdown percentage
- `daily_loss_usd` (number): Daily PnL (negative = loss)
- `last_data_timestamp` (number): Last data update timestamp
- `perf_p99_ms` (number): P99 latency in milliseconds
- `rejection_rate` (number): Order rejection rate (0-1)
- `avg_slippage_bps` (number): Average slippage in basis points
- `system_confidence` (number): System confidence (0-1)

#### getStatus()

Get comprehensive system status.

```javascript
const status = masterControl.getStatus();
```

**Returns**: `Object`
```javascript
{
  status: 'RUNNING',
  operational_mode: 'PAPER',
  truth_verdict: { verdict: 'ALLOW', ... },
  fsm_state: { currentMode: 'PAPER', ... },
  system_state: { kill_switch: false, ... },
  safety_metrics: { safetyScore: 95, ... },
  health_check: { healthy: true, ... },
  performance_metrics: { avgResponseTime: 150, ... },
  timestamp: 1770710000000
}
```

#### printDashboard()

Print visual dashboard to console.

```javascript
masterControl.printDashboard();
```

**Output**:
```
┌─────────────────────────────────────────────────────────────┐
│ 🎛️  MASTER CONTROL SYSTEM DASHBOARD                        │
├─────────────────────────────────────────────────────────────┤
│ Status: RUNNING                                             │
│ Mode: PAPER                                                 │
├─────────────────────────────────────────────────────────────┤
│ TRUTH LAYER                                                 │
│   Verdict: ALLOW                                            │
│   Confidence: 0.95                                          │
│   Reason Codes: ALLOW_OK                                    │
...
```

---

## TRUTH ENGINE API

### Constructor

```javascript
import { TruthEngine } from './core/truth/truth_engine.mjs';

const truthEngine = new TruthEngine(ssot);
```

**Parameters**:
- `ssot` (Object, required): Single Source of Truth configuration

### Methods

#### evaluate(systemState)

Evaluate system state and return authoritative verdict.

```javascript
const verdict = truthEngine.evaluate({
  kill_switch: false,
  emergency_stop: false,
  reality_gap: 0.15,
  current_drawdown_pct: 0.05,
  daily_loss_usd: -10,
  last_data_timestamp: Date.now(),
  perf_p99_ms: 200,
  rejection_rate: 0.05,
  avg_slippage_bps: 10,
  system_confidence: 0.95,
  requested_mode: 'PAPER'
});
```

**Returns**: `Object` (TruthVerdict)
```javascript
{
  verdict: 'ALLOW',  // 'ALLOW' | 'DEGRADED' | 'HALT'
  mode: 'PAPER',     // 'OFF' | 'PAPER' | 'LIVE_SMALL' | 'LIVE' | 'DIAGNOSTIC'
  reason_codes: ['ALLOW_OK'],
  confidence: 0.95,  // 0-1
  actions: {
    kill_switch: false,
    reduce_risk_pct: 0,
    cooldown_s: 0
  },
  limits_snapshot: {
    reality_gap_halt: 0.85,
    max_drawdown_halt_pct: 0.20,
    max_daily_loss_halt_usd: 200,
    data_staleness_halt_ms: 5000,
    min_confidence_allow: 0.75
  },
  timestamp: 1770710000000
}
```

**Verdict Types**:

**ALLOW**: Trading permitted
- `confidence >= min_confidence_allow`
- No HALT conditions triggered
- Mode set to requested mode

**DEGRADED**: Trading with reduced risk
- Performance issues detected (P99 > 1000ms)
- High rejection rate (> 30%)
- High slippage (> 50bps)
- Low confidence (< 0.75)
- Actions: `reduce_risk_pct: 50`, `cooldown_s: 300`

**HALT**: All trading halted (terminal)
- Kill switch active
- Emergency stop active
- Reality gap > 85%
- Data stale > 5000ms
- Drawdown > 20%
- Daily loss > $200
- Actions: `kill_switch: true`, `confidence: 0.0`

**Reason Codes**:

HALT:
- `HALT_REALITY_GAP`
- `HALT_KILL_SWITCH_ACTIVE`
- `HALT_MAX_DRAWDOWN`
- `HALT_DAILY_LOSS`
- `HALT_DATA_STALE`
- `HALT_EMERGENCY_STOP`

DEGRADED:
- `DEGRADED_PERF_P99`
- `DEGRADED_HIGH_REJECT`
- `DEGRADED_HIGH_SLIPPAGE`
- `DEGRADED_LOW_CONFIDENCE`

ALLOW:
- `ALLOW_OK`

#### getConfig()

Get current Truth Engine configuration.

```javascript
const config = truthEngine.getConfig();
```

**Returns**: `Object` - Truth Layer configuration from SSOT

---

## MULTI-STRATEGY PORTFOLIO API

### Constructor

```javascript
import { MultiStrategyPortfolio } from './core/portfolio/multi_strategy.mjs';

const portfolio = new MultiStrategyPortfolio({
  run_id: 'portfolio_001',
  totalCapitalUsd: 10000,
  maxPortfolioDrawdownPct: 0.20,
  maxDailyLossUsd: 500,
  log_dir: 'logs/events'
});
```

**Parameters**:
- `totalCapitalUsd` (number): Total portfolio capital
- `maxPortfolioDrawdownPct` (number): Maximum portfolio drawdown (0-1)
- `maxDailyLossUsd` (number): Maximum daily loss in USD
- `run_id` (string): Unique identifier
- `log_dir` (string): Event log directory

### Methods

#### registerStrategy(config)

Register a trading strategy.

```javascript
const strategy = portfolio.registerStrategy({
  id: 'strategy_001',
  name: 'Momentum Strategy',
  allocation_pct: 30,
  max_position_usd: 3000,
  max_daily_loss_usd: 150,
  enabled: true,
  priority: 8
});
```

**Parameters**:
- `id` (string, required): Unique strategy ID
- `name` (string, required): Strategy name
- `allocation_pct` (number, required): Capital allocation percentage (0-100)
- `max_position_usd` (number): Max position size in USD
- `max_daily_loss_usd` (number): Max daily loss in USD
- `enabled` (boolean): Enable strategy (default: true)
- `priority` (number): Strategy priority 1-10 (10 = highest)

**Returns**: `StrategyConfig` object

**Constraints**:
- Total allocation across all strategies cannot exceed 100%

#### canTrade(strategyId, positionSizeUsd)

Check if strategy can trade.

```javascript
const check = portfolio.canTrade('strategy_001', 1000);

if (check.allowed) {
  // Execute trade
} else {
  console.log(`Trade blocked: ${check.reason}`);
}
```

**Returns**: `Object`
```javascript
{
  allowed: true,  // or false
  reason: ''      // If false, reason why trade is blocked
}
```

**Checks Performed**:
1. Strategy enabled
2. Strategy position limit
3. Strategy daily loss limit
4. Portfolio capital limit
5. Portfolio daily loss limit
6. Portfolio drawdown limit

#### recordTrade(strategyId, trade)

Record a trade execution.

```javascript
portfolio.recordTrade('strategy_001', {
  pnl: 50.25,
  positionChangeUsd: 1000
});
```

**Parameters**:
- `strategyId` (string, required): Strategy ID
- `trade` (Object, required):
  - `pnl` (number): Profit/Loss in USD
  - `positionChangeUsd` (number): Position size change

**Side Effects**:
- Updates strategy state (PnL, trade count, win/loss)
- Updates portfolio state (total PnL, drawdown)
- Logs trade to event log

#### getStatus()

Get portfolio status.

```javascript
const status = portfolio.getStatus();
```

**Returns**: `Object`
```javascript
{
  totalCapitalUsd: 10000,
  portfolioState: {
    totalPositionUsd: 3000,
    dailyPnL: 125.50,
    totalPnL: 450.75,
    peakEquity: 10450.75,
    currentDrawdownPct: 0.02,
    activeStrategies: 2
  },
  stats: {
    totalTrades: 45,
    totalWins: 28,
    totalLosses: 17
  },
  strategies: {
    total: 3,
    active: 2,
    list: [
      {
        id: 'strategy_001',
        name: 'Momentum Strategy',
        allocation_pct: 30,
        capitalUsd: 3000,
        dailyPnL: 75.25,
        totalPnL: 250.50,
        tradeCount: 25,
        winRate: 0.64
      }
    ]
  }
}
```

---

## WEBSOCKET FEED API

### Constructor

```javascript
import { WebSocketFeed } from './core/data/websocket_feed.mjs';

const feed = new WebSocketFeed({
  url: 'wss://stream.binance.com:9443/ws',
  reconnectDelay: 5000,
  heartbeatInterval: 30000,
  maxReconnectAttempts: 10,
  enabled: true  // Set false for mock mode
});
```

### Methods

#### connect()

Connect to WebSocket feed.

```javascript
const result = await feed.connect();
```

**Returns**: `Promise<Object>`
```javascript
{
  success: true,
  mode: 'LIVE'  // or 'MOCK'
}
```

#### subscribe(symbol, callback)

Subscribe to symbol data.

```javascript
feed.subscribe('btcusdt', (data) => {
  console.log(`BTC price: $${data.price}`);
});
```

**Parameters**:
- `symbol` (string, required): Trading pair symbol
- `callback` (function, required): Data callback

**Callback receives**:
```javascript
{
  symbol: 'BTCUSDT',
  price: 50125.50,
  timestamp: 1770710000000,
  volume: 12.5
}
```

#### getLatest(symbol)

Get latest data for symbol.

```javascript
const data = feed.getLatest('btcusdt');
```

**Returns**: `Object` or `undefined`

---

## ANOMALY DETECTION API

### Constructor

```javascript
import { AnomalyDetector } from './core/ml/anomaly_detector.mjs';

const detector = new AnomalyDetector({
  windowSize: 100,
  zScoreThreshold: 3.0,
  iqrMultiplier: 1.5,
  rateChangeThreshold: 0.5,
  enabled: true
});
```

### Methods

#### record(metric, value, metadata)

Record a metric value for detection.

```javascript
detector.record('order_latency', 150, { order_id: 'order_123' });
```

#### check(metric, value, metadata)

Check if value is anomalous.

```javascript
const result = detector.check('order_latency', 5000);

if (result.isAnomaly) {
  console.log('Anomaly detected!');
  console.log(`Severity: ${result.anomaly.severity}`);
  console.log(`Methods: ${result.methods.join(', ')}`);
}
```

**Returns**: `Object`
```javascript
{
  isAnomaly: true,
  anomaly: {
    metric: 'order_latency',
    value: 5000,
    timestamp: 1770710000000,
    methods: { zScore: {...}, iqr: {...}, ... },
    metadata: {},
    severity: 'HIGH'  // 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  },
  methods: ['zScore', 'iqr', 'rateChange']
}
```

**Detection Methods**:
1. **Z-score**: Standard deviations from mean (threshold: 3.0)
2. **IQR**: Interquartile Range outliers (multiplier: 1.5)
3. **Rate Change**: Rapid value changes (threshold: 50%)
4. **Moving Average**: Deviation from moving average (threshold: 50%)

---

## ERROR HANDLING

All async methods return Promises. Handle errors with try-catch:

```javascript
try {
  const result = await masterControl.start();
  console.log('System started successfully');
} catch (error) {
  console.error('Failed to start system:', error.message);
  // Handle error
}
```

**Common Errors**:

- `Strategy not found`: Strategy ID doesn't exist
- `Total allocation would exceed 100%`: Too much capital allocated
- `Max reconnect attempts reached`: WebSocket connection failed
- `Invalid transition`: FSM doesn't allow this mode transition
- `HALT active - manual reset required`: System is HALTED

---

## RATE LIMITS

**WebSocket Feed**:
- Mock mode: Unlimited
- Live mode: Subject to exchange limits (typically 10 requests/second)

**Master Control**:
- No built-in rate limits
- Safety Monitor runs at configured interval (default: 1 second)

**Multi-Strategy Portfolio**:
- No built-in rate limits
- Enforce limits in trading logic based on strategy configuration

---

## EXAMPLES

### Complete System Setup

```javascript
import { MasterControlSystem } from './core/control/master_system.mjs';
import { MultiStrategyPortfolio } from './core/portfolio/multi_strategy.mjs';
import { WebSocketFeed } from './core/data/websocket_feed.mjs';
import { AnomalyDetector } from './core/ml/anomaly_detector.mjs';
import { MODES } from './core/truth/truth_engine.mjs';
import fs from 'fs';

// Load configuration
const ssot = JSON.parse(fs.readFileSync('spec/ssot.json', 'utf-8'));

// Initialize Master Control
const master = new MasterControlSystem(ssot, {
  run_id: 'production_001',
  enableSafetyMonitor: true
});

// Initialize Portfolio
const portfolio = new MultiStrategyPortfolio({
  totalCapitalUsd: 10000,
  maxPortfolioDrawdownPct: 0.20
});

// Register strategies
portfolio.registerStrategy({
  id: 'momentum',
  name: 'Momentum Strategy',
  allocation_pct: 40,
  max_position_usd: 4000,
  priority: 8
});

portfolio.registerStrategy({
  id: 'mean_reversion',
  name: 'Mean Reversion Strategy',
  allocation_pct: 30,
  max_position_usd: 3000,
  priority: 7
});

// Initialize WebSocket Feed
const feed = new WebSocketFeed({ enabled: false }); // Mock mode

// Initialize Anomaly Detector
const detector = new AnomalyDetector({ enabled: true });

// Start system
await master.start();

// Subscribe to market data
feed.subscribe('btcusdt', (data) => {
  // Update system state with latest data
  master.updateSystemState({
    last_data_timestamp: data.timestamp
  });
  
  // Check for price anomalies
  detector.record('btc_price', data.price);
  const anomaly = detector.check('btc_price', data.price);
  
  if (anomaly.isAnomaly) {
    console.log('Price anomaly detected!');
  }
});

// Request PAPER mode
await master.requestMode(MODES.PAPER);

// Check if strategy can trade
const canTrade = portfolio.canTrade('momentum', 1000);

if (canTrade.allowed) {
  // Execute trade logic here
  
  // Record trade
  portfolio.recordTrade('momentum', {
    pnl: 25.50,
    positionChangeUsd: 1000
  });
}

// Get status
const status = master.getStatus();
console.log('System status:', status);

// Stop system
await master.stop();
portfolio.close();
await feed.disconnect();
```

---

## SUPPORT

For issues or questions:
- Documentation: `/reports/EPOCH-08_EXECUTION_REPORT.md`
- Deployment Guide: `/docs/DEPLOYMENT_GUIDE.md`
- GitHub Issues: (if applicable)

---

**End of API Documentation**
