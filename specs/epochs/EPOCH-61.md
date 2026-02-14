# EPOCH-61 — POLISHPACK-01 (WOW Encyclopedia + KB Expansion + Derived Docs + Link Hygiene + WOW Rank)

## REALITY SNAPSHOT
- WOW SSOT and KB exist, but human-facing docs can drift and link hygiene is not hard-gated.

## GOALS
- Add per-item WOW cards for all SHIPPED/STAGED entries.
- Introduce deterministic WOW ranking with machine outputs.
- Make key docs deterministic derived views from SSOT.
- Enforce markdown link and anchor hygiene across docs/KB/WOW/epochs.
- Expand KB into operator-focused reference with strict sections.

## NON-GOALS
- No new trading alpha logic.
- No relaxation of offline-first, deterministic, or release strict policies.

## CONSTRAINTS
- SSOT remains `specs/*` ledgers.
- Derived docs are generated deterministically and validated.
- Verification works offline by default.
- Required gates pass twice in CI mode.

## DESIGN / CONTRACTS
- `specs/wow/items/WOW-###.md` cards are mandatory for SHIPPED/STAGED.
- `scripts/truth/wow_rank.mjs` computes `computed.priority_score` from scored fields.
- `scripts/truth/render_wow_catalog.mjs`, `render_wow_matrix.mjs`, `render_kb_portal.mjs` generate derived docs.
- `scripts/verify/derived_docs_check.mjs` fails on derived-doc drift.
- `scripts/verify/docs_links_check.mjs` fails on broken internal file/anchor links.

## PATCH PLAN
- Add WOW cards and ledger `doc_path` + `scores` + computed rank values.
- Add WOW rank reports and verifier checks for score/rank drift.
- Replace static matrix/portal pages with deterministic renders.
- Expand KB sections with canonical pointers, operator checklists, and failure modes.
- Produce E61 evidence outputs and checksums under `reports/evidence/EPOCH-61/`.

## VERIFY
- `npm run verify:specs`
- `npm ci`
- `CI=true npm run verify:repo`
- `CI=true npm run verify:specs`
- `CI=true npm run verify:wow`
- `CI=true npm run verify:kb`
- `CI=true npm run verify:passports`
- `CI=true npm run verify:derived`
- `CI=true npm run verify:docs`
- `CI=true npm run verify:ledger`
- `CI=true npm run verify:edge`
- `CI=true npm run verify:treasure`
- `npm run release:build`
- `RELEASE_BUILD=1 RELEASE_STRICT=1 CI=true npm run verify:release`

## EVIDENCE REQUIREMENTS
- `reports/evidence/EPOCH-61/` standard pack files with checksums and `pack_index.json`.
- Required machine outputs under `reports/evidence/EPOCH-61/gates/manual/`:
  - `wow_rank.json`
  - `wow_rank_summary.json`
  - `derived_docs_manifest.json`
  - `docs_link_report.json`
  - `verify_epoch61_result.json`

## STOP RULES
- PASS only with all required gates PASS/PASS and evidence files present.
- BLOCKED if link hygiene, derived doc check, WOW card contracts, or release strict checks fail twice.
- Any SSOT/doc drift triggers fix-first before additional development.

## RISK REGISTER
- Generated docs drift from ledger due to manual edits.
- WOW scores edited without rank recomputation.
- Card links break due to relative path mistakes.
- Anchor validation mismatches GitHub slug semantics.
- Repo manifest gate may fail if tracked-file hashes are stale.

## ACCEPTANCE CRITERIA
- [ ] WOW cards exist for every SHIPPED/STAGED ledger item and `verify:wow` enforces headings/evidence refs.
- [ ] WOW rank outputs are generated and rank drift checks pass.
- [ ] Derived docs regenerate deterministically and `verify:derived` passes.
- [ ] `verify:docs` passes with zero broken links/anchors.
- [ ] KB 00..06 include canonical pointers, operator checklist, and failure modes and pass `verify:kb`.

## NOTES
- E61 is anti-self-deception by construction: all polish artifacts are machine-verified.
