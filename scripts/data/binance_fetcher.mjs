#!/usr/bin/env node
// scripts/data/binance_fetcher.mjs
// Production-ready Binance REST client for historical klines data
// Features: rate limiting, retry logic, circuit breaker, timeout controls

import https from 'https';

const BINANCE_BASE_URL = 'https://api.binance.com';
const MAX_KLINES_PER_REQUEST = 1000; // Binance limit
const RATE_LIMIT_WEIGHT_PER_MIN = 1200;
const RATE_LIMIT_KLINES_WEIGHT = 1; // Weight for klines endpoint

const CIRCUIT_BREAKER_THRESHOLD = 3; // Open circuit after N failures
const CIRCUIT_BREAKER_TIMEOUT_MS = 30000; // Try to close after 30s
const REQUEST_TIMEOUT_MS = 15000;
const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 1000;

class CircuitBreakerError extends Error {
  constructor(message) {
    super(message);
    this.name = 'CircuitBreakerError';
  }
}

class RateLimitError extends Error {
  constructor(message) {
    super(message);
    this.name = 'RateLimitError';
  }
}

export class BinanceFetcher {
  constructor(options = {}) {
    this.apiKey = options.apiKey || null;
    this.baseUrl = options.baseUrl || BINANCE_BASE_URL;
    this.timeout = options.timeout || REQUEST_TIMEOUT_MS;
    this.maxRetries = options.maxRetries || MAX_RETRIES;
    
    // Rate limiting
    this.requestWeights = [];
    this.rateLimit = RATE_LIMIT_WEIGHT_PER_MIN;
    
    // Circuit breaker state
    this.circuitState = 'closed'; // closed | open | half-open
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.circuitOpenTime = null;
    
    this.verbose = options.verbose || false;
  }

  log(msg) {
    if (this.verbose) {
      console.log(`[BinanceFetcher] ${msg}`);
    }
  }

  warn(msg) {
    console.warn(`[BinanceFetcher] WARNING: ${msg}`);
  }

  // Circuit breaker logic
  checkCircuit() {
    if (this.circuitState === 'closed') {
      return; // Normal operation
    }

    if (this.circuitState === 'open') {
      const elapsed = Date.now() - this.circuitOpenTime;
      if (elapsed > CIRCUIT_BREAKER_TIMEOUT_MS) {
        this.log('Circuit breaker: attempting half-open');
        this.circuitState = 'half-open';
        this.failureCount = 0;
      } else {
        throw new CircuitBreakerError(
          `Circuit breaker OPEN (${Math.ceil((CIRCUIT_BREAKER_TIMEOUT_MS - elapsed) / 1000)}s remaining)`
        );
      }
    }
  }

  recordSuccess() {
    if (this.circuitState === 'half-open') {
      this.log('Circuit breaker: closing after successful request');
      this.circuitState = 'closed';
    }
    this.failureCount = 0;
  }

  recordFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= CIRCUIT_BREAKER_THRESHOLD) {
      this.circuitState = 'open';
      this.circuitOpenTime = Date.now();
      this.warn(`Circuit breaker OPENED after ${this.failureCount} failures`);
    }
  }

  // Rate limiting
  checkRateLimit() {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    // Remove old requests
    this.requestWeights = this.requestWeights.filter(r => r.timestamp > oneMinuteAgo);
    
    const currentWeight = this.requestWeights.reduce((sum, r) => sum + r.weight, 0);
    
    if (currentWeight + RATE_LIMIT_KLINES_WEIGHT > this.rateLimit) {
      const oldestRequest = this.requestWeights[0];
      const waitMs = oldestRequest ? oldestRequest.timestamp + 60000 - now : 1000;
      throw new RateLimitError(`Rate limit would be exceeded. Wait ${Math.ceil(waitMs / 1000)}s`);
    }
    
    // Record this request
    this.requestWeights.push({
      timestamp: now,
      weight: RATE_LIMIT_KLINES_WEIGHT
    });
  }

  // HTTP request wrapper
  async httpGet(path, params = {}) {
    return new Promise((resolve, reject) => {
      const query = new URLSearchParams(params).toString();
      const url = `${this.baseUrl}${path}?${query}`;
      
      const options = {
        timeout: this.timeout,
        headers: {}
      };
      
      if (this.apiKey) {
        options.headers['X-MBX-APIKEY'] = this.apiKey;
      }

      const req = https.get(url, options, (res) => {
        let data = '';
        
        res.on('data', chunk => {
          data += chunk;
        });
        
        res.on('end', () => {
          if (res.statusCode === 200) {
            try {
              const parsed = JSON.parse(data);
              resolve(parsed);
            } catch (err) {
              reject(new Error(`Failed to parse JSON: ${err.message}`));
            }
          } else if (res.statusCode === 429) {
            reject(new RateLimitError(`HTTP 429: Rate limit exceeded`));
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
          }
        });
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error(`Request timeout after ${this.timeout}ms`));
      });

      req.on('error', (err) => {
        reject(err);
      });
    });
  }

  // Exponential backoff retry
  async retryWithBackoff(fn, attempt = 0) {
    try {
      return await fn();
    } catch (err) {
      if (attempt >= this.maxRetries) {
        throw err;
      }

      // Don't retry circuit breaker errors
      if (err instanceof CircuitBreakerError) {
        throw err;
      }

      // Exponential backoff: 1s, 2s, 4s, 8s...
      const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt);
      
      // Special handling for rate limit errors
      if (err instanceof RateLimitError) {
        const match = err.message.match(/Wait (\d+)s/);
        const waitSeconds = match ? parseInt(match[1]) : Math.ceil(delay / 1000);
        this.warn(`Rate limited. Waiting ${waitSeconds}s before retry ${attempt + 1}/${this.maxRetries}`);
        await new Promise(resolve => setTimeout(resolve, waitSeconds * 1000));
      } else {
        this.warn(`Request failed: ${err.message}. Retry ${attempt + 1}/${this.maxRetries} in ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      return this.retryWithBackoff(fn, attempt + 1);
    }
  }

  // Main method: fetch klines
  async fetchKlines(symbol, interval, options = {}) {
    const {
      startTime,
      endTime,
      limit = 1000
    } = options;

    if (limit > MAX_KLINES_PER_REQUEST) {
      throw new Error(`Limit ${limit} exceeds max ${MAX_KLINES_PER_REQUEST}`);
    }

    // Check circuit breaker
    this.checkCircuit();
    
    // Check rate limit
    this.checkRateLimit();

    const params = {
      symbol: symbol.toUpperCase(),
      interval,
      limit
    };

    if (startTime) params.startTime = startTime;
    if (endTime) params.endTime = endTime;

    this.log(`Fetching klines: ${symbol} ${interval} (limit=${limit})`);

    try {
      const klines = await this.retryWithBackoff(() => 
        this.httpGet('/api/v3/klines', params)
      );

      this.recordSuccess();
      return klines;
    } catch (err) {
      this.recordFailure();
      throw err;
    }
  }

  // Fetch multiple batches to get more than 1000 bars
  async fetchKlinesBatched(symbol, interval, totalBars) {
    const batches = Math.ceil(totalBars / MAX_KLINES_PER_REQUEST);
    const allKlines = [];
    let lastEndTime = null;

    this.log(`Fetching ${totalBars} bars in ${batches} batches`);

    for (let i = 0; i < batches; i++) {
      const limit = Math.min(MAX_KLINES_PER_REQUEST, totalBars - allKlines.length);
      const options = { limit };
      
      // Start from the end of the last batch (exclusive)
      if (lastEndTime) {
        options.startTime = lastEndTime + 1;
      }

      const klines = await this.fetchKlines(symbol, interval, options);
      
      if (klines.length === 0) {
        this.warn(`Batch ${i + 1}/${batches}: No more data available`);
        break;
      }

      allKlines.push(...klines);
      lastEndTime = klines[klines.length - 1][6]; // closeTime
      
      this.log(`Batch ${i + 1}/${batches}: fetched ${klines.length} bars (total: ${allKlines.length})`);

      // Small delay between batches to be nice to the API
      if (i < batches - 1) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    return allKlines;
  }

  // Get server time (useful for testing connection)
  async getServerTime() {
    this.checkCircuit();
    this.checkRateLimit();
    
    try {
      const response = await this.retryWithBackoff(() =>
        this.httpGet('/api/v3/time')
      );
      this.recordSuccess();
      return response.serverTime;
    } catch (err) {
      this.recordFailure();
      throw err;
    }
  }

  // Get circuit breaker status
  getStatus() {
    return {
      circuitState: this.circuitState,
      failureCount: this.failureCount,
      requestsInLastMinute: this.requestWeights.length,
      totalWeight: this.requestWeights.reduce((sum, r) => sum + r.weight, 0)
    };
  }
}

export default BinanceFetcher;
