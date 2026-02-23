import fs from 'node:fs';
import path from 'node:path';
import { writeMd } from './canon.mjs';
import { resolveProfit00Profile } from './edge_profit_00_paths.mjs';

const ROOT = path.resolve(process.cwd());
const BASE_DIR = path.join(ROOT, 'reports', 'evidence', 'EDGE_PROFIT_00');
const activeProfile = resolveProfit00Profile(ROOT);

function readJson(p) {
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf8'));
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

const dirEntries = fs.existsSync(BASE_DIR)
  ? fs.readdirSync(BASE_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
  : [];

const profiles = dirEntries
  .filter((name) => !['gates', 'registry'].includes(name))
  .sort((a, b) => a.localeCompare(b));

const profileRows = [];
for (const profile of profiles) {
  const pDir = path.join(BASE_DIR, profile);
  const closeout = readJson(path.join(pDir, 'gates', 'manual', 'edge_profit_00_closeout.json'));
  const sample = fs.existsSync(path.join(pDir, 'SAMPLE_TELEMETRY.md'));
  const idxPath = path.join(pDir, 'PROFILE_INDEX.md');
  const status = closeout?.status || 'MISSING';
  const reason = closeout?.reason_code || 'ME01';
  const nextAction = profileNextAction(profile, closeout);

  const profileMd = `# PROFILE_INDEX.md — EDGE_PROFIT_00/${profile}

STATUS: ${status === 'MISSING' ? 'BLOCKED' : 'PASS'}
REASON_CODE: ${status === 'MISSING' ? 'ME01' : 'NONE'}
NEXT_ACTION: ${nextAction}

- profile: ${profile}
- closeout_status: ${status}
- closeout_reason_code: ${reason}
- has_sample_telemetry: ${sample}
- closeout_json_path: reports/evidence/EDGE_PROFIT_00/${profile}/gates/manual/edge_profit_00_closeout.json
`;
  writeMd(idxPath, profileMd);

  profileRows.push(`| ${profile} | ${status} | ${reason} | ${nextAction} |`);
}

const activeCloseoutPath = activeProfile
  ? path.join(BASE_DIR, activeProfile, 'gates', 'manual', 'edge_profit_00_closeout.json')
  : path.join(BASE_DIR, 'gates', 'manual', 'edge_profit_00_closeout.json');
const activeCloseout = readJson(activeCloseoutPath);
const globalNextAction = profileNextAction(activeProfile, activeCloseout);

const md = `# PROFILES_INDEX.md — EDGE_PROFIT_00

STATUS: PASS
REASON_CODE: NONE
NEXT_ACTION: ${globalNextAction}

## Active Profile

- active_profile: ${activeProfile || 'clean(default)'}
- profile_marker_path: artifacts/incoming/paper_telemetry.profile
- active_closeout_path: ${activeProfile ? `reports/evidence/EDGE_PROFIT_00/${activeProfile}/gates/manual/edge_profit_00_closeout.json` : 'reports/evidence/EDGE_PROFIT_00/gates/manual/edge_profit_00_closeout.json'}
- active_closeout_status: ${activeCloseout?.status || 'MISSING'}
- active_closeout_reason_code: ${activeCloseout?.reason_code || 'ME01'}

## Available Profiles

| profile | closeout_status | closeout_reason_code | next_action |
|---|---|---|---|
${profileRows.join('\n') || '| NONE | MISSING | ME01 | npm run -s edge:profit:00 |'}
`;

writeMd(path.join(BASE_DIR, 'PROFILES_INDEX.md'), md);
console.log('[PASS] edge_profit_00_doctor — NONE');
