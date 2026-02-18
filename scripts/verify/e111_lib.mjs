import fs from 'node:fs';
import path from 'node:path';
import { sha256File, sha256Text } from './e66_lib.mjs';

export const E111_ROOT = path.resolve('reports/evidence/E111');

function hashOrAbsent(p) {
  const full = path.resolve(p);
  return fs.existsSync(full) ? sha256File(full) : 'ABSENT';
}

function readCanon(p) {
  const full = path.resolve(p);
  if (!fs.existsSync(full)) return 'ABSENT';
  const text = fs.readFileSync(full, 'utf8');
  const m = text.match(/canonical_fingerprint:\s*([a-f0-9]{64})/);
  return m ? m[1] : 'NOT_FOUND';
}

export function anchorsE111() {
  return {
    e110_canonical_fingerprint: readCanon('reports/evidence/E110/CLOSEOUT.md'),
    fetch_capsules_hash: hashOrAbsent('scripts/data/e111_fetch_real_capsules.mjs'),
    normalize_capsules_hash: hashOrAbsent('scripts/data/e111_normalize_capsules.mjs'),
    quorum_contract_hash: hashOrAbsent('scripts/verify/e111_data_quorum_v3_contract.mjs'),
    real_feed_hash: hashOrAbsent('core/live/real_feed_bybit_public.mjs'),
    paper_live_runner_hash: hashOrAbsent('core/paper/e111_paper_live_real_feed_runner.mjs'),
    harvest_v3_hash: hashOrAbsent('scripts/edge/e111_harvest_v3.mjs'),
    graduation_hash: hashOrAbsent('scripts/live/e111_graduate_candidate_paper_live.mjs'),
    live_isolation_contract_hash: hashOrAbsent('scripts/verify/e111_live_feed_isolation_contract.mjs'),
    graduation_contract_hash: hashOrAbsent('scripts/verify/e111_graduation_readiness_contract.mjs')
  };
}

export function evidenceFingerprintE111() {
  const coreFiles = [
    'PREFLIGHT.md', 'CONTRACTS_SUMMARY.md', 'PERF_NOTES.md', 'REALITY_CAPSULES.md',
    'DATA_QUORUM_V3.md', 'LIVE_FEED_PAPER_RUN.md', 'GAP_COST_REPORT.md',
    'CANDIDATE_BOARD_V3.md', 'GRADUATION_RUN.md', 'DAILY_REPORT.md'
  ];
  const parts = [];
  for (const f of coreFiles) {
    const fp = path.join(E111_ROOT, f);
    if (fs.existsSync(fp)) parts.push(`${f}:${sha256File(fp)}`);
  }
  const seal = path.join(E111_ROOT, 'SEAL_X2.md');
  if (fs.existsSync(seal)) parts.push(`SEAL_X2.md:${sha256File(seal)}`);
  return sha256Text(parts.join('\n'));
}
