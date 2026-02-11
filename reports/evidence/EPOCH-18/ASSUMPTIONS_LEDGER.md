# ASSUMPTIONS_LEDGER — EPOCH-18

1. Deterministic ranking can be achieved with stable sort + seed-based tie-break.
2. Existing risk caps in `spec/ssot.json` are enough to bound allocations.
3. Strategy conversion can reuse existing execution intent fields.
4. New strategy modules can be tested without network dependencies.
5. Baseline gates remain green after adding strategy layer modules.
