export function getVictorySteps(victoryTestMode) {
  return victoryTestMode ? [
    'npm run -s verify:public:data:readiness',
    'npm run -s verify:regression:data-readiness-ssot',
    'npm run -s verify:regression:liquidations-lock-schema-contract',
    'npm run -s verify:regression:truth-separation-no-foundation-readiness-claim',
  ] : [
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
  ];
}
