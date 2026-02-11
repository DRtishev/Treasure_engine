# RISK REGISTER

- Flake risk: repeated gates could diverge due to hidden state.
- Drift risk: seed handling regressions in wrappers.
- Clean clone risk: release-governor dependency on missing export artifacts.
- Hidden state risk: stale files in reports/evidence influencing checksums.
- Toolchain risk: zip/sha256sum availability differs across environments.
