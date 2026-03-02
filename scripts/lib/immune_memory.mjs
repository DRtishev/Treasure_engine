/**
 * immune_memory.mjs — Persistent failure memory for Doctor
 *
 * Reads/writes artifacts/doctor/IMMUNE_MEMORY.json
 * Tracks which gates failed, how many times, and what chaos found.
 * Next Doctor run uses this to prioritize checks.
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const MEMORY_DIR = path.join(ROOT, 'artifacts', 'doctor');
const MEMORY_PATH = path.join(MEMORY_DIR, 'IMMUNE_MEMORY.json');

export function loadMemory() {
  if (!fs.existsSync(MEMORY_PATH)) {
    return { last_failures: [], failure_count: {}, chaos_history: {}, heal_history: [], runs: 0 };
  }
  try {
    return JSON.parse(fs.readFileSync(MEMORY_PATH, 'utf8'));
  } catch {
    return { last_failures: [], failure_count: {}, chaos_history: {}, heal_history: [], runs: 0 };
  }
}

export function saveMemory(mem) {
  fs.mkdirSync(MEMORY_DIR, { recursive: true });
  const sorted = {};
  for (const k of Object.keys(mem).sort()) sorted[k] = mem[k];
  fs.writeFileSync(MEMORY_PATH, JSON.stringify(sorted, null, 2) + '\n', 'utf8');
}

export function updateMemory(currentFailures, chaosResults, healActions) {
  const mem = loadMemory();
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
      mem.failure_count[k] = 0; // Reset on pass — it healed
    }
  }

  // Chaos history
  for (const [id, result] of Object.entries(chaosResults)) {
    mem.chaos_history[id] = result;
  }

  // Heal history (keep last 20)
  if (healActions.length > 0) {
    mem.heal_history = [...(mem.heal_history || []), ...healActions.map((h) => h.action)].slice(-20);
  }

  saveMemory(mem);
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
