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
