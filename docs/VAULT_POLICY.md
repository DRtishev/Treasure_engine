# Vault Holdout Policy (E56)

## Purpose
Vault datasets are frozen holdout fixtures for canary/paper evaluation only.

## Tier tags
Dataset manifests must include:
- `tag.tier: "train"`
- `tag.tier: "val"`
- `tag.tier: "vault"`

## Hard policy
- Tuning/parameter sweeps (E55/E56 fitness lab) must never read `tier=vault` data.
- Enforcement is implemented by `core/data/dataset_tier_policy.mjs`.
- In strict mode, any tuning request with a vault market/fills dataset fails with `FAIL_VAULT_DATASET_FOR_TUNING`.

## Allowed usage
- `tier=vault` is allowed for canary/paper evaluation and regression checks.
- Vault remains frozen; no mutation and no tuning feedback loop.
