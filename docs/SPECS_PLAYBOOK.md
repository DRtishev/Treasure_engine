# TREASURE ENGINE — SPECS PLAYBOOK

## Purpose
Practical rules for editing specs without breaking autopilot execution or evidence integrity.

## 1) Safe spec editing workflow
1. Start with `specs/CONSTRAINTS.md` and `specs/epochs/INDEX.md`.
2. Make the smallest coherent doc change.
3. Keep headings aligned with `specs/epochs/TEMPLATE.md`.
4. Run `npm run verify:specs`.
5. Record evidence in `reports/evidence/<EPOCH-ID>/`.

## 2) Adding a new epoch spec
1. Copy `specs/epochs/TEMPLATE.md` to `specs/epochs/EPOCH-XX.md`.
2. Fill all sections with implementation-ready details (no ambiguous placeholders).
3. Update `specs/epochs/INDEX.md` dependency chain and gate map.
4. Add npm gate wiring in `package.json` if needed.
5. Update `scripts/verify/specs_check.mjs` only if structure rules evolve.

## 3) Evolving `verify:specs` (strict but fair)
- Enforce structure, presence, and minimal semantics.
- Avoid brittle wording checks.
- Allow controlled placeholders only with `ALLOW_TBD: YES` marker plus remediation note.
- Prefer deterministic checks (file existence, heading order, checklist/risk counts).

## 4) Anti-regression discipline for specs
- One coherent doc risk per commit.
- Keep `DIFF.patch` in evidence for any spec change.
- Do not merge spec changes without fresh `verify:specs` PASS log.
- If spec conflicts are found, reconcile in spec docs first (not in code comments).

## 5) Evidence checklist for spec-only epochs
- `PREFLIGHT.log`
- `SNAPSHOT.md`
- `AUDIT.md`
- `ASSUMPTIONS.md`
- `GATE_PLAN.md`
- `RISK_REGISTER.md`
- `gates/verify_specs.log`
- checksum manifests + validation logs
- `SUMMARY.md`
- `VERDICT.md`
