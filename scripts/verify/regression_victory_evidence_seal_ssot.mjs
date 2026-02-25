import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = path.resolve(process.cwd());
const EXEC_DIR = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC_DIR, 'gates/manual');
const NEXT_ACTION = 'npm run -s epoch:victory:seal';

function fileHash(rel) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) return null;
  return crypto.createHash('sha256').update(fs.readFileSync(abs)).digest('hex');
}

const targets = {
  netkill_ledger: 'reports/evidence/EXECUTOR/NETKILL_LEDGER.json',
  victory_seal_json: 'reports/evidence/EXECUTOR/gates/manual/victory_seal.json',
  foundation_gate: 'reports/evidence/EXECUTOR/gates/manual/profit_foundation_freeze_gate.json',
  readiness_gate: 'reports/evidence/EXECUTOR/gates/manual/public_data_readiness_seal.json',
  evidence_tar_sha: 'artifacts/incoming/EVIDENCE_TAR.sha256',
};

const hashes = {};
const missing = [];
for (const [k, rel] of Object.entries(targets)) {
  const h = fileHash(rel);
  if (!h) missing.push(rel);
  hashes[k] = h;
}
const insufficient_evidence = missing.length > 0;
const sealPayload = JSON.stringify({ targets, hashes, insufficient_evidence });
const victory_evidence_seal = crypto.createHash('sha256').update(sealPayload).digest('hex');
const status = insufficient_evidence ? 'BLOCKED' : 'PASS';
const reason_code = insufficient_evidence ? 'RG_SEAL01' : 'NONE';

writeMd(path.join(EXEC_DIR, 'VICTORY_EVIDENCE_SEAL.md'), `# VICTORY_EVIDENCE_SEAL.md\n\nSTATUS: ${status}\nREASON_CODE: ${reason_code}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${NEXT_ACTION}\n\n- insufficient_evidence: ${insufficient_evidence}\n- victory_evidence_seal: ${victory_evidence_seal}\n${Object.entries(targets).map(([k,v])=>`- ${k}: ${v} | sha256=${hashes[k] || 'MISSING'}`).join('\n')}\n`);
writeJsonDeterministic(path.join(MANUAL, 'victory_evidence_seal.json'), { schema_version:'1.0.0', status, reason_code, run_id:RUN_ID, next_action:NEXT_ACTION, insufficient_evidence, missing, targets, hashes, victory_evidence_seal });
console.log(`[${status}] regression_victory_evidence_seal_ssot — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
