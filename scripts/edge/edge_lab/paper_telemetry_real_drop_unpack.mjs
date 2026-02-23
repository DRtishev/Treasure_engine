import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { writeJsonDeterministic } from '../../lib/write_json_deterministic.mjs';
import { RUN_ID, writeMd } from './canon.mjs';

const ROOT = path.resolve(process.cwd());
const INCOMING = path.join(ROOT, 'artifacts', 'incoming');
const DROP_PATH = path.join(INCOMING, 'REAL_DROP.tar.gz');
const OUT_MD = path.join(ROOT, 'reports', 'evidence', 'EDGE_PROFIT_00', 'real', 'REAL_DROP_UNPACK.md');
const OUT_JSON = path.join(ROOT, 'reports', 'evidence', 'EDGE_PROFIT_00', 'real', 'gates', 'manual', 'real_drop_unpack.json');
const PROFILE_PATH = path.join(INCOMING, 'paper_telemetry.profile');
const NEXT_ACTION = 'npm run -s edge:profit:00:real:drop:unpack';

fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
fs.mkdirSync(INCOMING, { recursive: true });

function sha256File(abs) {
  const raw = fs.readFileSync(abs);
  return crypto.createHash('sha256').update(raw).digest('hex');
}

function runTar(args) {
  const run = spawnSync('tar', args, { cwd: ROOT, encoding: 'utf8', env: process.env });
  return { ec: Number.isInteger(run.status) ? run.status : 1, out: `${run.stdout || ''}${run.stderr || ''}` };
}

function write(status, reasonCode, message, diagnostics = [], extracted = []) {
  writeMd(OUT_MD, `# REAL_DROP_UNPACK.md\n\nSTATUS: ${status}\nREASON_CODE: ${reasonCode}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${NEXT_ACTION}\n\n- drop_path: artifacts/incoming/REAL_DROP.tar.gz\n- extracted_n: ${extracted.length}\n\n## EXTRACTED\n\n${extracted.map((e) => `- ${e}`).join('\n') || '- NONE'}\n\n## DIAGNOSTICS\n\n${diagnostics.map((d) => `- ${d}`).join('\n') || '- NONE'}\n`);
  writeJsonDeterministic(OUT_JSON, {
    schema_version: '1.0.0',
    status,
    reason_code: reasonCode,
    run_id: RUN_ID,
    message,
    next_action: NEXT_ACTION,
    drop_path: 'artifacts/incoming/REAL_DROP.tar.gz',
    extracted,
    diagnostics,
  });
}

if (!fs.existsSync(DROP_PATH)) {
  write('NEEDS_DATA', 'RDROP01', 'REAL_DROP.tar.gz is missing.', ['missing:artifacts/incoming/REAL_DROP.tar.gz']);
  console.log('[NEEDS_DATA] paper_telemetry_real_drop_unpack — RDROP01');
  process.exit(0);
}

const list = runTar(['-tzf', DROP_PATH]);
if (list.ec !== 0) {
  write('FAIL', 'RDROP02', 'Unable to read REAL_DROP tar manifest.', [`tar_list_ec:${list.ec}`, `tar_output:${list.out.trim().slice(0, 400)}`]);
  console.log('[FAIL] paper_telemetry_real_drop_unpack — RDROP02');
  process.exit(1);
}

const entries = list.out.split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
const allowed = new Set(['raw_paper_telemetry.csv', 'metadata.json']);
const required = new Set(['raw_paper_telemetry.csv']);
const diagnostics = [`tar_sha256:${sha256File(DROP_PATH)}`];

function unsafeEntry(e) {
  if (e.includes('..')) return 'path_traversal';
  if (e.startsWith('/')) return 'absolute_path';
  if (e.includes('\\')) return 'backslash_path';
  if (e.includes('/')) return 'nested_path';
  if (e.endsWith('/')) return 'directory_entry';
  return '';
}

let invalid = '';
for (const e of entries) {
  const why = unsafeEntry(e);
  if (why) {
    invalid = `${why}:${e}`;
    break;
  }
  if (!allowed.has(e)) {
    invalid = `unexpected_entry:${e}`;
    break;
  }
}

for (const req of required) {
  if (!entries.includes(req)) {
    invalid = `missing_required:${req}`;
    break;
  }
}

if (invalid || entries.length !== new Set(entries).size) {
  diagnostics.push(invalid || 'duplicate_entries');
  write('FAIL', 'RDROP02', 'REAL_DROP content failed safety/schema validation.', diagnostics, entries);
  console.log('[FAIL] paper_telemetry_real_drop_unpack — RDROP02');
  process.exit(1);
}

const extracted = [];
for (const name of entries) {
  const ext = runTar(['-xzf', DROP_PATH, '-C', INCOMING, '--', name]);
  if (ext.ec !== 0) {
    diagnostics.push(`extract_failed:${name}:ec=${ext.ec}`);
    write('FAIL', 'RDROP02', `Extraction failed for ${name}.`, diagnostics, extracted);
    console.log('[FAIL] paper_telemetry_real_drop_unpack — RDROP02');
    process.exit(1);
  }
  extracted.push(`artifacts/incoming/${name}`);
}

fs.writeFileSync(PROFILE_PATH, 'real\n');
diagnostics.push('profile_marker:artifacts/incoming/paper_telemetry.profile=real');
diagnostics.push('edge_profit_profile_env:real-compatible');

write('PASS', 'NONE', 'REAL_DROP unpacked and validated.', diagnostics, extracted);
console.log('[PASS] paper_telemetry_real_drop_unpack — NONE');
