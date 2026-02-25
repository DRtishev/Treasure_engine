import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';
import { runBounded } from '../executor/spawn_bounded.mjs';

const ROOT = path.resolve(process.cwd());
const EXEC_DIR = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC_DIR, 'gates/manual');
const NEXT_ACTION = 'npm run -s epoch:victory:seal';

const baselineMd = path.join(ROOT, 'reports/evidence/EXECUTOR/BASELINE_SAFETY.md');
const baselineJson = path.join(ROOT, 'reports/evidence/EXECUTOR/gates/manual/baseline_safety.json');
fs.mkdirSync(path.dirname(baselineMd), { recursive: true });
fs.mkdirSync(path.dirname(baselineJson), { recursive: true });

const prevMd = fs.existsSync(baselineMd) ? fs.readFileSync(baselineMd, 'utf8') : null;
const prevJson = fs.existsSync(baselineJson) ? fs.readFileSync(baselineJson, 'utf8') : null;

const marker = `RG_EVD01_${RUN_ID}`;
fs.writeFileSync(baselineMd, `# BASELINE_SAFETY.md\n\nMARKER: ${marker}\n`);
fs.writeFileSync(baselineJson, JSON.stringify({ schema_version: '1.0.0', marker }, null, 2));

const clean = runBounded('npm run -s executor:clean:baseline', { cwd: ROOT, env: process.env, timeoutMs: 120000, maxBuffer: 32 * 1024 * 1024 });

const mdAfter = fs.existsSync(baselineMd) ? fs.readFileSync(baselineMd, 'utf8') : '';
const jsonAfter = fs.existsSync(baselineJson) ? fs.readFileSync(baselineJson, 'utf8') : '';

const checks = {
  baseline_clean_ec0: clean.ec === 0,
  baseline_safety_md_preserved: fs.existsSync(baselineMd) && mdAfter.includes(marker),
  baseline_safety_json_preserved: fs.existsSync(baselineJson) && jsonAfter.includes(marker),
};

if (prevMd === null) fs.rmSync(baselineMd, { force: true }); else fs.writeFileSync(baselineMd, prevMd);
if (prevJson === null) fs.rmSync(baselineJson, { force: true }); else fs.writeFileSync(baselineJson, prevJson);

const ok = Object.values(checks).every(Boolean);
const status = ok ? 'PASS' : 'FAIL';
const reason_code = ok ? 'NONE' : 'RG_EVD01';

writeMd(path.join(EXEC_DIR, 'REGRESSION_BASELINE_PRESERVE_CRITICAL_RECEIPTS.md'), `# REGRESSION_BASELINE_PRESERVE_CRITICAL_RECEIPTS.md\n\nSTATUS: ${status}\nREASON_CODE: ${reason_code}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${NEXT_ACTION}\n\n${Object.entries(checks).map(([k, v]) => `- ${k}: ${v}`).join('\n')}\n`);
writeJsonDeterministic(path.join(MANUAL, 'regression_baseline_preserve_critical_receipts.json'), {
  schema_version: '1.0.0',
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: NEXT_ACTION,
  checks,
});
console.log(`[${status}] regression_baseline_preserve_critical_receipts — ${reason_code}`);
process.exit(ok ? 0 : 1);
