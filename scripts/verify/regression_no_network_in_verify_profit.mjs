import fs from 'node:fs';
import path from 'node:path';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';

const ROOT = path.resolve(process.cwd());
const EDGE_DIR = path.join(ROOT, 'scripts', 'edge', 'edge_lab');
const REG_DIR = path.join(ROOT, 'reports', 'evidence', 'EDGE_PROFIT_00', 'registry');
const MANUAL_DIR = path.join(REG_DIR, 'gates', 'manual');
const NEXT_ACTION = 'npm run -s verify:regression:no-network-in-verify-profit';

fs.mkdirSync(MANUAL_DIR, { recursive: true });

const findings = [];
const patterns = [
  /\bfetch\s*\(/i,
  /\bWebSocket\s*\(/i,
  /from\s+['"]ws['"]/i,
  /from\s+['"]node:http['"]/i,
  /from\s+['"]node:https['"]/i,
  /from\s+['"]node:dns['"]/i,
  /from\s+['"]node:net['"]/i,
  /from\s+['"]node:tls['"]/i,
  /from\s+['"]node:dgram['"]/i,
  /from\s+['"]undici['"]/i,
  /from\s+['"]axios['"]/i,
  /from\s+['"]node-fetch['"]/i,
  /\bhttp\.request\s*\(/i,
  /\bhttps\.request\s*\(/i,
  /\brequest\s*\(/i,
];

function isAllowlisted(relPath) {
  return relPath === 'edge_profit_00_acquire_real_public.mjs' || relPath === 'edge_profit_00_acquire_public_diag.mjs' || relPath.startsWith('real_public/');
}

function scanDir(base) {
  if (!fs.existsSync(base)) return;
  for (const name of fs.readdirSync(base, { withFileTypes: true })) {
    if (name.isDirectory()) {
      scanDir(path.join(base, name.name));
      continue;
    }
    if (!name.name.endsWith('.mjs')) continue;
    const abs = path.join(base, name.name);
    const rel = path.relative(EDGE_DIR, abs).replace(/\\/g, '/');
    const text = fs.readFileSync(abs, 'utf8');
    for (const re of patterns) {
      if (!re.test(text)) continue;
      if (!isAllowlisted(rel)) findings.push(`${rel}:${re.source}`);
    }
  }
}

scanDir(EDGE_DIR);

const status = findings.length ? 'BLOCKED' : 'PASS';
const reasonCode = findings.length ? 'NETV01' : 'NONE';
const message = findings.length
  ? 'Network calls detected in verify/profit scripts outside allowlist.'
  : 'No direct network calls in verify/profit scripts outside ACQUIRE allowlist.';

writeMd(path.join(REG_DIR, 'REGRESSION_NO_NET_VERIFY.md'), `# REGRESSION_NO_NET_VERIFY.md\n\nSTATUS: ${status}\nREASON_CODE: ${reasonCode}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${NEXT_ACTION}\n\n## Findings\n\n${findings.map((x) => `- ${x}`).join('\n') || '- NONE'}\n`);

writeJsonDeterministic(path.join(MANUAL_DIR, 'regression_no_net_verify.json'), {
  schema_version: '1.0.0',
  status,
  reason_code: reasonCode,
  run_id: RUN_ID,
  message,
  next_action: NEXT_ACTION,
  allowlist: ['scripts/edge/edge_lab/edge_profit_00_acquire_real_public.mjs', 'scripts/edge/edge_lab/edge_profit_00_acquire_public_diag.mjs', 'scripts/edge/edge_lab/real_public/**'],
  findings,
});

console.log(`[${status}] regression_no_network_in_verify_profit — ${reasonCode}`);
process.exit(status === 'PASS' ? 0 : 1);
