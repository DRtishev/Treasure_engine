# GATE PLAN
Order and rationale:
1. verify:specs — validate specs health before execution.
2. npm ci — deterministic dependency install.
3. verify:paper x2 — anti-flake critical gate.
4. verify:e2 x2 — anti-flake critical gate.
5. verify:e2:multi — multi-seed stability gate.
6. verify:phase2 — phase-specific safety and integration checks.
7. verify:integration — end-to-end integration validation.
8. verify:core — consolidated regression gate.
9. regen:manifests + sha256 checks.
10. export:validated.
