# TREASURE ENGINE — SSOT INDEX

## Canonical SSOT files
- `spec/ssot.json` — canonical system and execution baseline.
- `spec/hacks.json` — sanctioned hack registry and identifiers.
- `spec/config.schema.json` — runtime config schema contract.
- `truth/*.schema.json` — report/event schemas consumed by verification.
- `specs/CONSTRAINTS.md` — non-negotiable QA/engineering constraints.
- `specs/epochs/INDEX.md` — dependency order and epoch gate map.

## Required validation when SSOT changes
When changing any SSOT file (`spec/*.json`, `truth/*.schema.json`, or epoch contracts):
1. `npm run verify:specs`
2. Relevant domain gate(s) (minimum one):
   - `npm run verify:core`
   - `npm run verify:phase2`
   - `npm run verify:integration`
3. If release-governance behavior changes:
   - `npm run verify:release-governor`
4. Update evidence pack manifests and summaries.

## Compatibility and change discipline
- Prefer additive evolution over breaking rename/removal.
- If breaking change is required, document migration in epoch NOTES and update gate map.
- Keep one semantic SSOT change per commit when possible.

## Evidence requirements for SSOT edits
Store under `reports/evidence/<EPOCH-ID>/`:
- gate logs (`gates/*.log`)
- `DIFF.patch`
- checksum manifests (`SHA256SUMS.SOURCE.txt`, `SHA256SUMS.EVIDENCE.txt`, optional export manifest)
- `SUMMARY.md` + `VERDICT.md`
