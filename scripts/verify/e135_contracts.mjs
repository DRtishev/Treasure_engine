#!/usr/bin/env node
/**
 * E135 Contracts — md-only check, redaction scan, header exactness.
 * Writes CONTRACTS.md to reports/evidence/E135/.
 */
import fs from 'node:fs';
import path from 'node:path';
import { E135_ROOT, writeMdAtomic } from './e135_lib.mjs';

const REQUIRED_HEADERS = [
  '# E135 TRANSPORT HARNESS MATRIX',
  '# E135 HARNESS RUN',
  '# E135 REASON CODES',
];

// Redaction: allow only localhost / 127.0.0.1 as hostnames.
// Disallow any FQDN that looks like a real host (has a dot and is not .local or localhost).
const FORBIDDEN_HOSTNAME_RE = /https?:\/\/(?!localhost|127\.0\.0\.1)[a-zA-Z0-9_-]+\.[a-zA-Z0-9_.%-]+/;
const FORBIDDEN_WSS_RE = /wss?:\/\/(?!localhost|127\.0\.0\.1)[a-zA-Z0-9_-]+\.[a-zA-Z0-9_.%-]+/;
const TOKEN_RE = /(?:Bearer|token|api_key|apikey|password|secret)\s*[=:]\s*\S+/i;

export function runContracts() {
  const results = {
    md_only: 'PASS',
    redaction: 'PASS',
    header_exactness: 'PASS',
    overall: 'PASS',
    details: [],
  };

  // 1. md-only check
  const files = fs.readdirSync(E135_ROOT);
  for (const f of files) {
    if (path.extname(f) !== '.md') {
      results.md_only = 'FAIL';
      results.overall = 'FAIL';
      results.details.push(`NON_MD_ARTIFACT:${f}`);
    }
  }

  // 2. redaction scan
  for (const f of files) {
    if (path.extname(f) !== '.md') continue;
    const content = fs.readFileSync(path.join(E135_ROOT, f), 'utf8');
    if (FORBIDDEN_HOSTNAME_RE.test(content) || FORBIDDEN_WSS_RE.test(content)) {
      results.redaction = 'FAIL';
      results.overall = 'FAIL';
      results.details.push(`REDACTION_FAIL:${f}:unredacted_host`);
    }
    if (TOKEN_RE.test(content)) {
      results.redaction = 'FAIL';
      results.overall = 'FAIL';
      results.details.push(`REDACTION_FAIL:${f}:credential_leak`);
    }
  }

  // 3. header exactness
  for (const requiredHeader of REQUIRED_HEADERS) {
    const mdFile = files.find((f) => {
      if (path.extname(f) !== '.md') return false;
      const content = fs.readFileSync(path.join(E135_ROOT, f), 'utf8');
      return content.startsWith(requiredHeader + '\n') || content.startsWith(requiredHeader + '\r\n');
    });
    if (!mdFile) {
      results.header_exactness = 'FAIL';
      results.overall = 'FAIL';
      results.details.push(`HEADER_MISSING:${requiredHeader}`);
    }
  }

  return results;
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const c = runContracts();
  const lines = [
    '# E135 CONTRACTS',
    `- md_only: ${c.md_only}`,
    `- redaction: ${c.redaction}`,
    `- header_exactness: ${c.header_exactness}`,
    `- overall: ${c.overall}`,
  ];
  if (c.details.length) lines.push('## Details', ...c.details.map((d) => `- ${d}`));
  writeMdAtomic(path.join(E135_ROOT, 'CONTRACTS.md'), lines.join('\n'));
  process.stdout.write(`${lines.join('\n')}\n`);
  process.exit(c.overall === 'PASS' ? 0 : 1);
}
