# E96 CLOSEOUT
- status: PASS
- cadence_ledger_fingerprint: 992d2a2692f09472f7bb0369d15ecd57cff4e8df42e12d60308dd80459c815e9
- e95_canonical_fingerprint: 2043167e95ad4790f202dbcd1fee52016cbaa5ab3b664e6a988f595c6c77514f
- e96_cadence_fixture_hash: d50bf9d1587b0547637ef8f665a5e5f0ef07b099d856a3df07a4508e868310f5
- e96_policy_hash: e2ff9ea5160687d60b6043a4be14efe0c6141e3a4fef3317347558a389167903
- e96_reason_fixture_hash: 960dfd0f7b6a7c4869657ed05ebe63b3edc38e783c403e114de8727151881b04
- reason_history_fingerprint: 70036a12f038d8884881672771a52fc982f3e5ed536b1a6054c42ba49dfebdb2
- canonical_fingerprint: 05cc3064da1a25542c3e6ff274533d7b3d6c96c5ac2cf291bd4b76471556ca70
- exact_commands: npm ci; CI=false CHAIN_MODE=FAST_PLUS QUIET=1 npm run -s verify:e95; CI=true CHAIN_MODE=FAST_PLUS QUIET=1 npm run -s verify:e95; CI=false UPDATE_E96_EVIDENCE=1 CHAIN_MODE=FAST_PLUS QUIET=1 npm run -s verify:e96:update; CI=false CHAIN_MODE=FAST_PLUS QUIET=1 npm run -s verify:e96; CI=true CHAIN_MODE=FAST_PLUS QUIET=1 npm run -s verify:e96
