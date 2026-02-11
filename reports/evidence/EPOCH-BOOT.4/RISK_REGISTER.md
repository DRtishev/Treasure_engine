# RISK REGISTER (EPOCH-BOOT.4)
- Risk: spec documents drift from executable scripts.
  Mitigation: every epoch gate doc references actual script names and marks non-existing gates as TO IMPLEMENT.
- Risk: specification conflicts remain implicit.
  Mitigation: explicit conflict register in `specs/SPEC_CONFLICTS.md`.
- Risk: documentation-only PRs can hide baseline breakage.
  Mitigation: full baseline gate reruns logged in this evidence cycle.
