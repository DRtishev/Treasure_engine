#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const manifestPath = 'specs/repo/REPO_MANIFEST.json';
const reportPath = 'reports/truth/no_placeholders_report.json';
const re = new RegExp(String.raw`\b(TO${"DO"}|FIX${"ME"}|TB${"D"}|TB${"A"})\b`, "i");

if (!fs.existsSync(manifestPath)) {
  console.error('verify:no_placeholders FAILED');
  console.error(`- missing manifest: ${manifestPath}`);
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const rows = (manifest.files || []).filter((r) => r.classification === 'ACTIVE');
const hits = [];
for (const row of rows) {
  const rel = row.path;
  if (rel.startsWith('archive/') || rel.startsWith('labs/') || rel.startsWith('reports/evidence/')) continue;
  if (!fs.existsSync(rel) || fs.statSync(rel).isDirectory()) continue;
  const ext = path.extname(rel).toLowerCase();
  const isText = ['.md', '.mjs', '.js', '.json', '.txt', '.yml', '.yaml', '.sh', '.ts'].includes(ext) || ext === '';
  if (!isText) continue;
  const text = fs.readFileSync(rel, 'utf8');
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    if (re.test(lines[i])) hits.push({ file: rel, line: i + 1, text: lines[i].trim() });
  }
}

fs.mkdirSync('reports/truth', { recursive: true });
fs.writeFileSync(reportPath, `${JSON.stringify({ checked_active_files: rows.length, violations: hits }, null, 2)}\n`);

if (hits.length) {
  console.error('verify:no_placeholders FAILED');
  for (const h of hits.slice(0, 200)) console.error(`- ${h.file}:${h.line} ${h.text}`);
  process.exit(1);
}
console.log('verify:no_placeholders PASSED');
