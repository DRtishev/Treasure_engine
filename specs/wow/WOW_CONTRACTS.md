# WOW Contracts (E60)

## Purpose
Define the machine-verifiable contract for WOW ideas so no item can be treated as shipped without proof of profit-link, risk controls, and evidence outputs.

## Status model
- `PROPOSED`: hypothesis only, no production claim.
- `LAB`: active experiment not yet release-candidate.
- `STAGED`: partially integrated and pending full evidence.
- `SHIPPED`: integrated, gated, and evidenced in epoch packs.
- `ARCHIVED`: retired by explicit kill criteria with kill evidence.

## JSON schema rules
- `id`: `WOW-###` unique key.
- `tier`: `P0|P1|P2` priority.
- `profit_hook`: required with `affected_layer`, `integration_point`, `expected_effect`.
- `acceptance.must_improve[]` and `acceptance.must_not_break[]` are required.
- `self_deception_risks[]` and `kill_criteria[]` must each have at least 2 entries for `LAB|STAGED|SHIPPED`.
- `integration` must include `epochs[]`, `gates[]`, `modules[]`, `evidence_outputs[]`.
- `SHIPPED` requires non-empty `epochs`, `gates`, `modules`, and `evidence_outputs`, and forbids placeholder values (`TBD/TODO/TBA`).
- `ARCHIVED` requires `kill_evidence_ref` (`epoch`, `path`).

## Verification gates
- `npm run verify:wow` validates ledger structure and evidence links.
- `npm run truth:passports` builds deterministic shipped passports.
- `npm run verify:passports` checks passports and evidence hashes.
