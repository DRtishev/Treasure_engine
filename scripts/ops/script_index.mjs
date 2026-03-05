#!/usr/bin/env node
/**
 * script_index.mjs — R3.2 Script Index Generator
 *
 * Scans scripts/verify/ and scripts/ops/ for all .mjs/.sh files.
 * Extracts metadata: filename, purpose, npm script name.
 * Generates artifacts/script_index.json.
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const DIRS = ['scripts/verify', 'scripts/ops'];
const OUTPUT = path.join(ROOT, 'artifacts', 'script_index.json');

function extractPurpose(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    // Try JSDoc @purpose or Purpose: line
    const purposeMatch = content.match(/@purpose\s+(.+)/i)
      || content.match(/\*\s+Purpose:\s*(.+)/i)
      || content.match(/\/\/\s*Purpose:\s*(.+)/i);
    if (purposeMatch) return purposeMatch[1].trim();

    // Try first meaningful comment line after shebang
    const lines = content.split('\n');
    for (let i = 0; i < Math.min(10, lines.length); i++) {
      const line = lines[i].trim();
      if (line.startsWith('* ') && !line.startsWith('* @') && line.length > 10 && !line.includes('#!/')) {
        return line.replace(/^\*\s*/, '').trim();
      }
      if (line.startsWith('// ') && !line.includes('#!/') && line.length > 10) {
        return line.replace(/^\/\/\s*/, '').trim();
      }
    }
  } catch { /* ignore */ }
  return '';
}

function findNpmScript(filename, pkg) {
  const scripts = pkg.scripts || {};
  for (const [name, cmd] of Object.entries(scripts)) {
    if (cmd.includes(filename)) return name;
  }
  return null;
}

function categorize(filePath) {
  if (filePath.includes('scripts/ops/')) return 'ops';
  if (filePath.includes('regression_') || filePath.includes('deep_')) return 'regression';
  return 'verify';
}

// Main
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const scripts = [];

for (const dir of DIRS) {
  const fullDir = path.join(ROOT, dir);
  if (!fs.existsSync(fullDir)) continue;
  const files = fs.readdirSync(fullDir).filter(f => f.endsWith('.mjs') || f.endsWith('.sh')).sort();
  for (const file of files) {
    const filePath = path.join(dir, file);
    scripts.push({
      file: filePath,
      npm: findNpmScript(file, pkg),
      purpose: extractPurpose(path.join(ROOT, filePath)),
      category: categorize(filePath)
    });
  }
}

const categories = {};
for (const s of scripts) {
  if (!categories[s.category]) categories[s.category] = 0;
  categories[s.category]++;
}

const index = {
  generated: 'DETERMINISTIC',
  total_scripts: scripts.length,
  categories,
  scripts
};

fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.writeFileSync(OUTPUT, JSON.stringify(index, null, 2));

console.log(`Script index generated: ${scripts.length} scripts → ${OUTPUT}`);
