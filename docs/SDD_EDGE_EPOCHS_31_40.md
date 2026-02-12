# SDD — EDGE Epochs 31→40 (Ironclad Rewrite)

## Canonical references
- Glossary: `docs/EDGE_RESEARCH/GLOSSARY.md`
- Determinism policy: `docs/EDGE_RESEARCH/DETERMINISM_POLICY.md`
- Contracts catalog: `docs/EDGE_RESEARCH/CONTRACTS_CATALOG.md`
- AI governance: `docs/EDGE_RESEARCH/AI_MODULE.md`
- Anti-pattern matrix: `docs/EDGE_RESEARCH/ANTI_PATTERNS.md`

## Program intent
This SDD defines implementation-ready specification boundaries for E31..E40 with offline-first defaults, deterministic replay, and evidence-first gate semantics.

## Kill-switch matrix
| Trigger | Required action | Epoch owner |
|---|---|---|
| Leakage detected | BLOCKED + rollback to previous READY epoch | E31/E37 |
| Replay drift detected | BLOCKED + freeze promotion | E34/E40 |
| Gap score critical band | BRAKE or kill-switch ON | E38/E39 |
| Shadow order submission >0 | BLOCKED immediately | E39 |

## Global invariants
- No live trading by default.
- No hidden network dependencies.
- Canonical JSON/hash/rounding from determinism policy.
- Evidence pack required for every PASS claim.
- Ledger and index must remain chain-consistent from E30->E40.
