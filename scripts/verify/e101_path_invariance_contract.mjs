#!/usr/bin/env node
// E101-10B: Path invariance scan across E97..E101 evidence + journals
// Detects absolute paths that should use <REPO_ROOT> placeholder

import fs from 'node:fs';
import path from 'node:path';
import { detectAbsolutePaths } from './foundation_paths.mjs';

const SCAN_EVIDENCE = [
  'reports/evidence/E97',
  'reports/evidence/E98',
  'reports/evidence/E99',
  'reports/evidence/E100',
  'reports/evidence/E101'
];

const SCAN_JOURNALS = [
  '.foundation-seal/E100_APPLY_JOURNAL.json',
  '.foundation-seal/E101_APPLY_JOURNAL.json'
];

function scanPathInvariance() {
  const violations = [];

  // Scan evidence directories
  for (const dir of SCAN_EVIDENCE) {
    if (!fs.existsSync(dir)) continue;

    const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'));
    for (const file of files) {
      const filePath = path.join(dir, file);
      const content = fs.readFileSync(filePath, 'utf8');
      const fileViolations = detectAbsolutePaths(content);

      for (const v of fileViolations) {
        violations.push({
          file: `${path.basename(dir)}/${file}:${v.line}`,
          text: v.text,
          pattern: v.pattern
        });
      }
    }
  }

  // Scan journal files
  for (const journalPath of SCAN_JOURNALS) {
    if (!fs.existsSync(journalPath)) continue;

    const content = fs.readFileSync(journalPath, 'utf8');
    const fileViolations = detectAbsolutePaths(content);

    for (const v of fileViolations) {
      violations.push({
        file: `${path.basename(journalPath)}:${v.line}`,
        text: v.text,
        pattern: v.pattern
      });
    }
  }

  return violations;
}

const violations = scanPathInvariance();

if (violations.length > 0) {
  console.error(`E101 path invariance contract FAILED: ${violations.length} violations`);
  for (const v of violations.slice(0, 10)) { // Limit output
    console.error(`  - ${v.file} - ${v.text.slice(0, 80)}`);
  }
  if (violations.length > 10) {
    console.error(`  ... and ${violations.length - 10} more`);
  }
  process.exit(1);
}

console.log('e101:path_invariance PASSED');
