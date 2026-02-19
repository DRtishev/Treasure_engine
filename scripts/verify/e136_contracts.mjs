#!/usr/bin/env node
/**
 * E136 Contracts — md-only check, redaction scan, header exactness.
 * Writes CONTRACTS.md to reports/evidence/E136/.
 */
import fs from 'node:fs';
import path from 'node:path';
import { E136_ROOT, writeMdAtomic } from './e136_lib.mjs';

const REQUIRED_HEADERS = [
  '# E136 BASELINE VERIFY',
  '# E136 OFFLINE HARNESS MATRIX',
  '# E136 ONLINE DIAG',
  '# E136 PROXY OBSERVABILITY',
  '# E136 REASON CODES',
];

// Disallow external FQDNs (allow localhost, 127.0.0.1, label-only forms, sha256 hex).
const EXTERNAL_HOST_RE = /https?:\/\/(?!localhost|127\.0\.0\.1)[a-zA-Z0-9_-]+\.[a-zA-Z0-9_.%-]+/;
const EXTERNAL_WS_RE = /wss?:\/\/(?!localhost|127\.0\.0\.1)[a-zA-Z0-9_-]+\.[a-zA-Z0-9_.%-]+/;
const TOKEN_RE = /(?:Bearer|token|api_key|apikey|password|secret|Authorization)\s*[=:]\s*\S+/i;

export function runContracts() {
  const results = {
    md_only: 'PASS',
    redaction: 'PASS',
    header_exactness: 'PASS',
    overall: 'PASS',
    details: [],
  };

  const files = fs.existsSync(E136_ROOT) ? fs.readdirSync(E136_ROOT) : [];

  // 1. md-only check
  for (const f of files) {
    if (path.extname(f) !== '.md') {
      results.md_only = 'FAIL';
      results.overall = 'FAIL';
      results.details.push(`NON_MD_ARTIFACT: ${f}`);
    }
  }

  // 2. Redaction scan
  for (const f of files) {
    if (path.extname(f) !== '.md') continue;
    const content = fs.readFileSync(path.join(E136_ROOT, f), 'utf8');
    if (EXTERNAL_HOST_RE.test(content) || EXTERNAL_WS_RE.test(content)) {
      results.redaction = 'FAIL';
      results.overall = 'FAIL';
      results.details.push(`REDACTION_FAIL: ${f}: unredacted_external_host`);
    }
    if (TOKEN_RE.test(content)) {
      results.redaction = 'FAIL';
      results.overall = 'FAIL';
      results.details.push(`REDACTION_FAIL: ${f}: credential_pattern`);
    }
  }

  // 3. Header exactness
  for (const hdr of REQUIRED_HEADERS) {
    const found = files.some((f) => {
      if (path.extname(f) !== '.md') return false;
      const c = fs.readFileSync(path.join(E136_ROOT, f), 'utf8');
      return c.trimStart().startsWith(hdr);
    });
    if (!found) {
      results.header_exactness = 'FAIL';
      results.overall = 'FAIL';
      results.details.push(`HEADER_MISSING: ${hdr}`);
    }
  }

  return results;
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const c = runContracts();
  const lines = [
    '# E136 CONTRACTS',
    `- md_only: ${c.md_only}`,
    `- redaction: ${c.redaction}`,
    `- header_exactness: ${c.header_exactness}`,
    `- overall: ${c.overall}`,
  ];
  if (c.details.length) lines.push('## Details', ...c.details.map((d) => `- ${d}`));
  writeMdAtomic(path.join(E136_ROOT, 'CONTRACTS.md'), lines.join('\n'));
  process.stdout.write(`${lines.join('\n')}\n`);
  process.exit(c.overall === 'PASS' ? 0 : 1);
}
