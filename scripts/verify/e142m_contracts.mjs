#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, writeMd } from './e142m_lib.mjs';

const REQUIRED = ['SNAPSHOT.md','DOCTOR_OUTPUT.md','MEGA_SUMMARY.md','MEGA_VERDICT.md','NETWORK_CLASSIFICATION.md','OPERATOR_RUNBOOK.md','EXPORT_MANIFEST.md','EXPORT_RECEIPT.md','IMPORT_RECEIPT.md','ACCEPTED.md','CONTRACTS.md','SEAL_X2.md','SHA256SUMS.md'];
const TOK = /(?:Bearer|token|api_key|apikey|password|secret|Authorization)\s*[=:]\s*\S+/i;
const RAW_PROXY = /https?:\/\/[a-zA-Z0-9._-]+:[0-9]{2,5}/;

export function runContracts() {
  const files = fs.existsSync(ROOT) ? fs.readdirSync(ROOT) : [];
  let md = true, hdr = true, red = true; const det = [];
  for (const f of files) if (!f.endsWith('.md')) { md = false; det.push(`non_md:${f}`); }
  for (const f of REQUIRED) {
    const p = path.join(ROOT, f);
    if (!fs.existsSync(p)) { hdr = false; det.push(`missing:${f}`); continue; }
    const c = fs.readFileSync(p, 'utf8');
    if (!c.startsWith('# E142_MEGA ')) { hdr = false; det.push(`header:${f}`); }
    if (f !== 'SHA256SUMS.md' && !c.includes('## RAW')) { hdr = false; det.push(`raw:${f}`); }
    if (TOK.test(c) || RAW_PROXY.test(c)) { red = false; det.push(`redaction:${f}`); }
  }
  const pass = md && hdr && red;
  writeMd(path.join(ROOT, 'CONTRACTS.md'), ['# E142_MEGA CONTRACTS',`- status: ${pass?'PASS':'FAIL'}`,`- md_only: ${md?'PASS':'FAIL'}`,`- redaction: ${red?'PASS':'FAIL'}`,`- header_exactness: ${hdr?'PASS':'FAIL'}`,'## RAW',...det.map((d)=>`- ${d}`)].join('\n'));
  return { ec: pass ? 0 : 1 };
}
if (process.argv[1] === new URL(import.meta.url).pathname) process.exit(runContracts().ec);
