import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';

const ROOT = path.resolve(process.cwd());
const GOV_DIR = path.join(ROOT, 'reports', 'evidence', 'GOV');
const MANUAL_DIR = path.join(GOV_DIR, 'gates', 'manual');
const NEXT_ACTION = 'npm run -s epoch:profit:real:00';

fs.mkdirSync(MANUAL_DIR, { recursive: true });

function readJson(rel) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) return null;
  return JSON.parse(fs.readFileSync(abs, 'utf8'));
}

function mdStatus(rel) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) return 'MISSING';
  const text = fs.readFileSync(abs, 'utf8');
  return (text.match(/^STATUS:\s*(\S+)\s*$/m)?.[1] || 'MISSING').toUpperCase();
}

function sha256File(rel) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) return '';
  return crypto.createHash('sha256').update(fs.readFileSync(abs)).digest('hex');
}

const ingest = readJson('reports/evidence/EDGE_PROFIT_00/real/gates/manual/paper_evidence_ingest.json');
const expectancy = readJson('reports/evidence/EDGE_PROFIT_00/real/gates/manual/expectancy_proof.json');
const pbo = readJson('reports/evidence/EDGE_PROFIT_00/real/gates/manual/pbo_cpcv.json');
const risk = readJson('reports/evidence/EDGE_PROFIT_00/real/gates/manual/risk_mcdd.json');
const proofEnvelopeStatus = mdStatus('reports/evidence/EDGE_PROFIT_00/real/PROOF_ENVELOPE_INDEX.md');
const regressionStub = readJson('reports/evidence/EDGE_PROFIT_00/registry/gates/manual/regression_no_stub_promotion.json');
const regressionSandbox = readJson('reports/evidence/EDGE_PROFIT_00/registry/gates/manual/regression_no_sandbox_promotion.json');
const lockdown = readJson('reports/evidence/GOV/gates/manual/system_lockdown_cert.json');

let status = 'PASS';
let reasonCode = 'NONE';
let message = 'PROFIT_READY cert verified for REAL evidence source.';

if (!lockdown || String(lockdown.status || '').toUpperCase() !== 'PASS') {
  status = 'BLOCKED';
  reasonCode = 'SL01';
  message = 'SYSTEM_LOCKDOWN_CERT is missing or not PASS.';
} else if (!ingest) {
  status = 'BLOCKED';
  reasonCode = 'ME01';
  message = 'Missing REAL ingest gate output.';
} else if (!new Set(['REAL', 'REAL_PUBLIC']).has(String(ingest.evidence_source || '').toUpperCase())) {
  status = 'NEEDS_DATA';
  reasonCode = 'EP02_REAL_REQUIRED';
  message = `Ingest evidence_source must be REAL/REAL_PUBLIC, got ${ingest.evidence_source || 'UNKNOWN'}.`;
}

const proofs = [
  ['expectancy_proof', expectancy],
  ['pbo_cpcv', pbo],
  ['risk_mcdd', risk],
];

if (status === 'PASS') {
  for (const [name, gate] of proofs) {
    if (!gate) {
      status = 'BLOCKED';
      reasonCode = 'ME01';
      message = `Missing proof gate: ${name}.`;
      break;
    }
    const s = String(gate.status || 'MISSING').toUpperCase();
    if (s !== 'PASS') {
      status = 'FAIL';
      reasonCode = String(gate.reason_code || 'ME01');
      message = `Proof gate ${name} is ${s}.`;
      break;
    }
  }
}

if (status === 'PASS' && proofEnvelopeStatus !== 'PASS') {
  status = 'BLOCKED';
  reasonCode = 'ME01';
  message = `PROOF_ENVELOPE_INDEX status is ${proofEnvelopeStatus}.`;
}

if (status === 'PASS' && (!regressionStub || String(regressionStub.status || '').toUpperCase() !== 'PASS')) {
  status = 'FAIL';
  reasonCode = String(regressionStub?.reason_code || 'ME01');
  message = 'Regression gate no-stub-promotion is not PASS.';
}

if (status === 'PASS' && (!regressionSandbox || String(regressionSandbox.status || '').toUpperCase() !== 'PASS')) {
  status = 'FAIL';
  reasonCode = String(regressionSandbox?.reason_code || 'ME01');
  message = 'Regression gate no-sandbox-promotion is not PASS.';
}

const lockdownHash = sha256File('reports/evidence/GOV/SYSTEM_LOCKDOWN_CERT.md');

writeMd(path.join(GOV_DIR, 'PROFIT_READY_CERT.md'), `# PROFIT_READY_CERT.md\n\nSTATUS: ${status}\nREASON_CODE: ${reasonCode}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${NEXT_ACTION}\n\n- lockdown_cert_sha256: ${lockdownHash || 'MISSING'}\n- ingest_evidence_source: ${ingest?.evidence_source || 'MISSING'}\n- proof_envelope_status: ${proofEnvelopeStatus}\n- expectancy_status: ${expectancy?.status || 'MISSING'}\n- pbo_status: ${pbo?.status || 'MISSING'}\n- risk_status: ${risk?.status || 'MISSING'}\n- regression_stub_status: ${regressionStub?.status || 'MISSING'}\n- regression_sandbox_status: ${regressionSandbox?.status || 'MISSING'}\n`);

writeJsonDeterministic(path.join(MANUAL_DIR, 'profit_ready_cert.json'), {
  schema_version: '1.0.0',
  status,
  reason_code: reasonCode,
  run_id: RUN_ID,
  message,
  next_action: NEXT_ACTION,
  lockdown_cert_sha256: lockdownHash || null,
  ingest_evidence_source: ingest?.evidence_source || null,
  proof_envelope_status: proofEnvelopeStatus,
  expectancy_status: expectancy?.status || 'MISSING',
  pbo_status: pbo?.status || 'MISSING',
  risk_status: risk?.status || 'MISSING',
  regression_stub_status: regressionStub?.status || 'MISSING',
  regression_sandbox_status: regressionSandbox?.status || 'MISSING',
});

console.log(`[${status}] profit_ready_cert_gate — ${reasonCode}`);
process.exit(status === 'PASS' ? 0 : 1);
