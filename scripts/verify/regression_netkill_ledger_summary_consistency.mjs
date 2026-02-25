import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = path.resolve(process.cwd());
const EXEC_DIR = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC_DIR, 'gates/manual');
const NEXT_ACTION = 'npm run -s verify:regression:netkill-ledger-summary-consistency';
const ledgerPath = path.join(EXEC_DIR, 'NETKILL_LEDGER.json');
const summaryPath = path.join(EXEC_DIR, 'NETKILL_LEDGER_SUMMARY.json');

let status = 'FAIL';
let reason_code = 'RG_NET04';
let details = {
  ledger_exists: fs.existsSync(ledgerPath),
  summary_exists: fs.existsSync(summaryPath),
};
if (details.ledger_exists && details.summary_exists) {
  try {
    const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
    const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
    const records = Array.isArray(ledger.records) ? ledger.records : [];
    const verifyRecords = records.filter((r) => /npm run -s verify:/i.test(String(r.cmd || '')));
    const verifyForced = verifyRecords.filter((r) => Boolean(r.force_net_kill)).length;
    const preloadCount = records.filter((r) => Boolean(r.node_options_has_preload)).length;
    const anomalies = records.filter((r) => (
      (/npm run -s verify:/i.test(String(r.cmd || '')) && (!r.force_net_kill || !r.env_treasure_net_kill || !r.node_options_has_preload))
      || (r.force_net_kill && !/npm run -s verify:/i.test(String(r.cmd || '')))
    ));
    const semanticHash = crypto.createHash('sha256').update(JSON.stringify({ execution_mode: ledger.execution_mode || 'FULL', records })).digest('hex');

    details = {
      ...details,
      total_steps_match: Number(summary.total_steps) === records.length,
      verify_steps_forced_match: Number(summary.verify_steps_forced) === verifyForced,
      preload_verified_count_match: Number(summary.preload_verified_count) === preloadCount,
      anomalies_match: Array.isArray(summary.anomalies_detected) && summary.anomalies_detected.length === anomalies.length,
      ledger_semantic_hash_match: String(summary.ledger_semantic_hash || '') === semanticHash,
    };
    const ok = details.total_steps_match
      && details.verify_steps_forced_match
      && details.preload_verified_count_match
      && details.anomalies_match
      && details.ledger_semantic_hash_match;
    status = ok ? 'PASS' : 'FAIL';
    reason_code = ok ? 'NONE' : 'RG_NET04';
  } catch {
    details = { ...details, parse_error: true };
  }
}

writeMd(path.join(EXEC_DIR, 'REGRESSION_NETKILL_LEDGER_SUMMARY_CONSISTENCY.md'), `# REGRESSION_NETKILL_LEDGER_SUMMARY_CONSISTENCY.md\n\nSTATUS: ${status}\nREASON_CODE: ${reason_code}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${NEXT_ACTION}\n\n${Object.entries(details).map(([k,v]) => `- ${k}: ${v}`).join('\n')}\n`);
writeJsonDeterministic(path.join(MANUAL, 'regression_netkill_ledger_summary_consistency.json'), {
  schema_version: '1.0.0', status, reason_code, run_id: RUN_ID, next_action: NEXT_ACTION, ...details,
});
console.log(`[${status}] regression_netkill_ledger_summary_consistency — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
