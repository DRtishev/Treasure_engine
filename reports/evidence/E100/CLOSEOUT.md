# E100 CLOSEOUT
- status: PASS
- e97_canonical_fingerprint: 2043167e95ad4790f202dbcd1fee52016cbaa5ab3b664e6a988f595c6c77514f
- e97_overlay_hash: 90adac21512f78837d64174b303866fb0295b9fba4bccae41faf7ca6fcd323cc
- e97_profit_ledger_hash: c686ea159b4a2ff9ff1ef203a077118feace4f58c1f946ce31a7bbd1e39845c9
- e98_canonical_fingerprint: 2043167e95ad4790f202dbcd1fee52016cbaa5ab3b664e6a988f595c6c77514f
- e99_canonical_fingerprint: 2043167e95ad4790f202dbcd1fee52016cbaa5ab3b664e6a988f595c6c77514f
- canonical_fingerprint: 3ee630f1e353a1ea3707ea4347ba932c4452b110e8e9ec4584d3ec04ff7916a0
- exact_commands: npm ci; CI=false CHAIN_MODE=FAST_PLUS QUIET=1 npm run -s verify:e99; CI=true CHAIN_MODE=FAST_PLUS QUIET=1 npm run -s verify:e99; CI=false UPDATE_E100_EVIDENCE=1 CHAIN_MODE=FAST_PLUS QUIET=1 npm run -s verify:e100:update; CI=false CHAIN_MODE=FAST_PLUS QUIET=1 npm run -s verify:e100; CI=true CHAIN_MODE=FAST_PLUS QUIET=1 npm run -s verify:e100; CI=true UPDATE_E100_EVIDENCE=1 npm run -s verify:e100; CI=1 UPDATE_E100_EVIDENCE=1 npm run -s verify:e100; CI=false UPDATE_E100_EVIDENCE=1 UPDATE_E100_APPLY=1 APPLY_MODE=APPLY CHAIN_MODE=FAST_PLUS QUIET=1 npm run -s verify:e100:apply_txn; CI=false ROLLBACK_E100=1 ROLLBACK_MODE=ROLLBACK CHAIN_MODE=FAST_PLUS QUIET=1 npm run -s verify:e100:rollback
