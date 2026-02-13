# EPOCH SPECS INDEX

## Dependency chain (READY order)
1. EPOCH-01
2. EPOCH-02
3. EPOCH-03
4. EPOCH-04
5. EPOCH-05
6. EPOCH-06
7. EPOCH-07
8. EPOCH-08
9. EPOCH-09
10. EPOCH-10
11. EPOCH-11
12. EPOCH-12
13. EPOCH-13
14. EPOCH-14
15. EPOCH-15
16. EPOCH-16
17. EPOCH-17
18. EPOCH-18
19. EPOCH-19
20. EPOCH-20
21. EPOCH-21
22. EPOCH-22
23. EPOCH-23
24. EPOCH-24
25. EPOCH-25
26. EPOCH-26
27. EPOCH-27
28. EPOCH-28
29. EPOCH-29
30. EPOCH-30
31. EPOCH-31
32. EPOCH-32
33. EPOCH-33
34. EPOCH-34
35. EPOCH-35
36. EPOCH-36
37. EPOCH-37
38. EPOCH-38
39. EPOCH-39
40. EPOCH-40

## Dependency notes (EDGE)
- EPOCH-31 depends on EPOCH-30 (EDGE starts from completed legacy runway).
- EPOCH-32 depends on EPOCH-31 (consumes FeatureFrame/FeatureManifest).
- EPOCH-33 depends on EPOCH-32 (consumes SimReport).
- EPOCH-34 depends on EPOCH-33 (consumes StrategyManifest).
- EPOCH-35 depends on EPOCH-34 (consumes Signal/Intent).
- EPOCH-36 depends on EPOCH-35 (consumes PortfolioState).
- EPOCH-37 depends on EPOCH-36 (consumes RiskState for escalation).
- EPOCH-38 depends on EPOCH-37 (consumes WFOReport for baseline).
- EPOCH-39 depends on EPOCH-38 (consumes GapReport for canary decisions).
- EPOCH-40 depends on EPOCH-39 (certifies all E31..E39 gates).

## SSOT foundations
- `docs/EDGE_RESEARCH/GLOSSARY.md` — canonical terminology for E31..E40.
- `docs/EDGE_RESEARCH/DETERMINISM_POLICY.md` — rounding, hashing, fingerprint, seed, ordering rules.
- `docs/EDGE_RESEARCH/CONTRACTS_CATALOG.md` — contract field definitions for all epoch schemas.
- `docs/EDGE_RESEARCH/ANTI_PATTERNS.md` — anti-pattern matrix with detectors/mitigations per epoch.
- `docs/EDGE_RESEARCH/AI_MODULE.md` — AI module allowed/forbidden behaviors.
- `docs/EDGE_RESEARCH/TEST_VECTORS.md` — must-pass and must-fail vectors per epoch.

## Epoch spec files
- `specs/epochs/EPOCH-01.md`
- `specs/epochs/EPOCH-02.md`
- `specs/epochs/EPOCH-03.md`
- `specs/epochs/EPOCH-04.md`
- `specs/epochs/EPOCH-05.md`
- `specs/epochs/EPOCH-06.md`
- `specs/epochs/EPOCH-07.md`
- `specs/epochs/EPOCH-08.md`
- `specs/epochs/EPOCH-09.md`
- `specs/epochs/EPOCH-10.md`
- `specs/epochs/EPOCH-11.md`
- `specs/epochs/EPOCH-12.md`
- `specs/epochs/EPOCH-13.md`
- `specs/epochs/EPOCH-14.md`
- `specs/epochs/EPOCH-15.md`
- `specs/epochs/EPOCH-16.md`
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
- `specs/epochs/EPOCH-27.md`
- `specs/epochs/EPOCH-28.md`
- `specs/epochs/EPOCH-29.md`
- `specs/epochs/EPOCH-30.md`
- `specs/epochs/EPOCH-31.md`
- `specs/epochs/EPOCH-32.md`
- `specs/epochs/EPOCH-33.md`
- `specs/epochs/EPOCH-34.md`
- `specs/epochs/EPOCH-35.md`
- `specs/epochs/EPOCH-36.md`
- `specs/epochs/EPOCH-37.md`
- `specs/epochs/EPOCH-38.md`
- `specs/epochs/EPOCH-39.md`
- `specs/epochs/EPOCH-40.md`

## Gate map
- EPOCH-01..EPOCH-16: legacy/doc mapping validated by `verify:specs`
- EPOCH-17: `verify:epoch17`
- EPOCH-18: `verify:epoch18`
- EPOCH-19: `verify:epoch19`
- EPOCH-20: `verify:epoch20`
- EPOCH-21: `verify:epoch21`
- EPOCH-22: `verify:epoch22`
- EPOCH-23: `verify:epoch23`
- EPOCH-24: `verify:epoch24`
- EPOCH-25: `verify:epoch25`
- EPOCH-26: `verify:epoch26`
- EPOCH-27: `verify:epoch27`
- EPOCH-28: `verify:epoch28`
- EPOCH-29: `verify:epoch29`
- EPOCH-30: `verify:epoch30`
- EPOCH-31: `verify:epoch31` via `scripts/verify/epoch31_edge_gate.mjs` (implemented)
- EPOCH-32: `verify:epoch32` via `scripts/verify/epoch32_edge_gate.mjs` (implemented)
- EPOCH-33: `verify:epoch33` via `scripts/verify/epoch33_edge_gate.mjs` (implemented)
- EPOCH-34: `verify:epoch34` via `scripts/verify/epoch34_edge_gate.mjs` (implemented)
- EPOCH-35: `verify:epoch35` via `scripts/verify/epoch35_edge_gate.mjs` (implemented)
- EPOCH-36: `verify:epoch36` via `scripts/verify/epoch36_edge_gate.mjs` (implemented)
- EPOCH-37: `verify:epoch37` via `scripts/verify/epoch37_edge_gate.mjs` (implemented)
- EPOCH-38: `verify:epoch38` via `scripts/verify/epoch38_edge_gate.mjs` (implemented)
- EPOCH-39: `verify:epoch39` via `scripts/verify/epoch39_edge_gate.mjs` (implemented)
- EPOCH-40: `verify:epoch40` via `scripts/verify/epoch40_edge_gate.mjs` (implemented)

## Ledger semantics
- EPOCH-31..EPOCH-40 are marked `DONE` when implementation gates are anti-flake green with required evidence under the active evidence epoch.

## Gate owners (31→40)
- EPOCH-31: data-platform
- EPOCH-32: simulation
- EPOCH-33: strategy-governance
- EPOCH-34: execution-pipeline
- EPOCH-35: portfolio-engine
- EPOCH-36: risk-governor
- EPOCH-37: quant-research
- EPOCH-38: runtime-safety
- EPOCH-39: release-governor
- EPOCH-40: certification


## EDGE aggregate gate
- `verify:edge` executes `scripts/verify/edge_all_epochs.mjs` and enforces evidence completeness for E31..E40.
