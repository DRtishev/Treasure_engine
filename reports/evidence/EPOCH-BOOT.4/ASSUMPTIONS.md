# ASSUMPTIONS (EPOCH-BOOT.4)
1. Existing wrapped gates remain stable while adding only specification documents.
   - Verify via baseline gate reruns.
2. SSOT docs can be introduced without changing runtime behavior.
   - Verify by no code-path regressions in gate logs.
3. Missing `specs/epochs/` can be safely established as canonical epoch spec location.
   - Verify with `specs/SPEC_CONFLICTS.md` and indexed links.
