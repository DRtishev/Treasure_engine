# EDGE Canonical Glossary

> **SSOT**: This is the single source of truth for terminology across E31..E40 specs.
> All epoch specs, research docs, and contracts must use these definitions consistently.
> Changes require review and `verify:specs` re-run.

## Terms

**CanaryPhase**: Staged allocation ramp (5 -> 15 -> 35 -> 70 -> 100 percent) with rollback gates at each transition. Phase skipping is forbidden.

**CertificationReport**: Immutable release artifact containing all epoch gate results, ledger snapshot hash, spec hash, evidence hash, clean-clone reproducibility references, and approvals.

**Deterministic Fingerprint**: `sha256` hash over canonicalized JSON payload and declared input set. Identical inputs must always produce identical fingerprint. Any mismatch is a deterministic failure (FAIL).

**EvidencePack**: Complete set of logs, manifests, and verdict for a run. Must include PREFLIGHT, gate logs, SUMMARY, VERDICT, and checksums.

**FeatureFrame**: Point-in-time feature row keyed by `(symbol, ts_event)` with provenance. Must satisfy no-lookahead invariant: `source_ts <= ts_event` for all contributing data.

**FeatureManifest**: Immutable metadata for a feature extraction run. Chains dataset hash, feature hash, config hash, seed, and schema version.

**Fill**: Simulated or live execution result with price, size, latency, and fees. Fantasy fills (zero spread/fees) are forbidden.

**Fingerprint**: See **Deterministic Fingerprint**.

**GapReport**: Drift comparison between simulation and shadow/live observations. Contains component deltas (slippage, fill-rate, latency, reject-rate, PnL) and a composite `gap_score`.

**GapScore**: Scalar drift score aggregating deltas between simulation and shadow/live. Thresholds are **HEURISTIC** and require quarterly calibration.

**HEURISTIC**: Any threshold, parameter, or constant without Tier-1 source backing. Must be labeled explicitly, include calibration protocol, and be reviewed quarterly.

**Intent**: Constrained executable instruction derived from a Signal. Includes side, size, limit price, time-in-force, max slippage, and risk tags. Must be deterministically reproducible from its inputs.

**Manifest**: Immutable metadata file chaining hashes and schema versions. Used for datasets, features, models, and strategies.

**Order**: Exchange-facing object. Forbidden in shadow mode by default. Only emitted when canary governor explicitly enables live order placement.

**PortfolioState**: Snapshot of portfolio including equity, cash, exposure, leverage, positions, asset caps, turnover, and drawdown.

**RiskState**: FSM mode (NORMAL, CAUTIOUS, RESTRICTED, HALTED) plus active triggers, cooldown timers, and kill-switch states.

**ShadowRunRecord**: Record of a shadow execution run. Must have `orders_submitted == 0` and `order_adapter_state == "DISABLED"`.

**Signal**: Strategy output hypothesis with confidence, side hint, and reasons. Does not authorize execution; must be transformed into Intent through deterministic mapping.

**SimReport**: Deterministic simulator assumptions and output fingerprint. Includes slippage model, fee model, latency model, and partial fill assumptions.

**StrategyManifest**: Immutable semver contract for a strategy artifact. Includes params schema, defaults, compatibility ranges, and artifact hashes.

**WFOReport**: Walk-forward optimization report with pre-committed windows, purge/embargo bars, selection criteria, IS/OOS metrics, and seed dispersion.

## Naming Conventions

- Schema names use PascalCase: `FeatureFrame`, `SimReport`, `RiskState`.
- Field names use snake_case: `schema_version`, `deterministic_fingerprint`, `gap_score`.
- Epoch references use format: `E31`, `E32`, ... `E40` or `EPOCH-31`, `EPOCH-32`, ... `EPOCH-40`.
- Evidence paths use format: `reports/evidence/<EVIDENCE_EPOCH>/epochNN/`.
