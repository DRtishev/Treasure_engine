#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const src = process.argv[2];
if (!src) throw new Error('usage: node scripts/fuel_pump/import_capsule.mjs <capsule_dir>');
const manifestPath = path.join(src, 'manifest.json');
const dataPath = path.join(src, 'capsule.jsonl');
const m = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const blob = fs.readFileSync(dataPath);
const actual = crypto.createHash('sha256').update(blob).digest('hex');
const expected = m?.files?.find((x) => x.path === 'capsule.jsonl')?.sha256;
if (!expected || expected !== actual) throw new Error('E131_CAPSULE_HASH_MISMATCH');
const runDir = path.resolve(process.env.TREASURE_RUN_DIR || '.run/treasure/E131_1700000000', 'e131_capsule');
fs.mkdirSync(runDir, { recursive: true });
fs.copyFileSync(manifestPath, path.join(runDir, 'manifest.json'));
fs.copyFileSync(dataPath, path.join(runDir, 'capsule.jsonl'));
console.log(`import_ok run_dir=${runDir}`);
