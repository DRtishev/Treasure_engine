# E90 CLOSEOUT
- status: PASS
- canary_policy_hash: 7520718ad2bdd020d4d45a7a11f46beaa70b5f1dbabfcad59aca40b657f8231f
- e89_canonical_fingerprint: 2043167e95ad4790f202dbcd1fee52016cbaa5ab3b664e6a988f595c6c77514f
- fixture_fingerprint: c7e0a70ccee42a56a6210b852cad68fe10b2ba7812081dc73a63732e0ffe9e2b
- park_policy_hash: 31bb8d4ce28b960b1c114a5ed6fee67fda8f793ee9e35d1ab10d85b9cceb9f06
- threshold_policy_hash: e251c6a7a9f96073ff17395a2db1921d56b6c40fed04695c191a0879909b1903
- canonical_fingerprint: aed70e50a3417ada19fdf12a955a0fb75fe606e8f150b95edb8e0c1c2bd800d0
- exact_commands: npm ci; CI=false UPDATE_E90_EVIDENCE=1 CHAIN_MODE=FAST_PLUS QUIET=1 npm run -s verify:e90:update; CI=false CHAIN_MODE=FAST_PLUS QUIET=1 npm run -s verify:e90; CI=true CHAIN_MODE=FAST_PLUS QUIET=1 npm run -s verify:e90
