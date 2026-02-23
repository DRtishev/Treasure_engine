import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { writeMd } from './canon.mjs';
import { resolveProfit00Profile } from './edge_profit_00_paths.mjs';

const ROOT = path.resolve(process.cwd());
const BASE_DIR = path.join(ROOT, 'reports', 'evidence', 'EDGE_PROFIT_00');
const activeProfile = resolveProfit00Profile(ROOT);

function readJson(p) {
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}
function sha256File(p) {
  if (!fs.existsSync(p)) return 'MISSING';
  return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
}
function readContract() {
  const p = path.join(ROOT, 'GOV', 'EXPORT_CONTRACT.md');
  if (!fs.existsSync(p)) return null;
  const kv = {};
  for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#') || !t.includes('=')) continue;
    const i = t.indexOf('=');
    kv[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
  return kv;
}
function profileNextAction(profile, closeout) {
  if (!closeout) return 'npm run -s edge:profit:00';
  if (profile === 'conflict') return 'npm run -s edge:profit:00:expect-blocked:conflict';
  if (closeout.status === 'NEEDS_DATA') {
    if (!profile || profile === 'clean') return 'npm run -s edge:profit:00:sample';
    return `npm run -s edge:profit:00:sample:${profile}`;
  }
  if (closeout.status === 'PASS') return 'npm run -s edge:profit:00:x2';
  return 'npm run -s edge:profit:00';
}

const dirEntries = fs.existsSync(BASE_DIR) ? fs.readdirSync(BASE_DIR, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name) : [];
const profiles = dirEntries.filter((name) => !['gates', 'registry'].includes(name)).sort((a, b) => a.localeCompare(b));

const profileRows = [];
for (const profile of profiles) {
  const pDir = path.join(BASE_DIR, profile);
  const closeout = readJson(path.join(pDir, 'gates', 'manual', 'edge_profit_00_closeout.json'));
  const idxPath = path.join(pDir, 'PROFILE_INDEX.md');
  const status = closeout?.status || 'MISSING';
  const reason = closeout?.reason_code || 'ME01';
  const nextAction = profileNextAction(profile, closeout);
  const evidenceSource = closeout?.evidence_source || 'UNKNOWN';
  const realStub = evidenceSource === 'REAL' && fs.existsSync(path.join(ROOT, 'artifacts', 'incoming', 'raw_paper_telemetry.csv'))
    ? fs.readFileSync(path.join(ROOT, 'artifacts', 'incoming', 'raw_paper_telemetry.csv'), 'utf8').includes('REAL_STUB_V1')
    : false;

  writeMd(idxPath, `# PROFILE_INDEX.md — EDGE_PROFIT_00/${profile}\n\nSTATUS: ${status === 'MISSING' ? 'BLOCKED' : 'PASS'}\nREASON_CODE: ${status === 'MISSING' ? 'ME01' : 'NONE'}\nNEXT_ACTION: ${nextAction}\n\n- profile: ${profile}\n- closeout_status: ${status}\n- closeout_reason_code: ${reason}\n- evidence_source: ${evidenceSource}\n- real_stub_tag: ${realStub}\n- closeout_json_path: reports/evidence/EDGE_PROFIT_00/${profile}/gates/manual/edge_profit_00_closeout.json\n`);
  profileRows.push(`| ${profile} | ${status} | ${reason} | ${evidenceSource} | ${realStub} | ${nextAction} |`);
}

const activeCloseoutPath = activeProfile ? path.join(BASE_DIR, activeProfile, 'gates', 'manual', 'edge_profit_00_closeout.json') : path.join(BASE_DIR, 'gates', 'manual', 'edge_profit_00_closeout.json');
const activeCloseout = readJson(activeCloseoutPath);
const globalNextAction = profileNextAction(activeProfile, activeCloseout);

const contract = readContract();
const evidenceEpoch = process.env.EVIDENCE_EPOCH || contract?.EVIDENCE_EPOCH_DEFAULT || 'EPOCH-EDGE-RC-STRICT-01';
const resolvePath = (tpl) => (tpl || '').replaceAll('${EVIDENCE_EPOCH}', evidenceEpoch);
const releasePaths = contract ? [
  resolvePath(contract.FINAL_VALIDATED_PRIMARY_PATH),
  resolvePath(contract.EVIDENCE_CHAIN_PRIMARY_PATH),
  resolvePath(contract.FINAL_VALIDATED_SHA256_SIDECAR_PATH),
] : [];
const releaseRows = releasePaths.map((p) => `- ${p}: ${fs.existsSync(path.join(ROOT, p)) ? 'PRESENT' : 'MISSING'} | sha256=${sha256File(path.join(ROOT, p))}`);
const releaseState = !contract ? 'RA02' : releasePaths.every((p) => fs.existsSync(path.join(ROOT, p))) ? 'PASS' : 'RA01';
const releaseNextAction = releaseState === 'PASS' ? globalNextAction : 'npm run -s export:final-validated';

const md = `# PROFILES_INDEX.md — EDGE_PROFIT_00\n\nSTATUS: PASS\nREASON_CODE: NONE\nNEXT_ACTION: ${releaseNextAction}\n\n## Active Profile\n\n- active_profile: ${activeProfile || 'clean(default)'}\n- active_closeout_path: ${activeProfile ? `reports/evidence/EDGE_PROFIT_00/${activeProfile}/gates/manual/edge_profit_00_closeout.json` : 'reports/evidence/EDGE_PROFIT_00/gates/manual/edge_profit_00_closeout.json'}\n- active_closeout_status: ${activeCloseout?.status || 'MISSING'}\n- active_closeout_reason_code: ${activeCloseout?.reason_code || 'ME01'}\n- active_evidence_source: ${activeCloseout?.evidence_source || 'UNKNOWN'}\n\n## Release Discipline (contract-aware)\n\n- contract_path: GOV/EXPORT_CONTRACT.md\n- contract_state: ${releaseState}\n- evidence_epoch_resolved: ${evidenceEpoch}\n${releaseRows.length ? releaseRows.join('\n') : '- contract_missing_or_unparseable'}\n\n## Available Profiles\n\n| profile | closeout_status | closeout_reason_code | evidence_source | real_stub | next_action |\n|---|---|---|---|---|---|\n${profileRows.join('\n') || '| NONE | MISSING | ME01 | UNKNOWN | false | npm run -s edge:profit:00 |'}\n`;

writeMd(path.join(BASE_DIR, 'PROFILES_INDEX.md'), md);
console.log('[PASS] edge_profit_00_doctor — NONE');
