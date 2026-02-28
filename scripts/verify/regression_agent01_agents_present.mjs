/**
 * regression_agent01_agents_present.mjs — RG_AGENT01_AGENTS_PRESENT
 *
 * Gate: AGENTS.md must exist at repo root AND contain SSOT markers.
 * Surface: UX
 */

import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

const NEXT_ACTION = 'npm run -s verify:fast';

const agentsPath = path.join(ROOT, 'AGENTS.md');
const claudePath = path.join(ROOT, 'CLAUDE.md');
const runbookPath = path.join(ROOT, 'docs', 'AI_RUNBOOK.md');

const checks = [];

// Check 1: AGENTS.md exists
const agentsExists = fs.existsSync(agentsPath);
checks.push({ check: 'agents_md_exists', pass: agentsExists, detail: agentsPath });

// Check 2: AGENTS.md contains SSOT marker
let agentsSsotOk = false;
if (agentsExists) {
  const content = fs.readFileSync(agentsPath, 'utf8');
  agentsSsotOk = content.includes('SSOT') || content.includes('Single source of truth') || content.includes('Agent OS SSOT');
}
checks.push({ check: 'agents_md_has_ssot_marker', pass: agentsSsotOk, detail: 'SSOT or Agent OS SSOT marker required' });

// Check 3: CLAUDE.md exists
const claudeExists = fs.existsSync(claudePath);
checks.push({ check: 'claude_md_exists', pass: claudeExists, detail: claudePath });

// Check 4: CLAUDE.md links to AGENTS.md
let claudeLinksOk = false;
if (claudeExists) {
  const content = fs.readFileSync(claudePath, 'utf8');
  claudeLinksOk = content.includes('AGENTS.md') || content.includes('AGENTS');
}
checks.push({ check: 'claude_md_links_to_agents', pass: claudeLinksOk, detail: 'CLAUDE.md must reference AGENTS.md' });

// Check 5: docs/AI_RUNBOOK.md exists
const runbookExists = fs.existsSync(runbookPath);
checks.push({ check: 'ai_runbook_exists', pass: runbookExists, detail: runbookPath });

const failed = checks.filter((c) => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'AGENT01_MISSING';

const mdContent = [
  '# REGRESSION_AGENT01_AGENTS_PRESENT.md',
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
  failed.length === 0 ? '- NONE' : failed.map((c) => `- ${c.check}`).join('\n'),
].join('\n');

writeMd(path.join(EXEC, 'REGRESSION_AGENT01_AGENTS_PRESENT.md'), mdContent);

writeJsonDeterministic(path.join(MANUAL, 'regression_agent01_agents_present.json'), {
  schema_version: '1.0.0',
  gate_id: 'RG_AGENT01_AGENTS_PRESENT',
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: NEXT_ACTION,
  checks,
  failed_checks: failed.map((c) => c.check),
});

console.log(`[${status}] regression_agent01_agents_present — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
