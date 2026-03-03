/**
 * proprioception.mjs — Organism self-awareness scanner (EPOCH-70 G8)
 *
 * Pure read-only. Scans: watermark, environment, FSM state, EventBus history.
 * Returns ProprioceptionContext. MUST NOT write anything.
 *
 * Exports:
 *   scan(bus?) → ProprioceptionContext
 */

import fs from 'node:fs';
import path from 'node:path';
import {
  loadFsmKernel, readWatermark, replayState,
  getAvailableTransitions, findPathToGoal,
  getCircuitBreakerState, stateToMode,
} from './state_manager.mjs';
import { findAllBusJsonls, readBus, mergeAndSortEvents } from './eventbus_v1.mjs';

const ROOT = process.cwd();

/**
 * Read the previous LIFE_SUMMARY.json (if any) to derive previous run outcome.
 */
function readPreviousLifeSummary() {
  const evidenceDir = path.join(ROOT, 'reports', 'evidence');
  if (!fs.existsSync(evidenceDir)) return null;
  const dirs = fs.readdirSync(evidenceDir)
    .filter((d) => d.startsWith('EPOCH-LIFE-'))
    .sort((a, b) => a.localeCompare(b));
  if (dirs.length === 0) return null;
  const latest = dirs[dirs.length - 1];
  const summaryPath = path.join(evidenceDir, latest, 'LIFE_SUMMARY.json');
  try {
    if (!fs.existsSync(summaryPath)) return null;
    return JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
  } catch {
    return null;
  }
}

/**
 * Scan environment for organism context.
 */
function scanEnvironment() {
  const nodeModulesPath = path.join(ROOT, 'node_modules');
  let depsReady = false;
  try {
    depsReady = fs.existsSync(nodeModulesPath) &&
      fs.readdirSync(nodeModulesPath).length >= 10;
  } catch { /* fail-safe */ }
  // BUG-D mirror: also check NODE_PATH
  if (!depsReady && process.env.NODE_PATH) {
    const dirs = process.env.NODE_PATH.split(path.delimiter).filter(Boolean);
    for (const dir of dirs) {
      try {
        if (fs.existsSync(dir) && fs.readdirSync(dir).length >= 10) {
          depsReady = true;
          break;
        }
      } catch { /* continue */ }
    }
  }

  const gitPresent = fs.existsSync(path.join(ROOT, '.git'));
  const networkToken = fs.existsSync(path.join(ROOT, 'artifacts', 'incoming', 'ALLOW_NETWORK'));

  let candidatesPromoted = 0;
  try {
    const regPath = path.join(ROOT, 'reports', 'evidence', 'EXECUTOR', 'CANDIDATE_REGISTRY.json');
    if (fs.existsSync(regPath)) {
      const reg = JSON.parse(fs.readFileSync(regPath, 'utf8'));
      const entries = reg.candidates ?? reg.entries ?? [];
      candidatesPromoted = entries.filter((c) => c.status === 'PROMOTED').length;
    }
  } catch { /* fail-safe */ }

  const executorDir = path.join(ROOT, 'reports', 'evidence', 'EXECUTOR');
  const executorPresent = fs.existsSync(executorDir);

  let gateCount = 0;
  try {
    const gateDir = path.join(executorDir, 'gates', 'manual');
    if (fs.existsSync(gateDir)) {
      gateCount = fs.readdirSync(gateDir).filter((f) => f.endsWith('.json')).length;
    }
  } catch { /* fail-safe */ }

  return {
    deps_ready: depsReady,
    git_present: gitPresent,
    network_token: networkToken,
    candidates_promoted: candidatesPromoted,
    executor_present: executorPresent,
    gate_count: gateCount,
  };
}

/**
 * Scan data organ status (EPOCH-74).
 * Pure read-only. Checks data lanes, enrichment, and pipeline state.
 */
function scanDataOrgan() {
  // Read data lanes
  const lanesPath = path.join(ROOT, 'specs', 'data_lanes.json');
  let lanes = [];
  try {
    if (fs.existsSync(lanesPath)) {
      lanes = JSON.parse(fs.readFileSync(lanesPath, 'utf8')).lanes || [];
    }
  } catch { /* fail-safe */ }

  const truthLanes = lanes.filter((l) => l.truth_level === 'TRUTH');

  // Check enriched bars presence
  const enrichedBarsPath = path.join(ROOT, 'artifacts', 'outgoing', 'enriched_bars.jsonl');
  const enrichedLockPath = path.join(ROOT, 'artifacts', 'outgoing', 'enriched_bars.lock.json');
  const hasEnrichedBars = fs.existsSync(enrichedBarsPath) && fs.existsSync(enrichedLockPath);

  // Check alchemist module presence
  const alchemistPresent = fs.existsSync(path.join(ROOT, 'core', 'data', 'orderbook_alchemist.mjs'));

  // Check ALLOW_NETWORK
  const hasAllowNetwork = fs.existsSync(path.join(ROOT, 'artifacts', 'incoming', 'ALLOW_NETWORK'));

  // Determine controller state from enrichment presence
  let controllerState = 'DORMANT';
  if (hasEnrichedBars) controllerState = 'NOURISHING';
  else if (hasAllowNetwork) controllerState = 'ACQUIRING';

  return Object.freeze({
    lanes_total: lanes.length,
    lanes_truth: truthLanes.length,
    pipeline: {
      acquire_ready: hasAllowNetwork,
      enrich_ready: alchemistPresent,
      consume_ready: hasEnrichedBars,
      alchemist_present: alchemistPresent,
    },
    controller_state: controllerState,
  });
}

/**
 * scan(bus?) → ProprioceptionContext
 *
 * Main entry point. Pure read-only scan of organism state.
 */
export function scan(bus = null) {
  const kernel = loadFsmKernel();
  const watermark = readWatermark();

  // 1. Derive FSM state from watermark → replay → initial
  let fsmState = kernel.initial_state;
  let fsmSource = 'initial';

  // Try watermark first
  if (watermark && watermark.state && watermark.state in kernel.states) {
    fsmState = watermark.state;
    fsmSource = 'watermark';
  }

  // If bus provided, try replay (authoritative)
  if (bus) {
    const allEvents = bus.events();
    if (allEvents.length > 0) {
      const replayed = replayState(allEvents);
      fsmState = replayed.state;
      fsmSource = 'replay';
    }
  } else {
    // Try reading all EventBus files
    const evidenceDir = path.join(ROOT, 'reports', 'evidence');
    const jsonlPaths = findAllBusJsonls(evidenceDir);
    if (jsonlPaths.length > 0) {
      const allEventArrays = jsonlPaths.map((p) => readBus(p).events());
      const allEvents = mergeAndSortEvents(allEventArrays);
      if (allEvents.length > 0) {
        const replayed = replayState(allEvents);
        fsmState = replayed.state;
        fsmSource = 'replay';
      }
    }
  }

  const fsmMode = stateToMode(fsmState);

  // 2. Previous run info
  const prevSummary = readPreviousLifeSummary();
  const previousState = prevSummary?.fsm_final_state ?? null;
  const previousOutcome = prevSummary?.status ?? null;
  const stateContinuity = previousState !== null && previousState === fsmState;

  // 3. Run number + watermark tick
  const runNumber = watermark?.tick ?? 0;
  const watermarkTick = watermark?.written_at_tick ?? watermark?.tick ?? 0;

  // 4. Environment scan
  const env = scanEnvironment();

  // 5. Available transitions, goal path, circuit breakers
  const availableTransitions = getAvailableTransitions(fsmState).map((t) => t.id);
  const goalState = kernel.goal_states?.[0] ?? 'CERTIFIED';
  const goalPath = findPathToGoal(fsmState, goalState).map((t) => t.id);
  const circuitBreakers = getCircuitBreakerState();
  const blockedTransitions = Object.entries(circuitBreakers)
    .filter(([, cb]) => cb.open)
    .map(([tid]) => tid);

  // 6. Data Organ scan (EPOCH-74)
  const dataOrgan = scanDataOrgan();

  return Object.freeze({
    // WHERE AM I?
    fsm_state: fsmState,
    fsm_mode: fsmMode,
    fsm_source: fsmSource,

    // HOW DID I GET HERE?
    previous_state: previousState,
    previous_outcome: previousOutcome,
    state_continuity: stateContinuity,

    // HOW LONG?
    run_number: runNumber,
    watermark_tick: watermarkTick,

    // WHAT'S AROUND ME?
    env,

    // WHAT CAN I DO?
    available_transitions: availableTransitions,
    goal_path: goalPath,
    circuit_breakers: circuitBreakers,
    blocked_transitions: blockedTransitions,

    // DATA ORGAN (EPOCH-74)
    data_organ: dataOrgan,
  });
}
