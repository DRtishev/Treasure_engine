# E131 TIME SYNC V4
- source_count: 2
- source_success_count: 2
- drift_min_sec: 0
- drift_max_sec: 1
- reason_code: E_OK
- endpoint: https://worldtimeapi.org/api/timezone/Etc/UTC drift_sec=1 reason=E_HTTP_FAIL
- endpoint: https://timeapi.io/api/Time/current/zone?timeZone=UTC drift_sec=0 reason=E_OK
