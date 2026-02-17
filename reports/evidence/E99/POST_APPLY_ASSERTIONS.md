# E99 POST APPLY ASSERTIONS

- idempotent: PASS
- apply_verdict: PASS
- stability_ok: PASS

## Contract
- Apply must be idempotent (x2 overlay hash match)
- Apply must not degrade stability metrics
- Insufficient data → OBSERVE, not PROMOTE
