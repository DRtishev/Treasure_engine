#!/usr/bin/env node
// E101-10A: Case-collision scan across repo
// Detects files that differ only by case (dangerous on case-insensitive filesystems)

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const SCAN_DIRS = [
  'scripts/verify',
  'reports/evidence',
  'core/edge'
];

function scanCaseCollisions() {
  const violations = [];
  const seen = new Map(); // lowercase -> original paths

  for (const dir of SCAN_DIRS) {
    if (!fs.existsSync(dir)) continue;

    const result = spawnSync('find', [dir, '-type', 'f'], { encoding: 'utf8' });
    const files = (result.stdout || '').trim().split('\n').filter(Boolean);

    for (const file of files) {
      const lower = file.toLowerCase();
      if (seen.has(lower)) {
        violations.push({
          path1: seen.get(lower),
          path2: file,
          collision: lower
        });
      } else {
        seen.set(lower, file);
      }
    }
  }

  return violations;
}

const violations = scanCaseCollisions();

if (violations.length > 0) {
  console.error(`e101:case_collision FAILED: ${violations.length} collisions`);
  for (const v of violations) {
    console.error(`  - ${v.path1} <=> ${v.path2}`);
  }
  process.exit(1);
}

console.log('e101:case_collision PASSED');
