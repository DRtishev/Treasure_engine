# GATE PLAN

1. Preflight + install фиксация.
2. Baseline anti-flake: `verify:e2` x2, `verify:paper` x2.
3. Baseline wall: `verify:phase2`, `verify:integration`, `verify:e2:multi`, `verify:core`.
4. Epoch wall: `verify:epoch17`, `verify:epoch18`, `verify:epoch19`, `verify:epoch20`, `verify:epoch21`.
5. Дополнительно для устойчивости новых частей: `verify:monitoring` x2, `verify:release-governor` x2.
6. Integrity: regenerate/validate manifests + rebuild FINAL_VALIDATED.zip + checksum.
