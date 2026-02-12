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

## EDGE dependency notes
- EPOCH-31 depends on EPOCH-30.
- EPOCH-32 depends on EPOCH-31.
- EPOCH-33 depends on EPOCH-32.
- EPOCH-34 depends on EPOCH-33.
- EPOCH-35 depends on EPOCH-34.
- EPOCH-36 depends on EPOCH-35.
- EPOCH-37 depends on EPOCH-36.
- EPOCH-38 depends on EPOCH-37.
- EPOCH-39 depends on EPOCH-38.
- EPOCH-40 depends on EPOCH-39.

## Canonical EDGE references
- `docs/EDGE_RESEARCH/GLOSSARY.md`
- `docs/EDGE_RESEARCH/DETERMINISM_POLICY.md`
- `docs/EDGE_RESEARCH/CONTRACTS_CATALOG.md`
- `docs/EDGE_RESEARCH/AI_MODULE.md`
- `docs/EDGE_RESEARCH/ANTI_PATTERNS.md`
- `docs/SDD_EDGE_EPOCHS_31_40.md`

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

## Gate map (owner + expected verifier)
- EPOCH-01..EPOCH-16 — owner: docs, runner: `npm run verify:specs`
- EPOCH-17 — owner: safety, runner: `npm run verify:epoch17`
- EPOCH-18 — owner: strategy, runner: `npm run verify:epoch18`
- EPOCH-19 — owner: governance, runner: `npm run verify:epoch19`
- EPOCH-20 — owner: monitoring, runner: `npm run verify:epoch20`
- EPOCH-21 — owner: release, runner: `npm run verify:epoch21`
- EPOCH-22 — owner: ai, runner: `npm run verify:epoch22`
- EPOCH-23 — owner: contracts, runner: `npm run verify:epoch23`
- EPOCH-24 — owner: validation, runner: `npm run verify:epoch24`
- EPOCH-25 — owner: testnet, runner: `npm run verify:epoch25`
- EPOCH-26 — owner: governor, runner: `npm run verify:epoch26`
- EPOCH-27 — owner: ai, runner: `npm run verify:epoch27`
- EPOCH-28 — owner: ai-safety, runner: `npm run verify:epoch28`
- EPOCH-29 — owner: leakage-court, runner: `npm run verify:epoch29`
- EPOCH-30 — owner: release, runner: `npm run verify:epoch30`
- EPOCH-31 — owner: edge-data, runner: `npm run verify:epoch31`
- EPOCH-32 — owner: edge-sim, runner: `npm run verify:epoch32`
- EPOCH-33 — owner: edge-strategy, runner: `npm run verify:epoch33`
- EPOCH-34 — owner: edge-decision, runner: `npm run verify:epoch34`
- EPOCH-35 — owner: edge-portfolio, runner: `npm run verify:epoch35`
- EPOCH-36 — owner: edge-risk, runner: `npm run verify:epoch36`
- EPOCH-37 — owner: edge-validation, runner: `npm run verify:epoch37`
- EPOCH-38 — owner: edge-gap, runner: `npm run verify:epoch38`
- EPOCH-39 — owner: edge-release-governor, runner: `npm run verify:epoch39`
- EPOCH-40 — owner: edge-freeze, runner: `npm run verify:epoch40`
