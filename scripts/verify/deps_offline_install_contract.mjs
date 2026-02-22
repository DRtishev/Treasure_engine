/**
 * deps_offline_install_contract.mjs — R12 offline deps detection
 *
 * Uses two complementary strategies:
 *
 * 1. Static lock scan: parse package-lock.json for packages with hasInstallScript=true
 *    or native-build dependencies (node-gyp, prebuild-install, node-pre-gyp).
 *    This deterministically detects DEP02 without relying on --dry-run output.
 *
 * 2. Closed-port registry test (npm_config_registry=http://127.0.0.1:9)
 *    + prefer-offline to test if npm install requires network access (DEP01).
 *    Run x2 for DEP03 nondeterminism check.
 *
 * Outcomes (R12):
 * - PASS: install requires no registry/network AND no native build candidates found
 * - BLOCKED DEP01: registry/network access attempted (capsule required)
 * - FAIL DEP02: native build candidates found in lock (hasInstallScript or native deps)
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
// B3 fix: Static package-lock.json scan for native build candidates
// This is the primary DEP02 detection method — deterministic, no dry-run required.
// ---------------------------------------------------------------------------

// Native build dependency names that indicate a native build requirement
const NATIVE_BUILD_DEP_NAMES = ['node-gyp', 'prebuild-install', 'node-pre-gyp', 'node-pre-gyp-init'];

// Packages explicitly allowed to have install scripts (allowlist)
const NATIVE_BUILD_ALLOWLIST = [];


function readRootPackageJson() {
  const pkgPath = path.join(ROOT, 'package.json');
  if (!fs.existsSync(pkgPath)) return { optionalNativeSet: new Set(), sqliteEnabled: false };
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    const optionalNativeSet = new Set(Object.keys(pkg.optionalDependencies || {}));
    return {
      optionalNativeSet,
      sqliteEnabled: process.env.ENABLE_SQLITE_PERSISTENCE === '1',
    };
  } catch {
    return { optionalNativeSet: new Set(), sqliteEnabled: false };
  }
}


function scanLockFileForNativeCandidates() {
  const lockPath = path.join(ROOT, 'package-lock.json');
  if (!fs.existsSync(lockPath)) {
    return { error: 'package-lock.json not found', candidates: [] };
  }

  let lock;
  try {
    lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
  } catch (e) {
    return { error: `package-lock.json parse error: ${e.message}`, candidates: [] };
  }

  const packages = lock.packages || {};
  const candidates = [];

  for (const [pkgPath, pkgData] of Object.entries(packages)) {
    if (!pkgPath || pkgPath === '') continue; // skip root package entry

    // Extract package name from path (e.g. "node_modules/better-sqlite3" -> "better-sqlite3")
    const pkgName = pkgPath.replace(/^.*node_modules\//, '');

    if (NATIVE_BUILD_ALLOWLIST.includes(pkgName)) continue;

    const reasons = [];

    // Check hasInstallScript flag
    if (pkgData.hasInstallScript === true) {
      reasons.push('hasInstallScript=true');
    }

    // Check dependencies for native build tool names
    const allDeps = {
      ...pkgData.dependencies,
      ...pkgData.devDependencies,
      ...pkgData.optionalDependencies,
    };
    for (const depName of NATIVE_BUILD_DEP_NAMES) {
      if (depName in allDeps) {
        reasons.push(`dep:${depName}`);
      }
    }

    if (reasons.length > 0) {
      candidates.push({
        package: pkgName,
        version: pkgData.version || 'unknown',
        reasons,
        path: pkgPath,
      });
    }
  }

  return { error: null, candidates };
}

console.log('[deps_offline] Running static lock scan for native build candidates...');
const lockScan = scanLockFileForNativeCandidates();
const nativeCandidates = lockScan.candidates;
const lockScanError = lockScan.error;
const { optionalNativeSet, sqliteEnabled } = readRootPackageJson();

const requiredNativeCandidates = nativeCandidates.filter((c) => !optionalNativeSet.has(c.package));
const optionalNativeCandidates = nativeCandidates.filter((c) => optionalNativeSet.has(c.package));

if (lockScanError) {
  console.warn(`[deps_offline] Lock scan warning: ${lockScanError}`);
} else {
  console.log(`[deps_offline] Lock scan complete: ${nativeCandidates.length} native candidate(s) found`);
  if (optionalNativeCandidates.length > 0) console.log(`[deps_offline] Optional-native candidates: ${optionalNativeCandidates.map((c)=>c.package).join(', ')}`);
  for (const c of nativeCandidates) {
    console.log(`  - ${c.package}@${c.version}: ${c.reasons.join(', ')}`);
  }
}

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

// B3 fix: DEP02 is now detected by static lock scan (primary) + runtime patterns (secondary).
// --dry-run skips install scripts so runtime patterns alone cannot be trusted for DEP02.
const hasNativeBuildRuntime = nativePatterns1.length > 0 || nativePatterns2.length > 0;
const optionalNativeInstalled = optionalNativeCandidates.some((c) => fs.existsSync(path.join(ROOT, c.path)));
const optionalNativeAllowed = !sqliteEnabled && !optionalNativeInstalled;
const hasNativeBuildLock = requiredNativeCandidates.length > 0 || (optionalNativeCandidates.length > 0 && !optionalNativeAllowed);
const hasNativeBuild = hasNativeBuildLock || hasNativeBuildRuntime;

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
  const detectionSource = hasNativeBuildLock ? 'static lock scan' : 'runtime pattern scan';
  const candidatePool = hasNativeBuildLock ? (requiredNativeCandidates.length > 0 ? requiredNativeCandidates : optionalNativeCandidates) : nativeCandidates;
  const candidateNames = candidatePool.map((c) => `${c.package}@${c.version}`).join(', ') || '(runtime-detected only)';
  message = `Native build candidates detected via ${detectionSource}: [${candidateNames}]. Native builds require capsule/toolchain policy approval unless optional-native policy is satisfied.`;
  next_action = 'Use npm ci --omit=optional and keep ENABLE_SQLITE_PERSISTENCE=0, or provide approved native capsule mitigation.';
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
  has_native_build_lock: hasNativeBuildLock,
  has_native_build_runtime: hasNativeBuildRuntime,
  optional_native_allowed: optionalNativeAllowed,
  optional_native_installed: optionalNativeInstalled,
  sqlite_persistence_enabled: sqliteEnabled,
  message,
  native_candidates_lock: nativeCandidates,
  native_candidates_required: requiredNativeCandidates,
  native_candidates_optional: optionalNativeCandidates,
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
const nativeCandidatesTable = nativeCandidates.length > 0
  ? nativeCandidates.map((c) => `| \`${c.package}\` | ${c.version} | ${c.reasons.join(', ')} |`).join('\n')
  : '| (none found) | — | — |';

const md = `# DEPS_OFFLINE_INSTALL_CONTRACT.md

STATUS: ${status}
REASON_CODE: ${reason_code}
RUN_ID: ${RUN_ID}
NEXT_ACTION: ${next_action}

## Methodology

**Primary (B3 fix): Static lock scan** — parses package-lock.json for:
- Packages with \`hasInstallScript=true\`
- Packages with dependencies on: ${NATIVE_BUILD_DEP_NAMES.join(', ')}
This is deterministic and not affected by --dry-run illusions.

**Secondary: Closed-port registry test** — npm_config_registry=http://127.0.0.1:9 + prefer-offline.
Runs npm install --dry-run twice (x2 anti-flake) for DEP01/DEP03 detection.

## Native Candidates (Static Lock Scan)

| Package | Version | Reasons |
|---------|---------|---------|
${nativeCandidatesTable}

## Dry-Run Results

| Metric | Run 1 | Run 2 |
|--------|-------|-------|
| exit_code | ${run1.exitCode} | ${run2.exitCode} |
| duration_ms | ${run1.durationMs} | ${run2.durationMs} |
| registry_patterns | ${registryPatterns1.length} | ${registryPatterns2.length} |
| native_patterns (runtime) | ${nativePatterns1.length} | ${nativePatterns2.length} |
| optional_native_allowed | ${optionalNativeAllowed} | - |
| optional_native_installed | ${optionalNativeInstalled} | - |
| ENABLE_SQLITE_PERSISTENCE | ${sqliteEnabled ? '1' : '0'} | - |
| x2_drift | ${x2Drift} | - |

## Outcome

**${status}** — ${reason_code}

${message}

## Evidence Paths

- reports/evidence/INFRA_P0/gates/manual/deps_offline_install.json
- reports/evidence/INFRA_P0/DEPS_OFFLINE_INSTALL_CONTRACT.md
`;

fs.writeFileSync(path.join(EVIDENCE_DIR, 'DEPS_OFFLINE_INSTALL_CONTRACT.md'), md);

if (status === 'PASS') {
  console.log(`[PASS] deps_offline_install_contract — ${message}`);
  process.exit(0);
} else {
  console.error(`[${status}] deps_offline_install_contract — ${reason_code}: ${message}`);
  // DEP01 (BLOCKED) exits 1; DEP02/DEP03 (FAIL) exits 1
  process.exit(1);
}
