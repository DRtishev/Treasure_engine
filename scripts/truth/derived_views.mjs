#!/usr/bin/env node
import fs from 'node:fs';
import { anchorTag } from './doc_anchors.mjs';

export function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

export function formatTable(headers, rows) {
  const lines = [];
  lines.push(`| ${headers.join(' | ')} |`);
  lines.push(`| ${headers.map(() => '---').join(' | ')} |`);
  for (const row of rows) lines.push(`| ${row.join(' | ')} |`);
  return `${lines.join('\n')}\n`;
}

export function renderWowCatalog(ledger) {
  const rows = (ledger.items || [])
    .filter((x) => ['SHIPPED', 'STAGED'].includes(x.status))
    .sort((a, b) => a.id.localeCompare(b.id));
  const table = rows.map((item) => [
    item.id,
    item.title,
    item.status,
    item.tier,
    item.doc_path ? `[card](../${item.doc_path})` : '-',
    (item.integration?.evidence_outputs || []).map((x) => `\`${x}\``).join(', ') || '-'
  ]);

  return `${anchorTag('wow-catalog')}\n\n# WOW Catalog (Derived)\n\n` +
    `Source of truth: \`specs/wow/WOW_LEDGER.json\`.\n\n` +
    `${anchorTag('shipped-staged-summary')}\n\n## SHIPPED/STAGED Summary\n\n` +
    formatTable(['ID', 'Title', 'Status', 'Tier', 'Card', 'Evidence refs'], table) +
    `\nGenerated deterministically from SSOT; do not edit manually.\n`;
}

export function renderWowMatrix(ledger) {
  const rows = (ledger.items || []).sort((a, b) => a.id.localeCompare(b.id)).map((item) => [
    item.id,
    item.title,
    item.status,
    item.profit_hook?.affected_layer || '-',
    (item.integration?.epochs || []).join(', ') || '-',
    (item.integration?.gates || []).map((x) => `\`${x}\``).join(', ') || '-',
    item.doc_path ? `[card](../${item.doc_path})` : '-'
  ]);

  return `${anchorTag('stage2-implementation-matrix')}\n\n# STAGE2 Implementation Matrix (Derived)\n\n` +
    `Source of truth: \`specs/wow/WOW_LEDGER.json\`.\n\n` +
    formatTable(['ID', 'Title', 'Status', 'Layer', 'Epochs', 'Gates', 'Card'], rows) +
    `\nGenerated deterministically from SSOT; do not edit manually.\n`;
}

export function renderKbPortal() {
  const sections = [
    ['KB foundations', [
      ['00 Glossary', '00_GLOSSARY.md'],
      ['01 System Map', '01_SYSTEM_MAP.md'],
      ['02 Data Truth', '02_DATA_TRUTH.md'],
      ['03 Execution Truth', '03_EXECUTION_TRUTH.md'],
      ['04 Risk Truth', '04_RISK_TRUTH.md'],
      ['05 Verification Truth', '05_VERIFICATION_TRUTH.md'],
      ['06 WOW to Profit', '06_WOW_TO_PROFIT.md']
    ]],
    ['Policy docs', [
      ['Pipeline Doctrine', '../docs/PIPELINE_DOCTRINE.md'],
      ['Anti-Drift Doctrine', '../docs/ANTI_DRIFT_DOCTRINE.md'],
      ['Specs Playbook', '../docs/SPECS_PLAYBOOK.md']
    ]],
    ['WOW + verification entrypoints', [
      ['WOW Catalog (derived)', '../docs/WOW_CATALOG.md'],
      ['WOW Ledger', '../specs/wow/WOW_LEDGER.json'],
      ['verify:wow', '../scripts/verify/wow_specs_check.mjs'],
      ['verify:kb', '../scripts/verify/kb_check.mjs'],
      ['verify:derived', '../scripts/verify/derived_docs_check.mjs'],
      ['verify:docs', '../scripts/verify/docs_links_check.mjs']
    ]]
  ];

  const parts = [anchorTag('knowledge-base-portal'), '', '# Knowledge Base Portal (Derived)', '', 'Central index generated from SSOT-adjacent assets.', ''];
  for (const [name, links] of sections) {
    parts.push(anchorTag(name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')));
    parts.push(`## ${name}`);
    parts.push('');
    for (const [label, href] of links) {
      parts.push(`- [${label}](${href})`);
    }
    parts.push('');
  }
  parts.push('Generated deterministically; do not edit manually.');
  return `${parts.join('\n')}\n`;
}
