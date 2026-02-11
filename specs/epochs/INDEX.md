# EPOCH SPECS INDEX

## Dependency chain and implementation order
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

No-skip policy: parallel implementation is allowed only when dependency contracts are not violated and regression gates remain green.

## Shared contracts
- `ExecutionAdapter`
- `EventLog`
- `RunContext`
- `RiskGuard`
- `GovernanceFSM`
- `ReleaseGovernor`

## Gate map
- EPOCH-17: `verify:epoch17`, `verify:e2`, `verify:paper`, `verify:e2:multi`
- EPOCH-18: `verify:epoch18`, `verify:strategy`, baseline wall
- EPOCH-19: `verify:epoch19`, `verify:governance`, baseline wall
- EPOCH-20: `verify:epoch20`, `verify:monitoring`, baseline wall
- EPOCH-21: `verify:epoch21`, `verify:release-governor`, baseline wall
- EPOCH-22: `verify:epoch22`, `verify:core` determinism/invariant scenario battery gates
- EPOCH-23: `verify:epoch23`, `verify:integration` signal-to-intent contract checks
- EPOCH-24: `verify:epoch24`, `verify:phase2` walk-forward + drift budget checks
- EPOCH-25: `verify:epoch25` testnet campaign profiling (network opt-in via `ENABLE_NETWORK_TESTS=1`)
- EPOCH-26: `verify:epoch26` micro-live governor rehearsals (approval/FSM/kill-switch/rollback, offline)

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
