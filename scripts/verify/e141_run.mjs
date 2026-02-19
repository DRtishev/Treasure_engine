#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { rewriteSums, verifySums } from './foundation_sums.mjs';
import { E141_ROOT, REASON, nodeMajor, run, writeMd } from './e141_lib.mjs';
import { doctorState, doctorText } from './e141_doctor.mjs';
import { writeCapsuleDocs } from './e141_node_capsule.mjs';
import { runAcquire } from './e141_node_acquire.mjs';
import { runBootstrap } from './e141_node_bootstrap.mjs';
import { execWithPinned } from './e141_exec_with_pinned_node.mjs';
import { runContracts } from './e141_contracts.mjs';
import { runSeal } from './e141_seal_x2.mjs';

const probe = process.argv.includes('--probe');
fs.mkdirSync(E141_ROOT,{recursive:true});
const beforeNode = process.version;

const snap=[
  '# E141 SNAPSHOT',
  `- date_utc: ${new Date().toISOString()}`,
  `- pwd: ${process.cwd()}`,
  `- branch: ${run('git',['rev-parse','--abbrev-ref','HEAD']).out}`,
  `- head: ${run('git',['rev-parse','--short','HEAD']).out}`,
  `- node: ${beforeNode}`,
  `- npm: ${run('npm',['-v']).out}`,
  '## RAW',
  `- probe: ${probe}`,
];
writeMd(path.join(E141_ROOT,'SNAPSHOT.md'),snap.join('\n'));

const doc=doctorState({probe});
writeMd(path.join(E141_ROOT,'DOCTOR_OUTPUT.md'),`# E141 DOCTOR OUTPUT\n\n## RAW\n\n\`\`\`\n${doctorText(doc)}\n\`\`\``);
writeCapsuleDocs({ satisfied: fs.existsSync('artifacts/incoming/node') && fs.readdirSync('artifacts/incoming/node').some(f=>f.endsWith('.tar.xz')) });

let acq={ec:0,reason:REASON.ACQUIRE_OK};
if(nodeMajor()<22) acq=runAcquire();
if(!fs.existsSync(path.join(E141_ROOT,'NODE_ACQUIRE.md'))){ writeMd(path.join(E141_ROOT,'NODE_ACQUIRE.md'),'# E141 NODE ACQUIRE\n- status: SKIPPED\n- reason_code: ACQUIRE_OK\n## RAW\n- detail: no acquisition required'); }

const boot=runBootstrap({probe});
let gateLines=['# E141 GATE RUN',`- status: ${probe?'PROBE':'RUN'}`,'## RAW'];
let authoritativeOk=false;

if(!probe){
  if(boot.ec!==0){
    gateLines.push('- blocked: bootstrap failed');
  } else {
    const bridgeSmoke=execWithPinned(['-v']);
    gateLines.push(`- bridge_smoke_ec: ${bridgeSmoke.ec}`);
    const gate=execWithPinned(['scripts/verify/e137_run.mjs']);
    gateLines.push(`- representative_gate: scripts/verify/e137_run.mjs`);
    gateLines.push(`- representative_gate_ec: ${gate.ec}`);
    authoritativeOk = bridgeSmoke.ec===0 && gate.ec===0;
  }
} else {
  gateLines.push('- probe_mode_non_authoritative: true');
}
writeMd(path.join(E141_ROOT,'GATE_RUN.md'),gateLines.join('\n'));
if(!fs.existsSync(path.join(E141_ROOT,'EXEC_BRIDGE.md'))){ writeMd(path.join(E141_ROOT,'EXEC_BRIDGE.md'),'# E141 EXEC BRIDGE\n- status: SKIPPED\n- node_bin: NA\n- command: none\n- ec: 0\n## RAW\n```\nprobe-mode\n```'); }

const ctr=runContracts();
const seal=runSeal();
rewriteSums(E141_ROOT,['SHA256SUMS.md'],'reports/evidence');
const rows=verifySums(path.join(E141_ROOT,'SHA256SUMS.md'),['reports/evidence/E141/SHA256SUMS.md']);

const status = probe ? 'PASS_NON_AUTHORITATIVE' : (authoritativeOk && ctr.ec===0 && seal.ec===0 ? 'AUTHORITATIVE_PASS' : 'BLOCKED');
const reason = status==='AUTHORITATIVE_PASS' ? REASON.BOOTSTRAP_OK : (probe ? REASON.PROBE_ONLY_NON_AUTHORITATIVE : (authoritativeOk ? REASON.OK : REASON.FAIL_NODE_POLICY));
writeMd(path.join(E141_ROOT,'VERDICT.md'),[
  '# E141 VERDICT',
  `- status: ${status}`,
  `- reason_code: ${reason}`,
  `- authoritative: ${status==='AUTHORITATIVE_PASS'}`,
  `- sha_rows_verified: ${rows}`,
  '## RAW',
  `- acquire_ec: ${acq.ec}`,
  `- bootstrap_ec: ${boot.ec}`,
  `- contracts_ec: ${ctr.ec}`,
  `- seal_ec: ${seal.ec}`,
].join('\n'));
rewriteSums(E141_ROOT,['SHA256SUMS.md'],'reports/evidence');
verifySums(path.join(E141_ROOT,'SHA256SUMS.md'),['reports/evidence/E141/SHA256SUMS.md']);
if(!probe && status!=='AUTHORITATIVE_PASS') process.exit(1);
process.exit(0);
