#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const manifest = JSON.parse(fs.readFileSync('specs/repo/REPO_MANIFEST.json', 'utf8'));
const entryCfg = JSON.parse(fs.readFileSync('specs/truth/ENTRYPOINTS.json', 'utf8'));

const verifyEntrypoints = fs.readdirSync('scripts/verify').filter((f) => f.endsWith('.mjs')).map((f) => `scripts/verify/${f}`);
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const scriptEntrypoints = [];
for (const cmd of Object.values(pkg.scripts || {})) {
  for (const m of String(cmd).matchAll(/node\s+([\w./-]+\.m?js)/g)) scriptEntrypoints.push(m[1]);
  for (const m of String(cmd).matchAll(/bash\s+([\w./-]+\.sh)/g)) scriptEntrypoints.push(m[1]);
}
const roots = new Set(['core/edge/runtime.mjs', ...verifyEntrypoints, ...scriptEntrypoints, ...(entryCfg.entrypoints || [])]);

const activeFiles = (manifest.files || []).filter((r) => r.classification === 'ACTIVE').map((r) => r.path);
const moduleFiles = new Set(activeFiles.filter((p) => /\.(mjs|js)$/.test(p) && !p.startsWith('archive/') && !p.startsWith('artifacts/')));

function resolveImport(fromFile, spec) {
  if (!spec.startsWith('.')) return null;
  const base = path.posix.normalize(path.posix.join(path.posix.dirname(fromFile), spec));
  const tries = [base, `${base}.mjs`, `${base}.js`, path.posix.join(base, 'index.mjs'), path.posix.join(base, 'index.js')];
  for (const t of tries) if (moduleFiles.has(t) || fs.existsSync(t)) return t;
  return null;
}

function parseImports(file) {
  const text = fs.readFileSync(file, 'utf8');
  const out = [];
  const re = /(?:import\s+[^'";]+?from\s+|import\s*\(\s*|export\s+[^'";]+?from\s+|import\s+)(['"])([^'"]+)\1/g;
  for (const m of text.matchAll(re)) {
    const r = resolveImport(file, m[2]);
    if (r) out.push(r);
  }
  return out;
}

const reachable = new Set();
const stack = [...roots].filter((r) => moduleFiles.has(r) || fs.existsSync(r));
while (stack.length) {
  const cur = stack.pop();
  if (reachable.has(cur)) continue;
  reachable.add(cur);
  if (!fs.existsSync(cur) || !/\.(mjs|js)$/.test(cur)) continue;
  for (const dep of parseImports(cur)) if (!reachable.has(dep)) stack.push(dep);
}

const allow = new Map((entryCfg.active_unreachable_allowlist || []).map((x) => [x.path, x.reason]));
const activeUnreachable = [];
const allowedUnreachable = [];

for (const f of activeFiles) {
  if (!moduleFiles.has(f)) {
    if (allow.has(f)) allowedUnreachable.push({ path: f, reason: allow.get(f) });
    continue;
  }
  if (!reachable.has(f)) {
    if (allow.has(f)) allowedUnreachable.push({ path: f, reason: allow.get(f) });
    else activeUnreachable.push(f);
  }
}

const report = {
  roots: [...roots].sort(),
  active_files: activeFiles.length,
  module_files: moduleFiles.size,
  reachable_modules: reachable.size,
  active_unreachable_count: activeUnreachable.length,
  active_unreachable: activeUnreachable.sort(),
  active_unreachable_allowlisted: allowedUnreachable.sort((a, b) => a.path.localeCompare(b.path))
};

fs.mkdirSync('reports/truth', { recursive: true });
fs.writeFileSync('reports/truth/reachability_report.json', `${JSON.stringify(report, null, 2)}\n`);

if (activeUnreachable.length) {
  console.error('verify:reachability FAILED');
  for (const f of activeUnreachable) console.error(`- ACTIVE unreachable: ${f}`);
  process.exit(1);
}

console.log('verify:reachability PASSED');
console.log(JSON.stringify({ active_unreachable_count: 0, reachable_modules: reachable.size }, null, 2));
