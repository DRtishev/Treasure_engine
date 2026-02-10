#!/usr/bin/env node
// scripts/verify/verify_adversarial.mjs
// Run adversarial safety tests

import { runAdversarialTests } from '../../core/exec/adapters/adversarial_safety.mjs';

async function main() {
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('💎 GENIUS VERIFICATION: Adversarial Safety');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  try {
    const results = await runAdversarialTests();
    
    if (results.successful_bypasses > 0) {
      console.error('❌ ADVERSARIAL TEST FAILED');
      console.error(`${results.successful_bypasses} attack(s) succeeded`);
      process.exit(1);
    }
    
    console.log('✅ ADVERSARIAL TEST PASSED');
    console.log(`All ${results.total_attacks} attacks blocked`);
    console.log('');
    console.log('💎 GENIUS LEVEL: Safety gates proven secure');
    console.log('');
    process.exit(0);
  } catch (err) {
    console.error('❌ ERROR:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

main();
