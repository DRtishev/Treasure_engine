const DEFAULT_STEP_TIMEOUT_MS = Number(process.env.VICTORY_STEP_TIMEOUT_DEFAULT_MS || 180000);
const FOUNDATION_STEP_TIMEOUT_MS = Number(process.env.VICTORY_STEP_TIMEOUT_FOUNDATION_MS || 900000);
const BUNDLE_X2_STEP_TIMEOUT_MS = Number(process.env.VICTORY_STEP_TIMEOUT_BUNDLE_X2_MS || 600000);
const WRAPPER_OVERHEAD_MARGIN_MS = Number(process.env.VICTORY_WRAPPER_OVERHEAD_MARGIN_MS || 30000);

export const VICTORY_STEP_TIMEOUT_MS = Object.freeze({
  default: DEFAULT_STEP_TIMEOUT_MS,
  foundation_seal: FOUNDATION_STEP_TIMEOUT_MS,
  evidence_bundle_deterministic_x2: BUNDLE_X2_STEP_TIMEOUT_MS,
});

const FAST_STEPS = Object.freeze([
  'npm run -s verify:regression:determinism-audit',
  'npm run -s verify:regression:node-truth-alignment',
  'npm run -s verify:regression:node-wrap-contract',
  'npm run -s verify:regression:node-vendored-backend-must-win',
  'npm run -s verify:regression:node-nvm-ban',
  'npm run -s verify:regression:churn-contract01',
  'npm run -s verify:regression:ec01-reason-context-contract',
  'npm run -s verify:regression:netkill-ledger-enforcement',
]);

const CLOSE_STEPS = Object.freeze([
  'npm run -s verify:regression:determinism-audit',
  'npm run -s verify:regression:operator-single-action-ssot',
  'npm run -s verify:regression:gate-receipt-presence-contract',
  'npm run -s verify:regression:ec01-reason-context-contract',
  'npm run -s verify:regression:churn-contract01',
]);

const AUDIT_STEPS = Object.freeze([
  'npm run -s verify:regression:determinism-audit',
  'npm run -s verify:regression:netkill-physics-full-surface',
  'npm run -s verify:regression:node-options-preload-eviction',
  'npm run -s verify:regression:net-kill-preload-hard',
  'npm run -s verify:regression:net-kill-preload-path-safe',
  'npm run -s verify:regression:executor-netkill-runtime-ledger',
  'npm run -s epoch:foundation:seal',
  'npm run -s export:evidence-bundle',
  'npm run -s export:evidence-bundle:portable',
  'npm run -s verify:regression:evidence-bundle-deterministic-x2',
  'npm run -s verify:regression:evidence-bundle-portable-mode',
  'npm run -s verify:regression:portable-manifest-env-byte-free-strict',
  'npm run -s verify:regression:operator-single-action-ssot',
  'npm run -s verify:regression:gate-receipt-presence-contract',
]);

export function getVictoryProfile() {
  const raw = String(process.env.VICTORY_PROFILE || 'FAST').trim().toUpperCase();
  if (raw === 'CLOSE') return 'CLOSE';
  if (raw === 'AUDIT') return 'AUDIT';
  if (raw === 'FULL') return 'AUDIT';
  return 'FAST';
}

export function getVictorySteps(_victoryTestMode) {
  const profile = getVictoryProfile();
  if (profile === 'AUDIT') return [...AUDIT_STEPS];
  if (profile === 'CLOSE') return [...CLOSE_STEPS];
  return [...FAST_STEPS];
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

export function getVictoryWrapperBudget(victoryTestMode) {
  const stepPlan = getVictoryStepPlan(victoryTestMode);
  const step_timeout_sum_ms = stepPlan.reduce((acc, step) => acc + Number(step.timeout_ms || 0), 0);
  const wrapper_timeout_ms = Number(process.env.VICTORY_WRAPPER_TIMEOUT_MS || (step_timeout_sum_ms + WRAPPER_OVERHEAD_MARGIN_MS));
  return {
    wrapper_timeout_ms,
    step_timeout_sum_ms,
    overhead_margin_ms: WRAPPER_OVERHEAD_MARGIN_MS,
    required_min_wrapper_timeout_ms: step_timeout_sum_ms + WRAPPER_OVERHEAD_MARGIN_MS,
    profile: getVictoryProfile(),
  };
}
