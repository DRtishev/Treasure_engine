Assumption 1: verify scripts in package.json exist and are runnable.
Check: node -e "const p=require(\"./package.json\");..."
Result: PASS (verify:* scripts listed).

Assumption 2: specs ledger can be updated for all epochs 01..30.
Check: inspect specs/epochs/LEDGER.json after gates.
Result: PENDING.

Assumption 3: export/manifests scripts regenerate checksum files deterministically.
Check: run export:validated + regen:manifests + sha256sum -c.
Result: PENDING.
