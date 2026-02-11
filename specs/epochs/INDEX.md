# EPOCH SPECS INDEX
One-line purpose: defines implementation order, gate ownership, and evidence expectations for autopilot epoch execution.

## Dependency chain (READY order)
1. EPOCH-17
2. EPOCH-18 (depends on EPOCH-17)
3. EPOCH-19 (depends on EPOCH-17..18)
4. EPOCH-20 (depends on EPOCH-17..19)
5. EPOCH-21 (depends on EPOCH-17..20)
6. EPOCH-22 (depends on EPOCH-17..21)
7. EPOCH-23 (depends on EPOCH-17..22)
8. EPOCH-24 (depends on EPOCH-17..23)
9. EPOCH-25 (depends on EPOCH-17..24)
10. EPOCH-26 (depends on EPOCH-17..25)

## Next READY epoch selection rule
Select the first epoch in dependency order that is not marked complete by its acceptance checklist + evidence verdict.

## Shared contracts
- `ExecutionAdapter`
- `EventLog`
- `RunContext`
- `RiskGuard`
- `GovernanceFSM`
- `ReleaseGovernor`

## Gate map per epoch
- EPOCH-17: `verify:epoch17`, `verify:e2`, `verify:paper`, `verify:e2:multi`
- EPOCH-18: `verify:epoch18`, `verify:strategy`, `verify:core`
- EPOCH-19: `verify:epoch19`, `verify:governance`, `verify:core`
- EPOCH-20: `verify:epoch20`, `verify:monitoring`, `verify:core`
- EPOCH-21: `verify:epoch21`, `verify:release-governor`, `verify:core`
- EPOCH-22: `verify:epoch22`, `verify:core`
- EPOCH-23: `verify:epoch23`, `verify:integration`, `verify:core`
- EPOCH-24: `verify:epoch24`, `verify:phase2`, `verify:core`
- EPOCH-25: `verify:epoch25` (network opt-in via `ENABLE_NETWORK_TESTS=1`), `verify:core`
- EPOCH-26: `verify:epoch26`, `verify:release-governor`, `verify:core`

## Evidence pack naming
- Required path pattern: `reports/evidence/<EPOCH-ID>/`
- Gate logs live under `reports/evidence/<EPOCH-ID>/gates/`
- Manifests live under `reports/evidence/<EPOCH-ID>/manifests/`

## Definition of DONE
An epoch is DONE only when:
1. Required gates pass with anti-flake repeats where required.
2. Evidence pack exists and includes `VERDICT.md` with `SAFE` or `SAFE-WITH-LIMITATIONS`.
3. Source/evidence manifests validate.
4. Export hash is recorded when export artifact is produced.

## Epoch spec files
- `specs/epochs/EPOCH-17.md`
- `specs/epochs/EPOCH-18.md`
- `specs/epochs/EPOCH-19.md`
- `specs/epochs/EPOCH-20.md`
- `specs/epochs/EPOCH-21.md`
- `specs/epochs/EPOCH-22.md`
- `specs/epochs/EPOCH-23.md`
- `specs/epochs/EPOCH-24.md`
- `specs/epochs/EPOCH-25.md`
- `specs/epochs/EPOCH-26.md`
