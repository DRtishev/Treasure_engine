/**
 * regression_cockpit06_readiness_scorecard_present.mjs — RG_COCKPIT06_READINESS_SCORECARD_PRESENT
 *
 * Gate: ops:cockpit must produce HUD.json with a readiness section that
 *       includes per-lane scorecard data from verify:public:data:readiness.
 *       HUD must be deterministic and contain lane data when readiness was run.
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
const EVIDENCE_DIR = path.join(ROOT, 'reports', 'evidence');
fs.mkdirSync(MANUAL, { recursive: true });

const NEXT_ACTION = 'npm run -s verify:fast';
const COCKPIT_SCRIPT = path.join(ROOT, 'scripts', 'ops', 'cockpit.mjs');
const checks = [];

checks.push({ check: 'cockpit_script_exists', pass: fs.existsSync(COCKPIT_SCRIPT), detail: COCKPIT_SCRIPT });

// Check 1: cockpit.mjs source has collectReadiness function
if (fs.existsSync(COCKPIT_SCRIPT)) {
  const content = fs.readFileSync(COCKPIT_SCRIPT, 'utf8');
  checks.push({
    check: 'cockpit_has_collect_readiness',
    pass: content.includes('collectReadiness'),
    detail: content.includes('collectReadiness') ? 'collectReadiness function present — OK' : 'MISSING: collectReadiness function',
  });
  checks.push({
    check: 'cockpit_has_readiness_section',
    pass: content.includes("readiness:") && content.includes('readiness_scorecard') || content.includes('DATA READINESS'),
    detail: content.includes('DATA READINESS') ? 'DATA READINESS section in HUD.md — OK' : 'MISSING: DATA READINESS section',
  });
  checks.push({
    check: 'cockpit_has_per_lane_output',
    pass: content.includes('per_lane'),
    detail: content.includes('per_lane') ? 'per_lane field in readiness section — OK' : 'MISSING: per_lane output',
  });
}

// Check 2: Run cockpit and verify HUD.json has readiness section
if (fs.existsSync(COCKPIT_SCRIPT)) {
  const r = spawnSync(process.execPath, [COCKPIT_SCRIPT], {
    cwd: ROOT, encoding: 'utf8', env: { ...process.env },
  });

  checks.push({
    check: 'cockpit_runs_ok',
    pass: r.status === 0,
    detail: r.status === 0 ? 'cockpit exits 0 — OK' : `exit=${r.status}: ${(r.stderr || r.stdout || '').trim().slice(0, 80)}`,
  });

  if (r.status === 0) {
    // Parse HUD_JSON path from cockpit stdout (stable — not mtime/lex sort)
    const hudJsonLine = (r.stdout || '').split('\n').find((l) => l.trim().startsWith('HUD_JSON:'));
    const hudRelPath = hudJsonLine ? hudJsonLine.trim().replace(/^HUD_JSON:\s*/, '') : null;
    const hudPath = hudRelPath ? path.join(ROOT, hudRelPath) : null;

    checks.push({
      check: 'hud_json_written',
      pass: Boolean(hudPath && fs.existsSync(hudPath)),
      detail: hudPath ? path.relative(ROOT, hudPath) : 'No HUD.json found',
    });

    if (hudPath && fs.existsSync(hudPath)) {
      let hud;
      try {
        hud = JSON.parse(fs.readFileSync(hudPath, 'utf8'));
      } catch (e) {
        checks.push({ check: 'hud_json_parseable', pass: false, detail: e.message });
        hud = null;
      }

      if (hud) {
        checks.push({ check: 'hud_json_parseable', pass: true, detail: 'JSON parse OK' });

        // Check readiness section exists in sections
        const hasReadiness = hud.sections && 'readiness' in hud.sections;
        checks.push({
          check: 'hud_has_readiness_section',
          pass: hasReadiness,
          detail: hasReadiness ? 'sections.readiness present — OK' : 'MISSING: sections.readiness in HUD.json',
        });

        if (hasReadiness) {
          const rd = hud.sections.readiness;
          checks.push({
            check: 'readiness_has_status',
            pass: typeof rd.status === 'string',
            detail: `readiness.status=${rd.status}`,
          });
          checks.push({
            check: 'readiness_has_per_lane_array',
            pass: Array.isArray(rd.per_lane),
            detail: Array.isArray(rd.per_lane) ? `per_lane_n=${rd.per_lane.length}` : 'per_lane is not array',
          });

          if (Array.isArray(rd.per_lane) && rd.per_lane.length > 0) {
            // Each lane entry must have required scorecard fields
            const requiredLaneFields = ['lane_id', 'truth_level', 'status', 'reason_code'];
            const badLanes = rd.per_lane.filter((l) => requiredLaneFields.some((f) => !(f in l)));
            checks.push({
              check: 'per_lane_entries_have_required_fields',
              pass: badLanes.length === 0,
              detail: badLanes.length === 0 ? `all ${rd.per_lane.length} lane entries valid — OK` : `BAD: ${badLanes.map((l) => l.lane_id).join(',')}`,
            });

            // Per-lane must be sorted by lane_id
            const ids = rd.per_lane.map((l) => l.lane_id);
            const sorted = [...ids].sort((a, b) => a.localeCompare(b));
            checks.push({
              check: 'per_lane_sorted_by_lane_id',
              pass: JSON.stringify(ids) === JSON.stringify(sorted),
              detail: JSON.stringify(ids) === JSON.stringify(sorted) ? 'per_lane sorted — OK' : `UNSORTED: ${ids.join(',')}`,
            });
          }
        }
      }
    }
  }
}

const failed = checks.filter((c) => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'COCKPIT06_READINESS_MISSING';

writeMd(path.join(EXEC, 'REGRESSION_COCKPIT06.md'), [
  '# REGRESSION_COCKPIT06.md', '',
  `STATUS: ${status}`,
  `REASON_CODE: ${reason_code}`,
  `RUN_ID: ${RUN_ID}`,
  `NEXT_ACTION: ${NEXT_ACTION}`, '',
  '## CHECKS',
  checks.map((c) => `- [${c.pass ? 'PASS' : 'FAIL'}] ${c.check}: ${c.detail}`).join('\n'), '',
  '## FAILED',
  failed.length === 0 ? '- NONE' : failed.map((c) => `- ${c.check}: ${c.detail}`).join('\n'),
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'regression_cockpit06.json'), {
  schema_version: '1.0.0',
  gate_id: 'RG_COCKPIT06_READINESS_SCORECARD_PRESENT',
  status, reason_code, run_id: RUN_ID, next_action: NEXT_ACTION,
  checks, failed_checks: failed.map((c) => c.check),
});

console.log(`[${status}] regression_cockpit06_readiness_scorecard_present — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
