# BUNDLE_CONTRACT.md — Offline Bundle Contract

version: 1.0.0
ssot_type: BUNDLE_CONTRACT
last_updated: 2026-02-21

## Purpose

Defines the contract for offline/bundle deployments where git history is unavailable.
Only applicable when VERIFY_MODE=BUNDLE.

## Required Environment Variables

Exactly one of the following MUST be set:

### BUNDLE_COMMIT_SHA_SHORT
- Format: `^[0-9a-f]{7,12}$` (lowercase hex only, 7-12 characters)
- Example: `f545a66`
- Derived from: the git commit SHA at bundle creation time, shortened

### SOURCE_FINGERPRINT
- Format: `^sha256:[0-9a-f]{64}$` (lowercase hex only)
- Example: `sha256:a1b2c3d4...` (64 hex chars after prefix)
- Derived from: SHA256 of the bundle manifest or source tree hash

## Format Validation (VM04)

Both formats MUST use lowercase hexadecimal digits only.
Uppercase letters or non-hex characters => FAIL VM04.

## Bundle Manifest Requirements

The bundle manifest MUST contain:
- `bundle_commit_sha_short` OR `source_fingerprint` (at minimum)
- `schema_version` (machine JSON policy)

## Reason Codes

- VM01: BLOCKED — BUNDLE mode but manifest missing required fingerprint field
- VM04: FAIL — Bundle fingerprint malformed (bad format)
