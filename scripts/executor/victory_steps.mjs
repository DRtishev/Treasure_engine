export const VICTORY_STEP_TIMEOUT_MS = Object.freeze({
  default: Number(process.env.VICTORY_STEP_TIMEOUT_DEFAULT_MS || 180000),
  foundation_seal: Number(process.env.VICTORY_STEP_TIMEOUT_FOUNDATION_MS || 900000),
  evidence_bundle_deterministic_x2: Number(process.env.VICTORY_STEP_TIMEOUT_BUNDLE_X2_MS || 600000),
});

const VICTORY_TEST_MODE_STEPS = Object.freeze([
  'npm run -s verify:public:data:readiness',
  'npm run -s verify:regression:data-readiness-ssot',
  'npm run -s verify:regression:liquidations-lock-schema-contract',
  'npm run -s verify:regression:truth-separation-no-foundation-readiness-claim',
]);

const VICTORY_FULL_MODE_STEPS = Object.freeze([
  'npm run -s verify:regression:determinism-audit',
  'npm run -s verify:regression:netkill-physics-full-surface',
  'npm run -s verify:regression:node-options-preload-eviction',
  'npm run -s verify:regression:net-kill-preload-hard',
  'npm run -s verify:regression:net-kill-preload-path-safe',
  'npm run -s verify:regression:executor-netkill-runtime-ledger',
  'npm run -s epoch:foundation:seal',
  'npm run -s verify:public:data:readiness',
  'npm run -s export:evidence-bundle',
  'npm run -s export:evidence-bundle:portable',
  'npm run -s verify:regression:evidence-bundle-deterministic-x2',
  'npm run -s verify:regression:evidence-bundle-portable-mode',
  'npm run -s verify:regression:portable-manifest-env-byte-free-strict',
  'npm run -s verify:regression:operator-single-action-ssot',
  'npm run -s verify:regression:gate-receipt-presence-contract',
]);

export function getVictorySteps(victoryTestMode) {
  return victoryTestMode ? [...VICTORY_TEST_MODE_STEPS] : [...VICTORY_FULL_MODE_STEPS];
}

export function getVictoryStepTimeoutMs(cmd) {
  if (cmd === 'npm run -s epoch:foundation:seal') return VICTORY_STEP_TIMEOUT_MS.foundation_seal;
  if (cmd === 'npm run -s verify:regression:evidence-bundle-deterministic-x2') return VICTORY_STEP_TIMEOUT_MS.evidence_bundle_deterministic_x2;
  return VICTORY_STEP_TIMEOUT_MS.default;
}

export function getVictoryStepPlan(victoryTestMode) {
  return getVictorySteps(victoryTestMode).map((cmd, index) => ({
    step_index: index + 1,
    cmd,
    timeout_ms: getVictoryStepTimeoutMs(cmd),
  }));
}
