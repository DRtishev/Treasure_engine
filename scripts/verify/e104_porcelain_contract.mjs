#!/usr/bin/env node
// E104-B2: Git Porcelain Contract - Validate parser against test vectors
import { parsePorcelainMap } from './foundation_git.mjs';
import { PORCELAIN_VECTORS } from './foundation_git_vectors.mjs';

let passed = 0;
let failed = 0;
const failures = [];

for (const vector of PORCELAIN_VECTORS) {
  const { line, expected } = vector;
  const result = parsePorcelainMap(line);

  // For renames/copies, parser creates entries for BOTH paths
  if (expected.path2) {
    // Check both old and new paths are in the map
    const hasOld = result.has(expected.path);
    const hasNew = result.has(expected.path2);
    const xyMatch = hasOld && hasNew &&
      result.get(expected.path) === expected.xy &&
      result.get(expected.path2) === expected.xy;

    if (!xyMatch) {
      failed++;
      failures.push({
        line,
        expected,
        actual: {
          hasOld,
          hasNew,
          xyOld: result.get(expected.path),
          xyNew: result.get(expected.path2)
        }
      });
    } else {
      passed++;
    }
  } else {
    // Single path
    const hasPath = result.has(expected.path);
    const xyMatch = hasPath && result.get(expected.path) === expected.xy;

    if (!xyMatch) {
      failed++;
      failures.push({
        line,
        expected,
        actual: {
          hasPath,
          xy: result.get(expected.path),
          allEntries: Array.from(result.entries())
        }
      });
    } else {
      passed++;
    }
  }
}

// Report results
console.log(`e104:porcelain_contract: ${passed} passed, ${failed} failed (total ${PORCELAIN_VECTORS.length})`);

if (failed > 0) {
  console.error('\nFailures:');
  for (const f of failures) {
    console.error(`  Line: "${f.line}"`);
    console.error(`  Expected:`, f.expected);
    console.error(`  Actual:`, f.actual);
    console.error('');
  }
  throw new Error(`Porcelain contract FAILED: ${failed} vectors failed`);
}

console.log('e104:porcelain_contract PASSED');
