# SPEC TOPOLOGY AUDIT (pre-polish)

## Scope audited
- `specs/`
- `spec/`
- `docs/`
- `scripts/verify/specs_check.mjs`

## Which epochs exist (INDEX list)
- `EPOCH-17` .. `EPOCH-26` are present and referenced in `specs/epochs/INDEX.md`.

## READY order (dependency chain)
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

## Common contracts found across epochs
- Core interfaces: `ExecutionAdapter`, `EventLog`, `RunContext`, `RiskGuard`, `GovernanceFSM`, `ReleaseGovernor`.
- Baseline gates repeatedly referenced: `verify:e2`, `verify:paper`, `verify:e2:multi`, `verify:phase2`, `verify:integration`, `verify:core`.
- Run directory convention expected: `reports/runs/<gate>/<seed>/<repeat>/<run_id>/`.
- Evidence directory convention: `reports/evidence/<EPOCH>/` with logs/manifests/summary/verdict.

## Contradictions / drift found
1. Heading standard drift:
   - Template and epochs use composite headings (`GOALS / NON-GOALS`, `DESIGN (contracts + ...)`) while requested canonical style is split and simpler.
2. `verify:specs` strictness drift:
   - Current checker validates fixed heading strings only, but does not validate heading order, verify command presence, acceptance depth, or placeholder/TBD policy.
3. Evidence naming drift:
   - Some docs refer to bootstrap evidence (`EPOCH-BOOT.AUTOPILOT`) while epoch docs should point to per-epoch evidence names.
4. Spec suite guidance gap:
   - No dedicated `docs/SPECS_PLAYBOOK.md` explaining safe spec evolution and anti-regression process.
5. Risk/acceptance quality inconsistency:
   - Several epoch docs use generic placeholder wording that is structurally valid but under-specified for direct implementation.

## Pre-polish verdict
- Structure exists, but quality and rigor are inconsistent.
- Machine-checking is present but too shallow to block low-quality spec drift.
