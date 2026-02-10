#!/usr/bin/env node
// scripts/data/DataAgent.mjs
// AUTONOMOUS DATA AGENT - Intelligent data source management
// Features: self-healing, confidence scoring, intelligent fallback, FSM

import { EventEmitter } from 'events';
import { BinanceWSClient } from './BinanceWSClient.mjs';
import { BinanceFetcher } from './binance_fetcher.mjs';
import { PriceConfidence } from './PriceConfidence.mjs';

// Agent states (Finite State Machine)
const STATES = {
  INITIALIZING: 'INITIALIZING',        // Startup phase
  WEBSOCKET_PRIMARY: 'WEBSOCKET_PRIMARY', // Real-time mode
  REST_FALLBACK: 'REST_FALLBACK',      // Degraded mode
  HYBRID: 'HYBRID',                    // Both sources active
  OFFLINE: 'OFFLINE'                   // All sources down
};

// State transition reasons
const TRANSITIONS = {
  HEALTH_CHECK_PASSED: 'HEALTH_CHECK_PASSED',
  WEBSOCKET_CONNECTED: 'WEBSOCKET_CONNECTED',
  WEBSOCKET_FAILED: 'WEBSOCKET_FAILED',
  WEBSOCKET_STALE: 'WEBSOCKET_STALE',
  REST_AVAILABLE: 'REST_AVAILABLE',
  REST_FAILED: 'REST_FAILED',
  CIRCUIT_OPEN: 'CIRCUIT_OPEN',
  MANUAL_OVERRIDE: 'MANUAL_OVERRIDE'
};

export class DataAgent extends EventEmitter {
  constructor(options = {}) {
    super();

    this.symbol = options.symbol || 'BTCUSDT';
    this.verbose = options.verbose || false;

    // Initialize data sources
    this.wsClient = new BinanceWSClient({ verbose: this.verbose });
    this.restClient = new BinanceFetcher({ verbose: this.verbose });

    // Agent state
    this.state = STATES.INITIALIZING;
    this.previousState = null;

    // Price data cache
    this.latestPrice = null;
    this.wsPrice = null;
    this.restPrice = null;

    // Decision metrics
    this.decisionCount = 0;
    this.stateTransitions = [];
    this.confidenceHistory = [];

    // Autonomous operation
    this.isAutonomous = options.autonomous !== false;
    this.autoRecovery = options.autoRecovery !== false;

    // Timers
    this.healthCheckTimer = null;
    this.restPollTimer = null;
  }

  log(msg) {
    if (this.verbose) {
      console.log(`[DataAgent:${this.state}] ${msg}`);
    }
  }

  warn(msg) {
    console.warn(`[DataAgent:${this.state}] WARNING: ${msg}`);
  }

  // STATE MACHINE TRANSITIONS

  transitionTo(newState, reason) {
    const oldState = this.state;
    this.state = newState;
    this.previousState = oldState;

    const transition = {
      from: oldState,
      to: newState,
      reason,
      timestamp: Date.now()
    };

    this.stateTransitions.push(transition);
    this.log(`STATE: ${oldState} → ${newState} (${reason})`);
    this.emit('state_change', transition);
  }

  // INITIALIZATION

  async initialize() {
    this.log('Initializing autonomous data agent...');
    this.emit('initializing');

    try {
      // Health check REST API
      this.log('Health check: REST API');
      const serverTime = await this.restClient.getServerTime();
      this.log(`REST API healthy (server time: ${new Date(serverTime).toISOString()})`);

      // Attempt WebSocket connection
      this.log('Connecting to WebSocket...');
      try {
        const stream = `${this.symbol.toLowerCase()}@ticker`;
        await this.wsClient.connect([stream]);
        
        // Setup WebSocket event handlers
        this.setupWebSocketHandlers();
        
        this.transitionTo(STATES.WEBSOCKET_PRIMARY, TRANSITIONS.WEBSOCKET_CONNECTED);
      } catch (wsError) {
        this.warn(`WebSocket connection failed: ${wsError.message}`);
        this.transitionTo(STATES.REST_FALLBACK, TRANSITIONS.WEBSOCKET_FAILED);
      }

      // Start autonomous monitoring
      if (this.isAutonomous) {
        this.startHealthChecks();
      }

      this.emit('initialized', { state: this.state });
      this.log('Initialization complete');

    } catch (err) {
      this.warn(`Initialization failed: ${err.message}`);
      this.transitionTo(STATES.OFFLINE, TRANSITIONS.CIRCUIT_OPEN);
      this.emit('initialization_failed', err);
      throw err;
    }
  }

  // WEBSOCKET EVENT HANDLERS

  setupWebSocketHandlers() {
    this.wsClient.on('message', (msg) => {
      if (msg.e === '24hrTicker') {
        this.handleWebSocketPrice(msg);
      }
    });

    this.wsClient.on('disconnected', ({ code, reason }) => {
      this.warn(`WebSocket disconnected: ${code} - ${reason}`);
      
      if (this.autoRecovery) {
        this.handleWebSocketFailure();
      }
    });

    this.wsClient.on('reconnecting', ({ attempt }) => {
      this.log(`WebSocket reconnecting (attempt ${attempt})`);
    });

    this.wsClient.on('connected', () => {
      this.log('WebSocket reconnected successfully');
      
      if (this.state === STATES.REST_FALLBACK) {
        this.transitionTo(STATES.WEBSOCKET_PRIMARY, TRANSITIONS.WEBSOCKET_CONNECTED);
      }
    });
  }

  handleWebSocketPrice(msg) {
    const price = parseFloat(msg.c);
    const timestamp = msg.E;
    
    this.wsPrice = {
      price,
      timestamp,
      source: 'websocket',
      raw: msg
    };

    // Update latest price with confidence
    this.updateLatestPrice();
  }

  handleWebSocketFailure() {
    if (this.state === STATES.WEBSOCKET_PRIMARY) {
      this.warn('WebSocket failed, falling back to REST');
      this.transitionTo(STATES.REST_FALLBACK, TRANSITIONS.WEBSOCKET_FAILED);
      this.startRestPolling();
    }
  }

  // REST POLLING

  async startRestPolling() {
    if (this.restPollTimer) return;

    this.log('Starting REST polling (fallback mode)');
    
    // Initial fetch
    await this.fetchRestPrice();

    // Poll every 5 seconds
    this.restPollTimer = setInterval(async () => {
      await this.fetchRestPrice();
    }, 5000);
  }

  stopRestPolling() {
    if (this.restPollTimer) {
      clearInterval(this.restPollTimer);
      this.restPollTimer = null;
      this.log('Stopped REST polling');
    }
  }

  async fetchRestPrice() {
    try {
      const klines = await this.restClient.fetchKlines(
        this.symbol,
        '1m',
        { limit: 1 }
      );

      if (klines && klines.length > 0) {
        const price = parseFloat(klines[0][4]); // close price
        const timestamp = klines[0][0]; // open time

        this.restPrice = {
          price,
          timestamp,
          source: 'rest',
          raw: klines[0]
        };

        this.updateLatestPrice();
      }
    } catch (err) {
      this.warn(`REST fetch failed: ${err.message}`);
      
      if (this.state === STATES.REST_FALLBACK) {
        const restStatus = this.restClient.getStatus();
        if (restStatus.circuitState === 'open') {
          this.transitionTo(STATES.OFFLINE, TRANSITIONS.CIRCUIT_OPEN);
        }
      }
    }
  }

  // INTELLIGENT SOURCE SELECTION

  updateLatestPrice() {
    this.decisionCount++;

    // Determine best source based on state and data quality
    let selectedSource = null;
    let confidence = 0;

    if (this.state === STATES.WEBSOCKET_PRIMARY && this.wsPrice) {
      const wsAge = Date.now() - this.wsPrice.timestamp;
      const wsConnected = this.wsClient.isConnected;
      const wsCircuit = this.wsClient.circuitState || 'closed';

      confidence = PriceConfidence.calculate({
        source: 'websocket',
        age_ms: wsAge,
        connected: wsConnected,
        circuit_state: wsCircuit
      });

      selectedSource = this.wsPrice;

      // Auto-fallback if WebSocket becomes stale
      if (confidence < 0.5 && this.autoRecovery) {
        this.warn('WebSocket data stale, initiating fallback');
        this.transitionTo(STATES.REST_FALLBACK, TRANSITIONS.WEBSOCKET_STALE);
        this.startRestPolling();
        return; // Recalculate after state change
      }
    }

    if (this.state === STATES.REST_FALLBACK && this.restPrice) {
      const restAge = Date.now() - this.restPrice.timestamp;
      const restStatus = this.restClient.getStatus();

      confidence = PriceConfidence.calculate({
        source: 'rest',
        age_ms: restAge,
        connected: restStatus.circuitState === 'closed',
        circuit_state: restStatus.circuitState
      });

      selectedSource = this.restPrice;
    }

    if (this.state === STATES.OFFLINE) {
      // Use cached price if available
      if (this.latestPrice) {
        const cacheAge = Date.now() - this.latestPrice.metadata.timestamp;
        confidence = PriceConfidence.calculate({
          source: 'cache',
          age_ms: cacheAge,
          connected: false,
          circuit_state: 'open'
        });
        selectedSource = { ...this.latestPrice };
      }
    }

    if (!selectedSource) {
      return; // No data available
    }

    // Create enriched price data
    this.latestPrice = PriceConfidence.createPriceData({
      symbol: this.symbol,
      price: selectedSource.price,
      source: selectedSource.source,
      age_ms: Date.now() - selectedSource.timestamp,
      connected: this.state !== STATES.OFFLINE,
      circuit_state: this.getCircuitState(),
      timestamp: selectedSource.timestamp
    });

    // Track confidence over time
    this.confidenceHistory.push({
      timestamp: Date.now(),
      confidence,
      state: this.state,
      source: selectedSource.source
    });

    // Keep last 100 confidence scores
    if (this.confidenceHistory.length > 100) {
      this.confidenceHistory.shift();
    }

    this.emit('price_update', this.latestPrice);
  }

  // HEALTH MONITORING

  startHealthChecks() {
    if (this.healthCheckTimer) return;

    this.log('Starting autonomous health checks');

    this.healthCheckTimer = setInterval(() => {
      this.performHealthCheck();
    }, 10000); // Every 10s
  }

  stopHealthChecks() {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
      this.log('Stopped health checks');
    }
  }

  async performHealthCheck() {
    const wsStatus = this.wsClient.getStatus();
    const restStatus = this.restClient.getStatus();

    const health = {
      timestamp: Date.now(),
      state: this.state,
      websocket: {
        connected: wsStatus.connected,
        stale: wsStatus.isStale,
        messageCount: wsStatus.messageCount,
        dataAge: wsStatus.dataAge
      },
      rest: {
        circuitState: restStatus.circuitState,
        failureCount: restStatus.failureCount,
        requestsLastMinute: restStatus.requestsInLastMinute
      },
      latestPrice: this.latestPrice
    };

    this.emit('health_check', health);

    // Auto-recovery logic
    if (this.autoRecovery) {
      await this.attemptRecovery(health);
    }
  }

  async attemptRecovery(health) {
    // If in REST_FALLBACK and WebSocket is healthy, try to reconnect
    if (
      this.state === STATES.REST_FALLBACK &&
      !health.websocket.connected
    ) {
      this.log('Attempting WebSocket recovery...');
      try {
        const stream = `${this.symbol.toLowerCase()}@ticker`;
        await this.wsClient.connect([stream]);
      } catch (err) {
        this.log('WebSocket recovery failed, staying in REST fallback');
      }
    }

    // If OFFLINE and REST circuit is closed, try REST
    if (
      this.state === STATES.OFFLINE &&
      health.rest.circuitState === 'closed'
    ) {
      this.log('Attempting REST recovery...');
      try {
        await this.fetchRestPrice();
        this.transitionTo(STATES.REST_FALLBACK, TRANSITIONS.REST_AVAILABLE);
        this.startRestPolling();
      } catch (err) {
        this.log('REST recovery failed, staying offline');
      }
    }
  }

  // UTILITY METHODS

  getCircuitState() {
    const wsStatus = this.wsClient.getStatus();
    const restStatus = this.restClient.getStatus();

    if (this.state === STATES.WEBSOCKET_PRIMARY) {
      return wsStatus.connected ? 'closed' : 'open';
    }
    if (this.state === STATES.REST_FALLBACK) {
      return restStatus.circuitState;
    }
    return 'open';
  }

  getPrice() {
    return this.latestPrice;
  }

  getStatus() {
    return {
      state: this.state,
      previousState: this.previousState,
      latestPrice: this.latestPrice,
      decisionCount: this.decisionCount,
      stateTransitions: this.stateTransitions.length,
      confidenceAvg: this.getAverageConfidence(),
      websocket: this.wsClient.getStatus(),
      rest: this.restClient.getStatus()
    };
  }

  getAverageConfidence() {
    if (this.confidenceHistory.length === 0) return 0;
    
    const sum = this.confidenceHistory.reduce(
      (acc, h) => acc + h.confidence,
      0
    );
    return sum / this.confidenceHistory.length;
  }

  // GRACEFUL SHUTDOWN

  async shutdown() {
    this.log('Shutting down agent...');
    
    this.stopHealthChecks();
    this.stopRestPolling();
    
    await this.wsClient.disconnect();
    
    this.transitionTo(STATES.OFFLINE, TRANSITIONS.MANUAL_OVERRIDE);
    this.emit('shutdown');
    
    this.log('Agent shutdown complete');
  }
}

export { STATES, TRANSITIONS };
export default DataAgent;
