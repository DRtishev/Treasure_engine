import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';

const ROOT = path.resolve(process.cwd());
const GOV_DIR = path.join(ROOT, 'reports', 'evidence', 'GOV');
const MANUAL_DIR = path.join(GOV_DIR, 'gates', 'manual');
const NEXT_ACTION = 'npm run -s epoch:mega:proof:x2';
const VERIFY_MODE = (process.env.VERIFY_MODE || 'GIT').toUpperCase();

fs.mkdirSync(MANUAL_DIR, { recursive: true });

function sha256File(abs) {
  const raw = fs.readFileSync(abs);
  return crypto.createHash('sha256').update(raw).digest('hex');
}

function parseStatusFromMd(abs) {
  const text = fs.readFileSync(abs, 'utf8');
  const m = text.match(/^STATUS:\s*(\S+)\s*$/m);
  return m ? m[1].trim().toUpperCase() : 'MISSING';
}

function parseMegaFingerprint(abs) {
  const text = fs.readFileSync(abs, 'utf8');
  const m = text.match(/^- aggregate_run_1:\s*([a-f0-9]{64})\s*$/m);
  return m ? m[1] : '';
}

function readJsonStatus(abs) {
  const data = JSON.parse(fs.readFileSync(abs, 'utf8'));
  return String(data.status || 'MISSING').toUpperCase();
}

const inputs = [
  ['reports/evidence/EXECUTOR/MEGA_PROOF_X2.md', 'md'],
  ['reports/evidence/EXECUTOR/gates/manual/mega_proof_x2.json', 'json'],
  ['reports/evidence/EXECUTOR/COMMANDS_RUN.md', 'md'],
  ['reports/evidence/EXECUTOR/COMMANDS_RUN_GUARD.md', 'md'],
  ['reports/evidence/EXECUTOR/gates/manual/commands_run_guard.json', 'json'],
  ['reports/evidence/GOV/EXPORT_CONTRACT_INTEGRITY.md', 'md'],
  ['reports/evidence/GOV/gates/manual/export_contract_integrity.json', 'json'],
  ['reports/evidence/GOV/EXPORT_CONTRACT_RECEIPT_GUARD.md', 'md'],
  ['reports/evidence/GOV/FINAL_VALIDATED_FINGERPRINT.md', 'md'],
  ['reports/evidence/GOV/gates/manual/final_validated_fingerprint.json', 'json'],
  ['reports/evidence/EDGE_PROFIT_00/registry/SCOPE_GUARD.md', 'md'],
  ['reports/evidence/EDGE_PROFIT_00/registry/gates/manual/scope_guard.json', 'json'],
  ['reports/evidence/EDGE_PROFIT_00/registry/RELEASE_ARTIFACTS.md', 'md'],
  ['reports/evidence/EDGE_PROFIT_00/registry/gates/manual/release_artifacts.json', 'json'],
  ['reports/evidence/EDGE_PROFIT_00/registry/REGRESSION_PROFILE_SOURCE_MISMATCH.md', 'md'],
  ['reports/evidence/EDGE_PROFIT_00/registry/gates/manual/regression_profile_source_mismatch.json', 'json'],
  ['reports/evidence/EDGE_PROFIT_00/registry/REGRESSION_NO_STUB_PROMOTION.md', 'md'],
  ['reports/evidence/EDGE_PROFIT_00/registry/gates/manual/regression_no_stub_promotion.json', 'json'],
  ['reports/evidence/EDGE_PROFIT_00/registry/REGRESSION_NO_SANDBOX_PROMOTION.md', 'md'],
  ['reports/evidence/EDGE_PROFIT_00/registry/gates/manual/regression_no_sandbox_promotion.json', 'json'],
];

const inputHashes = [];
const diagnostics = [];
let status = 'PASS';
let reasonCode = 'NONE';
let message = 'SYSTEM_LOCKDOWN cert verified; all prerequisite evidence is PASS.';

for (const [rel, kind] of inputs) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) {
    status = 'BLOCKED';
    reasonCode = 'SL01';
    message = `Missing required evidence input: ${rel}`;
    diagnostics.push(`missing:${rel}`);
    continue;
  }
  inputHashes.push({ path: rel, sha256_raw: sha256File(abs) });
  const gateStatus = kind === 'json' ? readJsonStatus(abs) : parseStatusFromMd(abs);
  if (gateStatus !== 'PASS' && status === 'PASS') {
    status = 'FAIL';
    reasonCode = 'SL02';
    message = `Required evidence is not PASS: ${rel} status=${gateStatus}`;
  }
  diagnostics.push(`status:${rel}:${gateStatus}`);
}

const contractPath = path.join(ROOT, 'GOV', 'EXPORT_CONTRACT.md');
const receiptPath = path.join(ROOT, 'GOV', 'EXPORT_CONTRACT_RECEIPT.md');
const contractSha256 = fs.existsSync(contractPath) ? sha256File(contractPath) : '';
const receiptSha256 = fs.existsSync(receiptPath) ? sha256File(receiptPath) : '';
const finalFingerprintPath = path.join(ROOT, 'reports', 'evidence', 'GOV', 'FINAL_VALIDATED_FINGERPRINT.md');
const finalValidatedSha256 = fs.existsSync(finalFingerprintPath) ? sha256File(finalFingerprintPath) : '';
const megaPath = path.join(ROOT, 'reports', 'evidence', 'EXECUTOR', 'MEGA_PROOF_X2.md');
const megaX2Fingerprint = fs.existsSync(megaPath) ? parseMegaFingerprint(megaPath) : '';

if (status !== 'PASS' && reasonCode === 'NONE') reasonCode = 'SL02';

writeMd(path.join(GOV_DIR, 'SYSTEM_LOCKDOWN_CERT.md'), `# SYSTEM_LOCKDOWN_CERT.md\n\nSTATUS: ${status}\nREASON_CODE: ${reasonCode}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${NEXT_ACTION}\n\n- verify_mode: ${VERIFY_MODE}\n- node_version: ${process.version}\n- run_id: ${RUN_ID}\n- contract_sha256: ${contractSha256 || 'MISSING'}\n- receipt_sha256: ${receiptSha256 || 'MISSING'}\n- mega_x2_fingerprint: ${megaX2Fingerprint || 'MISSING'}\n- final_validated_sha256: ${finalValidatedSha256 || 'MISSING'}\n\n## REQUIRED_INPUTS_SHA256_RAW\n\n${inputHashes.map((x) => `- ${x.path}: ${x.sha256_raw}`).join('\n') || '- NONE'}\n\n## DIAGNOSTICS\n\n${diagnostics.map((d) => `- ${d}`).join('\n') || '- NONE'}\n`);

writeJsonDeterministic(path.join(MANUAL_DIR, 'system_lockdown_cert.json'), {
  schema_version: '1.0.0',
  status,
  reason_code: reasonCode,
  run_id: RUN_ID,
  message,
  next_action: NEXT_ACTION,
  verify_mode: VERIFY_MODE,
  node_version: process.version,
  contract_sha256: contractSha256 || null,
  receipt_sha256: receiptSha256 || null,
  mega_x2_fingerprint: megaX2Fingerprint || null,
  final_validated_sha256: finalValidatedSha256 || null,
  required_inputs: inputHashes,
  diagnostics,
});

console.log(`[${status}] system_lockdown_cert_gate — ${reasonCode}`);
process.exit(status === 'PASS' ? 0 : 1);
