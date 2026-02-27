import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

const TARGET = '22.22.0';
const nodeTruthPath = path.join(ROOT, 'NODE_TRUTH.md');
const nvmrcPath = path.join(ROOT, '.nvmrc');
const pkgPath = path.join(ROOT, 'package.json');

const nodeTruth = fs.existsSync(nodeTruthPath) ? fs.readFileSync(nodeTruthPath, 'utf8') : '';
const pinnedMinor = (nodeTruth.match(/hard_pinned_minor:\s*([0-9.]+)/) || [,'MISSING'])[1];
const nvmrc = fs.existsSync(nvmrcPath) ? fs.readFileSync(nvmrcPath, 'utf8').trim() : 'MISSING';
const pkg = fs.existsSync(pkgPath) ? JSON.parse(fs.readFileSync(pkgPath, 'utf8')) : {};
const enginesNode = pkg?.engines?.node ?? 'MISSING';

const ok = pinnedMinor === TARGET && nvmrc === TARGET && enginesNode === TARGET;
const status = ok ? 'PASS' : 'BLOCKED';
const reason = ok ? 'NONE' : 'RG_NODE_ALIGN01';

writeMd(path.join(EXEC, 'REGRESSION_NODE_TRUTH_ALIGNMENT.md'), `# REGRESSION_NODE_TRUTH_ALIGNMENT.md\n\nSTATUS: ${status}\nREASON_CODE: ${reason}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: npm run -s epoch:victory:seal\n\n- target: ${TARGET}\n- node_truth.hard_pinned_minor: ${pinnedMinor}\n- .nvmrc: ${nvmrc}\n- package.engines.node: ${enginesNode}\n`);
writeJsonDeterministic(path.join(MANUAL, 'regression_node_truth_alignment.json'), {
  schema_version: '1.0.0',
  status,
  reason_code: reason,
  run_id: RUN_ID,
  target: TARGET,
  node_truth_hard_pinned_minor: pinnedMinor,
  nvmrc,
  package_engines_node: enginesNode,
});

console.log(`[${status}] regression_node_truth_alignment — ${reason}`);
process.exit(ok ? 0 : 2);
