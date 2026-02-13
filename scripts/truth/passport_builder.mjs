#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';

function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function sha256(file) { return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'); }

const wow = readJson('specs/wow/WOW_LEDGER.json');
const ledger = readJson('specs/epochs/LEDGER.json');
const outDir = 'reports/truth/passports';
fs.mkdirSync(outDir, { recursive: true });

const shipped = (wow.items || []).filter((x) => x.status === 'SHIPPED');
const manifest = [];

for (const item of shipped) {
  const evidence = [];
  for (const epoch of item.integration.epochs) {
    const row = ledger.epochs?.[String(epoch)];
    const root = row?.evidence_root;
    if (!root) continue;
    const pack = readJson(`${root}pack_index.json`);
    const sumPath = `${root}SHA256SUMS.EVIDENCE`;
    const sumMap = new Map();
    if (fs.existsSync(sumPath)) {
      for (const line of fs.readFileSync(sumPath, 'utf8').split('\n')) {
        const m = line.match(/^([a-f0-9]{64})\s+\.\/(.+)$/);
        if (m) sumMap.set(m[2], m[1]);
      }
    }
    const packMap = new Map();
    for (const x of pack.gate_runs || []) packMap.set(x.path, x.sha256);
    for (const x of pack.artifacts || []) packMap.set(x.path, x.sha256);
    for (const [k, v] of Object.entries(pack.hashes || {})) packMap.set(k, v);

    for (const rel of item.integration.evidence_outputs) {
      const full = `${root}${rel}`;
      evidence.push({
        epoch,
        evidence_root: root,
        path: rel,
        sha256_pack_index: packMap.get(rel) || null,
        sha256_sums: sumMap.get(rel) || null,
        sha256_file: fs.existsSync(full) ? sha256(full) : null
      });
    }
  }

  const passport = {
    id: item.id,
    title: item.title,
    mechanism: item.mechanism,
    profit_hook: item.profit_hook,
    acceptance: item.acceptance,
    kill_criteria: item.kill_criteria,
    linked_epochs: item.integration.epochs,
    linked_gates: item.integration.gates,
    evidence
  };
  const outFile = `${outDir}/${item.id}.json`;
  fs.writeFileSync(outFile, `${JSON.stringify(passport, null, 2)}\n`);
  manifest.push({ id: item.id, file: outFile, sha256: sha256(outFile) });
}

fs.writeFileSync('reports/truth/passports_manifest.json', `${JSON.stringify({ generated_at: new Date().toISOString(), shipped_count: shipped.length, passports: manifest }, null, 2)}\n`);
console.log(`truth:passports generated ${manifest.length} passports`);
