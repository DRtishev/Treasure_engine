#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const LEDGER_PATH = 'specs/epochs/LEDGER.json';
const EVIDENCE_EPOCH = process.env.EVIDENCE_EPOCH || process.env.EPOCH_EVIDENCE_ID || 'EPOCH-PIPELINE-FREEZE';
const EVIDENCE_DIR = path.join('reports', 'evidence', EVIDENCE_EPOCH);
const GATES_DIR = path.join(EVIDENCE_DIR, 'gates');
const RUN_STATE_PATH = path.join(EVIDENCE_DIR, 'AUTONOMOUS_EPOCH_RUN_STATE.json');

const ORDER = ['17', '18', '19', '20', '21', '22', '23', '24', '25', '26', '27', '28', '29', '30'];

const GATE_MAP = {
  '17': ['npm run verify:epoch17', 'npm run verify:paper', 'npm run verify:e2', 'npm run verify:e2:multi'],
  '18': ['npm run verify:epoch18', 'npm run verify:strategy', 'npm run verify:core'],
  '19': ['npm run verify:epoch19', 'npm run verify:governance', 'npm run verify:core'],
  '20': ['npm run verify:epoch20', 'npm run verify:monitoring', 'npm run verify:core'],
  '21': ['npm run verify:epoch21', 'npm run verify:release-governor', 'npm run verify:core'],
  '22': ['npm run verify:epoch22', 'npm run verify:core'],
  '23': ['npm run verify:epoch23', 'npm run verify:integration', 'npm run verify:core'],
  '24': ['npm run verify:epoch24', 'npm run verify:phase2', 'npm run verify:core'],
  '25': ['npm run verify:epoch25', 'npm run verify:core'],
  '26': ['npm run verify:epoch26', 'npm run verify:release-governor', 'npm run verify:core'],
  '27': ['npm run verify:epoch27', 'npm run verify:core'],
  '28': ['npm run verify:epoch28', 'npm run verify:integration', 'npm run verify:core'],
  '29': ['npm run verify:epoch29', 'npm run verify:phase2', 'npm run verify:core'],
  '30': ['npm run verify:epoch30', 'npm run verify:wall', 'npm run verify:release-governor'],
};

function readLedger() {
  return JSON.parse(fs.readFileSync(LEDGER_PATH, 'utf8'));
}

function writeLedger(ledger) {
  ledger.updated_at = new Date().toISOString();
  fs.writeFileSync(LEDGER_PATH, JSON.stringify(ledger, null, 2) + '\n');
}

function nextReady(ledger) {
  const epochs = ledger.epochs || {};
  for (const e of ORDER) {
    if (epochs[e]?.status === 'READY') {
      const prior = ORDER.filter((x) => Number(x) < Number(e));
      const blockers = prior.filter((x) => epochs[x]?.status !== 'DONE');
      if (blockers.length === 0) return { epoch: e, why: `first READY epoch with all dependencies DONE (${prior.join(', ') || 'none'})` };
      return { epoch: e, why: `READY by ledger but dependency statuses not DONE: ${blockers.join(', ')}` };
    }
  }
  return null;
}

function runCmd(cmd, logPath) {
  const res = spawnSync('bash', ['-lc', cmd], { encoding: 'utf8' });
  const full = `$ ${cmd}\n${res.stdout || ''}${res.stderr || ''}`;
  fs.writeFileSync(logPath, full);
  if (res.status !== 0) {
    throw new Error(`Command failed (${res.status}): ${cmd}. See ${logPath}`);
  }
}

function actionNext() {
  const n = nextReady(readLedger());
  if (!n) {
    console.log('No READY epoch in ledger.');
    return;
  }
  console.log(`Next epoch: EPOCH-${n.epoch}`);
  console.log(`Why: ${n.why}`);
  console.log(`Planned gates: ${(GATE_MAP[n.epoch] || []).join(' ; ')}`);
}

function actionRun() {
  fs.mkdirSync(GATES_DIR, { recursive: true });
  const ledger = readLedger();
  const n = nextReady(ledger);
  if (!n) throw new Error('No READY epoch available to run.');
  const gates = GATE_MAP[n.epoch] || [];
  if (!gates.length) throw new Error(`No gates configured for EPOCH-${n.epoch}`);

  const executed = [];
  for (let i = 0; i < gates.length; i += 1) {
    const gate = gates[i];
    const fileSafe = gate.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '').toLowerCase();
    const logPath = path.join(GATES_DIR, `epoch_${n.epoch}_${String(i + 1).padStart(2, '0')}_${fileSafe}.log`);
    runCmd(gate, logPath);
    executed.push({ gate, log: logPath, status: 'PASS' });
  }

  const runState = {
    epoch: n.epoch,
    evidence_dir: EVIDENCE_DIR,
    executed_at: new Date().toISOString(),
    gates: executed
  };
  fs.writeFileSync(RUN_STATE_PATH, JSON.stringify(runState, null, 2) + '\n');
  console.log(`Completed autonomous run for EPOCH-${n.epoch}`);
  console.log(`State: ${RUN_STATE_PATH}`);
}

function actionClose() {
  if (!fs.existsSync(RUN_STATE_PATH)) throw new Error(`Missing run state: ${RUN_STATE_PATH}`);
  const runState = JSON.parse(fs.readFileSync(RUN_STATE_PATH, 'utf8'));
  const ledger = readLedger();
  const cur = ledger.epochs?.[runState.epoch];
  if (!cur) throw new Error(`Epoch ${runState.epoch} missing in ledger`);

  const allLogsExist = runState.gates.every((g) => fs.existsSync(g.log));
  if (!allLogsExist) throw new Error('Not all gate logs exist; refusing to close epoch');

  cur.status = 'DONE';
  cur.last_commit_sha = spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).stdout.trim();
  cur.last_evidence_path = `${EVIDENCE_DIR}/`;
  cur.last_gate_summary = runState.gates.map((g) => `${g.gate}=PASS`).join('; ');

  const nextIdx = ORDER.indexOf(runState.epoch) + 1;
  if (nextIdx < ORDER.length) {
    const next = ORDER[nextIdx];
    if ((ledger.epochs[next]?.status || '') === 'BLOCKED') ledger.epochs[next].status = 'READY';
  }

  writeLedger(ledger);
  const verdictPath = path.join(EVIDENCE_DIR, 'AUTONOMOUS_EPOCH_VERDICT.md');
  fs.writeFileSync(verdictPath, `# AUTONOMOUS EPOCH VERDICT\n\nStatus: SAFE\n\nClosed epoch: EPOCH-${runState.epoch}\nEvidence: ${EVIDENCE_DIR}/\n`);
  console.log(`Closed EPOCH-${runState.epoch} and updated ledger.`);
}

const action = process.argv.includes('--action')
  ? process.argv[process.argv.indexOf('--action') + 1]
  : 'next';

try {
  if (action === 'next') actionNext();
  else if (action === 'run') actionRun();
  else if (action === 'close') actionClose();
  else throw new Error(`Unknown action: ${action}`);
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
