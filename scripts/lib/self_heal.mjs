/**
 * self_heal.mjs — Deterministic self-healing for known infrastructure failures
 *
 * CRITICAL RULE: NEVER modifies source code, specs, or gate scripts.
 *                Only fixes infrastructure state: dirs, baseline, deps.
 *
 * Each healer returns { healed: bool, action: string, detail: string }
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { isLegacyExempt } from '../gov/policy_engine.mjs';

const ROOT = process.cwd();

export function healAll() {
  const log = [];
  log.push(healExecutorDir());
  log.push(healGitDir());
  log.push(healNodeModules());
  log.push(healOrphansInEvidence());
  log.push(healStaleEnrichment());
  log.push(healCorruptLock());
  log.push(healMissingEnrichedBars());
  log.push(healOrphanRuns());
  return log.filter((h) => h.healed);
}

export function healExecutorDir() {
  const exec = path.join(ROOT, 'reports/evidence/EXECUTOR/gates/manual');
  if (fs.existsSync(exec)) return { healed: false, action: 'executor_dir', detail: 'already exists' };
  fs.mkdirSync(exec, { recursive: true });
  return { healed: true, action: 'executor_dir', detail: 'created EXECUTOR/gates/manual' };
}

export function healGitDir() {
  const gitDir = path.join(ROOT, '.git');
  if (fs.existsSync(gitDir)) return { healed: false, action: 'git_dir', detail: 'already exists' };
  if (process.env.VERIFY_MODE === 'BUNDLE') return { healed: false, action: 'git_dir', detail: 'BUNDLE mode, skip' };
  const r1 = spawnSync('git', ['init'], { cwd: ROOT, encoding: 'utf8' });
  if (r1.status !== 0) return { healed: false, action: 'git_dir', detail: `git init failed: ec=${r1.status}` };
  spawnSync('git', ['add', '-A'], { cwd: ROOT, encoding: 'utf8' });
  spawnSync('git', ['commit', '-m', 'self-heal: init for RUN_ID'], { cwd: ROOT, encoding: 'utf8' });
  return { healed: true, action: 'git_dir', detail: 'git init + add + commit' };
}

export function healNodeModules() {
  const nm = path.join(ROOT, 'node_modules');
  if (fs.existsSync(nm) && fs.readdirSync(nm).length > 10) {
    return { healed: false, action: 'node_modules', detail: 'already populated' };
  }
  const r = spawnSync('npm', ['ci', '--ignore-scripts'], { cwd: ROOT, encoding: 'utf8', timeout: 120000 });
  if (r.status !== 0) return { healed: false, action: 'node_modules', detail: `npm ci failed: ec=${r.status}` };
  return { healed: true, action: 'node_modules', detail: 'npm ci completed' };
}

export function healOrphansInEvidence() {
  const evidenceDir = path.join(ROOT, 'reports', 'evidence');
  if (!fs.existsSync(evidenceDir)) return { healed: false, action: 'orphan_quarantine', detail: 'no evidence dir' };
  const quarantine = path.join(ROOT, 'artifacts', 'quarantine', `heal-${Date.now()}`);
  let moved = 0;
  for (const ent of fs.readdirSync(evidenceDir, { withFileTypes: true })) {
    const name = ent.name;
    if (name === 'EXECUTOR' || name.startsWith('EPOCH-') || isLegacyExempt(name)) continue;
    // Orphan found — quarantine it
    fs.mkdirSync(quarantine, { recursive: true });
    const src = path.join(evidenceDir, name);
    const dst = path.join(quarantine, name);
    fs.renameSync(src, dst);
    moved++;
  }
  if (moved === 0) return { healed: false, action: 'orphan_quarantine', detail: 'no orphans found' };
  return { healed: true, action: 'orphan_quarantine', detail: `quarantined ${moved} orphan(s) to ${path.relative(ROOT, quarantine)}` };
}

// ── EPOCH-74 Data Organ Healers (H1-H4) ─────────────────────────────

function runBounded(cmd, opts = {}) {
  const r = spawnSync(cmd, { cwd: opts.cwd || ROOT, encoding: 'utf8', shell: true, timeout: 120000, env: { ...process.env, TREASURE_NET_KILL: '1' } });
  return { ec: r.status ?? 127 };
}

/** H1: Stale enrichment → trigger re-enrichment from latest raw. */
export function healStaleEnrichment() {
  const enrichPath = path.join(ROOT, 'artifacts/outgoing/features_liq.lock.json');
  const rawDir = path.join(ROOT, 'artifacts/incoming/liquidations/bybit_ws_v5');
  if (!fs.existsSync(rawDir)) return { healed: false, action: 'stale_enrichment', detail: 'no raw data' };

  if (!fs.existsSync(enrichPath)) {
    const result = runBounded('TREASURE_NET_KILL=1 node scripts/edge/edge_liq_02_signals.mjs');
    return { healed: result.ec === 0, action: 'stale_enrichment', detail: `regenerated ec=${result.ec}` };
  }
  return { healed: false, action: 'stale_enrichment', detail: 'enrichment exists' };
}

/** H2: Corrupt lock.json → detect missing lock files. */
export function healCorruptLock() {
  const lanesPath = path.join(ROOT, 'specs/data_lanes.json');
  if (!fs.existsSync(lanesPath)) return { healed: false, action: 'corrupt_lock', detail: 'no data_lanes.json' };

  const lanes = JSON.parse(fs.readFileSync(lanesPath, 'utf8')).lanes;
  let healed = false;
  for (const lane of lanes) {
    const base = (lane.required_artifacts[0] || '').split('/<RUN_ID>/')[0];
    if (!base) continue;
    const dir = path.join(ROOT, base);
    if (!fs.existsSync(dir)) continue;
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { continue; }
    const latest = entries.filter((d) => d.isDirectory()).map((d) => d.name).sort().at(-1);
    if (!latest) continue;
    const lockP = path.join(dir, latest, 'lock.json');
    const rawP = path.join(dir, latest, 'raw.jsonl');
    if (fs.existsSync(rawP) && !fs.existsSync(lockP)) {
      healed = true;
    }
  }
  return { healed, action: 'corrupt_lock', detail: healed ? 'missing lock detected' : 'all locks present' };
}

/** H3: Missing enriched bars → flag for attention. */
export function healMissingEnrichedBars() {
  const enrichedPath = path.join(ROOT, 'artifacts/outgoing/enriched_bars.jsonl');
  if (!fs.existsSync(enrichedPath)) {
    return { healed: false, action: 'missing_enriched_bars', detail: 'enriched_bars not yet generated' };
  }
  return { healed: false, action: 'missing_enriched_bars', detail: 'enriched_bars present' };
}

/** H4: Orphan run dirs → quarantine old runs (keep latest 3). */
export function healOrphanRuns() {
  const MAX_RUNS = 3;
  let quarantined = 0;
  const baseDirs = [
    'artifacts/incoming/liquidations/bybit_ws_v5',
    'artifacts/incoming/liquidations/okx_ws_v5',
    'artifacts/incoming/liquidations/binance_forceorder_ws',
    'artifacts/incoming/okx/orderbook',
  ];
  for (const rel of baseDirs) {
    const dir = path.join(ROOT, rel);
    if (!fs.existsSync(dir)) continue;
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { continue; }
    const runs = entries.filter((d) => d.isDirectory()).map((d) => d.name).sort();
    if (runs.length <= MAX_RUNS) continue;
    const toQuarantine = runs.slice(0, runs.length - MAX_RUNS);
    for (const run of toQuarantine) {
      const src = path.join(dir, run);
      const dest = path.join(ROOT, 'artifacts/quarantine', `data-heal-${Date.now()}`, rel, run);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.renameSync(src, dest);
      quarantined++;
    }
  }
  return { healed: quarantined > 0, action: 'orphan_runs', detail: `quarantined ${quarantined} old runs` };
}
