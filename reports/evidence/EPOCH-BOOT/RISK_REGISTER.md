# Risk Register (EPOCH-BOOT refresh #6)
- Risk: safety orchestration can drift from primitive adapter behavior.
  Mitigation: validator delegates checks directly to `core/exec/adapters/safety_gates.mjs`; behavior covered by `verify:safety` assertions.
- Risk: anti-flake claims can be overstated without reruns.
  Mitigation: mandatory `verify:e2` x2 and `verify:paper` x2 logs under `reports/evidence/EPOCH-BOOT/gates/`.
- Risk: evidence manifests may become inconsistent after any log update.
  Mitigation: regenerate SOURCE/EVIDENCE manifests only after all gate logs and summaries are finalized.
