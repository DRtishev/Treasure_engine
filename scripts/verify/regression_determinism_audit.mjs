import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = path.resolve(process.cwd());
const EXEC_DIR = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC_DIR, 'gates/manual');
const NEXT_ACTION = 'npm run -s verify:regression:determinism-audit';

const targetFiles = [
  'scripts/executor/executor_run_chain.mjs',
  'scripts/executor/executor_mega_proof_x2.mjs',
  'scripts/executor/executor_epoch_foundation_seal.mjs',
  'scripts/export/evidence_bundle.mjs',
  'scripts/safety/net_kill_preload.cjs',
  'scripts/verify/regression_net_kill_preload_hard.mjs',
  'scripts/verify/regression_net_kill_preload_path_safe.mjs',
  'scripts/verify/regression_evidence_bundle_contract_ssot.mjs',
  'scripts/verify/regression_evidence_bundle_portable_mode.mjs',
  'scripts/verify/regression_mega_proof_x2_stability_contract.mjs',
  'scripts/verify/regression_mega_proof_x2_semantic_mismatch_classification.mjs',
  'scripts/verify/regression_foundation_seal_next_action_ssot.mjs',
  'scripts/verify/regression_foundation_seal_step_order_ssot.mjs',
    'scripts/verify/regression_bounded_kill_tree.mjs',
  'scripts/verify/regression_liquidations_offline_replay_no_network.mjs',
];
const allowNetwork = [
  /^scripts\/edge\/edge_lab\//,
  /^scripts\/verify\/regression_net_kill_preload_hard\.mjs$/,
  /^scripts\/verify\/regression_net_kill_preload_path_safe\.mjs$/,
  /^scripts\/safety\/net_kill_preload\.cjs$/,
  /^scripts\/verify\/regression_liquidations_offline_replay_no_network\.mjs$/,
];

function walk(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(abs, acc);
    else if (/\.(mjs|cjs|js|sh|md)$/.test(entry.name)) acc.push(path.relative(ROOT, abs).replace(/\\/g, '/'));
  }
  return acc;
}

const files = targetFiles.filter((rel) => fs.existsSync(path.join(ROOT, rel))).sort((a, b) => a.localeCompare(b));

const hits = [];
function push(rule_id, rel, detail) { hits.push({ rule_id, path: rel, detail }); }

for (const rel of files) {
  const txt = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  if (txt.includes('Math.random(')) push('RG_DTR_RANDOM', rel, 'Math.random(');
  if (/child_process\.(spawn|spawnSync|exec|execSync)\(/.test(txt) && !rel.endsWith('spawn_bounded.mjs')) push('RG_DTR_CHILDPROC', rel, 'child_process spawn/exec outside bounded wrapper');

  if (/child_process\.execFile\(/.test(txt)) push('RG_DTR_EXECFILE', rel, 'child_process.execFile usage');
  if (/NODE_OPTIONS\s*=\s*[^\n]*\$\{?NODE_OPTIONS\}?/.test(txt) || /export\s+NODE_OPTIONS\s*=/.test(txt)) push('RG_DTR_ENV_CHAIN', rel, 'NODE_OPTIONS env chain mutation');
  if (/bash\s+-lc\s+['"`].*\$\(.*\).*['"`]/.test(txt) || /sh\s+-c\s+['"`].*\$\(.*\).*['"`]/.test(txt)) { push('RG_DTR_SUBSHELL_WRAP', rel, 'subshell wrapped command execution'); push('RG_SH01', rel, 'shell escape wrap'); }
  if (/process\.env\.NODE_OPTIONS\s*=/.test(txt)) push('RG_DTR_NODEOPT_OVERWRITE', rel, 'NODE_OPTIONS direct overwrite');
  if (/cd\s+[^\n]*&&\s*node\b/.test(txt)) push('RG_DTR_CD_NODE', rel, 'cd && node heuristic');
  if (txt.includes('--no-warnings') || txt.includes('--experimental-')) push('RG_DTR_NODE_FLAGS', rel, 'risky node flags in governed files');
  if (txt.includes('Date.now(') || txt.includes('new Date().toISOString()')) push('RG_DTR_TIME', rel, 'Date.now()/toISOString()');
  if (txt.includes('performance.now(') || txt.includes('process.hrtime')) push('RG_DTR_HRTIME', rel, 'performance.now/hrtime');
  if (txt.includes('toLocaleString(')) push('RG_DTR_LOCALE', rel, 'toLocaleString()');
  const spawnAllow = new Set(['scripts/export/evidence_bundle.mjs','scripts/verify/regression_bounded_kill_tree.mjs','scripts/verify/regression_net_kill_preload_hard.mjs','scripts/verify/regression_net_kill_preload_path_safe.mjs']);
  if (txt.includes('spawnSync(') && !rel.endsWith('spawn_bounded.mjs') && !spawnAllow.has(rel)) push('RG_DTR_SPAWNSYNC', rel, 'spawnSync outside spawn_bounded.mjs');
  if (/(\bfetch\(|\bhttp\.|\bhttps\.|\bdns\.|\bnet\.|\btls\.|\bundici\b|\bws\b)/.test(txt) && !allowNetwork.some((r) => r.test(rel))) push('RG_DTR_NETWORK', rel, 'network API/module usage outside allowlist');
  if (txt.includes('tar') && txt.includes(' -cf ') && (!txt.includes('--sort=name') || !txt.includes('--mtime') || !txt.includes('--numeric-owner'))) push('RG_DTR_TAR', rel, 'tar missing deterministic flags');
  if (txt.includes('gzip') && !txt.includes('gzip -n') && !txt.includes("'-n'")) push('RG_DTR_GZIP', rel, 'gzip without -n');
  if (rel.includes('evidence') && txt.includes('readdirSync(') && !txt.includes('.sort(')) push('RG_DTR_READDIR', rel, 'readdirSync without sort heuristic');
}

hits.sort((a, b) => (a.path === b.path ? a.rule_id.localeCompare(b.rule_id) : a.path.localeCompare(b.path)));
const first20 = hits.slice(0, 20);
const status = hits.length ? 'BLOCKED' : 'PASS';
const reason_code = hits.length ? 'RG_DTR01' : 'NONE';

writeMd(path.join(EXEC_DIR, 'REGRESSION_DETERMINISM_AUDIT.md'), `# REGRESSION_DETERMINISM_AUDIT.md\n\nSTATUS: ${status}\nREASON_CODE: ${reason_code}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${NEXT_ACTION}\n\n- target_files_n: ${files.length}\n- allowlist: ${allowNetwork.map((r) => r.toString()).join('; ')}\n- hits_count: ${hits.length}\n\n## FIRST_20_HITS\n${first20.length ? first20.map((h) => `- ${h.rule_id} ${h.path} :: ${h.detail}`).join('\n') : '- NONE'}\n`);
writeJsonDeterministic(path.join(MANUAL, 'regression_determinism_audit.json'), {
  schema_version: '1.0.0', status, reason_code, run_id: RUN_ID, next_action: NEXT_ACTION,
  target_files: files, allowlist: allowNetwork.map((r) => r.toString()), hits_count: hits.length, hits, first_20_hits: first20,
});
console.log(`[${status}] regression_determinism_audit — ${reason_code}`);
process.exit(hits.length ? 1 : 0);
