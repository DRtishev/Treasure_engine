# RISK REGISTER (EPOCH-22)

- Risk: AI modules still rely on `Math.random`/`Date.now` in several paths.
  - Mitigation: epoch22 drift gate blocks any increase vs baseline.
- Risk: checksum manifests can self-reference volatile check logs.
  - Mitigation: manifest generator excludes `gates/sha_*` and `gates/regen_manifests*`.
- Risk: clean clone can miss export artifact for release governor.
  - Mitigation: existing release-governor auto-build path retained and validated.
