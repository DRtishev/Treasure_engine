# PURPOSE
This policy defines autonomous closeout behavior for TREASURE ENGINE with Truth Layer enforcement.

# SAFETY & OFFLINE POLICY
- Offline-first by default; network operations are opt-in only via `ENABLE_NETWORK_TESTS=1`.
- Never commit secrets, tokens, or live-trading credentials.
- Live trading must remain disabled by default.
- Never commit `node_modules/`; binary archives must be written to `artifacts/incoming/` and kept gitignored.

# EVIDENCE PROTOCOL
- Every execution cycle must use `reports/evidence/<EVIDENCE_EPOCH>/`.
- All gate runs must write logs under that cycle folder.
- Required evidence must include machine-readable gate outputs, checksums, summaries, and verdict.
- PASS/BLOCKED claims must cite concrete evidence file paths.

# ANTI-REGRESSION DOCTRINE
- Required gates must run in deterministic, reproducible mode.
- Two-run anti-flake is mandatory where policy requires repeat verification.
- Multi-seed stability checks are required where randomness exists.
- Ledger updates are allowed only after required gates pass in the same evidence cycle.

# AUTONOMOUS EPOCH EXECUTION
- Maintain specs and ledger for all epochs in scope.
- Execute gates in declared order and repair root cause on failure.
- Keep patches minimal and focused on failing invariants.

# OUTPUT STANDARD
- Report exact commands executed, gate outcomes, and evidence locations.
- Publish checksum outputs for source/evidence/export artifacts.
- Record final verdict with PASS or BLOCKED and supporting paths.

# STOP RULES
- Stop and publish a diagnostic when critical gates fail twice without clear root cause.
- Do not claim completion without reproducible logs and validated checksums.
