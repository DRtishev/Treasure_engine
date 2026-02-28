/**
 * regression_cockpit03_integration.mjs — RG_COCKPIT03_INTEGRATION
 *
 * Gate: cockpit.mjs must exist and produce HUD output that contains
 *       both timemachine and autopilot sections with evidence links.
 * Surface: UX
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
const EVIDENCE_DIR = path.join(ROOT, 'reports', 'evidence');
fs.mkdirSync(MANUAL, { recursive: true });

const NEXT_ACTION = 'npm run -s verify:fast';
const COCKPIT_SCRIPT = path.join(ROOT, 'scripts', 'ops', 'cockpit.mjs');

const checks = [];

// Check 1: cockpit script exists
const scriptExists = fs.existsSync(COCKPIT_SCRIPT);
checks.push({ check: 'cockpit_script_exists', pass: scriptExists, detail: COCKPIT_SCRIPT });

if (scriptExists) {
  const content = fs.readFileSync(COCKPIT_SCRIPT, 'utf8');

  // Check 2: Script references timemachine section
  const hasTmSection = content.includes('TIMEMACHINE') || content.includes('timemachine');
  checks.push({ check: 'script_has_timemachine_section', pass: hasTmSection, detail: 'timemachine section required in cockpit' });

  // Check 3: Script references autopilot section
  const hasApSection = content.includes('AUTOPILOT') || content.includes('autopilot');
  checks.push({ check: 'script_has_autopilot_section', pass: hasApSection, detail: 'autopilot section required in cockpit' });

  // Check 4: No wall-clock time in output
  const nonCommentLines = content.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
  const hasWallClock = /\bnew Date\b|\bDate\.now\b|\bperformance\.now\(|\bprocess\.hrtime\b/.test(nonCommentLines);
  checks.push({ check: 'no_wall_clock_time', pass: !hasWallClock, detail: hasWallClock ? 'FORBIDDEN: wall-clock time detected' : 'no wall-clock time' });

  // Check 5: Writes HUD.json and HUD.md
  const hasHudJson = content.includes('HUD.json');
  const hasHudMd = content.includes('HUD.md');
  checks.push({ check: 'outputs_hud_json', pass: hasHudJson, detail: 'HUD.json output required' });
  checks.push({ check: 'outputs_hud_md', pass: hasHudMd, detail: 'HUD.md output required' });

  // Check 6: Output under EPOCH-COCKPIT-*
  const hasEpochDir = content.includes('EPOCH-COCKPIT-');
  checks.push({ check: 'epoch_dir_cockpit_pattern', pass: hasEpochDir, detail: 'output under EPOCH-COCKPIT-<RUN_ID>' });

  // Check 7: Run cockpit and verify it produces HUD files
  // Cockpit may exit 0 (PASS) or 1 (BLOCKED) — both are valid runs; we check output is produced
  const r = spawnSync(process.execPath, [COCKPIT_SCRIPT], { cwd: ROOT, encoding: 'utf8', env: { ...process.env } });
  const cockpitRanOk = r.status === 0 || r.status === 1; // 0=PASS 1=BLOCKED both valid; crash=2+ is invalid
  const cockpitCrashed = r.status === null || (r.status !== null && r.status > 1);
  checks.push({ check: 'cockpit_runs_without_crash', pass: cockpitRanOk && !cockpitCrashed, detail: `cockpit exit code=${r.status ?? 'null'}: ${(r.stdout || '').slice(0, 100)}` });

  if (cockpitRanOk) {
    // Find latest EPOCH-COCKPIT-* dir
    const epochDirs = fs.existsSync(EVIDENCE_DIR)
      ? fs.readdirSync(EVIDENCE_DIR).filter((d) => d.startsWith('EPOCH-COCKPIT-')).sort()
      : [];
    const latestCockpit = epochDirs.length > 0 ? epochDirs[epochDirs.length - 1] : null;

    if (latestCockpit) {
      const hudJsonPath = path.join(EVIDENCE_DIR, latestCockpit, 'HUD.json');
      const hudMdPath = path.join(EVIDENCE_DIR, latestCockpit, 'HUD.md');

      const hudJsonExists = fs.existsSync(hudJsonPath);
      const hudMdExists = fs.existsSync(hudMdPath);
      checks.push({ check: 'hud_json_produced', pass: hudJsonExists, detail: path.relative(ROOT, hudJsonPath) });
      checks.push({ check: 'hud_md_produced', pass: hudMdExists, detail: path.relative(ROOT, hudMdPath) });

      if (hudJsonExists) {
        try {
          const hud = JSON.parse(fs.readFileSync(hudJsonPath, 'utf8'));
          const hasTmInJson = 'timemachine' in (hud.sections ?? {});
          const hasApInJson = 'autopilot' in (hud.sections ?? {});
          checks.push({ check: 'hud_json_has_timemachine', pass: hasTmInJson, detail: 'HUD.json.sections.timemachine required' });
          checks.push({ check: 'hud_json_has_autopilot', pass: hasApInJson, detail: 'HUD.json.sections.autopilot required' });
        } catch {
          checks.push({ check: 'hud_json_parseable', pass: false, detail: 'HUD.json parse failed' });
        }
      }

      if (hudMdExists) {
        const mdContent = fs.readFileSync(hudMdPath, 'utf8');
        const hasTmInMd = mdContent.includes('TIMEMACHINE');
        const hasApInMd = mdContent.includes('AUTOPILOT');
        checks.push({ check: 'hud_md_has_timemachine_section', pass: hasTmInMd, detail: 'HUD.md must contain TIMEMACHINE section' });
        checks.push({ check: 'hud_md_has_autopilot_section', pass: hasApInMd, detail: 'HUD.md must contain AUTOPILOT section' });
      }
    } else {
      checks.push({ check: 'cockpit_epoch_dir_created', pass: false, detail: 'No EPOCH-COCKPIT-* dir found after run' });
    }
  }
}

const failed = checks.filter((c) => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'COCKPIT01_UNSTABLE';

const mdContent = [
  '# REGRESSION_COCKPIT03_INTEGRATION.md',
  '',
  `STATUS: ${status}`,
  `REASON_CODE: ${reason_code}`,
  `RUN_ID: ${RUN_ID}`,
  `NEXT_ACTION: ${NEXT_ACTION}`,
  '',
  '## CHECKS',
  checks.map((c) => `- [${c.pass ? 'PASS' : 'FAIL'}] ${c.check}: ${c.detail}`).join('\n'),
  '',
  '## FAILED',
  failed.length === 0 ? '- NONE' : failed.map((c) => `- ${c.check}: ${c.detail}`).join('\n'),
].join('\n');

writeMd(path.join(EXEC, 'REGRESSION_COCKPIT03_INTEGRATION.md'), mdContent);

writeJsonDeterministic(path.join(MANUAL, 'regression_cockpit03_integration.json'), {
  schema_version: '1.0.0',
  gate_id: 'RG_COCKPIT03_INTEGRATION',
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: NEXT_ACTION,
  checks,
  failed_checks: failed.map((c) => c.check),
});

console.log(`[${status}] regression_cockpit03_integration — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
