import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { sha256File, sha256Text } from './e66_lib.mjs';

export const E122_ROOT = path.resolve('reports/evidence/E122');
export const E122_BINDING = path.resolve('.foundation-seal/E122_INPUT_BINDING.json');
export function runDirE122() { return path.resolve(process.env.TREASURE_RUN_DIR || '.run/treasure/E122_1700000000'); }
export function isCITruthy() { const ci = String(process.env.CI || ''); return ci === 'true' || ci === '1'; }
export function modeE122() {
  const modes = ['OFFLINE_ONLY', 'ONLINE_OPTIONAL', 'ONLINE_REQUIRED'].filter((k) => process.env[k] === '1');
  if (modes.length > 1) throw new Error(`E122_MODE_CONFLICT:${modes.join(',')}`);
  return modes[0] || 'OFFLINE_ONLY';
}
export function atomicWrite(p, body) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  const tmp = `${p}.tmp-${process.pid}-${Date.now()}`;
  const fd = fs.openSync(tmp, 'w', 0o644);
  try { fs.writeFileSync(fd, body, 'utf8'); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
  fs.renameSync(tmp, p);
}
export function writeMdAtomic(p, text) { atomicWrite(p, `${String(text).replace(/\r\n/g, '\n').replace(/\s+$/gm, '').trimEnd()}\n`); }
export function enforceCIBoundaryE122() {
  if (!isCITruthy()) return;
  for (const [k, vRaw] of Object.entries(process.env)) {
    const v = String(vRaw || '').trim();
    if (!v) continue;
    if (k.startsWith('UPDATE_') || k === 'ENABLE_NET' || k.startsWith('ONLINE_') || k.startsWith('LIVE_') || k.startsWith('WS_') || k === 'I_UNDERSTAND_LIVE_RISK' || k.startsWith('ARM_') || k.startsWith('CONFIRM_')) throw new Error(`E122_CI_FORBIDDEN_ENV:${k}`);
  }
}
export function snapshotState(paths) {
  return sha256Text(paths.map((p) => {
    const a = path.resolve(p);
    if (!fs.existsSync(a)) return `${p}:ABSENT`;
    const st = fs.statSync(a);
    if (st.isFile()) return `${p}:FILE:${sha256File(a)}`;
    return `${p}:DIR:${sha256Text(fs.readdirSync(a).sort().join('|'))}`;
  }).join('\n'));
}
export function evidenceFingerprintE122() {
  const files = ['PREFLIGHT.md','CONTRACTS_SUMMARY.md','PERF_NOTES.md','CONNECTIVITY_DIAG.md','EXECUTION_FLOW.md','LIVE_FILL_PROOF.md','LIVE_FILL_GATE.md','LEDGER_DAILY_REPORT.md','ANTI_FAKE_FULL.md','ZERO_WRITES_ON_FAIL.md','REPLAY_X2.md'];
  return sha256Text(files.map((f) => `${f}:${fs.existsSync(path.join(E122_ROOT, f)) ? sha256File(path.join(E122_ROOT, f)) : 'ABSENT'}`).join('\n'));
}
export function cmdOut(cmd, args) { return spawnSync(cmd, args, { encoding: 'utf8' }).stdout.trim(); }
