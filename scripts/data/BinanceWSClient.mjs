#!/usr/bin/env node
// scripts/data/BinanceWSClient.mjs
// Production-ready Binance WebSocket client for real-time price data
// Features: auto-reconnect, ping/pong, staleness detection, clean shutdown

import { WebSocket } from 'ws';
import { EventEmitter } from 'events';

const BINANCE_WS_BASE_URL = 'wss://stream.binance.com:9443';
const RECONNECT_BASE_DELAY_MS = 1000;
const RECONNECT_MAX_DELAY_MS = 30000;
const MAX_RECONNECT_ATTEMPTS = 10;
const PING_INTERVAL_MS = 30000;
const STALENESS_THRESHOLD_MS = 5000;

class ConnectionError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ConnectionError';
  }
}

export class BinanceWSClient extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.baseUrl = options.baseUrl || BINANCE_WS_BASE_URL;
    this.reconnectEnabled = options.reconnectEnabled !== false;
    this.maxReconnectAttempts = options.maxReconnectAttempts || MAX_RECONNECT_ATTEMPTS;
    this.verbose = options.verbose || false;
    
    // Connection state
    this.ws = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.reconnectTimer = null;
    this.pingTimer = null;
    
    // Stream state
    this.activeStreams = new Set();
    this.lastMessageTime = null;
    this.messageCount = 0;
    
    // Graceful shutdown
    this.isShuttingDown = false;
  }

  log(msg) {
    if (this.verbose) {
      console.log(`[BinanceWS] ${msg}`);
    }
  }

  warn(msg) {
    console.warn(`[BinanceWS] WARNING: ${msg}`);
  }

  // Connect to Binance WebSocket
  async connect(streams = []) {
    if (this.isShuttingDown) {
      throw new ConnectionError('Client is shutting down');
    }

    if (this.isConnected) {
      this.log('Already connected');
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        // Build stream URL
        let url = this.baseUrl;
        if (streams.length > 0) {
          const streamPath = streams.join('/');
          url = `${this.baseUrl}/stream?streams=${streamPath}`;
        } else {
          url = `${this.baseUrl}/ws`;
        }

        this.log(`Connecting to: ${url}`);
        this.activeStreams = new Set(streams);

        this.ws = new WebSocket(url);

        // Connection opened
        this.ws.on('open', () => {
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.lastMessageTime = Date.now();
          
          this.log('✓ Connected');
          this.emit('connected');
          
          // Start ping/pong heartbeat
          this.startPingTimer();
          
          resolve();
        });

        // Message received
        this.ws.on('message', (data) => {
          this.lastMessageTime = Date.now();
          this.messageCount++;
          
          try {
            const message = JSON.parse(data.toString());
            this.emit('message', message);
          } catch (err) {
            this.warn(`Failed to parse message: ${err.message}`);
            this.emit('error', new Error(`Parse error: ${err.message}`));
          }
        });

        // Pong response (heartbeat)
        this.ws.on('pong', () => {
          this.log('Pong received');
        });

        // Connection closed
        this.ws.on('close', (code, reason) => {
          this.isConnected = false;
          this.stopPingTimer();
          
          const reasonStr = reason ? reason.toString() : 'Unknown';
          this.log(`Disconnected: code=${code}, reason=${reasonStr}`);
          this.emit('disconnected', { code, reason: reasonStr });
          
          // Auto-reconnect if not shutting down
          if (!this.isShuttingDown && this.reconnectEnabled) {
            this.scheduleReconnect(streams);
          }
        });

        // Connection error
        this.ws.on('error', (err) => {
          this.warn(`WebSocket error: ${err.message}`);
          this.emit('error', err);
          
          if (!this.isConnected) {
            reject(err);
          }
        });

      } catch (err) {
        reject(err);
      }
    });
  }

  // Schedule reconnection with exponential backoff
  scheduleReconnect(streams) {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.warn(`Max reconnect attempts (${this.maxReconnectAttempts}) reached. Giving up.`);
      this.emit('reconnect_failed');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(
      RECONNECT_BASE_DELAY_MS * Math.pow(2, this.reconnectAttempts - 1),
      RECONNECT_MAX_DELAY_MS
    );

    this.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    this.emit('reconnecting', { attempt: this.reconnectAttempts, delay });

    this.reconnectTimer = setTimeout(async () => {
      try {
        await this.connect(Array.from(this.activeStreams));
      } catch (err) {
        this.warn(`Reconnection failed: ${err.message}`);
      }
    }, delay);
  }

  // Start ping/pong heartbeat
  startPingTimer() {
    this.stopPingTimer();
    
    this.pingTimer = setInterval(() => {
      if (this.isConnected && this.ws) {
        this.log('Sending ping');
        this.ws.ping();
      }
    }, PING_INTERVAL_MS);
  }

  // Stop ping/pong heartbeat
  stopPingTimer() {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  // Subscribe to additional streams (if using combined stream endpoint)
  subscribe(streams) {
    if (!this.isConnected) {
      throw new ConnectionError('Not connected');
    }

    const payload = {
      method: 'SUBSCRIBE',
      params: streams,
      id: Date.now()
    };

    this.log(`Subscribing to: ${streams.join(', ')}`);
    this.ws.send(JSON.stringify(payload));
    
    streams.forEach(s => this.activeStreams.add(s));
    this.emit('subscribed', streams);
  }

  // Unsubscribe from streams
  unsubscribe(streams) {
    if (!this.isConnected) {
      throw new ConnectionError('Not connected');
    }

    const payload = {
      method: 'UNSUBSCRIBE',
      params: streams,
      id: Date.now()
    };

    this.log(`Unsubscribing from: ${streams.join(', ')}`);
    this.ws.send(JSON.stringify(payload));
    
    streams.forEach(s => this.activeStreams.delete(s));
    this.emit('unsubscribed', streams);
  }

  // Check if data is stale
  isDataStale() {
    if (!this.lastMessageTime) {
      return true;
    }
    
    const age = Date.now() - this.lastMessageTime;
    return age > STALENESS_THRESHOLD_MS;
  }

  // Get data age in milliseconds
  getDataAge() {
    if (!this.lastMessageTime) {
      return null;
    }
    return Date.now() - this.lastMessageTime;
  }

  // Get connection status
  getStatus() {
    return {
      connected: this.isConnected,
      streams: Array.from(this.activeStreams),
      messageCount: this.messageCount,
      lastMessageTime: this.lastMessageTime,
      dataAge: this.getDataAge(),
      isStale: this.isDataStale(),
      reconnectAttempts: this.reconnectAttempts
    };
  }

  // Graceful shutdown
  async disconnect() {
    this.isShuttingDown = true;
    this.reconnectEnabled = false;
    
    // Clear timers
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.stopPingTimer();

    // Close WebSocket
    if (this.ws) {
      return new Promise((resolve) => {
        if (!this.isConnected) {
          resolve();
          return;
        }

        this.ws.once('close', () => {
          this.log('Disconnected gracefully');
          resolve();
        });

        this.ws.close();
        
        // Force close after 5s
        setTimeout(() => {
          if (this.ws) {
            this.ws.terminate();
          }
          resolve();
        }, 5000);
      });
    }
  }
}

export default BinanceWSClient;
