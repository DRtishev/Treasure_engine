/**
 * infra_p0_run.mjs — INFRA P0 runner (runner, not renderer)
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';
import { RUN_ID } from '../edge/edge_lab/canon.mjs';

const ROOT = path.resolve(process.cwd());
const INFRA_DIR = path.join(ROOT, 'reports', 'evidence', 'INFRA_P0');
const SAFETY_DIR = path.join(ROOT, 'reports', 'evidence', 'SAFETY');
const INFRA_MANUAL_DIR = path.join(INFRA_DIR, 'gates', 'manual');

fs.mkdirSync(INFRA_MANUAL_DIR, { recursive: true });

const GATES = [
  { id: 'NET_ISOLATION', script: 'scripts/verify/net_isolation_proof.mjs', json: 'reports/evidence/INFRA_P0/gates/manual/net_isolation.json' },
  { id: 'NODE_TRUTH', script: 'scripts/verify/node_truth_gate.mjs', json: 'reports/evidence/INFRA_P0/gates/manual/node_truth_gate.json' },
  { id: 'VERIFY_MODE', script: 'scripts/verify/verify_mode_gate.mjs', json: 'reports/evidence/INFRA_P0/gates/manual/verify_mode_gate.json' },
  { id: 'DEPS_OFFLINE', script: 'scripts/verify/deps_offline_install_contract.mjs', json: 'reports/evidence/INFRA_P0/gates/manual/deps_offline_install.json' },
  { id: 'GOLDENS_APPLY', script: 'scripts/verify/goldens_apply_gate.mjs', json: 'reports/evidence/INFRA_P0/gates/manual/goldens_apply_gate.json' },
  { id: 'FORMAT_POLICY', script: 'scripts/verify/format_policy_gate.mjs', json: 'reports/evidence/INFRA_P0/gates/manual/format_policy_gate.json' },
  { id: 'FIXTURE_GUARD', script: 'scripts/verify/fixture_guard_gate.mjs', json: 'reports/evidence/INFRA_P0/gates/manual/fixture_guard_gate.json' },
  { id: 'ZERO_WAR_PROBE', script: 'scripts/verify/zero_war_probe.mjs', json: 'reports/evidence/SAFETY/gates/manual/zero_war_probe.json' },
];

const OWNED_DERIVED = [
  'reports/evidence/INFRA_P0/INFRA_P0_CLOSEOUT.md',
  'reports/evidence/INFRA_P0/INFRA_P0_COMMANDS_RUN.md',
  'reports/evidence/INFRA_P0/DEPS_OFFLINE_INSTALL_CONTRACT.md',
  'reports/evidence/INFRA_P0/NET_ISOLATION_PROOF.md',
  'reports/evidence/INFRA_P0/NODE_TRUTH_GATE.md',
  'reports/evidence/INFRA_P0/VERIFY_MODE_GATE.md',
  'reports/evidence/INFRA_P0/GOLDENS_APPLY_GATE.md',
  'reports/evidence/INFRA_P0/FORMAT_POLICY_GATE.md',
  'reports/evidence/INFRA_P0/FIXTURE_GUARD_GATE.md',
  'reports/evidence/INFRA_P0/gates/manual/infra_p0_closeout.json',
  'reports/evidence/INFRA_P0/gates/manual/infra_p0_commands.json',
  ...GATES.map((g) => g.json),
  'reports/evidence/SAFETY/ZERO_WAR_PROBE.md',
];

for (const rel of OWNED_DERIVED) {
  const abs = path.join(ROOT, rel);
  if (fs.existsSync(abs)) fs.rmSync(abs, { force: true });
}

function runScript(script, args = '') {
  try {
    const out = execSync(`node "${path.join(ROOT, script)}" ${args}`.trim(), {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 120000,
      env: { ...process.env },
    });
    if (out.trim()) console.log(out.trim());
    return { ec: 0, stderr: '', stdout: out.trim() };
  } catch (err) {
    const stdout = err.stdout?.toString().trim() ?? '';
    const stderr = err.stderr?.toString().trim() ?? '';
    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);
    return { ec: err.status || 1, stdout, stderr };
  }
}

function readGate(rel) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) return { status: 'BLOCKED', reason_code: 'ME01', message: `Missing required gate JSON: ${rel}` };
  try {
    const d = JSON.parse(fs.readFileSync(abs, 'utf8'));
    return { status: d.status || 'UNKNOWN', reason_code: d.reason_code || 'NONE', message: d.message || '' };
  } catch {
    return { status: 'FAIL', reason_code: 'ME01', message: `Unreadable gate JSON: ${rel}` };
  }
}

const results = [];
for (const gate of GATES) {
  console.log(`\n[INFRA_RUN] ${gate.id}`);
  const run = runScript(gate.script);
  const gateJson = readGate(gate.json);
  results.push({ gate: gate.id, script: gate.script, json: gate.json, exit_code: run.ec, status: gateJson.status, reason_code: gateJson.reason_code, message: gateJson.message });
}

// renderer-only closeout regeneration
runScript('scripts/verify/infra_p0_closeout.mjs', '--render-only');

const allPass = results.every((r) => r.status === 'PASS');
const status = allPass ? 'PASS' : 'FAIL';
const nextAction = allPass ? 'npm run -s gov:integrity' : (results.find((r) => r.reason_code === 'NT02') ? 'bash scripts/ops/node_authority_run.sh node -v' : 'npm run -s infra:p0');

const md = `# INFRA_P0_COMMANDS_RUN.md\n\nSTATUS: ${status}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${nextAction}\n\n| Gate | Exit Code | Status | Reason Code |\n|---|---:|---|---|\n${results.map((r)=>`| ${r.gate} | ${r.exit_code} | ${r.status} | ${r.reason_code} |`).join('\n')}\n`;
fs.writeFileSync(path.join(INFRA_DIR, 'INFRA_P0_COMMANDS_RUN.md'), md);

writeJsonDeterministic(path.join(INFRA_MANUAL_DIR, 'infra_p0_commands.json'), {
  schema_version: '1.0.0',
  run_id: RUN_ID,
  status,
  next_action: nextAction,
  all_pass: allPass,
  results,
});

process.exit(allPass ? 0 : 1);
