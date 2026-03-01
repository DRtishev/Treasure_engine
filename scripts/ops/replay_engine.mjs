/**
 * replay_engine.mjs — EPOCH-69 Organism Brain FSM Replay Engine
 *
 * CLI tool for state reconstruction from event log.
 *
 * Usage:
 *   node scripts/ops/replay_engine.mjs                 # current state
 *   node scripts/ops/replay_engine.mjs --at-tick 42    # state at tick 42
 *   node scripts/ops/replay_engine.mjs --timeline      # full state history
 *
 * Reads all EPOCH-EVENTBUS-* /EVENTS.jsonl files, derives FSM state.
 * EPOCH-69 GENIUS: shows goal path, circuit breakers, goal reachability.
 * Output: reports/evidence/EPOCH-REPLAY-<RUN_ID>/REPLAY.{json,md}
 */

import fs from 'node:fs';
import path from 'node:path';
import { findAllBusJsonls, readBus, mergeAndSortEvents } from './eventbus_v1.mjs';
import { loadFsmKernel, replayState, getAvailableTransitions, findPathToGoal, stateToMode, getCircuitBreakerState } from './state_manager.mjs';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = process.cwd();
const EVIDENCE_DIR = path.join(ROOT, 'reports', 'evidence');

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);
const atTickIdx = args.indexOf('--at-tick');
const targetTick = atTickIdx !== -1 ? Number(args[atTickIdx + 1]) : Infinity;
const showTimeline = args.includes('--timeline');

// ---------------------------------------------------------------------------
// Load all events from all bus epochs
// ---------------------------------------------------------------------------
const jsonlPaths = findAllBusJsonls(EVIDENCE_DIR);
const allEventArrays = jsonlPaths.map((p) => readBus(p).events());
const allEvents = mergeAndSortEvents(allEventArrays);

console.log(`[ops:replay] Loaded ${allEvents.length} events from ${jsonlPaths.length} bus epoch(s)`);

// ---------------------------------------------------------------------------
// Replay state
// ---------------------------------------------------------------------------
const kernel = loadFsmKernel();
const result = replayState(allEvents, targetTick);
const available = getAvailableTransitions(result.state);

const tickLabel = targetTick === Infinity ? 'CURRENT' : String(targetTick);
console.log(`[ops:replay] State at tick ${tickLabel}: ${result.state}`);
console.log(`[ops:replay] Mode: ${result.mode}`);
console.log(`[ops:replay] Transitions seen: ${result.transitions_count}`);
console.log(`[ops:replay] Available transitions: ${available.map((t) => t.id).join(', ') || 'NONE'}`);

// ---------------------------------------------------------------------------
// G1: Goal path analysis
// ---------------------------------------------------------------------------
const goalStates = kernel.goal_states ?? ['CERTIFIED'];
const goalPaths = {};
const goalReachability = {};

for (const goal of goalStates) {
  const pathToGoal = findPathToGoal(result.state, goal);
  goalPaths[goal] = pathToGoal.map((t) => t.id);
  goalReachability[goal] = result.state === goal || pathToGoal.length > 0;
  const pathStr = result.state === goal ? '(already at goal)' : (pathToGoal.length > 0 ? pathToGoal.map((t) => t.id).join(' → ') : 'NO PATH');
  console.log(`[ops:replay] Path to ${goal}: ${pathStr}`);
}

// ---------------------------------------------------------------------------
// G2: Circuit breaker status
// ---------------------------------------------------------------------------
const breakerState = getCircuitBreakerState();
const breakerEntries = Object.entries(breakerState);
if (breakerEntries.length > 0) {
  for (const [tid, bs] of breakerEntries) {
    console.log(`[ops:replay] Circuit breaker ${tid}: failures=${bs.failures} open=${bs.open}`);
  }
} else {
  console.log(`[ops:replay] Circuit breakers: all closed`);
}

// ---------------------------------------------------------------------------
// Timeline output (if --timeline)
// ---------------------------------------------------------------------------
let timeline = [];
if (showTimeline) {
  let walkState = kernel.initial_state;
  timeline.push({ tick: 0, state: walkState, mode: stateToMode(walkState), transition_id: 'INITIAL' });

  for (const event of allEvents) {
    if (event.event === 'STATE_TRANSITION' && event.component === 'FSM' && event.attrs && event.attrs.to_state) {
      walkState = event.attrs.to_state;
      timeline.push({
        tick: event.tick,
        state: walkState,
        mode: stateToMode(walkState),
        transition_id: event.attrs.transition_id || 'unknown',
      });
    }
  }

  console.log(`[ops:replay] Timeline entries: ${timeline.length}`);
  for (const entry of timeline) {
    console.log(`  tick=${entry.tick} state=${entry.state} mode=${entry.mode} via=${entry.transition_id}`);
  }
}

// ---------------------------------------------------------------------------
// Write evidence
// ---------------------------------------------------------------------------
const epochDir = path.join(EVIDENCE_DIR, `EPOCH-REPLAY-${RUN_ID}`);
fs.mkdirSync(epochDir, { recursive: true });

writeJsonDeterministic(path.join(epochDir, 'REPLAY.json'), {
  schema_version: '1.0.0',
  gate_id: 'FSM_REPLAY',
  run_id: RUN_ID,
  events_loaded: allEvents.length,
  bus_epochs: jsonlPaths.length,
  target_tick: tickLabel,
  current_state: result.state,
  current_mode: result.mode,
  transitions_seen: result.transitions_count,
  available_transitions: available.map((t) => t.id),
  goal_states: goalStates,
  goal_paths: goalPaths,
  goal_reachability: goalReachability,
  circuit_breakers: breakerState,
  timeline: showTimeline ? timeline : [],
});

writeMd(path.join(epochDir, 'REPLAY.md'), [
  `# REPLAY — EPOCH-REPLAY-${RUN_ID}`, '',
  `RUN_ID: ${RUN_ID}`,
  `TARGET_TICK: ${tickLabel}`,
  `STATE: ${result.state}`,
  `MODE: ${result.mode}`,
  `TRANSITIONS_SEEN: ${result.transitions_count}`,
  `AVAILABLE: ${available.map((t) => t.id).join(', ') || 'NONE'}`,
  `BUS_EPOCHS: ${jsonlPaths.length}`,
  `EVENTS_LOADED: ${allEvents.length}`, '',
  '## GOAL ANALYSIS',
  ...goalStates.map((g) => {
    const pathStr = result.state === g ? '(at goal)' : (goalPaths[g].length > 0 ? goalPaths[g].join(' → ') : 'NO PATH');
    return `- ${g}: reachable=${goalReachability[g]} path=${pathStr}`;
  }), '',
  '## CIRCUIT BREAKERS',
  breakerEntries.length === 0
    ? '- All closed'
    : breakerEntries.map(([tid, bs]) => `- ${tid}: failures=${bs.failures} open=${bs.open}`).join('\n'),
  '',
  '## TRANSITION HISTORY',
  result.transitions.length === 0
    ? '- No FSM transitions recorded'
    : result.transitions.map((t) => `- tick=${t.tick}: ${t.from} → ${t.to} via ${t.transition_id}`).join('\n'),
  '',
  showTimeline ? '## TIMELINE' : '',
  showTimeline
    ? (timeline.length === 0
      ? '- Empty timeline'
      : timeline.map((t) => `- tick=${t.tick}: ${t.state} (${t.mode}) via ${t.transition_id}`).join('\n'))
    : '',
  '',
  '## NEXT_ACTION',
  'npm run -s verify:fast', '',
].join('\n'));

console.log(`[ops:replay] Evidence: ${path.relative(ROOT, epochDir)}/`);
