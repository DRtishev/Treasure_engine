/**
 * regression_agent02_claude_md_drift.mjs — RG_AGENT02_CLAUDE_MD_DRIFT
 *
 * Gate: CLAUDE.md must not duplicate AGENTS.md rules (drift detection).
 *       CLAUDE.md must be an exec summary only, linking to AGENTS.md.
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

const checks = [];
const driftSignals = [];

// Check 1: Both files exist (prerequisite)
const agentsExists = fs.existsSync(agentsPath);
const claudeExists = fs.existsSync(claudePath);
checks.push({ check: 'agents_md_exists_prereq', pass: agentsExists, detail: 'AGENTS.md required for drift check' });
checks.push({ check: 'claude_md_exists_prereq', pass: claudeExists, detail: 'CLAUDE.md required for drift check' });

if (agentsExists && claudeExists) {
  const agentsContent = fs.readFileSync(agentsPath, 'utf8');
  const claudeContent = fs.readFileSync(claudePath, 'utf8');

  // Check 2: CLAUDE.md links to AGENTS.md (summary pattern)
  const hasLink = claudeContent.includes('AGENTS.md') || claudeContent.includes('./AGENTS');
  checks.push({ check: 'claude_links_to_agents', pass: hasLink, detail: 'CLAUDE.md must reference/link to AGENTS.md' });

  // Check 3: CLAUDE.md is shorter than AGENTS.md (exec summary must be leaner)
  const claudeLines = claudeContent.split('\n').length;
  const agentsLines = agentsContent.split('\n').length;
  const isShorter = claudeLines < agentsLines;
  checks.push({
    check: 'claude_shorter_than_agents',
    pass: isShorter,
    detail: `claude_lines=${claudeLines} agents_lines=${agentsLines} (CLAUDE.md must be exec summary)`,
  });

  // Check 4: CLAUDE.md does not contain full rule tables (duplication detection)
  // Drift signal: CLAUDE.md should not reproduce the full rule table from AGENTS.md
  const agentsRuleLines = agentsContent.split('\n').filter((l) => /^\| R\d+/.test(l));
  const claudeRuleLines = claudeContent.split('\n').filter((l) => /^\| R\d+/.test(l));
  const duplicatedRules = claudeRuleLines.filter((line) => agentsRuleLines.includes(line));

  if (duplicatedRules.length > 3) {
    driftSignals.push(`duplicated_rule_table_lines=${duplicatedRules.length}`);
  }
  checks.push({
    check: 'claude_no_full_rule_duplication',
    pass: duplicatedRules.length <= 3,
    detail: `duplicated_rule_lines=${duplicatedRules.length} (max=3)`,
  });

  // Check 5: CLAUDE.md must contain ONE_NEXT_ACTION
  const hasNextAction = claudeContent.includes('ONE NEXT ACTION') || claudeContent.includes('npm run') || claudeContent.includes('verify:fast');
  checks.push({ check: 'claude_has_next_action', pass: hasNextAction, detail: 'CLAUDE.md must include ONE_NEXT_ACTION' });
}

const failed = checks.filter((c) => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'AGENT02_CLAUDE_MD_DRIFT';

const mdContent = [
  '# REGRESSION_AGENT02_CLAUDE_MD_DRIFT.md',
  '',
  `STATUS: ${status}`,
  `REASON_CODE: ${reason_code}`,
  `RUN_ID: ${RUN_ID}`,
  `NEXT_ACTION: ${NEXT_ACTION}`,
  '',
  '## CHECKS',
  checks.map((c) => `- [${c.pass ? 'PASS' : 'FAIL'}] ${c.check}: ${c.detail}`).join('\n'),
  '',
  '## DRIFT_SIGNALS',
  driftSignals.length === 0 ? '- NONE' : driftSignals.map((s) => `- ${s}`).join('\n'),
  '',
  '## FAILED',
  failed.length === 0 ? '- NONE' : failed.map((c) => `- ${c.check}: ${c.detail}`).join('\n'),
].join('\n');

writeMd(path.join(EXEC, 'REGRESSION_AGENT02_CLAUDE_MD_DRIFT.md'), mdContent);

writeJsonDeterministic(path.join(MANUAL, 'regression_agent02_claude_md_drift.json'), {
  schema_version: '1.0.0',
  gate_id: 'RG_AGENT02_CLAUDE_MD_DRIFT',
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: NEXT_ACTION,
  checks,
  drift_signals: driftSignals,
  failed_checks: failed.map((c) => c.check),
});

console.log(`[${status}] regression_agent02_claude_md_drift — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
