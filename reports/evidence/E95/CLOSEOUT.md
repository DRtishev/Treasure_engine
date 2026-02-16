# E95 CLOSEOUT
- status: PASS
- cadence_ledger_fingerprint: 992d2a2692f09472f7bb0369d15ecd57cff4e8df42e12d60308dd80459c815e9
- e94_canonical_fingerprint: 2043167e95ad4790f202dbcd1fee52016cbaa5ab3b664e6a988f595c6c77514f
- fixture_cadence_hash: 4bcc96bda0cbeb4c227515366dec7e444289440d27f35397a7adab862d2590bc
- fixture_reason_hash: b958bc114df818356c12ff48e733af77cdb4d7ed9cb9fd2163d44f3550dbbeea
- readiness_policy_hash: 2a93dd88a4646cac2081272d22fe074ed175867e11523b1471be14fd3c52fa2e
- reason_history_fingerprint: 70036a12f038d8884881672771a52fc982f3e5ed536b1a6054c42ba49dfebdb2
- canonical_fingerprint: 02ae0135589e210395fd9e7dbcca665a9e9cee3825ad1a46b817d7883601357f
- exact_commands: npm ci; CI=false CHAIN_MODE=FAST_PLUS QUIET=1 npm run -s verify:e94; CI=true CHAIN_MODE=FAST_PLUS QUIET=1 npm run -s verify:e94; CI=false UPDATE_E95_EVIDENCE=1 CHAIN_MODE=FAST_PLUS QUIET=1 npm run -s verify:e95:update; CI=false CHAIN_MODE=FAST_PLUS QUIET=1 npm run -s verify:e95; CI=true CHAIN_MODE=FAST_PLUS QUIET=1 npm run -s verify:e95
