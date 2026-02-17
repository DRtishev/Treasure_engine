#!/usr/bin/env node
// E101-10C: No-secrets scan
// Scans E101 evidence for potential secrets (with documented filter rules)

import fs from 'node:fs';
import path from 'node:path';

const E101_ROOT = path.resolve('reports/evidence/E101');

const SECRET_PATTERNS = [
  { regex: /api[_-]?key/i, name: 'api_key' },
  { regex: /secret/i, name: 'secret' },
  { regex: /password/i, name: 'password' },
  { regex: /token/i, name: 'token' },
  { regex: /-----BEGIN (RSA|PRIVATE) KEY-----/i, name: 'private_key' }
];

// Filter rules to avoid self-false-positives
const IGNORE_PATTERNS = [
  /no-secrets|no_secrets/i, // Self-references
  /secret.*scan/i, // Discussing the scan itself
  /password.*check/i // Discussing password checking
];

function scanSecrets() {
  const violations = [];

  if (!fs.existsSync(E101_ROOT)) return violations;

  const files = fs.readdirSync(E101_ROOT).filter(f => f.endsWith('.md'));
  for (const file of files) {
    const filePath = path.join(E101_ROOT, file);
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    lines.forEach((line, idx) => {
      // Skip if matches ignore patterns
      if (IGNORE_PATTERNS.some(p => p.test(line))) return;

      for (const { regex, name } of SECRET_PATTERNS) {
        if (regex.test(line)) {
          violations.push({
            file: `${file}:${idx + 1}`,
            pattern: name,
            text: line.trim().slice(0, 80)
          });
          break;
        }
      }
    });
  }

  return violations;
}

const violations = scanSecrets();

if (violations.length > 0) {
  console.error(`e101:no_secrets FAILED: ${violations.length} potential secrets`);
  for (const v of violations.slice(0, 5)) {
    console.error(`  - ${v.file} [${v.pattern}] ${v.text}`);
  }
  if (violations.length > 5) {
    console.error(`  ... and ${violations.length - 5} more`);
  }
  process.exit(1);
}

console.log('e101:no_secrets PASSED');
