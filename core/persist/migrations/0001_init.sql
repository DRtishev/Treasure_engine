-- TREASURE ENGINE: Initial Schema Migration
-- Version: 0001_init
-- Date: 2026-02-10
-- Purpose: Persistence + Idempotency Foundation (EPOCH-12)

-- Runs table: tracks each simulation/trading run
CREATE TABLE IF NOT EXISTS runs (
    run_id TEXT PRIMARY KEY,
    started_at INTEGER NOT NULL,
    mode TEXT NOT NULL CHECK(mode IN ('paper', 'sim', 'live')),
    dataset_sha TEXT,
    ssot_sha TEXT,
    status TEXT NOT NULL CHECK(status IN ('running', 'completed', 'failed', 'stopped')),
    metadata_json TEXT,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
);

CREATE INDEX IF NOT EXISTS idx_runs_status ON runs(status);
CREATE INDEX IF NOT EXISTS idx_runs_started_at ON runs(started_at);

-- Events table: all system events (dual sink with JSONL)
CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id TEXT NOT NULL,
    seq INTEGER NOT NULL,
    ts_ms INTEGER NOT NULL,
    category TEXT NOT NULL,
    event_type TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
    FOREIGN KEY (run_id) REFERENCES runs(run_id),
    UNIQUE(run_id, seq)
);

CREATE INDEX IF NOT EXISTS idx_events_run_id ON events(run_id);
CREATE INDEX IF NOT EXISTS idx_events_category ON events(category);
CREATE INDEX IF NOT EXISTS idx_events_ts_ms ON events(ts_ms);

-- Intents table: trading intents (idempotency key: intent_id)
CREATE TABLE IF NOT EXISTS intents (
    intent_id TEXT PRIMARY KEY,
    run_id TEXT NOT NULL,
    ts_ms INTEGER NOT NULL,
    side TEXT NOT NULL CHECK(side IN ('long', 'short', 'close')),
    size_usd REAL NOT NULL,
    symbol TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('pending', 'submitted', 'filled', 'canceled', 'failed')),
    hack_id TEXT,
    signal_hash TEXT,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
    FOREIGN KEY (run_id) REFERENCES runs(run_id)
);

CREATE INDEX IF NOT EXISTS idx_intents_run_id ON intents(run_id);
CREATE INDEX IF NOT EXISTS idx_intents_status ON intents(status);
CREATE INDEX IF NOT EXISTS idx_intents_ts_ms ON intents(ts_ms);

-- Orders table: actual orders placed via execution adapter
CREATE TABLE IF NOT EXISTS orders (
    order_id TEXT PRIMARY KEY,
    intent_id TEXT NOT NULL,
    adapter TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('pending', 'submitted', 'filled', 'partially_filled', 'canceled', 'failed')),
    order_type TEXT,
    side TEXT,
    symbol TEXT,
    size REAL,
    price REAL,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
    FOREIGN KEY (intent_id) REFERENCES intents(intent_id)
);

CREATE INDEX IF NOT EXISTS idx_orders_intent_id ON orders(intent_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);

-- Fills table: order fill events
CREATE TABLE IF NOT EXISTS fills (
    fill_id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    price REAL NOT NULL,
    qty REAL NOT NULL,
    fee_usd REAL NOT NULL DEFAULT 0.0,
    ts_ms INTEGER NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
    FOREIGN KEY (order_id) REFERENCES orders(order_id)
);

CREATE INDEX IF NOT EXISTS idx_fills_order_id ON fills(order_id);
CREATE INDEX IF NOT EXISTS idx_fills_ts_ms ON fills(ts_ms);

-- Positions table: current position state (per symbol)
CREATE TABLE IF NOT EXISTS positions (
    symbol TEXT PRIMARY KEY,
    qty REAL NOT NULL DEFAULT 0.0,
    avg_price REAL,
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
);

-- Safety table: global safety state
CREATE TABLE IF NOT EXISTS safety (
    id INTEGER PRIMARY KEY CHECK(id = 1),
    status TEXT NOT NULL CHECK(status IN ('normal', 'paused', 'halted', 'emergency')),
    reason TEXT,
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
);

-- Initialize safety state
INSERT OR IGNORE INTO safety (id, status, reason, updated_at) 
VALUES (1, 'normal', NULL, strftime('%s', 'now') * 1000);

-- Checkpoints table: arbitrary key-value persistence
CREATE TABLE IF NOT EXISTS checkpoints (
    name TEXT PRIMARY KEY,
    payload_json TEXT NOT NULL,
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
);

-- Schema version tracking
CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER PRIMARY KEY,
    applied_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
);

INSERT INTO schema_version (version, applied_at) 
VALUES (1, strftime('%s', 'now') * 1000);
