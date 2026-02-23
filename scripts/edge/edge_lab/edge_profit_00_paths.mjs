import fs from 'node:fs';
import path from 'node:path';

const PROFILE_MARKER = path.join('artifacts', 'incoming', 'paper_telemetry.profile');
const ALLOWED_PROFILES = new Set(['real', 'public', 'sandbox', 'stub', 'clean', 'missing', 'conflict']);

export function profileForEvidenceSource(evidenceSource) {
  const source = String(evidenceSource || '').trim().toUpperCase();
  if (source === 'REAL') return 'real';
  if (source === 'REAL_PUBLIC') return 'public';
  if (source === 'REAL_SANDBOX') return 'sandbox';
  if (source === 'FIXTURE_STUB') return 'stub';
  return '';
}

export function resolveProfit00Profile(ROOT = process.cwd()) {
  const fromEnv = String(process.env.EDGE_PROFIT_PROFILE || '').trim().toLowerCase();
  if (fromEnv) return ALLOWED_PROFILES.has(fromEnv) ? fromEnv : '';
  const markerPath = path.join(ROOT, PROFILE_MARKER);
  if (!fs.existsSync(markerPath)) return '';
  const fromMarker = String(fs.readFileSync(markerPath, 'utf8')).trim().toLowerCase();
  return ALLOWED_PROFILES.has(fromMarker) ? fromMarker : '';
}

export function resolveProfit00EpochDir(ROOT = process.cwd()) {
  const profile = resolveProfit00Profile(ROOT);
  return profile
    ? path.join(ROOT, 'reports', 'evidence', 'EDGE_PROFIT_00', profile)
    : path.join(ROOT, 'reports', 'evidence', 'EDGE_PROFIT_00');
}

export function resolveProfit00ManualDir(ROOT = process.cwd()) {
  return path.join(resolveProfit00EpochDir(ROOT), 'gates', 'manual');
}
