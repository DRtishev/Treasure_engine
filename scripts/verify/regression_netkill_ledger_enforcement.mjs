import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
const ledgerPath = path.join(EXEC, 'NETKILL_LEDGER.json');
fs.mkdirSync(MANUAL, { recursive: true });

if (!fs.existsSync(ledgerPath)) {
  console.error('[FAIL] RG_NET02 missing NETKILL_LEDGER.json');
  process.exit(1);
}
const allow = ['npm ci --omit=optional'];
const data = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
const bad = [];
for (const r of data.records || []) {
  const cmd = String(r.cmd || '');
  const auth = /(verify|proof|gov|victory|foundation|mega)/i.test(cmd);
  if (!auth) continue;
  const allowlisted = allow.some((x) => cmd.includes(x));
  if (!allowlisted && r.force_net_kill !== true) bad.push({ index: r.index, cmd, force_net_kill: r.force_net_kill });
}
const ok = bad.length === 0;
const status = ok ? 'PASS' : 'FAIL';
const reason = ok ? 'NONE' : 'RG_NET02';
writeMd(path.join(EXEC, 'REGRESSION_NETKILL_LEDGER_ENFORCEMENT.md'), `# REGRESSION_NETKILL_LEDGER_ENFORCEMENT.md\n\nSTATUS: ${status}\nREASON_CODE: ${reason}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: npm run -s verify:regression:netkill-ledger-enforcement\n\n${bad.map((b) => `- bad_index=${b.index} force_net_kill=${b.force_net_kill} cmd=${b.cmd}`).join('\n') || '- bad: NONE'}\n`);
writeJsonDeterministic(path.join(MANUAL, 'regression_netkill_ledger_enforcement.json'), { schema_version: '1.0.0', status, reason_code: reason, run_id: RUN_ID, bad });
console.log(`[${status}] regression_netkill_ledger_enforcement — ${reason}`);
process.exit(ok ? 0 : 1);
