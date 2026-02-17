# E99 CLOSEOUT
- status: PASS
- e97_canonical_fingerprint: 2043167e95ad4790f202dbcd1fee52016cbaa5ab3b664e6a988f595c6c77514f
- e97_overlay_hash: 90adac21512f78837d64174b303866fb0295b9fba4bccae41faf7ca6fcd323cc
- e98_canonical_fingerprint: 2043167e95ad4790f202dbcd1fee52016cbaa5ab3b664e6a988f595c6c77514f
- post_apply_e97_fingerprint: 2043167e95ad4790f202dbcd1fee52016cbaa5ab3b664e6a988f595c6c77514f
- pre_apply_e97_fingerprint: 2043167e95ad4790f202dbcd1fee52016cbaa5ab3b664e6a988f595c6c77514f
- canonical_fingerprint: 6c2281616a12a181f16199b178a709265288e16b53fbdc618b75bcd1072d44fd
- exact_commands: npm ci; CI=false CHAIN_MODE=FAST_PLUS QUIET=1 npm run -s verify:e98; CI=true CHAIN_MODE=FAST_PLUS QUIET=1 npm run -s verify:e98; CI=false UPDATE_E99_EVIDENCE=1 CHAIN_MODE=FAST_PLUS QUIET=1 npm run -s verify:e99:update; CI=false CHAIN_MODE=FAST_PLUS QUIET=1 npm run -s verify:e99; CI=true CHAIN_MODE=FAST_PLUS QUIET=1 npm run -s verify:e99; CI=true UPDATE_E99_EVIDENCE=1 npm run -s verify:e99; CI=1 UPDATE_E99_EVIDENCE=1 npm run -s verify:e99; CI=false CHAIN_MODE=FAST_PLUS QUIET=1 npm run -s verify:e99:apply_rehearsal
