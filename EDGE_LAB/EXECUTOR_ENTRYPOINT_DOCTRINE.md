# EXECUTOR_ENTRYPOINT_DOCTRINE.md

## Single entrypoint doctrine

Authoritative TREASURE ENGINE execution cycles are run through exactly one entrypoint:

- `npm run -s executor:run:chain`

This command is the SSOT runner for PASS/BLOCKED claims and must be used for official gate outcomes.

## Manual command policy

Manual gate commands are allowed for debugging and root-cause analysis only.
Manual runs are not sufficient for PASS claims unless the same cycle is reproduced through:

- `npm run -s executor:run:chain`
