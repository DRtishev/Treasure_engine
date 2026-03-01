/**
 * regression_r2_01_no_daily_wiring.mjs — RG_R2_01_NO_DAILY_WIRING
 *
 * Gate: verify:fast and ops:life must NOT include any verify:r2:* scripts.
 *       R2 gates are offline research gates — they must NOT run in the daily
 *       ops chain until a lane reaches TRUTH_READY. Accidental wiring blocks
 *       the daily chain when fixture data is absent.
 *
 * Also verifies: verify:r2:okx-orderbook script exists (Phase 2 presence check).
 *
 * Surface: OFFLINE_AUTHORITY
 */

import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

const NEXT_ACTION = 'npm run -s verify:regression:r2-01-no-daily-wiring';
const PKG_PATH = path.join(ROOT, 'package.json');

const checks = [];

if (!fs.existsSync(PKG_PATH)) {
  checks.push({ check: 'package_json_exists', pass: false, detail: `missing: ${PKG_PATH}` });
} else {
  let pkg;
  try {
    pkg = JSON.parse(fs.readFileSync(PKG_PATH, 'utf8'));
    checks.push({ check: 'package_json_parseable', pass: true, detail: 'JSON parse OK' });
  } catch (e) {
    pkg = null;
    checks.push({ check: 'package_json_parseable', pass: false, detail: `parse error: ${e.message}` });
  }

  if (pkg && pkg.scripts) {
    const scripts = pkg.scripts;

    // Check 1: verify:fast must not include verify:r2:*
    const fastScript = scripts['verify:fast'] || '';
    const fastHasR2 = /verify:r2:/.test(fastScript);
    checks.push({
      check: 'verify_fast_no_r2_wiring',
      pass: !fastHasR2,
      detail: fastHasR2
        ? `WIRED: verify:fast contains verify:r2:* — remove before TRUTH_READY`
        : `verify:fast has no verify:r2:* — OK`,
    });

    // Check 2: ops:life must not include verify:r2:*
    const lifeScript = scripts['ops:life'] || '';
    // ops:life calls node scripts/ops/life.mjs; also check life.mjs itself
    const lifeHasR2 = /verify:r2:/.test(lifeScript);
    checks.push({
      check: 'ops_life_script_no_r2_wiring',
      pass: !lifeHasR2,
      detail: lifeHasR2
        ? `WIRED: ops:life script contains verify:r2:* — remove before TRUTH_READY`
        : `ops:life script has no verify:r2:* — OK`,
    });

    // Check 3: life.mjs must not reference verify:r2:*
    const lifeMjsPath = path.join(ROOT, 'scripts', 'ops', 'life.mjs');
    if (fs.existsSync(lifeMjsPath)) {
      const lifeSrc = fs.readFileSync(lifeMjsPath, 'utf8');
      const lifeMjsHasR2 = /verify:r2:/.test(lifeSrc);
      checks.push({
        check: 'life_mjs_no_r2_wiring',
        pass: !lifeMjsHasR2,
        detail: lifeMjsHasR2
          ? `WIRED: scripts/ops/life.mjs references verify:r2:* — remove before TRUTH_READY`
          : `scripts/ops/life.mjs has no verify:r2:* — OK`,
      });
    } else {
      checks.push({ check: 'life_mjs_exists', pass: false, detail: `missing: scripts/ops/life.mjs` });
    }

    // Check 4: verify:r2:okx-orderbook script exists (presence check)
    const r2OkxExists = !!scripts['verify:r2:okx-orderbook'];
    checks.push({
      check: 'verify_r2_okx_orderbook_script_exists',
      pass: r2OkxExists,
      detail: r2OkxExists
        ? `verify:r2:okx-orderbook script present — OK`
        : `MISSING: verify:r2:okx-orderbook not in package.json scripts`,
    });

    // Check 5: verify:r2:preflight script exists
    const r2PrefExists = !!scripts['verify:r2:preflight'];
    checks.push({
      check: 'verify_r2_preflight_script_exists',
      pass: r2PrefExists,
      detail: r2PrefExists
        ? `verify:r2:preflight script present — OK`
        : `MISSING: verify:r2:preflight not in package.json scripts`,
    });
  } else {
    checks.push({ check: 'scripts_field_present', pass: false, detail: 'package.json missing scripts field' });
  }
}

const failed = checks.filter((c) => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'R2_01_DAILY_WIRING_DETECTED';

writeMd(path.join(EXEC, 'REGRESSION_R2_01.md'), [
  '# REGRESSION_R2_01.md', '',
  `STATUS: ${status}`,
  `REASON_CODE: ${reason_code}`,
  `RUN_ID: ${RUN_ID}`,
  `NEXT_ACTION: ${NEXT_ACTION}`, '',
  '## POLICY',
  '- verify:fast MUST NOT contain verify:r2:* (R2 gates are research-only)',
  '- ops:life MUST NOT contain verify:r2:* (daily chain must stay clean)',
  '- R2 gates run only via verify:r2:okx-orderbook until lane is TRUTH_READY', '',
  '## CHECKS',
  checks.map((c) => `- [${c.pass ? 'PASS' : 'FAIL'}] ${c.check}: ${c.detail}`).join('\n'), '',
  '## FAILED',
  failed.length === 0 ? '- NONE' : failed.map((c) => `- ${c.check}: ${c.detail}`).join('\n'),
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'regression_r2_01.json'), {
  schema_version: '1.0.0',
  gate_id: 'RG_R2_01_NO_DAILY_WIRING',
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: NEXT_ACTION,
  checks,
  failed_checks: failed.map((c) => c.check),
});

console.log(`[${status}] regression_r2_01_no_daily_wiring — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
