# Gate Validation Matrix

| Gate Name | Offline Safe? | Run-Scoped? | Two-Run Anti-Flake? | Multi-Seed? | Schema-Validated? | Evidence Required? | Failure Mode Defined? | Rollback Defined? |
|---|---|---|---|---|---|---|---|---|
| verify:e2 | Yes | Yes | Yes (policy) | No (covered by e2:multi) | Yes | Yes | Yes | Yes |
| verify:paper | Yes | Yes | Yes (policy) | No | Event-structure validation | Yes | Yes | Yes |
| verify:e2:multi | Yes | Yes | Internal repeat | Yes (3+ seeds) | Yes | Yes | Yes | Yes |
| verify:phase2 | Yes | Indirect via wrapped e2 | No | No | Structure checks | Yes | Yes | Yes |
| verify:integration | Yes | Uses deterministic context/log path | No | No | Integration assertions | Yes | Yes | Yes |
| verify:safety | Yes | N/A (logic gate) | Recommended | No | Assertion-level | Yes | Yes | Yes |
| verify:strategy | TO IMPLEMENT (must be offline) | Required | Required | Optional | Required | Yes | Required | Required |
| verify:governance | TO IMPLEMENT (must be offline) | Required | Required | Optional | Required | Yes | Required | Required |
| verify:monitoring | TO IMPLEMENT (must be offline) | Required | Recommended | Optional | Required | Yes | Required | Required |
| verify:production | TO IMPLEMENT (offline checklist only) | N/A | N/A | N/A | Checklist schema recommended | Yes | Required | Required |

## Required fixes applied in this audit
- Marked not-yet-existing gates as **TO IMPLEMENT** (no false claim of availability).
- Unified anti-flake and evidence expectations with `specs/CONSTRAINTS.md` + `specs/PIPELINE.md`.
