# ASSUMPTIONS_LEDGER — EPOCH-17

1. Existing adapter contracts can support safety-integrated wrapper without changing adapter internals.
2. Risk governor `preCheck` + `update` APIs are sufficient to enforce block/allow flow.
3. Adding `verify:epoch17` will not break existing scripts.
4. Existing baseline gates remain stable after EPOCH-17 additions.
5. Live mode remains blocked by default unless explicit confirmation/env preconditions are provided.
