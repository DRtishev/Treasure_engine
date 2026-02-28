# CLAUDE.md — Treasure Engine AI Executive Summary

> AI agent entry point. Full rules and commands: **see [AGENTS.md](./AGENTS.md)**.
> Do not duplicate rules here.

---

## ONE NEXT ACTION

```bash
npm run -s verify:fast
```

---

## QUICK REFERENCE

| Action | Command |
|--------|---------|
| Fast gate (boot check) | `npm run -s verify:fast` |
| Triage if blocked | `npm run -s epoch:victory:triage` |
| TimeMachine ledger | `npm run -s ops:timemachine` |
| Autopilot (dry-run) | `npm run -s ops:autopilot` |
| Autopilot (apply) | `npm run -s ops:autopilot -- --apply` |
| Cockpit status | `npm run -s ops:cockpit` |

---

## CRITICAL CONSTRAINTS

1. **Offline by default** — no network unless double-key unlocked
2. **Write-scope** — CERT writes only to `artifacts/**` and `reports/evidence/EPOCH-*/**`
3. **Apply requires double-key** — flag `--apply` + file `artifacts/incoming/APPLY_AUTOPILOT`
4. **No fabrication** — BLOCKED/FAIL when unknown; never invent evidence
5. **Determinism** — run gates twice; report both exit codes

---

## FULL DOCUMENTATION

- **[AGENTS.md](./AGENTS.md)** — SSOT: all rules, modes, gates, commands
- **[docs/AI_RUNBOOK.md](./docs/AI_RUNBOOK.md)** — operational runbook
- **[docs/AI_TEMPLATES/](./docs/AI_TEMPLATES/)** — report and evidence templates
- **[RUNBOOK.md](./RUNBOOK.md)** — general project runbook
