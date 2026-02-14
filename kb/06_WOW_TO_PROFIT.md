# WOW to Profit

## Acceptance as falsification
WOW items are valid only when measurable acceptance criteria pass.

## Kill criteria discipline
If criteria fail repeatedly, downgrade or archive rather than rationalize.

## Passports as proof
SHIPPED WOW items require passports with evidence hash tuples.

## Canonical pointers
- `specs/wow/WOW_LEDGER.json`
- `specs/wow/items/`
- `reports/truth/passports_manifest.json`
- `scripts/truth/wow_rank.mjs`

## Operator checklist
- `npm run truth:wow:rank`
- `npm run verify:wow`
- `npm run verify:passports`

## Failure modes
- WOW status upgraded without verifiable evidence outputs.
- Rank scores edited without recomputing `computed.priority_score`.
- Cards and ledger diverge, causing operational drift.
