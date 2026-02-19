#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { E137_ROOT, REASON, writeMd } from './e137_lib.mjs';

const REQUIRED_HEADERS = [
  '# E137 SNAPSHOT',
  '# E137 OFFLINE MATRIX',
  '# E137 ONLINE MATRIX',
  '# E137 TRANSFER PROTOCOL',
  '# E137 EXPORT MANIFEST',
  '# E137 EXPORT RECEIPT',
  '# E137 IMPORT REPORT',
  '# E137 SEAL X2',
];

const TOKEN_RE = /(?:Bearer|token|api_key|apikey|password|secret|Authorization)\s*[=:]\s*\S+/i;
const EXT_HOST_RE = /https?:\/\/(?!localhost|127\.0\.0\.1)[a-zA-Z0-9_-]+\.[a-zA-Z0-9_.%-]+/;

export function runContracts() {
  let reason = REASON.OK;
  const details = [];
  const files = fs.existsSync(E137_ROOT) ? fs.readdirSync(E137_ROOT) : [];

  for (const f of files) {
    if (!f.endsWith('.md')) {
      reason = REASON.FAIL_MD_ONLY;
      details.push(`non_md:${f}`);
    }
  }

  for (const f of files.filter((x) => x.endsWith('.md'))) {
    const c = fs.readFileSync(path.join(E137_ROOT, f), 'utf8');
    if (TOKEN_RE.test(c) || EXT_HOST_RE.test(c)) {
      reason = REASON.FAIL_REDACTION;
      details.push(`redaction:${f}`);
    }
  }

  for (const h of REQUIRED_HEADERS) {
    const found = files.filter((x) => x.endsWith('.md')).some((f) => fs.readFileSync(path.join(E137_ROOT, f), 'utf8').startsWith(`${h}\n`));
    if (!found) {
      if (reason === REASON.OK) reason = REASON.FAIL_HEADER_EXACT;
      details.push(`header_missing:${h}`);
    }
  }

  const pass = reason === REASON.OK;
  writeMd(path.join(E137_ROOT, 'CONTRACTS.md'), [
    '# E137 CONTRACTS',
    `- status: ${pass ? 'PASS' : 'FAIL'}`,
    `- reason_code: ${reason}`,
    'Declare: E137 evidence must be md-only with strict headers and redaction.',
    'Verify: extension scan + token/hostname regex + required header presence.',
    'If mismatch: regenerate offending report file and rerun verify:e137:contracts.',
    ...(details.length ? ['', '## Details', ...details.map((d) => `- ${d}`)] : []),
  ].join('\n'));

  return { ec: pass ? 0 : 1, reasonCode: reason };
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const r = runContracts();
  process.exit(r.ec);
}
