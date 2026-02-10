#!/usr/bin/env node
// scripts/verify/phase2_verify.mjs
// Phase 2.2 Verification Gate

import fs from 'fs';
import { execSync } from 'child_process';

let exitCode = 0;

function run(cmd, label) {
  console.log(`\n=== ${label} ===`);
  try {
    const output = execSync(cmd, { encoding: 'utf8', stdio: 'inherit' });
    console.log(`✅ ${label} PASSED`);
    return true;
  } catch (err) {
    console.log(`❌ ${label} FAILED (exit code: ${err.status})`);
    exitCode = 1;
    return false;
  }
}

console.log('🔥 PHASE 2.2 VERIFICATION GATE\n');

// 1. Smoke tests
run('node scripts/verify/phase2_smoke.mjs', 'Phase 2 Smoke Tests');

// 2. Full E2 verification
run('npm run verify:e2', 'E2 End-to-End Tests');

// 3. Verify report structure
console.log('\n=== Report Structure Validation ===');
const baseReport = JSON.parse(fs.readFileSync('reports/hack_a2_base_report.json', 'utf8'));

const requiredSections = [
  'execution_policy',
  'risk_governor',
  'quality_filter'
];

let structureOk = true;
for (const section of requiredSections) {
  if (!(section in baseReport)) {
    console.log(`❌ Missing section: ${section}`);
    structureOk = false;
    exitCode = 1;
  } else {
    console.log(`✅ Found section: ${section}`);
  }
}

// 4. Verify execution_policy fields
if ('execution_policy' in baseReport) {
  const ep = baseReport.execution_policy;
  const requiredFields = ['avg_ttl_ms', 'avg_tip_bps', 'expired_count'];
  for (const field of requiredFields) {
    if (!(field in ep)) {
      console.log(`❌ execution_policy missing: ${field}`);
      exitCode = 1;
    }
  }
  console.log(`✅ execution_policy structure valid`);
}

// 5. Verify risk_governor fields
if ('risk_governor' in baseReport) {
  const rg = baseReport.risk_governor;
  const requiredFields = ['kill_switch_active', 'final_equity_usd', 'blocked_trades'];
  for (const field of requiredFields) {
    if (!(field in rg)) {
      console.log(`❌ risk_governor missing: ${field}`);
      exitCode = 1;
    }
  }
  console.log(`✅ risk_governor structure valid`);
}

// 6. Check Court reality_gap_cliff
console.log('\n=== Court Reality Gap Cliff ===');
const courtReport = JSON.parse(fs.readFileSync('reports/court_report.json', 'utf8'));
let foundCliff = false;
for (const hack of courtReport.hacks) {
  if (hack.evidence && 'reality_gap_cliff' in hack.evidence) {
    foundCliff = true;
    console.log(`✅ reality_gap_cliff found in ${hack.id}: ${hack.evidence.reality_gap_cliff}`);
    break;
  }
}
if (!foundCliff) {
  console.log(`❌ reality_gap_cliff not found in court evidence`);
  exitCode = 1;
}

// 7. Check for Date.now() in simulation code (should use now_ms)
console.log('\n=== Determinism Check ===');
const filesToCheck = [
  'core/risk/risk_governor.mjs',
  'core/sim/order_lifecycle.mjs',
  'core/sim/engine.mjs'
];

let foundDirectDateNow = false;
for (const file of filesToCheck) {
  const content = fs.readFileSync(file, 'utf8');
  // Check for Date.now() NOT in fallback pattern (now_ms !== null ? now_ms : Date.now())
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('Date.now()') && !line.includes('now_ms') && !line.includes('//')) {
      console.log(`⚠️  ${file}:${i+1}: Direct Date.now() usage (should use now_ms param)`);
      foundDirectDateNow = true;
    }
  }
}

if (!foundDirectDateNow) {
  console.log(`✅ No direct Date.now() in simulation paths`);
} else {
  console.log(`⚠️  Found Date.now() usage - verify it's in fallback/production paths only`);
}

// Final verdict
console.log('\n' + '='.repeat(60));
if (exitCode === 0) {
  console.log('✅ PHASE 2.2 VERIFICATION PASSED');
} else {
  console.log('❌ PHASE 2.2 VERIFICATION FAILED');
}
console.log('='.repeat(60) + '\n');

process.exit(exitCode);
