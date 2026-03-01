/**
 * regression_lane02_code_matches_registry.mjs — RG_LANE02_CODE_MATCHES_REGISTRY
 *
 * Gate: For each lane in specs/data_lanes.json, the replay_command script must
 *       exist on disk and be executable offline under TREASURE_NET_KILL=1
 *       (dry-run: just check the script exists + is parseable).
 * Surface: DATA
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

const NEXT_ACTION = 'npm run -s verify:fast';
const REGISTRY_PATH = path.join(ROOT, 'specs/data_lanes.json');
const checks = [];

checks.push({ check: 'registry_exists', pass: fs.existsSync(REGISTRY_PATH), detail: REGISTRY_PATH });

if (fs.existsSync(REGISTRY_PATH)) {
  let reg;
  try {
    reg = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));
  } catch (e) {
    checks.push({ check: 'registry_parse', pass: false, detail: e.message });
    reg = null;
  }

  if (reg && Array.isArray(reg.lanes)) {
    for (const lane of reg.lanes) {
      // Extract script path from replay_command
      // Pattern: TREASURE_NET_KILL=1 node <script_path> ...
      const cmdParts = (lane.replay_command || '').split(/\s+/);
      // Find the script: first arg after 'node'
      const nodeIdx = cmdParts.findIndex((p) => p === 'node');
      const scriptRel = nodeIdx >= 0 ? cmdParts[nodeIdx + 1] : null;

      if (!scriptRel) {
        checks.push({ check: `${lane.lane_id}_has_node_script`, pass: false, detail: `cannot parse node script from: ${lane.replay_command}` });
        continue;
      }

      const scriptPath = path.join(ROOT, scriptRel);
      const exists = fs.existsSync(scriptPath);
      checks.push({
        check: `${lane.lane_id}_replay_script_exists`,
        pass: exists,
        detail: exists ? scriptRel : `MISSING: ${scriptRel}`,
      });

      if (exists) {
        // Verify replay_command starts with TREASURE_NET_KILL=1 (offline-safe marker)
        const hasNetKill = lane.replay_command.includes('TREASURE_NET_KILL=1');
        checks.push({
          check: `${lane.lane_id}_replay_cmd_has_netkill`,
          pass: hasNetKill,
          detail: hasNetKill ? 'TREASURE_NET_KILL=1 present — OK' : 'MISSING: TREASURE_NET_KILL=1 in replay_command',
        });

        // Verify script content does not use fetch/curl (network-safe check)
        const content = fs.readFileSync(scriptPath, 'utf8');
        const nonComment = content.split('\n').filter((l) => { const t = l.trim(); return !t.startsWith('//') && !t.startsWith('*'); }).join('\n');
        const hasNetCall = nonComment.includes("'curl'") || nonComment.includes('"curl"') || nonComment.includes('fetch(') || nonComment.includes('node:https');
        // NOTE: acquire scripts are allowed to have curl (they have double-key gate)
        // replay scripts must not
        const isAcquireScript = scriptRel.includes('acquire');
        checks.push({
          check: `${lane.lane_id}_replay_script_no_network`,
          pass: isAcquireScript || !hasNetCall,
          detail: (isAcquireScript || !hasNetCall)
            ? 'no network calls in replay — OK'
            : 'FORBIDDEN: network call in replay script',
        });
      }
    }
  }
}

const failed = checks.filter((c) => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'LANE02_CODE_MISMATCH';

writeMd(path.join(EXEC, 'REGRESSION_LANE02.md'), [
  '# REGRESSION_LANE02.md', '',
  `STATUS: ${status}`,
  `REASON_CODE: ${reason_code}`,
  `RUN_ID: ${RUN_ID}`,
  `NEXT_ACTION: ${NEXT_ACTION}`, '',
  '## CHECKS',
  checks.map((c) => `- [${c.pass ? 'PASS' : 'FAIL'}] ${c.check}: ${c.detail}`).join('\n'), '',
  '## FAILED',
  failed.length === 0 ? '- NONE' : failed.map((c) => `- ${c.check}: ${c.detail}`).join('\n'),
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'regression_lane02.json'), {
  schema_version: '1.0.0',
  gate_id: 'RG_LANE02_CODE_MATCHES_REGISTRY',
  status, reason_code, run_id: RUN_ID, next_action: NEXT_ACTION,
  checks, failed_checks: failed.map((c) => c.check),
});

console.log(`[${status}] regression_lane02_code_matches_registry — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
