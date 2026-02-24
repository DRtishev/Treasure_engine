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

function readCommandsLaneSummary() {
  const p = path.join(ROOT, 'reports', 'evidence', 'EXECUTOR', 'COMMANDS_RUN.md');
  if (!fs.existsSync(p)) {
    return { laneA: 'MISSING', laneB: 'MISSING', laneBMode: 'MISSING', nextAction: 'npm run -s executor:run:chain' };
  }
  const text = fs.readFileSync(p, 'utf8');
  const get = (k) => (text.match(new RegExp(`^${k}:\\s*(.+)$`, 'm')) || [])[1] || 'MISSING';
  return {
    laneA: get('LANE_A_STATUS'),
    laneB: get('LANE_B_STATUS'),
    laneBMode: get('LANE_B_MODE'),
    nextAction: get('NEXT_ACTION'),
  };
}

function profileNextAction(profile, closeout) {
  if (profile === 'public') {
    const lockPath = path.join(ROOT, 'artifacts', 'incoming', 'real_public_market.lock.md');
    if (!fs.existsSync(lockPath)) return 'npm run -s epoch:edge:profit:public:00:x2:node22';
    if (!String(process.env.ENABLE_NETWORK || '0').match(/^(1|true)$/i)) return 'npm run -s epoch:edge:profit:public:00:x2:node22';
    if (!closeout || closeout.status === 'NEEDS_DATA') return 'npm run -s epoch:edge:profit:public:00:x2:node22';
    if (closeout.status === 'PASS') return 'npm run -s epoch:edge:profit:public:00:x2:node22';
    return 'npm run -s epoch:edge:profit:public:00:x2:node22';
  }
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
  const promotionEligible = Boolean(closeout?.eligible_for_profit_track);
  const promotionReason = closeout?.promotion_eligibility_reason || (promotionEligible ? 'REAL-only promotion gate satisfied.' : 'EP02_REAL_REQUIRED: evidence_source is not REAL.');
  const realStub = evidenceSource === 'REAL' && fs.existsSync(path.join(ROOT, 'artifacts', 'incoming', 'raw_paper_telemetry.csv'))
    ? fs.readFileSync(path.join(ROOT, 'artifacts', 'incoming', 'raw_paper_telemetry.csv'), 'utf8').includes('REAL_STUB_V1')
    : false;

  writeMd(idxPath, `# PROFILE_INDEX.md — EDGE_PROFIT_00/${profile}\n\nSTATUS: ${status === 'MISSING' ? 'BLOCKED' : 'PASS'}\nREASON_CODE: ${status === 'MISSING' ? 'ME01' : 'NONE'}\nNEXT_ACTION: ${nextAction}\n\n- profile: ${profile}\n- closeout_status: ${status}\n- closeout_reason_code: ${reason}\n- evidence_source: ${evidenceSource}\n- real_stub_tag: ${realStub}\n- PROMOTION_ELIGIBLE: ${promotionEligible}\n- promotion_eligibility_reason: ${promotionReason}\n- closeout_json_path: reports/evidence/EDGE_PROFIT_00/${profile}/gates/manual/edge_profit_00_closeout.json\n`);
  profileRows.push(`| ${profile} | ${status} | ${reason} | ${evidenceSource} | ${realStub} | ${promotionEligible} | ${Boolean(closeout?.eligible_for_micro_live)} | ${nextAction} |`);
}

const activeCloseoutPath = activeProfile ? path.join(BASE_DIR, activeProfile, 'gates', 'manual', 'edge_profit_00_closeout.json') : path.join(BASE_DIR, 'gates', 'manual', 'edge_profit_00_closeout.json');
const activeCloseout = readJson(activeCloseoutPath);
const globalNextAction = profileNextAction(activeProfile, activeCloseout);
const publicLockJson = readJson(path.join(ROOT, 'artifacts', 'incoming', 'real_public_market.lock.json'));
const publicCloseout = readJson(path.join(BASE_DIR, 'public', 'gates', 'manual', 'edge_profit_00_closeout.json'));
const netDiag = readJson(path.join(BASE_DIR, 'registry', 'gates', 'manual', 'net_diag.json'));
const publicRootCause = netDiag?.root_cause_code || 'NONE';
const publicRoute = publicLockJson?.route || 'UNKNOWN';
const publicNetFamily = publicLockJson?.net_family ?? netDiag?.net_family ?? 'UNKNOWN';

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

const laneSummary = readCommandsLaneSummary();

const md = `# PROFILES_INDEX.md — EDGE_PROFIT_00\n\nSTATUS: PASS\nREASON_CODE: NONE\nNEXT_ACTION: ${releaseNextAction}\n\n## Executor Lane Summary\n\n- lane_a_status: ${laneSummary.laneA}\n- lane_b_status: ${laneSummary.laneB}\n- lane_b_mode: ${laneSummary.laneBMode}\n- commands_next_action: ${laneSummary.nextAction}\n\n## Active Profile\n\n- active_profile: ${activeProfile || 'clean(default)'}\n- active_closeout_path: ${activeProfile ? `reports/evidence/EDGE_PROFIT_00/${activeProfile}/gates/manual/edge_profit_00_closeout.json` : 'reports/evidence/EDGE_PROFIT_00/gates/manual/edge_profit_00_closeout.json'}\n- active_closeout_status: ${activeCloseout?.status || 'MISSING'}\n- active_closeout_reason_code: ${activeCloseout?.reason_code || 'ME01'}\n- active_evidence_source: ${activeCloseout?.evidence_source || 'UNKNOWN'}\n- active_promotion_eligible: ${Boolean(activeCloseout?.eligible_for_profit_track)}\n- active_promotion_reason: ${activeCloseout?.promotion_eligibility_reason || (activeCloseout?.evidence_source === 'REAL' ? 'Closeout not PASS; promotion denied.' : 'EP02_REAL_REQUIRED: evidence_source is not REAL.')}\n\n## Release Discipline (contract-aware)\n\n- contract_path: GOV/EXPORT_CONTRACT.md\n- contract_state: ${releaseState}\n- evidence_epoch_resolved: ${evidenceEpoch}\n${releaseRows.length ? releaseRows.join('\n') : '- contract_missing_or_unparseable'}\n\n## Public Profile Snapshot\n\n- public_lock_exists: ${fs.existsSync(path.join(ROOT, 'artifacts', 'incoming', 'real_public_market.lock.md'))}\n- public_lock_path: artifacts/incoming/real_public_market.lock.md\n- public_lock_json_path: artifacts/incoming/real_public_market.lock.json\n- public_market_path: artifacts/incoming/real_public_market.jsonl\n- public_telemetry_csv_path: artifacts/incoming/paper_telemetry.csv\n- public_provider_id: ${publicLockJson?.provider_id || 'UNKNOWN'}\n- public_anchor_server_time_ms: ${publicLockJson?.server_time_anchor_ms || 'MISSING'}\n- public_anchor_end_ms: ${publicLockJson?.end_anchor_ms || 'MISSING'}\n- public_dataset_sha256: ${publicLockJson?.sha256_norm_dataset || 'MISSING'}\n- public_telemetry_sha256: ${publicLockJson?.telemetry_csv_sha256 || 'MISSING'}\n- public_profile_promotion_eligible: ${Boolean(publicCloseout?.eligible_for_profit_track)}\n- public_route: ${publicRoute}\n- public_net_family: ${publicNetFamily}\n- public_root_cause_code: ${publicRootCause}\n- public_sentinel_exists: ${fs.existsSync(path.join(ROOT, 'reports', 'evidence', 'EXECUTOR', 'PUBLIC_REACHABILITY_SENTINEL.md'))}\n- public_summary: route=${publicRoute} | net_family=${publicNetFamily} | root_cause_code=${publicRootCause} | sentinel_exists=${fs.existsSync(path.join(ROOT, 'reports', 'evidence', 'EXECUTOR', 'PUBLIC_REACHABILITY_SENTINEL.md'))}\n\n## Available Profiles\n\n| profile | closeout_status | closeout_reason_code | evidence_source | real_stub | promotion_eligible | micro_live_eligible | next_action |\n|---|---|---|---|---|---|---|---|\n${profileRows.join('\n') || '| NONE | MISSING | ME01 | UNKNOWN | false | false | false | npm run -s edge:profit:00 |'}\n`;

writeMd(path.join(BASE_DIR, 'PROFILES_INDEX.md'), md);
console.log('[PASS] edge_profit_00_doctor — NONE');
