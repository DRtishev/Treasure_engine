#!/usr/bin/env node
// core/resilience/self_healing.mjs
// 💎 GENIUS: Self-Healing System - "System fixes itself"
// Auto-recovery, circuit breakers, graceful degradation

export class CircuitBreaker {
  constructor(name, options = {}) {
    this.name = name;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    
    // Configuration
    this.config = {
      failureThreshold: options.failureThreshold || 5,
      successThreshold: options.successThreshold || 2,
      timeout: options.timeout || 60000, // 60s
      halfOpenRequests: options.halfOpenRequests || 3
    };
    
    // Statistics
    this.stats = {
      totalCalls: 0,
      totalFailures: 0,
      totalSuccesses: 0,
      stateChanges: []
    };
  }

  async execute(fn) {
    this.stats.totalCalls++;
    
    // Check circuit state
    if (this.state === 'OPEN') {
      // Check if timeout expired
      const now = Date.now();
      if (now - this.lastFailureTime >= this.config.timeout) {
        this._transitionTo('HALF_OPEN');
      } else {
        throw new Error(`Circuit breaker ${this.name} is OPEN`);
      }
    }
    
    try {
      const result = await fn();
      this._onSuccess();
      return result;
    } catch (err) {
      this._onFailure();
      throw err;
    }
  }

  _onSuccess() {
    this.stats.totalSuccesses++;
    
    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      if (this.successCount >= this.config.successThreshold) {
        this._transitionTo('CLOSED');
        this.failureCount = 0;
        this.successCount = 0;
      }
    } else if (this.state === 'CLOSED') {
      this.failureCount = 0;
    }
  }

  _onFailure() {
    this.stats.totalFailures++;
    this.lastFailureTime = Date.now();
    
    if (this.state === 'HALF_OPEN') {
      this._transitionTo('OPEN');
      this.successCount = 0;
    } else if (this.state === 'CLOSED') {
      this.failureCount++;
      if (this.failureCount >= this.config.failureThreshold) {
        this._transitionTo('OPEN');
      }
    }
  }

  _transitionTo(newState) {
    const oldState = this.state;
    this.state = newState;
    this.stats.stateChanges.push({
      from: oldState,
      to: newState,
      timestamp: Date.now()
    });
    console.log(`🔧 Circuit Breaker [${this.name}]: ${oldState} → ${newState}`);
  }

  getState() {
    return this.state;
  }

  getStats() {
    return { ...this.stats, currentState: this.state };
  }

  reset() {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
  }
}

export class SelfHealingSystem {
  constructor(adapter, options = {}) {
    this.adapter = adapter;
    this.eventLog = options.eventLog;
    
    // Circuit breakers for different operations
    this.breakers = {
      orderPlacement: new CircuitBreaker('OrderPlacement', {
        failureThreshold: 5,
        timeout: 30000
      }),
      orderQuery: new CircuitBreaker('OrderQuery', {
        failureThreshold: 10,
        timeout: 15000
      }),
      exchange: new CircuitBreaker('Exchange', {
        failureThreshold: 3,
        timeout: 60000
      })
    };
    
    // Health checks
    this.healthChecks = [];
    this.healthStatus = 'HEALTHY';
    this.healingInProgress = false;
    
    // Auto-retry configuration
    this.retryConfig = {
      maxRetries: options.maxRetries || 3,
      baseDelay: options.baseDelay || 1000,
      maxDelay: options.maxDelay || 30000,
      backoffMultiplier: options.backoffMultiplier || 2
    };
  }

  /**
   * Execute with auto-retry and exponential backoff
   */
  async executeWithRetry(fn, context = {}) {
    const { maxRetries, baseDelay, maxDelay, backoffMultiplier } = this.retryConfig;
    
    let lastError;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (err) {
        lastError = err;
        
        if (attempt < maxRetries) {
          const delay = Math.min(
            baseDelay * Math.pow(backoffMultiplier, attempt),
            maxDelay
          );
          
          console.log(`⚙️  Retry ${attempt + 1}/${maxRetries} after ${delay}ms: ${err.message}`);
          
          if (this.eventLog) {
            this.eventLog.sys('auto_retry', {
              attempt: attempt + 1,
              maxRetries,
              delay,
              error: err.message,
              context
            });
          }
          
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    // All retries failed
    throw new Error(`Failed after ${maxRetries} retries: ${lastError.message}`);
  }

  /**
   * Execute with circuit breaker protection
   */
  async executeWithBreaker(breakerName, fn) {
    const breaker = this.breakers[breakerName];
    if (!breaker) {
      throw new Error(`Unknown circuit breaker: ${breakerName}`);
    }
    
    return breaker.execute(fn);
  }

  /**
   * Health check system
   */
  async runHealthChecks() {
    console.log('🏥 Running health checks...');
    
    const results = [];
    let allHealthy = true;
    
    // Check 1: Adapter responsive
    try {
      const stats = this.adapter.getStats();
      results.push({ check: 'Adapter', status: 'OK', details: stats });
    } catch (err) {
      results.push({ check: 'Adapter', status: 'FAIL', error: err.message });
      allHealthy = false;
    }
    
    // Check 2: No emergency stop
    if (this.adapter.emergencyStop) {
      results.push({ check: 'Emergency Stop', status: 'FAIL', details: 'Emergency stop active' });
      allHealthy = false;
    } else {
      results.push({ check: 'Emergency Stop', status: 'OK' });
    }
    
    // Check 3: Circuit breakers
    for (const [name, breaker] of Object.entries(this.breakers)) {
      const state = breaker.getState();
      if (state === 'OPEN') {
        results.push({ check: `Circuit: ${name}`, status: 'FAIL', details: 'Circuit open' });
        allHealthy = false;
      } else {
        results.push({ check: `Circuit: ${name}`, status: 'OK', state });
      }
    }
    
    this.healthStatus = allHealthy ? 'HEALTHY' : 'UNHEALTHY';
    
    console.log(`   Overall: ${this.healthStatus}`);
    for (const result of results) {
      const icon = result.status === 'OK' ? '✓' : '✗';
      console.log(`   ${icon} ${result.check}: ${result.status}`);
    }
    console.log('');
    
    return { healthy: allHealthy, checks: results };
  }

  /**
   * Auto-repair system
   */
  async autoRepair() {
    if (this.healingInProgress) {
      console.log('⚙️  Healing already in progress');
      return;
    }
    
    this.healingInProgress = true;
    console.log('🔧 AUTO-REPAIR: Starting self-healing sequence...');
    
    try {
      // Step 1: Run health checks
      const health = await this.runHealthChecks();
      
      if (health.healthy) {
        console.log('✓ System is healthy, no repair needed');
        return { repaired: true, actions: [] };
      }
      
      const actions = [];
      
      // Step 2: Reset circuit breakers
      for (const [name, breaker] of Object.entries(this.breakers)) {
        if (breaker.getState() === 'OPEN') {
          breaker.reset();
          actions.push(`Reset circuit breaker: ${name}`);
          console.log(`   ✓ Reset circuit breaker: ${name}`);
        }
      }
      
      // Step 3: Clear emergency stop if active
      if (this.adapter.emergencyStop) {
        this.adapter.emergencyStop = false;
        this.adapter.emergencyReason = null;
        actions.push('Cleared emergency stop');
        console.log('   ✓ Cleared emergency stop');
      }
      
      // Step 4: Reset adapter state
      this.adapter.reset();
      actions.push('Reset adapter state');
      console.log('   ✓ Reset adapter state');
      
      // Step 5: Verify repair
      const postHealth = await this.runHealthChecks();
      
      if (postHealth.healthy) {
        console.log('✅ AUTO-REPAIR: System restored successfully');
        
        if (this.eventLog) {
          this.eventLog.sys('auto_repair_success', { actions });
        }
        
        return { repaired: true, actions };
      } else {
        console.error('❌ AUTO-REPAIR: Failed to restore system');
        return { repaired: false, actions };
      }
    } finally {
      this.healingInProgress = false;
    }
  }

  /**
   * Graceful degradation
   */
  async degradeGracefully(reason) {
    console.log('⚠️  GRACEFUL DEGRADATION');
    console.log(`   Reason: ${reason}`);
    
    // Reduce risk exposure
    const originalPosSize = this.adapter.maxPositionSizeUsd;
    const originalLossCap = this.adapter.maxDailyLossUsd;
    
    this.adapter.maxPositionSizeUsd = originalPosSize * 0.25; // 25%
    this.adapter.maxDailyLossUsd = originalLossCap * 0.25;
    
    console.log(`   Position cap: $${originalPosSize} → $${this.adapter.maxPositionSizeUsd}`);
    console.log(`   Loss cap: $${originalLossCap} → $${this.adapter.maxDailyLossUsd}`);
    
    if (this.eventLog) {
      this.eventLog.sys('graceful_degradation', {
        reason,
        old_position_cap: originalPosSize,
        new_position_cap: this.adapter.maxPositionSizeUsd,
        old_loss_cap: originalLossCap,
        new_loss_cap: this.adapter.maxDailyLossUsd
      });
    }
  }

  /**
   * Get system status
   */
  getStatus() {
    return {
      health: this.healthStatus,
      healing: this.healingInProgress,
      breakers: Object.fromEntries(
        Object.entries(this.breakers).map(([name, breaker]) => [
          name,
          breaker.getStats()
        ])
      )
    };
  }
}

export default SelfHealingSystem;
