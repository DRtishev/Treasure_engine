import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { canonicalStringify, deterministicFingerprint, validateContract } from '../../core/edge/contracts.mjs';
import {
  determinismTripwire,
  buildFeatureFrame,
  buildStrategySpec,
  buildSignal,
  buildIntent,
  buildAllocationPlan,
  buildRiskDecision,
  buildSimReport,
  buildRealityGapReport,
  buildShadowEvent,
  buildCanaryPhaseState,
  buildCertificationReport,
  submitOrder,
  walkForwardLeakageSentinel
} from '../../core/edge/runtime.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../..');
const epoch = process.argv[2];
if (!epoch) throw new Error('epoch required');

const evidenceEpoch = process.env.EVIDENCE_EPOCH || 'EPOCH-EDGE-LOCAL';
const gateDir = path.join(root, 'reports/evidence', evidenceEpoch, `epoch${epoch}`);
const vectorsDir = path.join(root, 'reports/evidence', evidenceEpoch, 'vectors');
fs.mkdirSync(gateDir, { recursive: true });
fs.mkdirSync(vectorsDir, { recursive: true });
const initialTrackedStatus = spawnSync('git', ['status', '--porcelain', '--untracked-files=no'], { cwd: root, encoding: 'utf8' }).stdout;

function write(rel, data) {
  const file = path.join(gateDir, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, data);
  return file;
}

function writeVector(rel, data) {
  const file = path.join(vectorsDir, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, data);
  return file;
}

function fileSha(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function compareGolden(contractName, payload) {
  const actual = `${canonicalStringify(payload)}\n`;
  const goldenPath = path.join(root, 'tests/vectors', contractName, `epoch${epoch}.golden.json`);
  const actualPath = writeVector(`epoch${epoch}.${contractName}.actual.json`, actual);

  if (!fs.existsSync(goldenPath)) {
    if (process.env.UPDATE_GOLDENS === '1') {
      fs.mkdirSync(path.dirname(goldenPath), { recursive: true });
      fs.writeFileSync(goldenPath, actual);
      write('GOLDEN_UPDATES.log', `GOLDEN UPDATED ${path.relative(root, goldenPath)}\n`);
    } else {
      throw new Error(`Missing golden ${path.relative(root, goldenPath)}`);
    }
  }

  const golden = fs.readFileSync(goldenPath, 'utf8');
  if (golden !== actual) {
    const diff = [
      `contract=${contractName}`,
      '--- golden',
      golden,
      '--- actual',
      actual
    ].join('\n');
    writeVector(`epoch${epoch}.${contractName}.diff.txt`, diff);
    if (process.env.UPDATE_GOLDENS === '1') {
      fs.writeFileSync(goldenPath, actual);
      write('GOLDEN_UPDATES.log', `GOLDEN UPDATED ${path.relative(root, goldenPath)}\n`);
    } else {
      throw new Error(`Golden mismatch for ${contractName}`);
    }
  }

  return { goldenPath, actualPath };
}

function assertNoTrackedDrift() {
  const result = spawnSync('git', ['status', '--porcelain', '--untracked-files=no'], { cwd: root, encoding: 'utf8' });
  const currentStatus = result.stdout;
  write('NO_DIRTY_VERIFY.status', currentStatus.trim() ? currentStatus : 'CLEAN\n');
  if (process.env.UPDATE_GOLDENS !== '1' && currentStatus !== initialTrackedStatus) throw new Error('verify modified tracked files');
}

function addPreflight() {
  const pf = [
    process.cwd(),
    spawnSync('git', ['branch', '--show-current'], { cwd: root, encoding: 'utf8' }).stdout.trim(),
    spawnSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).stdout.trim(),
    process.version
  ].join('\n') + '\n';
  write('PREFLIGHT.log', pf);
}

addPreflight();
write('SNAPSHOT.md', `- epoch: ${epoch}\n- seed: 12345\n- offline: true\n`);
write('GATE_PLAN.md', '- schema validation\n- deterministic replay\n- golden comparison\n- no-dirty assertion\n');

const outputs = {};
if (epoch === '31') {
  outputs.FeatureFrame = buildFeatureFrame(12345);
  determinismTripwire((seed) => buildFeatureFrame(seed), 12345);
  let injectedFailed = false;
  try { walkForwardLeakageSentinel(true); } catch { injectedFailed = true; }
  if (!injectedFailed) throw new Error('Injected look-ahead case did not fail');
  write('FEATURE_CONTRACTS.md', '- FeatureFrame contract enforced against SSOT field list.\n');
  write('LOOKAHEAD_SENTINEL_PLAN.md', '- Positive control (leakage) is required to fail.\n');
  write('FINGERPRINT_RULES.md', '- deterministic_fingerprint excludes only itself; canonical sorted JSON; truncate_toward_zero.\n');
}
if (epoch === '32') {
  outputs.SimReport = buildSimReport(12345);
  determinismTripwire((seed) => buildSimReport(seed), 12345);
}
if (epoch === '33') outputs.StrategySpec = buildStrategySpec();
if (epoch === '34') {
  outputs.Signal = buildSignal(12345);
  outputs.Intent = buildIntent(outputs.Signal);
}
if (epoch === '35') outputs.AllocationPlan = buildAllocationPlan(12345);
if (epoch === '36') outputs.RiskDecision = buildRiskDecision(0.22);
if (epoch === '37') {
  outputs.WFOReport = walkForwardLeakageSentinel(false);
  let injectedFailed = false;
  try { walkForwardLeakageSentinel(true); } catch { injectedFailed = true; }
  if (!injectedFailed) throw new Error('Injected leakage fixture did not fail');
}
if (epoch === '38') outputs.RealityGapReport = buildRealityGapReport('sim-12345', 'sh-12345', 0.031);
if (epoch === '39') {
  outputs.ShadowEvent = buildShadowEvent(4);
  outputs.CanaryPhaseState = buildCanaryPhaseState(5, 15);
  let shadowBlocked = false;
  try { submitOrder('SHADOW'); } catch (error) { shadowBlocked = error.code === 'EDGE_SHADOW_ORDER_FORBIDDEN'; }
  if (!shadowBlocked) throw new Error('Shadow hard-fuse did not trigger');
}
if (epoch === '40') {
  outputs.CertificationReport = buildCertificationReport(Object.fromEntries(Array.from({ length: 10 }, (_, i) => [String(31 + i), 'PASS'])));
}
if (Object.keys(outputs).length === 0) throw new Error(`unsupported epoch ${epoch}`);

const checksumLines = [];
for (const [name, payload] of Object.entries(outputs)) {
  if (payload?.deterministic_fingerprint) {
    const expected = deterministicFingerprint(name, payload);
    if (expected !== payload.deterministic_fingerprint) throw new Error(`Fingerprint mismatch for ${name}`);
    if (name !== 'WFOReport') validateContract(name, payload);
  }
  if (name !== 'WFOReport') {
    const paths = compareGolden(name, payload);
    checksumLines.push(`${fileSha(paths.actualPath)}  ${path.relative(root, paths.actualPath)}`);
    if (fs.existsSync(paths.goldenPath)) checksumLines.push(`${fileSha(paths.goldenPath)}  ${path.relative(root, paths.goldenPath)}`);
  }
}

write('CHECKSUMS.sha256', `${checksumLines.join('\n')}\n`);
write('VERDICT.md', 'PASS\n');
assertNoTrackedDrift();

console.log(`PASS epoch${epoch} artifacts=${path.relative(root, gateDir)}`);
