# TREASURE ENGINE — agents.md
**Purpose:** Operating rules for autonomous development, verification, and evidence discipline.

## 0) Mission
Turn TREASURE ENGINE into a reproducible, deterministic, evidence-driven trading research engine.
Advance development by epoch specs under `specs/epochs/` and SSOT under `spec/`.

## 1) Safety & Policy
- **Default: OFFLINE-FIRST.** Default verify must not call external APIs.
- Network tests are opt-in: `ENABLE_NETWORK_TESTS=1`.
- No secrets, no API keys, no live trading by default.
- LIVE mode requires `RELEASE_UNLOCK=1` + `verify:release-governor` PASS + evidence.

## 2) Repo Discipline
- Project root contains `package.json`.
- Archives go to `artifacts/incoming/` and are gitignored.
- Do not commit `node_modules/`, `.cache/`, huge logs, run artifacts.
- Run artifacts go to: `reports/runs/<gate>/<seed>/<repeat>/<run_id>/`.
- Evidence packs go to: `reports/evidence/<EPOCH>/`.

## 3) Truth Layer Evidence Protocol
Every epoch/boot cycle MUST produce:
- `PREFLIGHT.log` (node/npm/pwd/git status/inventory)
- `SNAPSHOT.md` (sha, branch, environment, assumptions)
- `ASSUMPTIONS.md`
- `GATE_PLAN.md` (ordered gates + repeats)
- `RISK_REGISTER.md`
- `DIFF.patch` (if code changes)
- Manifests: `SHA256SUMS.SOURCE.txt`, `SHA256SUMS.EVIDENCE.txt`, `SHA256SUMS.EXPORT.txt`
- `SUMMARY.md` (what changed + what passed)
- `VERDICT.md` (SAFE/BLOCKED + reasons)
- `gates/*.log` (full logs)

## 4) Meta-Cognitive Loop (MANDATORY)
For every work unit:
1) **Orient:** Read SSOT + relevant specs; summarize constraints.
2) **Plan:** Produce a short checklist with acceptance criteria.
3) **Execute:** Implement with minimal safe diffs (or justified refactor).
4) **Verify:** Run required gates with anti-flake policy.
5) **Reflect:** If failure, write root-cause analysis + minimal fix.
6) **Commit:** Atomic commit(s) with evidence references.
7) **Ship:** Build validated export + hashes.

## 5) Anti-Regression Doctrine
- Critical gates run twice (anti-flake).
- Multi-seed stability gate required where defined.
- No silent drift: repeated-seed fingerprints must match structurally.
- Any new bug fix must add a regression test.

## 6) Epoch Autopilot
- Specs live in `specs/epochs/`.
- Epoch order and dependencies live in `specs/epochs/INDEX.md`.
- The agent must always target the **next READY epoch**.
- If `verify:specs` fails → fix specs first.
- If wall fails → fix determinism first.

## 7) Output Standards
Never claim PASS without:
- Gate logs in evidence folder
- sha256 manifests passing
- A written VERDICT.md

**Status labels:** SAFE / BLOCKED / SAFE-WITH-LIMITATIONS
- Always update LEDGER after passing gates.
