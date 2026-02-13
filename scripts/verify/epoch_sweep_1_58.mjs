#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ledger = JSON.parse(fs.readFileSync('specs/epochs/LEDGER.json', 'utf8')).epochs;
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const scripts = pkg.scripts || {};
const errors = [];
const report = { legacy: [], done: [] };

for (let i = 1; i <= 58; i += 1) {
  const id = `EPOCH-${String(i).padStart(2, '0')}`;
  const row = ledger[String(i)];
  if (!row) {
    errors.push(`${id} missing in ledger`);
    continue;
  }
  if (i <= 16) {
    if (row.stage !== 'LEGACY_DONE') errors.push(`${id} must be LEGACY_DONE`);
    if (row.evidence_root && !row.evidence_root.includes('archive') && !row.evidence_root.includes('EPOCH-30-CLOSEOUT-STRONG')) {
      errors.push(`${id} legacy evidence_root should be archived path`);
    }
    report.legacy.push({ id, stage: row.stage, evidence_root: row.evidence_root || null });
    continue;
  }

  if (row.stage !== 'DONE') errors.push(`${id} must be DONE`);
  if (!row.evidence_root) errors.push(`${id} missing evidence_root`);
  const root = row.evidence_root || `reports/evidence/${id}/`;
  const indexPath = path.join(root, 'pack_index.json');
  if (!fs.existsSync(indexPath)) errors.push(`${id} missing pack_index.json`);
  const scriptName = `verify:epoch${i}`;
  const verifierExists = Boolean(scripts[scriptName]);
  if (!verifierExists) {
    const specPath = path.join('specs/epochs', `${id}.md`);
    const spec = fs.existsSync(specPath) ? fs.readFileSync(specPath, 'utf8') : '';
    if (!/fallback verifier/i.test(spec)) errors.push(`${id} missing verifier script and fallback verifier note`);
  }
  report.done.push({ id, evidence_root: row.evidence_root, verifier: verifierExists ? scriptName : 'fallback' });
}

const outDir = path.resolve('reports/evidence/EPOCH-59/gates/manual');
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, 'epoch_sweep_report.json');
fs.writeFileSync(outPath, `${JSON.stringify({ ok: errors.length === 0, errors, report }, null, 2)}\n`);

if (errors.length) {
  console.error('verify:epochs:sweep FAILED');
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}
console.log(`verify:epochs:sweep PASSED report=${path.relative(process.cwd(), outPath)}`);
