# RELEASE CHECKLIST TEMPLATE

- Epoch: `<EPOCH-ID>`
- Date: `<YYYY-MM-DD>`
- Status: `SAFE | BLOCKED`

## Mandatory gates
- [ ] `verify:e2` run1/run2
- [ ] `verify:paper` run1/run2
- [ ] epoch-specific gate(s)
- [ ] integration/core wall as required

## Evidence completeness
- [ ] preflight log present
- [ ] gate logs present
- [ ] source/evidence/export checksum manifests present
- [ ] summary + verdict present with rationale

## Artifact integrity
- [ ] `FINAL_VALIDATED.zip` exists
- [ ] `FINAL_VALIDATED.zip.sha256` matches archive
- [ ] evidence pack checksum present

## Risks / blockers
- `<list open risks or "none">`
