#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

let cachedBase = null;

export function ensureRunBaseDir() {
  if (cachedBase) return cachedBase;
  cachedBase = process.env.TREASURE_RUN_DIR && process.env.TREASURE_RUN_DIR.trim()
    ? path.resolve(process.env.TREASURE_RUN_DIR.trim())
    : fs.mkdtempSync(path.join(os.tmpdir(), 'treasure-run-'));
  fs.mkdirSync(cachedBase, { recursive: true });
  process.env.TREASURE_RUN_DIR = cachedBase;
  return cachedBase;
}

export function ensureRunDir(scope = 'default') {
  const dir = path.join(ensureRunBaseDir(), scope);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function resolveRunPath(scope, ...parts) {
  return path.join(ensureRunDir(scope), ...parts);
}
