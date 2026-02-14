#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { parseAnchors } from '../truth/doc_anchors.mjs';

const roots = ['README.md', 'docs', 'kb', 'specs/wow/items', 'specs/epochs'];
const mdFiles = [];

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p);
    else if (ent.isFile() && p.endsWith('.md')) mdFiles.push(p);
  }
}
for (const root of roots) {
  if (root.endsWith('.md')) {
    if (fs.existsSync(root)) mdFiles.push(root);
    continue;
  }
  walk(root);
}

const anchorsByFile = new Map();
const contract = {
  checked_files: 0,
  files_with_explicit_anchors: 0,
  duplicate_anchor_errors: [],
  invalid_anchor_errors: [],
  derived_docs_required_anchor_check: {}
};

for (const file of mdFiles) {
  const text = fs.readFileSync(file, 'utf8');
  const parsed = parseAnchors(text);
  anchorsByFile.set(file, parsed.anchors);
  contract.checked_files += 1;
  if ([...parsed.anchors].some((a) => text.includes(`<a id="${a}"></a>`))) contract.files_with_explicit_anchors += 1;
  for (const dup of parsed.duplicateAnchors) contract.duplicate_anchor_errors.push(`${file}: duplicate anchor id ${dup}`);
  for (const bad of parsed.invalidAnchors) contract.invalid_anchor_errors.push(`${file}: invalid anchor id ${bad}`);
}

const requiredDerivedAnchors = {
  'docs/WOW_CATALOG.md': ['wow-catalog', 'shipped-staged-summary'],
  'docs/STAGE2_IMPLEMENTATION_MATRIX.md': ['stage2-implementation-matrix'],
  'kb/INDEX.md': ['knowledge-base-portal', 'kb-foundations', 'policy-docs', 'wow-verification-entrypoints']
};

for (const [file, req] of Object.entries(requiredDerivedAnchors)) {
  const anchors = anchorsByFile.get(file) || new Set();
  const missing = req.filter((a) => !anchors.has(a));
  contract.derived_docs_required_anchor_check[file] = { required: req, missing };
  for (const m of missing) contract.invalid_anchor_errors.push(`${file}: missing required canonical anchor ${m}`);
}

const errors = [...contract.duplicate_anchor_errors, ...contract.invalid_anchor_errors];
const report = { checked_files: mdFiles.length, broken_links: [] };
const linkRe = /\[[^\]]+\]\(([^)]+)\)/g;

for (const file of mdFiles) {
  const text = fs.readFileSync(file, 'utf8');
  for (const m of text.matchAll(linkRe)) {
    const raw = m[1].trim();
    if (!raw || raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('mailto:')) continue;
    const cleaned = raw.replace(/^<|>$/g, '');
    if (cleaned.startsWith('#')) {
      const anchor = cleaned.slice(1);
      const anchors = anchorsByFile.get(file) || new Set();
      if (!anchors.has(anchor)) {
        const msg = `${file}: missing local anchor #${anchor}`;
        errors.push(msg);
        report.broken_links.push(msg);
      }
      continue;
    }
    const [filePart, anchorPart] = cleaned.split('#');
    const target = path.normalize(path.join(path.dirname(file), filePart));
    if (!fs.existsSync(target)) {
      const msg = `${file}: missing target ${filePart}`;
      errors.push(msg);
      report.broken_links.push(msg);
      continue;
    }
    if (anchorPart && target.endsWith('.md')) {
      const anchors = anchorsByFile.get(target) || new Set();
      if (!anchors.has(anchorPart)) {
        const msg = `${file}: missing anchor ${filePart}#${anchorPart}`;
        errors.push(msg);
        report.broken_links.push(msg);
      }
    }
  }
}

fs.mkdirSync('reports/truth', { recursive: true });
fs.writeFileSync('reports/truth/docs_link_report.json', `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync('reports/truth/docs_anchor_contract_check.json', `${JSON.stringify(contract, null, 2)}\n`);

if (errors.length) {
  console.error('verify:docs FAILED');
  for (const err of errors) console.error(`- ${err}`);
  process.exit(1);
}

console.log('verify:docs PASSED');
console.log(JSON.stringify({ checked_files: mdFiles.length, broken_links: 0 }, null, 2));
