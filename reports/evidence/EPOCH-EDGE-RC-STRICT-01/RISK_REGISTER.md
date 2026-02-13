# Residual Risks

- npm emits non-blocking env warning about `http-proxy`; this is environment config noise.
- strict verify:edge with clean-clone is longer-running and may appear silent between logs.
- FINAL_VALIDATED tarball is gitignored by policy; reproducibility relies on stored SHA + reproducible command.
