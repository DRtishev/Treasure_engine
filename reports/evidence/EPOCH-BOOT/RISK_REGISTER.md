# RISK REGISTER

1. Warning по npm `http-proxy` остаётся шумом окружения и не влияет на PASS/FAIL гейтов.
2. Release governor зависит от наличия локального `FINAL_VALIDATED.zip`; при его отсутствии gate корректно падает.
3. Полный спектр network-gates не запускался в baseline (по offline-first политике).
