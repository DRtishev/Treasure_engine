import fs from 'node:fs';
import path from 'node:path';
import { sortKeysRecursive } from '../../../lib/write_json_deterministic.mjs';

export function writeDeterministicJson(filePath, data) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  const sorted = sortKeysRecursive(data);
  fs.writeFileSync(filePath, `${JSON.stringify(sorted, null, 2)}\n`);
}

export function readJson(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}
