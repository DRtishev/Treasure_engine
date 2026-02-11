#!/usr/bin/env node
import { execSync } from 'node:child_process';
import fs from 'node:fs';

const zipName = 'FINAL_VALIDATED.zip';
const shaName = 'FINAL_VALIDATED.zip.sha256';

if (fs.existsSync(zipName)) fs.unlinkSync(zipName);

const excludes = [
  '.git/*',
  'node_modules/*',
  'logs/*',
  'reports/runs/*',
  'artifacts/incoming/*',
  '.cache/*',
  'tmp/*',
  'temp/*',
  '*.zip',
  '*.tar.gz'
];

const cmd = `zip -r -X ${zipName} . ${excludes.map((x) => `-x "${x}"`).join(' ')}`;
execSync(cmd, { stdio: 'inherit' });
execSync(`sha256sum ${zipName} > ${shaName}`, { stdio: 'inherit' });
console.log(`Export complete: ${zipName} and ${shaName}`);
