# RISK REGISTER
- npm warning: unknown env config `http-proxy` appears in all npm runs; currently non-fatal.
- Existing scripts can generate large outputs and long logs; evidence storage growth risk.
- `export:validated` includes broad repository content; accidental inclusion risk if ignore rules drift.
- `regen:manifests` currently targets EPOCH-BOOT.AUTOPILOT by default; requires explicit autopilot-epoch manifest generation.
