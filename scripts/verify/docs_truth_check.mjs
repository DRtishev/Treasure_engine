#!/usr/bin/env node
import fs from 'node:fs';

const manifestPath = 'specs/repo/REPO_MANIFEST.json';
const reportPath = 'reports/truth/docs_truth_report.json';
const requiredReadmeSections = [
  '## Что это',
  '## Одна команда проверки истины',
  '## Сборка релиза (строго)',
  '## Карта репозитория',
  '## Жёсткие правила',
  '## Как добавлять новую эпоху'
];
const bannedPhrases = [
  /\bconsciousness\b/i,
  /\bAI-IQ\b/i,
  /\bsuperintelligent\b/i,
  /\bready for real money\b/i
];

if (!fs.existsSync(manifestPath)) {
  console.error('verify:docs:truth FAILED');
  console.error(`- missing manifest: ${manifestPath}`);
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const activeDocs = (manifest.files || [])
  .filter((r) => r.classification === 'ACTIVE' && r.path.endsWith('.md'))
  .map((r) => r.path)
  .filter((p) => !p.startsWith('archive/') && !p.startsWith('labs/') && !p.startsWith('reports/'))
  .filter((p) => p === 'README.md' || p.startsWith('docs/') || p.startsWith('kb/') || p.startsWith('specs/'));

const violations = [];
for (const rel of activeDocs) {
  if (!fs.existsSync(rel)) continue;
  const text = fs.readFileSync(rel, 'utf8');
  for (const re of bannedPhrases) {
    if (re.test(text)) violations.push({ file: rel, type: 'banned_phrase', phrase: String(re) });
  }
}

const readme = fs.existsSync('README.md') ? fs.readFileSync('README.md', 'utf8') : '';
const missingSections = requiredReadmeSections.filter((s) => !readme.includes(s));
if (!readme.includes('CI=true npm run verify:phoenix')) {
  violations.push({ file: 'README.md', type: 'missing_command', command: 'CI=true npm run verify:phoenix' });
}
if (!readme.includes('run twice') && !readme.includes('два раза')) {
  violations.push({ file: 'README.md', type: 'missing_anti_flake_note' });
}
for (const section of missingSections) violations.push({ file: 'README.md', type: 'missing_section', section });

fs.mkdirSync('reports/truth', { recursive: true });
fs.writeFileSync(reportPath, `${JSON.stringify({ checked_docs: activeDocs.length, missing_readme_sections: missingSections, violations }, null, 2)}\n`);

if (violations.length) {
  console.error('verify:docs:truth FAILED');
  for (const v of violations) console.error(`- ${v.file} ${v.type} ${v.section || v.phrase || v.command || ''}`);
  process.exit(1);
}
console.log('verify:docs:truth PASSED');
