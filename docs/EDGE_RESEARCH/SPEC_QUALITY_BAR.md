# Spec Quality Bar

## What `verify:specs` enforces
- Required file presence across indexed epoch range.
- Canonical heading order in each epoch spec.
- At least one npm verify command in `## VERIFY`.
- Minimum risk bullets and acceptance checklist count.
- Forbidden placeholders (`TBD/TODO/TBA`) unless explicitly allowed.
- Ledger entry existence/status/required fields and INDEX mapping consistency.

## Common fail examples
- Missing heading (`## STOP RULES`) => hard FAIL.
- No `npm run verify:*` command in VERIFY section => hard FAIL.
- Fewer than required acceptance checklist items => hard FAIL.
- Epoch missing in LEDGER or INDEX file map => hard FAIL.

## Authoring checklist (before PR)
- [ ] Template heading order preserved.
- [ ] Contracts include schema names, examples, invariants.
- [ ] Deterministic fingerprint material explicitly listed.
- [ ] Verify section includes gate I/O and pass/fail semantics.
- [ ] Evidence paths and file purposes are explicit.
- [ ] Stop rules include BLOCKED and rollback trigger.
- [ ] No placeholder language.
