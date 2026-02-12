# RISK REGISTER — SPECS FOUNDATION CLOSEOUT

1. **Term drift recurrence** — Mitigation: glossary law + alias table + BLOCKED rule on unresolved drift.
2. **Determinism drift hidden by pretty JSON** — Mitigation: canonical serialization law + hash normalization.
3. **Volatile fields included in fingerprints** — Mitigation: mandatory include/exclude contract rule.
4. **Spec-only PRs skipping anti-flake** — Mitigation: constraints require `verify:specs` x2.
5. **Legacy alias confusion in implementation** — Mitigation: canonical-to-legacy map in glossary + contracts + SDD.
6. **Roadmap bleeding into active gate scope** — Mitigation: POST-40 file marked PLANNING ONLY.
7. **Evidence incompleteness** — Mitigation: explicit checklist in constraints and evidence pack generation.
