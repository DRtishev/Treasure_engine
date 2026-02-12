# Risk Register
- Clean-clone proof overlays current workspace modifications into clone; if file status parsing changes, proof may miss newly introduced paths.
- verify:edge currently marks optional clean-clone sub-gate as SKIPPED unless ENABLE_CLEAN_CLONE=1 (explicit by design).
- Existing legacy evidence directories in repo can increase repository noise and make manual audits slower.
