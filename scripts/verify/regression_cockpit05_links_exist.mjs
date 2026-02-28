/**
 * regression_cockpit05_links_exist.mjs — RG_COCKPIT05_LINKS_EXIST
 *
 * Gate: All evidence_paths listed in HUD.json must actually exist on disk.
 *       HUD.json must have evidence_paths array.
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
const COCKPIT_SCRIPT = path.join(ROOT, 'scripts', 'ops', 'cockpit.mjs');
const EVIDENCE_DIR = path.join(ROOT, 'reports', 'evidence');

const checks = [];

// Check 1: Script exists
const scriptExists = fs.existsSync(COCKPIT_SCRIPT);
checks.push({ check: 'cockpit_script_exists', pass: scriptExists, detail: COCKPIT_SCRIPT });

if (scriptExists) {
  const content = fs.readFileSync(COCKPIT_SCRIPT, 'utf8');

  // Check 2: Has evidence_paths array in output
  const hasEvidencePaths = content.includes('evidence_paths');
  checks.push({ check: 'declares_evidence_paths', pass: hasEvidencePaths, detail: 'evidence_paths array required in HUD.json' });

  // Run cockpit to get fresh HUD
  const r = spawnSync(process.execPath, [COCKPIT_SCRIPT], { cwd: ROOT, encoding: 'utf8', env: { ...process.env } });
  const crashed = r.status !== null && r.status >= 2;
  checks.push({
    check: 'cockpit_runs_without_crash',
    pass: !crashed,
    detail: `exit code=${r.status ?? 'null'}: ${(r.stdout || '').trim().slice(0, 80)}`,
  });

  if (!crashed) {
    // Find latest EPOCH-COCKPIT-*
    const cockpitDirs = fs.existsSync(EVIDENCE_DIR)
      ? fs.readdirSync(EVIDENCE_DIR).filter((d) => d.startsWith('EPOCH-COCKPIT-')).sort()
      : [];
    const latestCockpit = cockpitDirs.length > 0 ? cockpitDirs[cockpitDirs.length - 1] : null;
    const hudJsonPath = latestCockpit ? path.join(EVIDENCE_DIR, latestCockpit, 'HUD.json') : null;

    if (hudJsonPath && fs.existsSync(hudJsonPath)) {
      const hud = JSON.parse(fs.readFileSync(hudJsonPath, 'utf8'));

      // Check 3: evidence_paths is array
      const epArr = hud.evidence_paths;
      checks.push({
        check: 'evidence_paths_is_array',
        pass: Array.isArray(epArr),
        detail: Array.isArray(epArr) ? `${epArr.length} paths declared` : 'evidence_paths must be array',
      });

      if (Array.isArray(epArr)) {
        // Check 4: All declared paths exist
        const missing = [];
        for (const p of epArr) {
          const abs = path.join(ROOT, p);
          if (!fs.existsSync(abs)) missing.push(p);
        }
        checks.push({
          check: 'all_evidence_paths_exist',
          pass: missing.length === 0,
          detail: missing.length === 0
            ? `all ${epArr.length} evidence_paths exist`
            : `missing: ${missing.join(', ')}`,
        });
      }

      // Check 5: HUD.md exists
      const hudMdPath = hudJsonPath.replace('HUD.json', 'HUD.md');
      checks.push({
        check: 'hud_md_exists',
        pass: fs.existsSync(hudMdPath),
        detail: fs.existsSync(hudMdPath) ? path.relative(ROOT, hudMdPath) : 'HUD.md missing',
      });

      // Check 6: HUD has schema_version
      checks.push({
        check: 'hud_has_schema_version',
        pass: hud.schema_version === '1.0.0',
        detail: `schema_version=${hud.schema_version}`,
      });

      // Check 7: HUD has sections.timemachine and sections.autopilot
      checks.push({
        check: 'hud_has_timemachine_section',
        pass: hud.sections?.timemachine !== undefined,
        detail: hud.sections?.timemachine !== undefined ? 'timemachine section present' : 'timemachine section missing',
      });
      checks.push({
        check: 'hud_has_autopilot_section',
        pass: hud.sections?.autopilot !== undefined,
        detail: hud.sections?.autopilot !== undefined ? 'autopilot section present' : 'autopilot section missing',
      });
    } else {
      checks.push({ check: 'hud_json_found', pass: false, detail: 'No HUD.json found after cockpit run' });
    }
  }
}

const failed = checks.filter((c) => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'COCKPIT05_BROKEN_LINKS';

writeMd(path.join(EXEC, 'REGRESSION_COCKPIT05_LINKS_EXIST.md'), [
  '# REGRESSION_COCKPIT05_LINKS_EXIST.md', '',
  `STATUS: ${status}`, `REASON_CODE: ${reason_code}`, `RUN_ID: ${RUN_ID}`, `NEXT_ACTION: ${NEXT_ACTION}`, '',
  '## CHECKS', checks.map((c) => `- [${c.pass ? 'PASS' : 'FAIL'}] ${c.check}: ${c.detail}`).join('\n'), '',
  '## FAILED', failed.length === 0 ? '- NONE' : failed.map((c) => `- ${c.check}: ${c.detail}`).join('\n'),
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'regression_cockpit05_links_exist.json'), {
  schema_version: '1.0.0',
  gate_id: 'RG_COCKPIT05_LINKS_EXIST',
  status, reason_code, run_id: RUN_ID, next_action: NEXT_ACTION,
  checks, failed_checks: failed.map((c) => c.check),
});

console.log(`[${status}] regression_cockpit05_links_exist — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
