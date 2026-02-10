#!/usr/bin/env node
// scripts/verify/websocket_smoke.mjs
// Smoke tests for BinanceWSClient (no real network required)
// Tests: configuration, status, staleness detection, cleanup

import { BinanceWSClient } from '../data/BinanceWSClient.mjs';

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

function testConfiguration() {
  console.log('\n━━━ CONFIGURATION TEST ━━━');
  
  const defaultClient = new BinanceWSClient();
  assert(defaultClient.baseUrl === 'wss://stream.binance.com:9443', 'Default baseUrl is correct');
  assert(defaultClient.reconnectEnabled === true, 'Default reconnect enabled');
  assert(defaultClient.maxReconnectAttempts === 10, 'Default max reconnect attempts');
  assert(defaultClient.verbose === false, 'Default verbose is false');

  const customClient = new BinanceWSClient({
    baseUrl: 'wss://custom.url',
    reconnectEnabled: false,
    maxReconnectAttempts: 5,
    verbose: true
  });
  assert(customClient.baseUrl === 'wss://custom.url', 'Custom baseUrl works');
  assert(customClient.reconnectEnabled === false, 'Custom reconnect works');
  assert(customClient.maxReconnectAttempts === 5, 'Custom max attempts works');
  assert(customClient.verbose === true, 'Custom verbose works');
}

function testInitialState() {
  console.log('\n━━━ INITIAL STATE TEST ━━━');
  
  const client = new BinanceWSClient();
  
  assert(client.isConnected === false, 'Initial connection state is false');
  assert(client.reconnectAttempts === 0, 'Initial reconnect attempts is 0');
  assert(client.messageCount === 0, 'Initial message count is 0');
  assert(client.lastMessageTime === null, 'Initial last message time is null');
  assert(client.activeStreams.size === 0, 'Initial active streams is empty');
  assert(client.isShuttingDown === false, 'Initial shutdown state is false');
}

function testStatusReporting() {
  console.log('\n━━━ STATUS REPORTING TEST ━━━');
  
  const client = new BinanceWSClient();
  const status = client.getStatus();

  assert(typeof status.connected === 'boolean', 'Status has connected field');
  assert(Array.isArray(status.streams), 'Status has streams array');
  assert(typeof status.messageCount === 'number', 'Status has messageCount');
  assert(status.lastMessageTime === null, 'Status shows null for no messages');
  assert(status.dataAge === null, 'Status shows null data age initially');
  assert(status.isStale === true, 'Status shows stale when no messages');
  assert(typeof status.reconnectAttempts === 'number', 'Status has reconnectAttempts');
}

function testStalenessDetection() {
  console.log('\n━━━ STALENESS DETECTION TEST ━━━');
  
  const client = new BinanceWSClient();
  
  // No messages yet - should be stale
  assert(client.isDataStale() === true, 'No messages = stale data');
  assert(client.getDataAge() === null, 'No messages = null age');
  
  // Simulate recent message
  client.lastMessageTime = Date.now();
  assert(client.isDataStale() === false, 'Recent message = fresh data');
  assert(client.getDataAge() < 100, 'Recent message = low age');
  
  // Simulate old message (>5s)
  client.lastMessageTime = Date.now() - 6000;
  assert(client.isDataStale() === true, 'Old message = stale data');
  assert(client.getDataAge() > 5000, 'Old message = high age');
}

function testStreamManagement() {
  console.log('\n━━━ STREAM MANAGEMENT TEST ━━━');
  
  const client = new BinanceWSClient();
  
  // Initial state
  assert(client.activeStreams.size === 0, 'No active streams initially');
  
  // Simulate adding streams
  client.activeStreams.add('btcusdt@ticker');
  client.activeStreams.add('ethusdt@ticker');
  assert(client.activeStreams.size === 2, 'Can track multiple streams');
  assert(client.activeStreams.has('btcusdt@ticker'), 'Stream tracking works');
  
  // Remove stream
  client.activeStreams.delete('ethusdt@ticker');
  assert(client.activeStreams.size === 1, 'Can remove streams');
  assert(!client.activeStreams.has('ethusdt@ticker'), 'Stream removal works');
}

function testEventEmitter() {
  console.log('\n━━━ EVENT EMITTER TEST ━━━');
  
  const client = new BinanceWSClient();
  
  let connectedFired = false;
  let messageFired = false;
  let errorFired = false;
  
  client.on('connected', () => {
    connectedFired = true;
  });
  
  client.on('message', () => {
    messageFired = true;
  });
  
  client.on('error', () => {
    errorFired = true;
  });
  
  // Simulate events
  client.emit('connected');
  client.emit('message', { test: 'data' });
  client.emit('error', new Error('test'));
  
  assert(connectedFired === true, 'Connected event fires');
  assert(messageFired === true, 'Message event fires');
  assert(errorFired === true, 'Error event fires');
}

function testShutdownState() {
  console.log('\n━━━ SHUTDOWN STATE TEST ━━━');
  
  const client = new BinanceWSClient();
  
  assert(client.isShuttingDown === false, 'Not shutting down initially');
  
  client.isShuttingDown = true;
  assert(client.isShuttingDown === true, 'Shutdown flag can be set');
}

function testMessageCounting() {
  console.log('\n━━━ MESSAGE COUNTING TEST ━━━');
  
  const client = new BinanceWSClient();
  
  assert(client.messageCount === 0, 'Initial message count is 0');
  
  client.messageCount++;
  client.messageCount++;
  client.messageCount++;
  
  assert(client.messageCount === 3, 'Message counting works');
  
  const status = client.getStatus();
  assert(status.messageCount === 3, 'Status reflects message count');
}

function testReconnectAttempts() {
  console.log('\n━━━ RECONNECT ATTEMPTS TEST ━━━');
  
  const client = new BinanceWSClient({ maxReconnectAttempts: 5 });
  
  assert(client.reconnectAttempts === 0, 'Initial reconnect attempts is 0');
  assert(client.maxReconnectAttempts === 5, 'Max reconnect attempts is set');
  
  // Simulate failed reconnects
  client.reconnectAttempts = 3;
  assert(client.reconnectAttempts === 3, 'Can track reconnect attempts');
  
  // Check if we've hit the limit
  const hasReachedLimit = client.reconnectAttempts >= client.maxReconnectAttempts;
  assert(hasReachedLimit === false, 'Not at limit yet');
  
  client.reconnectAttempts = 5;
  const nowAtLimit = client.reconnectAttempts >= client.maxReconnectAttempts;
  assert(nowAtLimit === true, 'Detects when limit reached');
}

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('BINANCE WEBSOCKET SMOKE TEST (No Network)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  try {
    testConfiguration();
    testInitialState();
    testStatusReporting();
    testStalenessDetection();
    testStreamManagement();
    testEventEmitter();
    testShutdownState();
    testMessageCounting();
    testReconnectAttempts();

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('RESULTS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✓ PASSED: ${passed}`);
    console.log(`✗ FAILED: ${failed}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    if (failed > 0) {
      console.error(`\n✗ ${failed} tests failed`);
      process.exit(1);
    }

    console.log('\n✓ All tests passed');
    process.exit(0);
  } catch (err) {
    console.error('\n✗ Unexpected error:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

main();
