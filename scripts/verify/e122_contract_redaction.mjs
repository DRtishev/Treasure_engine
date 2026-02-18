#!/usr/bin/env node
import fs from 'node:fs';
const dir = 'reports/evidence/E122';
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.md')).sort();
const pats = [/api[_-]?key/i, /secret/i, /hmac/i, /bearer\s+[a-z0-9._-]+/i, /private[_-]?key/i, /x-bapi/i, /token/i];
for (const f of files) {
  const t = fs.readFileSync(`${dir}/${f}`, 'utf8');
  for (const p of pats) if (p.test(t)) throw new Error(`E122_REDACTION_FAIL:${f}:${String(p)}`);
}
