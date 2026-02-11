# RISK_REGISTER — EPOCH-17

1. Wrong execution order could allow adapter call before safety/risk checks.
2. Event schema mismatch from new event fields.
3. Drift risk if wrapper introduces uncontrolled timestamps.
4. Regressions in verify:core due to package script changes.
5. Live-mode guard bypass if context/flags are weakly validated.
