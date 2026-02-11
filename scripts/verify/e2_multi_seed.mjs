#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';

const SEEDS = [12345, 23456, 34567];

function run(cmd, args, env = {}) {
  const res = spawnSync(cmd, args, { stdio: 'pipe', encoding: 'utf8', env: { ...process.env, ...env } });
  return res;
}

function fail(msg) {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

function listJson(runDir) {
  return fs.readdirSync(runDir).filter((f) => f.endsWith('.json')).sort();
}

function assertFiniteNumbers(v, p = '$') {
  if (typeof v === 'number' && !Number.isFinite(v)) throw new Error(`Non-finite number at ${p}`);
  if (Array.isArray(v)) v.forEach((x, i) => assertFiniteNumbers(x, `${p}[${i}]`));
  if (v && typeof v === 'object') Object.entries(v).forEach(([k, x]) => assertFiniteNumbers(x, `${p}.${k}`));
}

function topLevelKeysFingerprint(obj) {
  return Object.keys(obj).sort().join('|');
}

function structuralFingerprint(runDir) {
  const files = listJson(runDir);
  const hacks = files.filter((f) => /^hack_.*_report\.json$/.test(f));
  const court = files.includes('court_report.json');
  const eqs = files.includes('eqs_report.json');
  const keyprints = {};
  const sizeBands = {};
  for (const f of files) {
    const full = path.join(runDir, f);
    const text = fs.readFileSync(full, 'utf8');
    const obj = JSON.parse(text);
    assertFiniteNumbers(obj);
    keyprints[f] = topLevelKeysFingerprint(obj);
    sizeBands[f] = Math.floor(fs.statSync(full).size / 512);
  }

  let courtDecisionCounts = {};
  if (court) {
    const courtObj = JSON.parse(fs.readFileSync(path.join(runDir, 'court_report.json'), 'utf8'));
    for (const row of courtObj.decisions || []) {
      const d = row.decision || 'UNKNOWN';
      courtDecisionCounts[d] = (courtDecisionCounts[d] || 0) + 1;
    }
  }

  return {
    fileCount: files.length,
    hackCount: hacks.length,
    hasCourt: court,
    hasEqs: eqs,
    keyprints,
    sizeBands,
    courtDecisionCounts,
  };
}

function latestScopedRunDir(seed, repeatPrefix) {
  const base = path.join('reports', 'runs', 'e2', String(seed));
  if (!fs.existsSync(base)) throw new Error(`Missing base run path: ${base}`);
  const repeats = fs.readdirSync(base)
    .filter((d) => d.startsWith(repeatPrefix))
    .map((d) => ({ d, m: fs.statSync(path.join(base, d)).mtimeMs }))
    .sort((a, b) => b.m - a.m);
  if (!repeats.length) throw new Error(`No repeat dirs for ${seed}/${repeatPrefix}`);
  const repDir = path.join(base, repeats[0].d);
  const children = fs.readdirSync(repDir).filter((d) => fs.statSync(path.join(repDir, d)).isDirectory());
  if (children.length !== 1) throw new Error(`Expected 1 run_id dir in ${repDir}, got ${children.length}`);
  return path.join(repDir, children[0]);
}

function runSchemaChecks(runDir) {
  const env = { TREASURE_RUN_DIR: runDir };
  const checks = [
    ['truth/sim_report.schema.json', 'reports'],
    ['truth/eqs_report.schema.json', 'reports/eqs_report.json'],
    ['truth/court_report.schema.json', 'reports/court_report.json'],
  ];
  for (const [schema, target] of checks) {
    const r = run('node', ['scripts/verify/json_schema_check.mjs', schema, target], env);
    process.stdout.write(r.stdout || '');
    process.stderr.write(r.stderr || '');
    if (r.status !== 0) throw new Error(`Schema check failed for ${schema}`);
  }
}

function runOne(seed, repeat) {
  const res = run('node', ['scripts/verify/run_with_context.mjs', '--gate', 'e2', '--seed', String(seed), '--repeat', repeat, '--', 'npm', 'run', 'verify:e2:raw']);
  process.stdout.write(res.stdout || '');
  process.stderr.write(res.stderr || '');
  if (res.status !== 0) throw new Error(`verify:e2:raw failed for seed=${seed} repeat=${repeat}`);
  const runDir = latestScopedRunDir(seed, repeat);
  runSchemaChecks(runDir);
  const fp = structuralFingerprint(runDir);
  if (fp.hackCount < 12 || !fp.hasCourt || !fp.hasEqs) {
    throw new Error(`Missing required artifacts in ${runDir}`);
  }
  console.log(`✓ seed=${seed} repeat=${repeat} validated @ ${runDir}`);
  return { runDir, fp };
}

function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('E2 MULTI-SEED STABILITY GATE');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const fingerprints = new Map();
  for (const seed of SEEDS) {
    const run1 = runOne(seed, 'multi_r1');
    fingerprints.set(`${seed}:r1`, run1.fp);
    if (seed === SEEDS[0]) {
      const run2 = runOne(seed, 'multi_r2');
      const a = JSON.stringify(run1.fp);
      const b = JSON.stringify(run2.fp);
      if (a !== b) fail(`same-seed structural drift detected for seed=${seed}`);
      console.log(`✓ seed=${seed} repeat comparison stable (no structural drift)`);
      fingerprints.set(`${seed}:r2`, run2.fp);
    }
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✓ PASSED: seeds=${SEEDS.length}, repeats=2 for seed ${SEEDS[0]}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main();
