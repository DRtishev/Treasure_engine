#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

export const EVIDENCE_ROOT = 'reports/evidence';

export function detectLatestEvidenceEpoch() {
  if (!fs.existsSync(EVIDENCE_ROOT)) return null;
  const dirs = fs.readdirSync(EVIDENCE_ROOT)
    .map((name) => ({
      name,
      full: path.join(EVIDENCE_ROOT, name)
    }))
    .filter((entry) => fs.existsSync(entry.full) && fs.statSync(entry.full).isDirectory())
    .sort((a, b) => fs.statSync(b.full).mtimeMs - fs.statSync(a.full).mtimeMs);

  return dirs[0]?.name ?? null;
}

export function resolveEvidenceEpoch() {
  return process.env.EVIDENCE_EPOCH || detectLatestEvidenceEpoch() || 'EPOCH-PIPELINE-FREEZE';
}

export function resolveEvidenceDir() {
  return path.join(EVIDENCE_ROOT, resolveEvidenceEpoch());
}
