import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';

const RUNS_ROOT = 'reports/runs';
const LATEST_FILE = path.join(RUNS_ROOT, 'LATEST_RUN_ID');

export function deterministicRunId({ epoch, seed, hack_id }) {
  const text = `${epoch}::${seed}::${hack_id}`;
  return createHash('sha256').update(text).digest('hex').slice(0, 16);
}

export function ensureRunDir(run_id) {
  const envDir = process.env.TREASURE_RUN_DIR;
  const dir = envDir ? envDir : path.join(RUNS_ROOT, run_id);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function setLatestRun(run_id) {
  fs.mkdirSync(RUNS_ROOT, { recursive: true });
  fs.writeFileSync(LATEST_FILE, `${run_id}\n`, 'utf8');
}

export function getLatestRunId() {
  if (process.env.TREASURE_RUN_ID) {
    return process.env.TREASURE_RUN_ID.trim();
  }

  if (!fs.existsSync(LATEST_FILE)) {
    throw new Error(`Latest run marker not found: ${LATEST_FILE}`);
  }

  return fs.readFileSync(LATEST_FILE, 'utf8').trim();
}

export function getLatestRunDir() {
  if (process.env.TREASURE_RUN_DIR) {
    return process.env.TREASURE_RUN_DIR;
  }

  const run_id = getLatestRunId();
  return path.join(RUNS_ROOT, run_id);
}
