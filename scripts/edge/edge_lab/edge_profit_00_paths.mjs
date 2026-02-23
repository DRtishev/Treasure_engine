import fs from 'node:fs';
import path from 'node:path';

const PROFILE_MARKER = path.join('artifacts', 'incoming', 'paper_telemetry.profile');

export function resolveProfit00Profile(ROOT = process.cwd()) {
  const fromEnv = String(process.env.EDGE_PROFIT_PROFILE || '').trim().toLowerCase();
  if (fromEnv) return fromEnv;
  const markerPath = path.join(ROOT, PROFILE_MARKER);
  if (!fs.existsSync(markerPath)) return '';
  return String(fs.readFileSync(markerPath, 'utf8')).trim().toLowerCase();
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
