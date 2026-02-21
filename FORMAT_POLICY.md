# FORMAT_POLICY.md — Format Policy

version: 1.0.0
ssot_type: FORMAT_POLICY
last_updated: 2026-02-21

## Purpose

Governs file formats for evidence and machine outputs.
Violations => FP01 FAIL.

## Evidence Format Rules (R14)

- Evidence files MUST be `.md` (markdown) only
- Evidence location: `reports/evidence/**` (markdown files)
- Exception: Machine JSON allowed ONLY under `reports/evidence/**/gates/**` or `gates/manual`

## Machine JSON Rules (R13)

All machine JSON files MUST:
1. Have `.json` extension
2. Be written ONLY via `write_json_deterministic.mjs` helper
3. Include `schema_version` field at root (required, string type)
4. NOT include any timestamp fields (no `*_at`, `*_ts`, `timestamp*`, `created`, `updated`, `generated`, `date` fields)
5. Have recursively sorted keys (ASCII lexicographic)
6. Have stable array order (preserve insertion order unless explicitly sortable)

## Forbidden Evidence Formats

The following formats are FORBIDDEN for evidence files:
- `.json` at evidence root level (must use markdown)
- `.csv`, `.txt`, `.yaml`, `.yml` for evidence
- `.html`, `.xml` for evidence

## Allowed Script Formats

Source scripts:
- `.mjs` (ES modules) — preferred
- `.js` (CommonJS or ES modules as needed)

## Reason Codes

| Code | Action | Description |
|------|--------|-------------|
| FP01 | FAIL | Forbidden evidence format OR nondeterministic machine JSON (no schema_version / timestamps / unstable order) |
