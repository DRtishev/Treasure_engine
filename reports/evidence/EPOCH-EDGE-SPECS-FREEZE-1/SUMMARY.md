# Summary
- Added `scripts/verify/specs_strict.mjs` and wired `verify:specs:strict` in `package.json`.
- Enforced strict checks for E31..E40: placeholders, heading coverage, JSON examples, SSOT references, dependency consistency (INDEX vs LEDGER), and banned-source hygiene with LEAD exception.
- Polished E31..E40 wording to include explicit `docs/EDGE_RESEARCH/GLOSSARY.md` references and a `Dependencies` subsection.
- Added docs-only artifact policy to `specs/CONSTRAINTS.md` clarifying that `FINAL_VALIDATED.zip` is not mandatory in docs/spec cycles.
- Executed required anti-flake gates: `verify:specs` x2 and `verify:specs:strict` x2.

## Remaining risks
- Strict gate currently scans selected EDGE docs for banned domains; future expansion may include broader repository scope if requested.
