#!/usr/bin/env node
// E101-10D: EOL/CRLF contract for reports/evidence/**/*.md
// Ensures all evidence markdown uses LF only (no CRLF)

import fs from 'node:fs';
import path from 'node:path';
import { hasCRLF } from './foundation_render.mjs';

const SCAN_DIR = 'reports/evidence';

function scanCRLF() {
  const violations = [];

  function walkDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walkDir(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        const content = fs.readFileSync(fullPath, 'utf8');
        if (hasCRLF(content)) {
          violations.push(fullPath);
        }
      }
    }
  }

  if (fs.existsSync(SCAN_DIR)) {
    walkDir(SCAN_DIR);
  }

  return violations;
}

const violations = scanCRLF();

if (violations.length > 0) {
  console.error(`e101:eol_contract FAILED: ${violations.length} files with CRLF`);
  for (const v of violations.slice(0, 10)) {
    console.error(`  - ${v}`);
  }
  if (violations.length > 10) {
    console.error(`  ... and ${violations.length - 10} more`);
  }
  process.exit(1);
}

console.log('e101:eol_contract PASSED');
