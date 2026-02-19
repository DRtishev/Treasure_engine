#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve('reports/evidence/E139');
const REQUIRED = [
  ['SNAPSHOT.md', '# E139 SNAPSHOT'],
  ['DOCTOR_OUTPUT.md', '# E139 DOCTOR OUTPUT'],
  ['MODE_MATRIX.md', '# E139 MODE MATRIX'],
  ['OPERATOR_RUNBOOK.md', '# E139 OPERATOR RUNBOOK'],
];
const TOKEN_RE = /(?:Bearer|token|api_key|apikey|password|secret|Authorization)\s*[=:]\s*\S+/i;
const RAW_PROXY_RE = /(https?:\/\/[^\s/]+:[0-9]{2,5})/i;

function writeMd(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${String(content).replace(/\r\n/g, '\n').trimEnd()}\n`, 'utf8');
}

export function runContracts() {
  const files = fs.existsSync(ROOT) ? fs.readdirSync(ROOT) : [];
  let mdOnly = true;
  let headerExact = true;
  let redaction = true;
  const details = [];

  for (const f of files) {
    if (!f.endsWith('.md')) {
      mdOnly = false;
      details.push(`non_md:${f}`);
    }
  }

  for (const [file, header] of REQUIRED) {
    const p = path.join(ROOT, file);
    if (!fs.existsSync(p)) {
      headerExact = false;
      details.push(`missing:${file}`);
      continue;
    }
    const content = fs.readFileSync(p, 'utf8');
    if (!content.startsWith(`${header}\n`)) {
      headerExact = false;
      details.push(`header:${file}`);
    }
    if (TOKEN_RE.test(content) || RAW_PROXY_RE.test(content)) {
      redaction = false;
      details.push(`redaction:${file}`);
    }
  }

  const status = mdOnly && headerExact && redaction ? 'PASS' : 'FAIL';
  const reason = !mdOnly ? 'FAIL_MD_ONLY' : (!redaction ? 'FAIL_REDACTION' : (!headerExact ? 'FAIL_HEADER_EXACT' : 'OK'));
  writeMd(path.join(ROOT, 'CONTRACTS.md'), [
    '# E139 CONTRACTS',
    `- md_only: ${mdOnly ? 'PASS' : 'FAIL'}`,
    `- redaction: ${redaction ? 'PASS' : 'FAIL'}`,
    `- header_exactness: ${headerExact ? 'PASS' : 'FAIL'}`,
    `- status: ${status}`,
    `- reason_code: ${reason}`,
    ...(details.length ? ['', '## Details', ...details.map((d) => `- ${d}`)] : []),
  ].join('\n'));
  return { ec: status === 'PASS' ? 0 : 1, reason };
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const r = runContracts();
  process.exit(r.ec);
}
