/**
 * deps_offline_install_contract.mjs — R12 offline deps detection
 *
 * Uses closed-port registry technique (npm_config_registry=http://127.0.0.1:9)
 * + prefer-offline to test if npm install requires network access.
 *
 * Outcomes (R12):
 * - PASS: install requires no registry/network (all deps satisfied offline)
 * - BLOCKED DEP01: registry/network access attempted (capsule required)
 * - FAIL DEP02: native build attempted outside allowed capsule/toolchain policy
 * - FAIL DEP03: x2 install nondeterminism under same capsule
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync, spawnSync } from 'node:child_process';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';
import { RUN_ID } from '../edge/edge_lab/canon.mjs';

const ROOT = path.resolve(process.cwd());
const EVIDENCE_DIR = path.join(ROOT, 'reports', 'evidence', 'INFRA_P0');
const MANUAL_DIR = path.join(EVIDENCE_DIR, 'gates', 'manual');

fs.mkdirSync(MANUAL_DIR, { recursive: true });

// ---------------------------------------------------------------------------
// Deterministic stderr pattern scan
// ---------------------------------------------------------------------------
const REGISTRY_FETCH_PATTERNS = [
  /ECONNREFUSED/,
  /connect ECONNREFUSED/,
  /network/i,
  /getaddrinfo ENOTFOUND/,
  /proxy error/i,
  /registry\.npmjs\.org/,
  /http:\/\/127\.0\.0\.1:9/,
];

const NATIVE_BUILD_PATTERNS = [
  /node-gyp/,
  /binding\.gyp/,
  /node_modules\/.*\/build/,
  /prebuild-install/,
  /node-pre-gyp/,
];

function scanForPattern(text, patterns) {
  return patterns.filter((p) => p.test(text));
}

/**
 * Run npm install with closed-port registry and prefer-offline.
 * Returns { exitCode, stdout, stderr, durationMs }
 */
function runOfflineInstall(attempt) {
  const startMs = Date.now();
  const result = spawnSync(
    'npm',
    ['install', '--prefer-offline', '--dry-run', '--no-audit', '--no-fund'],
    {
      cwd: ROOT,
      encoding: 'utf8',
      env: {
        ...process.env,
        npm_config_registry: 'http://127.0.0.1:9',
        npm_config_prefer_offline: 'true',
        // Prevent any proxy from intercepting
        npm_config_proxy: '',
        npm_config_https_proxy: '',
      },
      timeout: 30000,
    }
  );

  return {
    attempt,
    durationMs: Date.now() - startMs,
    exitCode: result.status ?? -1,
    stderr: result.stderr ?? '',
    stdout: result.stdout ?? '',
  };
}

// ---------------------------------------------------------------------------
// Run x2 for DEP03 check
// ---------------------------------------------------------------------------
console.log('[deps_offline] Running install attempt 1/2 (closed-port registry)...');
const run1 = runOfflineInstall(1);

console.log('[deps_offline] Running install attempt 2/2 (closed-port registry)...');
const run2 = runOfflineInstall(2);

// ---------------------------------------------------------------------------
// Analyze results
// ---------------------------------------------------------------------------
const registryPatterns1 = scanForPattern(run1.stderr + run1.stdout, REGISTRY_FETCH_PATTERNS);
const registryPatterns2 = scanForPattern(run2.stderr + run2.stdout, REGISTRY_FETCH_PATTERNS);
const nativePatterns1 = scanForPattern(run1.stderr + run1.stdout, NATIVE_BUILD_PATTERNS);
const nativePatterns2 = scanForPattern(run2.stderr + run2.stdout, NATIVE_BUILD_PATTERNS);

const needsNetwork1 = registryPatterns1.length > 0 || (run1.exitCode !== 0 && !run1.stderr.includes('npm warn'));
const needsNetwork2 = registryPatterns2.length > 0 || (run2.exitCode !== 0 && !run2.stderr.includes('npm warn'));

const hasNativeBuild = nativePatterns1.length > 0 || nativePatterns2.length > 0;

// Drift detection: normalize stdout for comparison (remove timing info)
function normalizeInstallOutput(s) {
  return s
    .replace(/in \d+(\.\d+)?(ms|s)/g, 'in RUN_MS')
    .replace(/\d+\.\d+s/g, 'RUN_S')
    .replace(/\(\d+ms\)/g, '(RUN_MS)')
    .trim();
}

const normalized1 = normalizeInstallOutput(run1.stdout + '\n' + run1.stderr);
const normalized2 = normalizeInstallOutput(run2.stdout + '\n' + run2.stderr);
const x2Drift = normalized1 !== normalized2;

// Determine outcome
let status, reason_code, message, next_action;

if (hasNativeBuild) {
  status = 'FAIL';
  reason_code = 'DEP02';
  message = 'Native build (node-gyp or equivalent) detected during offline install check. Native builds require capsule/toolchain policy approval.';
  next_action = 'Review native dependency. Either pre-build in capsule, use prebuilt binaries, or add to approved native build list.';
} else if (x2Drift && run1.exitCode === 0 && run2.exitCode === 0) {
  status = 'FAIL';
  reason_code = 'DEP03';
  message = 'Install nondeterminism detected: x2 runs under same capsule produced different output.';
  next_action = 'Investigate install nondeterminism. Check for non-deterministic package resolution or OS-level timing variance.';
} else if (needsNetwork1 || needsNetwork2) {
  status = 'BLOCKED';
  reason_code = 'DEP01';
  message = 'Offline install attempted registry/network access. A dependency capsule (npm cache or bundled node_modules) is required for offline operation.';
  next_action = 'Provide offline capsule: run "npm ci" in an online environment, then package node_modules as capsule. Or use "npm pack" to bundle dependencies.';
} else {
  status = 'PASS';
  reason_code = 'NONE';
  message = `All dependencies satisfiable offline (no registry/network required). x2 runs consistent. Exit codes: [${run1.exitCode}, ${run2.exitCode}].`;
  next_action = 'No action required. Dependencies are fully offline-satisfiable.';
}

// Write machine JSON
const gateResult = {
  schema_version: '1.0.0',
  has_native_build: hasNativeBuild,
  message,
  native_patterns_found: [...new Set([...nativePatterns1, ...nativePatterns2].map((p) => p.source))],
  next_action,
  reason_code,
  registry_patterns_run1: registryPatterns1.map((p) => p.source),
  registry_patterns_run2: registryPatterns2.map((p) => p.source),
  run1_exit_code: run1.exitCode,
  run2_exit_code: run2.exitCode,
  run_id: RUN_ID,
  status,
  x2_drift: x2Drift,
};

writeJsonDeterministic(path.join(MANUAL_DIR, 'deps_offline_install.json'), gateResult);

// Write markdown evidence
const md = `# DEPS_OFFLINE_INSTALL.md

STATUS: ${status}
REASON_CODE: ${reason_code}
RUN_ID: ${RUN_ID}
NEXT_ACTION: ${next_action}

## Methodology

Uses closed-port registry (npm_config_registry=http://127.0.0.1:9) + prefer-offline.
Runs npm install --dry-run twice (x2 anti-flake).
Scans stderr + stdout for registry fetch / native build / drift patterns.

## Results

| Metric | Run 1 | Run 2 |
|--------|-------|-------|
| exit_code | ${run1.exitCode} | ${run2.exitCode} |
| duration_ms | ${run1.durationMs} | ${run2.durationMs} |
| registry_patterns | ${registryPatterns1.length} | ${registryPatterns2.length} |
| native_patterns | ${nativePatterns1.length} | ${nativePatterns2.length} |
| x2_drift | ${x2Drift} | - |

## Outcome

**${status}** — ${reason_code}

${message}

## Evidence Paths

- reports/evidence/INFRA_P0/gates/manual/deps_offline_install.json
- reports/evidence/INFRA_P0/DEPS_OFFLINE_INSTALL.md
`;

fs.writeFileSync(path.join(EVIDENCE_DIR, 'DEPS_OFFLINE_INSTALL.md'), md);

if (status === 'PASS') {
  console.log(`[PASS] deps_offline_install_contract — ${message}`);
  process.exit(0);
} else {
  console.error(`[${status}] deps_offline_install_contract — ${reason_code}: ${message}`);
  // DEP01 (BLOCKED) exits 1; DEP02/DEP03 (FAIL) exits 1
  process.exit(1);
}
