# Risk Register Delta

- Residual risk: npm emits env warning `Unknown env config "http-proxy"`; non-blocking and does not alter gate determinism.
- Residual risk: clean-clone strict mode (`ENABLE_CLEAN_CLONE=1`) remains opt-in at aggregate level, while epoch40 still certifies clean clone internally.
- Mitigation: keep `verify:edge:strict` as release preflight and preserve epoch40 mandatory `CLEAN_CLONE_PROOF.md` generation.
