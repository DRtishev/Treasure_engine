/**
 * edge_okx_orderbook_00_preflight_replay.mjs — OKX Orderbook R2 Preflight / Fixture Validator
 *
 * Offline-only. Validates R2 exception scaffolding: checks that fixture dirs
 * for no_update, seq_reset, and empty_updates are present and non-empty.
 * No live connection, no R2 implementation. Pure preflight gate.
 *
 * Usage:
 *   TREASURE_NET_KILL=1 node scripts/edge/edge_okx_orderbook_00_preflight_replay.mjs \
 *     [--provider okx_orderbook_ws]
 *
 * Exit codes:
 *   0 — PASS (fixtures present and valid)
 *   1 — FAIL (fixture schema error)
 *   2 — NEEDS_DATA (fixture dirs missing or empty)
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const SCRIPT_DIR = path.resolve(path.dirname(new URL(import.meta.url).pathname));
const ROOT_CANDIDATE = path.resolve(SCRIPT_DIR, '..', '..');
const gitRoot = spawnSync('git', ['-C', ROOT_CANDIDATE, 'rev-parse', '--show-toplevel'], { encoding: 'utf8' });
const ROOT = gitRoot.status === 0 ? String(gitRoot.stdout || '').trim() : ROOT_CANDIDATE;

const FIXTURE_BASE = path.join(ROOT, 'artifacts', 'fixtures', 'okx', 'orderbook');
const REQUIRED_DIRS = ['no_update', 'seq_reset', 'empty_updates'];

const args = process.argv.slice(2);
const providerIdx = args.indexOf('--provider');
const provider = providerIdx >= 0 ? args[providerIdx + 1] : 'okx_orderbook_ws';

if (provider !== 'okx_orderbook_ws') {
  console.error(`[FAIL] Unknown provider: ${provider}`);
  process.exit(1);
}

// Check fixture dirs
const missing = [];
const empty = [];
const present = [];

for (const dir of REQUIRED_DIRS) {
  const dirPath = path.join(FIXTURE_BASE, dir);
  if (!fs.existsSync(dirPath)) {
    missing.push(dir);
    continue;
  }
  const files = fs.readdirSync(dirPath).filter((f) => !f.startsWith('.'));
  if (files.length === 0) {
    empty.push(dir);
  } else {
    present.push(`${dir}(${files.length} files)`);
  }
}

if (missing.length > 0 || empty.length > 0) {
  const issues = [
    ...missing.map((d) => `missing: ${d}`),
    ...empty.map((d) => `empty: ${d}`),
  ];
  console.error(`[NEEDS_DATA] edge_okx_orderbook_00_preflight — ${issues.join(', ')}`);
  process.exit(2);
}

console.log(`[PASS] edge_okx_orderbook_00_preflight — provider=${provider} fixtures=${present.join(',')}`);
process.exit(0);
