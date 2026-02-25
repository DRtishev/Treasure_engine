import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = path.resolve(process.cwd());
const EXEC_DIR = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC_DIR, 'gates/manual');
const NEXT_ACTION = 'npm run -s export:evidence-bundle';
const doc = fs.readFileSync(path.join(ROOT, 'EDGE_LAB/EVIDENCE_BUNDLE_CONTRACT.md'), 'utf8');
const src = fs.readFileSync(path.join(ROOT, 'scripts/export/evidence_bundle.mjs'), 'utf8');
const portableSrc = fs.readFileSync(path.join(ROOT, 'scripts/export/evidence_bundle_portable.mjs'), 'utf8');
const checks = {
  doc_default_mode: doc.includes('Default mode behavior'),
  doc_portable_mode: doc.includes('Portable mode behavior'),
  doc_included_root: doc.includes('Included root'),
  doc_excluded_roots: doc.includes('Excluded roots/files'),
  tar_sort: src.includes('--sort=name'),
  tar_mtime: src.includes("--mtime='UTC 2020-01-01'"),
  tar_owner: src.includes('--owner=0') && src.includes('--group=0') && src.includes('--numeric-owner'),
  gzip_n: src.includes('gzip -n'),
  volatile_excluded: src.includes('EVIDENCE_BUNDLE_TOOLCHAIN_VOLATILE.md') && src.includes('exclude'),
  ec01_bdl01: src.includes('EC01_BDL01'),
  portable_doc_parity: doc.includes('Portable mode behavior') && portableSrc.includes('EVIDENCE_BUNDLE_PORTABLE') && portableSrc.includes('export:evidence-bundle'),
  portable_env_free: !portableSrc.includes('bash -lc') && !portableSrc.includes('source ~/.') && !portableSrc.includes('NODE_OPTIONS='),
};
const ok = Object.values(checks).every(Boolean);
const status = ok ? 'PASS' : 'FAIL';
const reason_code = ok ? 'NONE' : 'RG_EBC01';
writeMd(path.join(EXEC_DIR, 'REGRESSION_EVIDENCE_BUNDLE_CONTRACT_SSOT.md'), `# REGRESSION_EVIDENCE_BUNDLE_CONTRACT_SSOT.md\n\nSTATUS: ${status}\nREASON_CODE: ${reason_code}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${NEXT_ACTION}\n\n${Object.entries(checks).map(([k,v])=>`- ${k}: ${v}`).join('\n')}\n`);
writeJsonDeterministic(path.join(MANUAL, 'regression_evidence_bundle_contract_ssot.json'), { schema_version:'1.0.0', status, reason_code, run_id:RUN_ID, next_action:NEXT_ACTION, checks });
console.log(`[${status}] regression_evidence_bundle_contract_ssot — ${reason_code}`);
process.exit(ok ? 0 : 1);
