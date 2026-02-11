#!/usr/bin/env node
import fs from 'node:fs';
import { execSync } from 'node:child_process';
import { DeterministicRNG } from '../../core/sys/rng.mjs';

const baselinePath = 'specs/ai_determinism_baseline.json';
let failed = 0;
let passed = 0;

function ok(cond, msg) {
  if (cond) {
    passed += 1;
    console.log(`✓ ${msg}`);
  } else {
    failed += 1;
    console.error(`✗ ${msg}`);
  }
}

function countMatches(text, pattern) {
  return (text.match(pattern) || []).length;
}

function scanAi() {
  const files = execSync("find core/ai -maxdepth 1 -type f -name '*.mjs' | sort", { encoding: 'utf8' })
    .trim()
    .split('\n')
    .filter(Boolean);

  const results = { files: {}, totals: { mathRandom: 0, dateNow: 0 } };
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    const mathRandom = countMatches(text, /Math\.random\(/g);
    const dateNow = countMatches(text, /Date\.now\(/g);
    results.files[file] = { mathRandom, dateNow };
    results.totals.mathRandom += mathRandom;
    results.totals.dateNow += dateNow;
  }
  return results;
}

function checkDeterministicRng() {
  const a = new DeterministicRNG(12345);
  const b = new DeterministicRNG(12345);
  const c = new DeterministicRNG(54321);

  const seqA = Array.from({ length: 10 }, () => a.next());
  const seqB = Array.from({ length: 10 }, () => b.next());
  const seqC = Array.from({ length: 10 }, () => c.next());

  ok(JSON.stringify(seqA) === JSON.stringify(seqB), 'same seed yields identical RNG sequence');
  ok(JSON.stringify(seqA) !== JSON.stringify(seqC), 'different seed yields different RNG sequence');
}

function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('EPOCH-22 AI VALIDATION HARNESS CHECK');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  ok(fs.existsSync(baselinePath), `baseline exists: ${baselinePath}`);
  if (!fs.existsSync(baselinePath)) process.exit(1);

  const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
  const current = scanAi();

  for (const [file, counts] of Object.entries(baseline.files)) {
    const now = current.files[file] || { mathRandom: 0, dateNow: 0 };
    ok(now.mathRandom <= counts.mathRandom, `${file} Math.random count ${now.mathRandom} <= baseline ${counts.mathRandom}`);
    ok(now.dateNow <= counts.dateNow, `${file} Date.now count ${now.dateNow} <= baseline ${counts.dateNow}`);
  }

  ok(current.totals.mathRandom <= baseline.totals.mathRandom, `total Math.random count ${current.totals.mathRandom} <= baseline ${baseline.totals.mathRandom}`);
  ok(current.totals.dateNow <= baseline.totals.dateNow, `total Date.now count ${current.totals.dateNow} <= baseline ${baseline.totals.dateNow}`);

  checkDeterministicRng();

  console.log('Current totals:', current.totals);
  console.log('Baseline totals:', baseline.totals);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✓ PASSED: ${passed}`);
  console.log(`✗ FAILED: ${failed}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  if (failed > 0) process.exit(1);
}

main();
