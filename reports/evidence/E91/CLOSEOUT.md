# E91 CLOSEOUT
- status: PASS
- e90_canonical_fingerprint: 2043167e95ad4790f202dbcd1fee52016cbaa5ab3b664e6a988f595c6c77514f
- fixture_fingerprint: c7e0a70ccee42a56a6210b852cad68fe10b2ba7812081dc73a63732e0ffe9e2b
- canonical_fingerprint: d4569682665d14cc6e3621a3ca1668c8c58a9eb963b699a0be8c117e39c16dd9
- exact_commands: npm ci; CI=false UPDATE_E91_EVIDENCE=1 CHAIN_MODE=FAST_PLUS QUIET=1 npm run -s verify:e91:update; CI=false CHAIN_MODE=FAST_PLUS QUIET=1 npm run -s verify:e91; CI=true CHAIN_MODE=FAST_PLUS QUIET=1 npm run -s verify:e91
