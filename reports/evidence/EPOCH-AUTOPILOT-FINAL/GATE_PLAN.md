# GATE PLAN
1. verify:specs x2 (anti-flake for spec structure)
2. verify:paper:multi
3. verify:wall (canonical offline wall)
4. key reruns: verify:paper + verify:e2 (anti-flake safety)
5. verify:release-governor (ledger + latest evidence integrity)
6. regen:manifests + sha256 validations + export validation
