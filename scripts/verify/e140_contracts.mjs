#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { E140_ROOT, writeMd } from './e140_lib.mjs';

const REQUIRED = [
  ['SNAPSHOT.md', '# E140 SNAPSHOT'],
  ['DOCTOR_OUTPUT.md', '# E140 DOCTOR OUTPUT'],
  ['NODE_BOOTSTRAP.md', '# E140 NODE BOOTSTRAP'],
  ['TRANSFER_EXPORT.md', '# E140 TRANSFER EXPORT'],
  ['TRANSFER_IMPORT.md', '# E140 TRANSFER IMPORT'],
  ['GATE_RUN.md', '# E140 GATE RUN'],
  ['CONTRACTS.md', '# E140 CONTRACTS'],
  ['VERDICT.md', '# E140 VERDICT'],
];
const TOK = /(?:Bearer|token|api_key|apikey|password|secret|Authorization)\s*[=:]\s*\S+/i;
const RAW_PROXY = /https?:\/\/[a-zA-Z0-9._-]+:[0-9]{2,5}/;

export function runContracts() {
  const files = fs.existsSync(E140_ROOT) ? fs.readdirSync(E140_ROOT) : [];
  let mdOnly = true; let hdr = true; let red = true; const details = [];
  for (const f of files) if (!f.endsWith('.md')) { mdOnly = false; details.push(`non_md:${f}`); }
  for (const [f, h] of REQUIRED) {
    const p = path.join(E140_ROOT, f);
    if (!fs.existsSync(p)) { hdr = false; details.push(`missing:${f}`); continue; }
    const c = fs.readFileSync(p, 'utf8');
    if (!c.startsWith(`${h}\n`)) { hdr = false; details.push(`header:${f}`); }
    if (TOK.test(c) || RAW_PROXY.test(c)) { red = false; details.push(`redaction:${f}`); }
    if (!c.includes('## RAW')) { hdr = false; details.push(`raw_section:${f}`); }
  }
  const pass = mdOnly && hdr && red;
  writeMd(path.join(E140_ROOT, 'CONTRACTS.md'), [
    '# E140 CONTRACTS',
    `- md_only: ${mdOnly ? 'PASS' : 'FAIL'}`,
    `- redaction: ${red ? 'PASS' : 'FAIL'}`,
    `- header_exactness: ${hdr ? 'PASS' : 'FAIL'}`,
    `- status: ${pass ? 'PASS' : 'FAIL'}`,
    '## RAW',
    ...details.map((d) => `- ${d}`),
  ].join('\n'));
  return { ec: pass ? 0 : 1 };
}
if (process.argv[1] === new URL(import.meta.url).pathname) process.exit(runContracts().ec);
