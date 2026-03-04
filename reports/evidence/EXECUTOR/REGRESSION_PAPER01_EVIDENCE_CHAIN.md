# RG_PAPER01_EVIDENCE_CHAIN

STATUS: PASS
REASON_CODE: NONE
RUN_ID: STABLE
NEXT_ACTION: npm run -s verify:fast
CHECKS_TOTAL: 6
VIOLATIONS: 0

## CHECKS
- [PASS] PAPER01_GENESIS: OK: hash=39c507c01eab47cf...
- [PASS] PAPER01_LINK: OK: linked to genesis, hash=8e9061759226b5e8...
- [PASS] PAPER01_TAMPER_DETECTION: OK: good_chain=true tampered_chain=false breaks=1
- [PASS] PAPER01_SHORT_CHAIN_INELIGIBLE: OK: 1-day chain ineligible: FAILED: days_sufficient, trades_sufficient
- [PASS] PAPER01_FULL_CHAIN_ELIGIBLE: OK: 35 days, 130 trades, chain_valid=true, eligible=true
- [PASS] PAPER01_CHAIN_INTEGRITY: OK: 36 checkpoints, 0 breaks
