#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const SEEDS = [12345, 23456, 34567];

function run(cmd, args, env = {}) {
  return spawnSync(cmd, args, { stdio: 'pipe', encoding: 'utf8', env: { ...process.env, ...env } });
}

function fail(msg) {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

function latestRunDir(seed, repeatPrefix) {
  const base = path.join('reports', 'runs', 'paper', String(seed));
  if (!fs.existsSync(base)) throw new Error(`Missing paper base path: ${base}`);
  const repeats = fs.readdirSync(base)
    .filter((d) => d.startsWith(repeatPrefix))
    .map((d) => ({ d, m: fs.statSync(path.join(base, d)).mtimeMs }))
    .sort((a, b) => b.m - a.m);
  if (!repeats.length) throw new Error(`No repeat dirs for paper seed=${seed}, repeat=${repeatPrefix}`);
  const repDir = path.join(base, repeats[0].d);
  const runDirs = fs.readdirSync(repDir).filter((d) => fs.statSync(path.join(repDir, d)).isDirectory());
  if (runDirs.length !== 1) throw new Error(`Expected one run_id dir in ${repDir}, got ${runDirs.length}`);
  return path.join(repDir, runDirs[0]);
}

function parseJsonl(filePath) {
  const lines = fs.readFileSync(filePath, 'utf8').trim().split('\n').filter(Boolean);
  const categoryCounts = {};
  const eventCounts = {};
  for (const line of lines) {
    const event = JSON.parse(line);
    categoryCounts[event.category] = (categoryCounts[event.category] || 0) + 1;
    eventCounts[event.event] = (eventCounts[event.event] || 0) + 1;
    if (!Number.isFinite(event.ts_ms)) throw new Error(`Non-finite ts_ms in ${filePath}`);
  }
  return {
    lines: lines.length,
    categoryCounts,
    eventCounts,
    sizeBand: Math.floor(fs.statSync(filePath).size / 256)
  };
}

function fingerprint(runDir) {
  const jsonlFiles = fs.readdirSync(runDir).filter((f) => f.endsWith('.jsonl')).sort();
  if (jsonlFiles.length < 1) throw new Error(`No jsonl artifacts in ${runDir}`);
  const fps = {};
  for (const f of jsonlFiles) {
    fps[f] = parseJsonl(path.join(runDir, f));
  }
  return fps;
}

function runOne(seed, repeat) {
  const r = run('node', ['scripts/verify/run_with_context.mjs', '--gate', 'paper', '--seed', String(seed), '--repeat', repeat, '--', 'npm', 'run', 'verify:paper:raw']);
  process.stdout.write(r.stdout || '');
  process.stderr.write(r.stderr || '');
  if (r.status !== 0) throw new Error(`verify:paper:raw failed for seed=${seed} repeat=${repeat}`);
  const runDir = latestRunDir(seed, repeat);
  const fp = fingerprint(runDir);
  console.log(`✓ paper seed=${seed} repeat=${repeat} validated @ ${runDir}`);
  return { runDir, fp };
}

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('PAPER MULTI-SEED STABILITY GATE');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

const seed0 = SEEDS[0];
const a = runOne(seed0, 'multi_r1');
const b = runOne(seed0, 'multi_r2');
if (JSON.stringify(a.fp) !== JSON.stringify(b.fp)) {
  fail(`paper same-seed structural drift detected for seed=${seed0}`);
}
console.log(`✓ paper seed=${seed0} repeat comparison stable`);

for (const seed of SEEDS.slice(1)) {
  runOne(seed, 'multi_r1');
}

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`✓ PASSED: seeds=${SEEDS.length}, repeats=2 for seed ${seed0}`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
