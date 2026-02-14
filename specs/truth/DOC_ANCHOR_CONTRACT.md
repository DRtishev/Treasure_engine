# DOC ANCHOR CONTRACT

## Purpose
Define a single canonical anchor rule for markdown verification and rendering to prevent drift.

## Canonical rules
1. Canonical anchors are explicit HTML anchors: `<a id="anchor-id"></a>`.
2. `id` must match regex `^[a-z0-9][a-z0-9-]*$`.
3. Duplicate anchor ids in the same file are forbidden.
4. For backward compatibility, heading-derived anchors are accepted using the shared slugger in `scripts/truth/doc_anchors.mjs`.
5. Derived docs (`docs/WOW_CATALOG.md`, `docs/STAGE2_IMPLEMENTATION_MATRIX.md`, `kb/INDEX.md`) must emit explicit anchors for major sections.

## Verification
- `npm run verify:docs` validates links and anchors using `scripts/truth/doc_anchors.mjs`.
- `verify:docs` emits `reports/truth/docs_anchor_contract_check.json`.
