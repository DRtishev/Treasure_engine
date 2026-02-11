#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { deterministicRunId } from '../../core/sys/run_artifacts.mjs';

function parseArgs(argv) {
  const out = { gate: 'e2', seed: String(process.env.SEED || 12345), repeat: 'run1', cmd: [] };
  const dd = argv.indexOf('--');
  const head = dd >= 0 ? argv.slice(0, dd) : argv;
  out.cmd = dd >= 0 ? argv.slice(dd + 1) : [];

  for (let i = 0; i < head.length; i++) {
    const a = head[i];
    if (a === '--gate') out.gate = head[++i];
    else if (a === '--seed') out.seed = head[++i];
    else if (a === '--repeat') out.repeat = head[++i];
  }

  if (!out.cmd.length) throw new Error('Usage: run_with_context.mjs --gate <gate> --seed <seed> --repeat <label> -- <command...>');
  return out;
}

function ensureUniqueRunRoot(gate, seed, repeatBase) {
  const root = path.join('reports', 'runs', gate, String(seed));
  fs.mkdirSync(root, { recursive: true });
  let repeat = repeatBase;
  let idx = 1;
  while (fs.existsSync(path.join(root, repeat))) {
    idx += 1;
    repeat = `${repeatBase}_${idx}`;
  }
  const runRoot = path.join(root, repeat);
  fs.mkdirSync(runRoot, { recursive: true });
  return { runRoot, repeat };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const epoch = process.env.TREASURE_EPOCH || 'EPOCH-BOOT.1';
  const numericSeed = Number(args.seed);
  const seed = Number.isFinite(numericSeed) ? numericSeed : 12345;
  const runId = deterministicRunId({ epoch, seed, hack_id: `${args.gate.toUpperCase()}_BATCH` });
  const { runRoot, repeat } = ensureUniqueRunRoot(args.gate, seed, args.repeat);
  const runDir = path.join(runRoot, runId);
  fs.mkdirSync(runDir, { recursive: true });

  const env = {
    ...process.env,
    SEED: String(seed),
    TREASURE_EPOCH: epoch,
    TREASURE_RUN_ID: runId,
    TREASURE_RUN_DIR: runDir,
    TREASURE_RUN_GATE: args.gate,
    TREASURE_RUN_REPEAT: repeat,
  };

  if (args.gate === 'paper' && !env.FORCE_TRADES) {
    env.FORCE_TRADES = '1';
  }

  console.log(`[run_with_context] gate=${args.gate} seed=${seed} repeat=${repeat}`);
  console.log(`[run_with_context] run_id=${runId}`);
  console.log(`[run_with_context] run_dir=${runDir}`);

  const child = spawnSync(args.cmd[0], args.cmd.slice(1), {
    stdio: 'inherit',
    env,
    shell: false,
  });

  if (typeof child.status === 'number') process.exit(child.status);
  process.exit(1);
}

main();
