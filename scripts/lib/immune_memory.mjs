/**
 * immune_memory.mjs — Persistent failure memory for Doctor v2
 *
 * Reads/writes artifacts/doctor/IMMUNE_MEMORY.json
 * Tracks which gates failed, how many times, what chaos found,
 * score history, heal effectiveness, and trending snapshots.
 *
 * Schema v2: backward-compatible with v1 (missing fields backfilled).
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const MEMORY_DIR = path.join(ROOT, 'artifacts', 'doctor');
const MEMORY_PATH = path.join(MEMORY_DIR, 'IMMUNE_MEMORY.json');

const DEFAULTS = {
  schema_version: '2.0.0',
  chaos_history: {},
  failure_count: {},
  heal_history: [],
  last_failures: [],
  runs: 0,
  score_history: [],
  trending_snapshot: {
    pareto: [],
    avg_score: 0,
    heal_rate: 0,
    time_to_recovery: 0,
  },
  heal_effectiveness: {
    total: 0,
    effective: 0,
    ineffective: 0,
  },
};

export function loadMemory() {
  if (!fs.existsSync(MEMORY_PATH)) {
    return structuredClone(DEFAULTS);
  }
  try {
    const raw = JSON.parse(fs.readFileSync(MEMORY_PATH, 'utf8'));
    // D-05: backward compat — backfill missing v2 fields from defaults
    if (!raw.schema_version) raw.schema_version = '2.0.0';
    if (!raw.score_history) raw.score_history = [];
    if (!raw.trending_snapshot) raw.trending_snapshot = structuredClone(DEFAULTS.trending_snapshot);
    if (!raw.heal_effectiveness) raw.heal_effectiveness = structuredClone(DEFAULTS.heal_effectiveness);
    if (!raw.heal_history) raw.heal_history = [];
    if (!raw.chaos_history) raw.chaos_history = {};
    if (!raw.failure_count) raw.failure_count = {};
    if (!raw.last_failures) raw.last_failures = [];
    if (typeof raw.runs !== 'number') raw.runs = 0;
    return raw;
  } catch {
    return structuredClone(DEFAULTS);
  }
}

export function saveMemory(mem) {
  fs.mkdirSync(MEMORY_DIR, { recursive: true });
  const sorted = {};
  for (const k of Object.keys(mem).sort()) {
    sorted[k] = mem[k];
  }
  fs.writeFileSync(MEMORY_PATH, JSON.stringify(sorted, null, 2) + '\n', 'utf8');
}

/**
 * updateMemory — called after each Doctor run.
 * @param {string[]} currentFailures - scoreboard keys that failed
 * @param {Object} chaosResults - { CHAOS_ID: 'PASS'|'FAIL' }
 * @param {Array} healActions - heal log entries
 * @param {number} score - total score this run (BUG-01 fix)
 * @param {Object} opts - { max_score_history: 200, max_heal_history: 50, existing_memory: null }
 */
export function updateMemory(currentFailures, chaosResults, healActions, score, opts = {}) {
  const maxScoreHistory = opts.max_score_history || 200;
  const maxHealHistory = opts.max_heal_history || 50;
  // Accept pre-mutated memory (e.g. from evaluateHealEffectiveness) to avoid re-loading
  const mem = opts.existing_memory || loadMemory();
  mem.runs = (mem.runs || 0) + 1;
  mem.last_failures = currentFailures;

  // Increment failure counts
  for (const f of currentFailures) {
    mem.failure_count[f] = (mem.failure_count[f] || 0) + 1;
  }
  // Reset count for gates that passed this time
  const allKnown = Object.keys(mem.failure_count);
  for (const k of allKnown) {
    if (!currentFailures.includes(k) && mem.failure_count[k] > 0) {
      mem.failure_count[k] = 0;
    }
  }

  // Chaos history
  for (const [id, result] of Object.entries(chaosResults)) {
    mem.chaos_history[id] = result;
  }

  // Heal history (keep last maxHealHistory, with effectiveness tracking)
  if (healActions.length > 0) {
    const newEntries = healActions.map((h) => ({
      action: typeof h === 'string' ? h : h.action,
      run_index: mem.runs,
      effective: null,
    }));
    mem.heal_history = [...(mem.heal_history || []), ...newEntries].slice(-maxHealHistory);
  }

  // Score history (BUG-01 fix: now receives and persists score)
  if (typeof score === 'number') {
    mem.score_history = [...(mem.score_history || []), score].slice(-maxScoreHistory);
  }

  saveMemory(mem);
  return mem;
}

/**
 * evaluateHealEffectiveness — check if past heals actually fixed problems.
 * Call BEFORE updateMemory so we can compare against current board.
 */
export function evaluateHealEffectiveness(mem, currentBoard) {
  if (!mem.heal_history || mem.heal_history.length === 0) return mem;

  // Map heal actions to gate names (reverse-map)
  const healToGate = {
    orphan_quarantine: 'chaos_orphan',
    executor_dir: 'startup_boot',
    git_dir: 'startup_boot',
    node_modules: 'startup_boot',
    stale_baseline: 'startup_boot',
    stale_enrichment: 'readiness_san',
    corrupt_lock: 'readiness_san',
    missing_enriched_bars: 'readiness_san',
    orphan_runs: 'readiness_san',
  };

  for (const entry of mem.heal_history) {
    if (typeof entry === 'string') continue; // v1 format, skip
    if (entry.effective !== null) continue; // already evaluated
    const gate = healToGate[entry.action];
    if (!gate || !currentBoard[gate]) continue;
    entry.effective = currentBoard[gate].pass;
  }

  // Compute effectiveness stats
  const evaluated = mem.heal_history.filter((h) => typeof h === 'object' && h.effective !== null);
  mem.heal_effectiveness = {
    total: evaluated.length,
    effective: evaluated.filter((h) => h.effective === true).length,
    ineffective: evaluated.filter((h) => h.effective === false).length,
  };

  return mem;
}

export function getRecurring(mem, threshold = 3) {
  return Object.entries(mem.failure_count || {})
    .filter(([, count]) => count >= threshold)
    .map(([gate]) => gate)
    .sort();
}

export function getPriorityGates(mem) {
  // Gates that failed last time run first
  return [...(mem.last_failures || [])].sort();
}
