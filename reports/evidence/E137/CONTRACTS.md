# E137 CONTRACTS
- status: PASS
- reason_code: OK
Declare: E137 evidence must be md-only with strict headers and redaction.
Verify: extension scan + token/hostname regex + required header presence.
If mismatch: regenerate offending report file and rerun verify:e137:contracts.
