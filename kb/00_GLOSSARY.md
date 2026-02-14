# Glossary

## Core terms
- **SSOT**: single source of truth in `specs/*` ledgers.
- **Derived docs**: generated Markdown views that must match SSOT.
- **Gate**: deterministic verifier executed via npm scripts.
- **Evidence pack**: signed artifact set under `reports/evidence/<EPOCH>/`.

## Canonical pointers
- `specs/SSOT_INDEX.md`
- `specs/wow/WOW_LEDGER.json`
- `specs/epochs/LEDGER.json`
- `docs/ANTI_DRIFT_DOCTRINE.md`

## Operator checklist
- `npm run verify:ssot`
- `npm run verify:wow`
- `npm run verify:derived`

## Failure modes
- Terms drift from SSOT and cause policy ambiguity.
- Human docs redefine canon without corresponding ledger changes.
- Operators use stale commands not present in `package.json`.
