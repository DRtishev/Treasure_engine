# NEURO-MEV DEPLOYMENT GUIDE

**Version**: 3.0.0  
**Date**: 2026-02-10  
**Target**: Production deployment on testnet → micro-live → full live

---

## TABLE OF CONTENTS

1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Configuration](#configuration)
4. [Testing](#testing)
5. [Deployment Stages](#deployment-stages)
6. [Monitoring](#monitoring)
7. [Troubleshooting](#troubleshooting)
8. [Security](#security)
9. [Maintenance](#maintenance)

---

## PREREQUISITES

### System Requirements

**Minimum**:
- Node.js 20.20.0 or higher
- 4 GB RAM
- 20 GB disk space
- Linux/macOS/Windows

**Recommended**:
- Node.js 20.20.0 (exact version for authority)
- 8 GB RAM
- 50 GB SSD
- Ubuntu 24.04 LTS
- Dedicated server or VPS

### Dependencies

```bash
# Check Node.js version
node --version  # Should be v20.20.0 or higher

# Check npm version
npm --version   # Should be 10.x or higher
```

### API Keys

Required for live trading:
- Binance API key and secret (or equivalent exchange)
- Permissions: Read, Trade (NOT Withdrawal)

---

## INSTALLATION

### Step 1: Clone Repository

```bash
git clone https://github.com/your-org/neuro-mev.git
cd neuro-mev
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Verify Installation

```bash
# Run all verification tests
npm run verify:epoch07

# Expected output:
# ✓ 30/30 tests PASSED
# 💎 PRODUCTION READY: YES
```

---

## CONFIGURATION

### Single Source of Truth (SSOT)

Primary configuration: `spec/ssot.json`

**Key Sections**:

#### 1. Risk Governor

```json
{
  "risk_governor": {
    "initial_equity_usd": 10000,
    "max_position_size_usd": 1000,
    "max_daily_loss_usd": 100,
    "max_drawdown_from_peak_pct": 0.05,
    "kill_switch_threshold": 0.10,
    "circuit_breaker_cooldown_minutes": 60,
    "caps_reset_schedule": "daily_00_utc"
  }
}
```

**Recommended Settings by Stage**:

| Stage | Equity | Max Position | Max Daily Loss | Max Drawdown |
|-------|--------|--------------|----------------|--------------|
| Testnet | $10,000 | $1,000 | $100 | 5% |
| Micro-Live ($10) | $10 | $5 | $2 | 20% |
| Small-Live ($100) | $100 | $50 | $10 | 15% |
| Medium-Live ($1,000) | $1,000 | $500 | $50 | 10% |
| Full-Live ($10,000+) | $10,000+ | $5,000 | $500 | 5% |

#### 2. Truth Layer

```json
{
  "truth_layer": {
    "reality_gap_halt": 0.85,
    "penalized_expectancy_min": 0.0,
    "max_drawdown_halt_pct": 0.20,
    "max_daily_loss_halt_usd": 200,
    "data_staleness_halt_ms": 5000,
    "min_confidence_allow": 0.75,
    "cooldown_on_degraded_s": 300,
    "reduce_risk_on_degraded_pct": 50
  }
}
```

**DO NOT modify** these values without thorough testing. They enforce safety boundaries.

#### 3. Execution Policy

```json
{
  "execution_policy": {
    "base_order_size_usd": 1000,
    "default_ttl_ms": 5000,
    "max_ttl_ms": 30000,
    "tip_strategy": "adaptive",
    "min_tip_bps": 0,
    "max_tip_bps": 5,
    "competition_threshold": 0.7
  }
}
```

### Environment Variables

Create `.env` file (DO NOT commit to git):

```bash
# Exchange API credentials
BINANCE_API_KEY=your_api_key_here
BINANCE_SECRET=your_secret_here

# Network
ARBITRUM_RPC_URL=https://arb1.arbitrum.io/rpc

# Monitoring
SENTRY_DSN=your_sentry_dsn  # Optional
DATADOG_API_KEY=your_dd_key  # Optional

# Logging
LOG_LEVEL=info  # debug | info | warn | error
LOG_DIR=logs/production

# Mode
INITIAL_MODE=OFF  # OFF | PAPER | LIVE_SMALL | LIVE
```

**Security**: Add `.env` to `.gitignore`

---

## TESTING

### Pre-Deployment Testing

**Level 1: Unit Tests**
```bash
npm test
```

**Level 2: Integration Tests**
```bash
npm run verify:epoch07
```

**Level 3: End-to-End Tests**
```bash
# Run simulation with all modes
npm run sim:all

# Verify Court judgments
npm run court:v2

# Check Truth Layer
npm run verify:truth-layer
```

**Level 4: Adversarial Testing**
```bash
npm run verify:adversarial
```

### Testnet Validation

Before live deployment, validate on testnet:

```bash
# Configure for testnet
export BINANCE_TESTNET=true
export INITIAL_MODE=PAPER

# Run for 24 hours
node core/control/master_system_runner.mjs
```

**Success Criteria**:
- No crashes for 24 hours
- Zero HALT events (except intentional tests)
- All trades within risk limits
- Safety score > 90 consistently

---

## DEPLOYMENT STAGES

### Stage 1: Testnet (1-2 weeks)

**Goal**: Validate system behavior with fake money

**Configuration**:
```json
{
  "risk_governor": {
    "initial_equity_usd": 10000,
    "max_position_size_usd": 1000,
    "max_daily_loss_usd": 100
  }
}
```

**Steps**:
1. Deploy to testnet environment
2. Enable PAPER mode
3. Run for 1-2 weeks
4. Monitor all metrics
5. Verify no unexpected HALTs
6. Review Court decisions

**Exit Criteria**:
- ✅ 14 days uptime
- ✅ Zero system errors
- ✅ All safety gates working
- ✅ Truth Layer operational

### Stage 2: Micro-Live ($10)

**Goal**: Validate with real money (minimal risk)

**Configuration**:
```json
{
  "risk_governor": {
    "initial_equity_usd": 10,
    "max_position_size_usd": 5,
    "max_daily_loss_usd": 2,
    "max_drawdown_from_peak_pct": 0.20
  }
}
```

**Steps**:
1. Transfer $10 to exchange account
2. Enable LIVE_SMALL mode
3. Run for 3-7 days
4. Monitor closely (every few hours)
5. Verify real execution matches simulation

**Exit Criteria**:
- ✅ 7 days profitable (or max -$2 loss)
- ✅ Zero unexpected behaviors
- ✅ Execution quality as expected

### Stage 3: Small-Live ($100)

**Goal**: Scale to meaningful capital

**Configuration**:
```json
{
  "risk_governor": {
    "initial_equity_usd": 100,
    "max_position_size_usd": 50,
    "max_daily_loss_usd": 10,
    "max_drawdown_from_peak_pct": 0.15
  }
}
```

**Duration**: 2-4 weeks

**Exit Criteria**:
- ✅ 30 days profitable
- ✅ Drawdown < 10%
- ✅ Safety score > 95

### Stage 4: Medium-Live ($1,000)

**Goal**: Professional scale

**Configuration**:
```json
{
  "risk_governor": {
    "initial_equity_usd": 1000,
    "max_position_size_usd": 500,
    "max_daily_loss_usd": 50,
    "max_drawdown_from_peak_pct": 0.10
  }
}
```

**Duration**: 1-2 months

### Stage 5: Full-Live ($10,000+)

**Goal**: Production scale

**Configuration**: Use production SSOT values

**Requirements**:
- ✅ All previous stages successful
- ✅ 90 days continuous operation
- ✅ Sharpe ratio > 1.5
- ✅ Max drawdown < 10%

---

## MONITORING

### Key Metrics

Monitor these continuously:

**System Health**:
- Master Control status (RUNNING/HALTED)
- Truth verdict (ALLOW/DEGRADED/HALT)
- Safety score (0-100)
- Mode (OFF/PAPER/LIVE_SMALL/LIVE)

**Trading Metrics**:
- Daily PnL
- Drawdown (current, max)
- Win rate
- Trade count
- Rejection rate

**Performance**:
- P95 latency
- P99 latency
- Cache hit rate
- WebSocket health

**Risk Limits**:
- Position utilization (%)
- Loss utilization (%)
- Reality gap
- System confidence

### Monitoring Tools

**Built-in Dashboard**:
```bash
# Start web dashboard
npm run dashboard

# Open browser: http://localhost:8080
```

**Console Monitoring**:
```javascript
// Print dashboard every 10 seconds
setInterval(() => {
  masterControl.printDashboard();
}, 10000);
```

**Log Analysis**:
```bash
# View event logs
tail -f logs/events/run_production_001.jsonl

# Count HALT events
grep HALT logs/events/*.jsonl | wc -l

# Check anomalies
grep anomaly_detected logs/events/*.jsonl
```

### Alerts

Set up alerts for:

**Critical (immediate action)**:
- HALT triggered
- Kill switch activated
- Drawdown > 15%
- Daily loss > 80% of limit

**High (check within 1 hour)**:
- DEGRADED mode entered
- Safety score < 80
- P99 latency > 1000ms
- Reality gap > 70%

**Medium (check daily)**:
- Win rate < 50%
- Rejection rate > 20%
- Cache hit rate < 50%

---

## TROUBLESHOOTING

### System Won't Start

**Symptoms**: `masterControl.start()` fails

**Solutions**:
1. Check Node.js version: `node --version`
2. Verify dependencies: `npm install`
3. Check SSOT configuration: `spec/ssot.json`
4. Review event logs: `logs/events/`

### System Stuck in HALT

**Symptoms**: Truth verdict = HALT, cannot transition

**Solutions**:
1. Check reason codes: `masterControl.getStatus().truth_verdict.reason_codes`
2. If `HALT_KILL_SWITCH_ACTIVE`: Call `masterControl.requestManualReset()`
3. If `HALT_REALITY_GAP`: Fix data quality issues
4. If `HALT_MAX_DRAWDOWN`: Wait for reset or reduce limits
5. If `HALT_DAILY_LOSS`: Wait for daily reset (midnight UTC)

### High Rejection Rate

**Symptoms**: `rejection_rate > 0.20`

**Solutions**:
1. Check network latency
2. Increase order timeout: `default_ttl_ms` in SSOT
3. Review tip strategy: May need higher tips
4. Check exchange status: Possibly under maintenance

### Poor Performance

**Symptoms**: P99 > 1000ms

**Solutions**:
1. Enable Performance Engine: `enablePerformance: true`
2. Check connection pool: May need more connections
3. Review cache settings: Increase cache size
4. Network issues: Check exchange connectivity

### Memory Leaks

**Symptoms**: Memory usage grows unbounded

**Solutions**:
1. Check circular buffer sizes
2. Limit event log retention
3. Clear old anomaly history
4. Review WebSocket message handling

---

## SECURITY

### API Key Security

**DO**:
- ✅ Store keys in `.env` file
- ✅ Use read + trade permissions only
- ✅ Rotate keys regularly (every 90 days)
- ✅ Use IP whitelist on exchange

**DON'T**:
- ❌ Commit keys to git
- ❌ Share keys via email/chat
- ❌ Enable withdrawal permissions
- ❌ Use keys on multiple machines

### Network Security

**Firewall Rules**:
```bash
# Allow only necessary ports
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 8080/tcp  # Dashboard (if needed)
sudo ufw enable
```

**VPN/Proxy**: Consider using dedicated IP for exchange access

### Code Security

**Before deployment**:
1. Review all code changes
2. Run security audit: `npm audit`
3. Check for hardcoded secrets: `grep -r "AKID" .`
4. Verify dependencies: `npm audit fix`

---

## MAINTENANCE

### Daily Tasks

- [ ] Check system status
- [ ] Review daily PnL
- [ ] Check for HALT events
- [ ] Monitor safety score

### Weekly Tasks

- [ ] Review win rate and Sharpe ratio
- [ ] Analyze trade distribution
- [ ] Check for anomalies
- [ ] Review Court decisions
- [ ] Backup logs

### Monthly Tasks

- [ ] Performance review
- [ ] Strategy optimization
- [ ] Risk limit adjustment
- [ ] Dependency updates
- [ ] Security audit

### Backup

**Critical Files**:
- `spec/ssot.json` (configuration)
- `logs/events/*.jsonl` (trade history)
- `.env` (encrypted backup only)

**Backup Command**:
```bash
#!/bin/bash
DATE=$(date +%Y%m%d)
tar -czf backup_$DATE.tar.gz \
  spec/ \
  logs/ \
  reports/

# Upload to secure storage
# scp backup_$DATE.tar.gz user@backup-server:/backups/
```

### Updates

**Updating System**:
```bash
# Pull latest code
git pull origin main

# Install dependencies
npm install

# Run tests
npm run verify:epoch07

# If tests pass, restart system
npm run stop
npm run start
```

**Version Compatibility**:
- Always test updates on testnet first
- Read CHANGELOG for breaking changes
- Backup current state before updating

---

## APPENDIX

### Common Commands

```bash
# Start system
npm run start

# Stop system
npm run stop

# Run tests
npm test

# Full verification
npm run verify:epoch07

# Run Court v2
npm run court:v2

# View dashboard
npm run dashboard

# Check logs
tail -f logs/events/run_*.jsonl
```

### File Structure

```
neuro-mev/
├── core/                   # Core system modules
│   ├── control/            # Master Control System
│   ├── truth/              # Truth Engine
│   ├── court/              # Court v1, v2
│   ├── portfolio/          # Multi-Strategy Portfolio
│   ├── data/               # WebSocket Feed
│   ├── ml/                 # Anomaly Detection
│   ├── monitoring/         # Safety Monitor
│   ├── resilience/         # Self-Healing
│   └── performance/        # Performance Engine
├── spec/                   # Configuration
│   └── ssot.json           # Single Source of Truth
├── scripts/                # Utility scripts
│   └── verify/             # Verification tests
├── reports/                # Generated reports
├── logs/                   # Event logs
├── ui/                     # Web dashboard
└── docs/                   # Documentation
```

### Support

**Issues**: Check GitHub Issues  
**Email**: support@neuro-mev.io  
**Discord**: (if applicable)

---

**End of Deployment Guide**
