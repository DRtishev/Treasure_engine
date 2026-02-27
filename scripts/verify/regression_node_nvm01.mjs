import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = path.resolve(process.cwd());
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
const NEXT_ACTION = 'npm run -s epoch:victory:seal';
fs.mkdirSync(MANUAL, { recursive: true });

const bannedPatterns = ['nvm.sh', 'nvm install', 'nvm use'];
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const scripts = pkg.scripts || {};

const authoritativeScriptName = (name) => (
  name.startsWith('epoch:')
  || name.startsWith('_epoch:')
  || name.startsWith('verify:')
  || name.startsWith('_verify:')
  || name.startsWith('executor:')
  || name.startsWith('ops:')
);

const offenders = Object.entries(scripts)
  .filter(([name]) => authoritativeScriptName(name))
  .map(([name, cmd]) => {
    const hits = bannedPatterns.filter((pattern) => String(cmd).includes(pattern));
    return { name, cmd: String(cmd), hits };
  })
  .filter((entry) => entry.hits.length > 0)
  .sort((a, b) => a.name.localeCompare(b.name));

const status = offenders.length === 0 ? 'PASS' : 'BLOCKED';
const reason_code = offenders.length === 0 ? 'NONE' : 'RG_NODE_NVM01';

writeMd(path.join(EXEC, 'REGRESSION_NODE_NVM01.md'), `# REGRESSION_NODE_NVM01.md\n\nSTATUS: ${status}\nREASON_CODE: ${reason_code}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${NEXT_ACTION}\n\n- authoritative_scripts_scanned_n: ${Object.keys(scripts).filter(authoritativeScriptName).length}\n- offenders_n: ${offenders.length}\n\n## OFFENDERS\n${offenders.map((entry) => `- ${entry.name}: hits=${entry.hits.join(',')}`).join('\n') || '- none'}\n`);

writeJsonDeterministic(path.join(MANUAL, 'regression_node_nvm01.json'), {
  schema_version: '1.0.0',
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: NEXT_ACTION,
  authoritative_scripts_scanned_n: Object.keys(scripts).filter(authoritativeScriptName).length,
  banned_patterns: bannedPatterns,
  offenders,
});

console.log(`[${status}] regression_node_nvm01 — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
