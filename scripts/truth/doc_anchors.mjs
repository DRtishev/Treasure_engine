#!/usr/bin/env node

export const CANONICAL_ANCHOR_RE = /^[a-z0-9][a-z0-9-]*$/;

export function toHeadingAnchor(text) {
  return text
    .trim()
    .toLowerCase()
    .replace(/[\s]+/g, '-')
    .replace(/[!"#$%&'()*+,./:;<=>?@[\\\]^`{|}~]/g, '')
    .replace(/-+/g, '-');
}

export function parseAnchors(markdownText) {
  const anchors = new Set();
  const duplicateAnchors = new Set();
  const invalidAnchors = new Set();

  const explicitCounts = new Map();
  for (const m of markdownText.matchAll(/<a\s+id="([^"]+)"\s*><\/a>/g)) {
    const id = m[1].trim();
    const seen = explicitCounts.get(id) || 0;
    explicitCounts.set(id, seen + 1);
    if (!CANONICAL_ANCHOR_RE.test(id)) invalidAnchors.add(id);
    if (seen > 0) duplicateAnchors.add(id);
    anchors.add(id);
  }

  const headingCounts = new Map();
  for (const line of markdownText.split(/\r?\n/)) {
    const hm = line.match(/^(#{1,6})\s+(.+)$/);
    if (!hm) continue;
    const base = toHeadingAnchor(hm[2]);
    const seen = headingCounts.get(base) || 0;
    headingCounts.set(base, seen + 1);
    anchors.add(seen === 0 ? base : `${base}-${seen}`);
  }

  return { anchors, duplicateAnchors: [...duplicateAnchors], invalidAnchors: [...invalidAnchors] };
}

export function anchorTag(id) {
  if (!CANONICAL_ANCHOR_RE.test(id)) throw new Error(`invalid canonical anchor id: ${id}`);
  return `<a id="${id}"></a>`;
}
