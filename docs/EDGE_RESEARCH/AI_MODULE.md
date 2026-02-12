# AI Module Specification (EDGE, No-Delusion Edition)

## Operator Summary
- This document defines AI behavior limits for EDGE epochs.
- AI is decision-support under risk governance; it is never self-authorizing.
- Offline-first and deterministic replay are mandatory.
- Training in production runtime is forbidden.
- Hidden network calls are forbidden by default.
- Future leakage is a hard fail condition.
- Model promotion requires immutable registry records and evidence links.
- Drift/degradation must trigger confidence caps and risk escalation.
- Shadow mode cannot place orders.
- All AI claims require reproducible logs and fingerprints.

## Where to look next
- WFO/leakage epoch spec: `specs/epochs/EPOCH-37.md`.
- Gap monitor and braking: `specs/epochs/EPOCH-38.md`.
- Shadow and canary governor: `specs/epochs/EPOCH-39.md`.

## Allowed behaviors
- Offline training/inference over immutable point-in-time snapshots.
- Deterministic replay with fixed seeds and pinned dependency manifests.
- Registered model promotion via explicit gates and approvals.
- Shadow inference outputting Signal/Intent candidates only.

## Forbidden behaviors
- Training on future labels or post-event revised data.
- Hidden network calls when `ENABLE_NETWORK_TESTS` is not `1`.
- Auto-trade or direct order placement from AI outputs.
- Dynamic dependency upgrades during train/infer runs.
- Unlogged decisions or missing rationale fields.

## Deterministic contract
Required AI run fields:
- `schema_version`, `model_id`, `model_semver`, `seed`, `dataset_snapshot_id`, `feature_manifest_hash`, `code_commit_sha`, `dependency_lock_hash`, `deterministic_fingerprint`.

Determinism requirements:
- Stable sample ordering must be persisted in run manifest.
- Floating policy: deterministic decimal rounding (`price:1e-8`, `score:1e-6`, `prob:1e-6`).
- Fingerprint policy: `sha256(canonical_json(run_inputs + config + seed + model_artifact_hash))`.
- Rerun drift rule: identical inputs must yield identical fingerprint; otherwise gate FAIL.

## Dataset discipline + leakage controls
- Point-in-time snapshots only; no forward-filled future labels.
- Strict train/validation/test split records.
- Purging/embargo required when label horizons overlap split boundaries.
- Leakage battery:
  - Positive control: inject known future leakage; sentinel must fail.
  - Negative control: clean data; sentinel must pass.

## Model registry and promotion rules
- Immutable model card fields: objective, data snapshot refs, metrics, risk notes, known limits, evidence links.
- Semver:
  - MAJOR: feature/label contract break.
  - MINOR: compatible model upgrade.
  - PATCH: metadata/bugfix, unchanged contract.
- Promotion gate requires all: leakage battery pass, deterministic replay pass, OOS threshold pass, risk signoff.

## Evaluation baseline + calibration
Mandatory minimum metrics:
- OOS Sharpe (HEURISTIC floor by asset class, calibrated quarterly).
- Max drawdown OOS (HEURISTIC ceiling, calibrated quarterly).
- Hit-rate stability across seeds.
- IS→OOS degradation ratio.

Technique options (as applicable): CPCV, PBO, DSR, SPA, White Reality Check.
All unsourced thresholds must be marked **HEURISTIC** and include calibration protocol.

## Degradation and safety interplay
- Confidence caps reduce intent sizing when uncertainty increases.
- Confidence collapse or instability triggers risk mode escalation.
- Safe fallback chain: primary model → conservative baseline model → no-trade.
- HALTED risk mode is non-bypassable by AI module.

## Proof gates (must be reproducible)
1. Leakage injected fixture must FAIL.
2. Clean fixture must PASS.
3. Same-seed replay must be fingerprint-identical.
4. Cross-seed dispersion beyond HEURISTIC bound must WARN/FAIL per policy.
5. Drift stress fixture must trigger auto-brake evidence.

## Required evidence files
- `reports/evidence/<EVIDENCE_EPOCH>/ai/AI_RUN_MANIFEST.json`
- `reports/evidence/<EVIDENCE_EPOCH>/ai/LEAKAGE_POSITIVE_CONTROL.log`
- `reports/evidence/<EVIDENCE_EPOCH>/ai/LEAKAGE_NEGATIVE_CONTROL.log`
- `reports/evidence/<EVIDENCE_EPOCH>/ai/SEED_REPLAY_DIFF.log`
- `reports/evidence/<EVIDENCE_EPOCH>/ai/DRIFT_BRAKE_PROOF.log`
