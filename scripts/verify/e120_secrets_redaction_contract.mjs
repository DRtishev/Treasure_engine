#!/usr/bin/env node
import fs from 'node:fs';
const files = fs.readdirSync('reports/evidence/E120').map((f) => `reports/evidence/E120/${f}`);
const bad = ['API_KEY', 'SECRET', 'TOKEN', 'PRIVATE_KEY'];
for (const f of files) {
  const t = fs.readFileSync(f, 'utf8');
  for (const b of bad) if (t.includes(b)) throw new Error(`E120_SECRET_LEAK:${f}:${b}`);
}
