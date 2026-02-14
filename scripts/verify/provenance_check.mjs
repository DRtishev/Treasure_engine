#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';

const args = process.argv.slice(2);
const [aPath = 'truth/PROVENANCE.json', bPath] = args;
const required = ['schema_version', 'buildType', 'commit_sha', 'node', 'npm', 'materials', 'outputs'];
const sha = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');

function load(file) {
  const doc = JSON.parse(fs.readFileSync(file, 'utf8'));
  const errors = [];
  for (const k of required) if (!(k in doc)) errors.push(`missing ${k}`);
  for (const m of doc.materials || []) {
    if (!fs.existsSync(m.path)) { errors.push(`material missing ${m.path}`); continue; }
    if (sha(m.path) !== m.sha256) errors.push(`material sha mismatch ${m.path}`);
  }
  for (const o of doc.outputs || []) {
    if (!fs.existsSync(o.path)) { errors.push(`output missing ${o.path}`); continue; }
    if (sha(o.path) !== o.sha256) errors.push(`output sha mismatch ${o.path}`);
  }
  return { doc, errors };
}

const a = load(aPath);
const errors = [...a.errors];
if (bPath) {
  const b = load(bPath);
  errors.push(...b.errors);
  const normalize = (d) => {
    const x = structuredClone(d);
    for (const m of x.materials || []) delete m.run_dir;
    for (const o of x.outputs || []) delete o.run_dir;
    return JSON.stringify(x);
  };
  if (normalize(a.doc) !== normalize(b.doc)) errors.push('normalized provenance mismatch run1/run2');
}

if (errors.length) {
  console.error('verify:provenance FAILED');
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}
console.log('verify:provenance PASSED');
