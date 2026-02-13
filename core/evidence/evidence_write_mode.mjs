import fs from 'node:fs';
import path from 'node:path';

const ASSERT_MODE = 'ASSERT_NO_DIFF';

export function resolveEvidenceWriteContext(epochId) {
  const mode = process.env.EVIDENCE_WRITE_MODE || 'IN_PLACE';
  const root = process.cwd();
  const evidenceRoot = mode === ASSERT_MODE
    ? path.join(root, '.tmp', 'epoch_freeze', epochId)
    : path.join(root, 'reports', 'evidence', epochId);

  const manualDir = path.join(evidenceRoot, 'gates', 'manual');
  fs.mkdirSync(manualDir, { recursive: true });

  const fitnessDir = mode === ASSERT_MODE
    ? path.join(root, '.tmp', 'epoch_freeze', 'reports', 'fitness')
    : path.join(root, 'reports', 'fitness');
  fs.mkdirSync(fitnessDir, { recursive: true });

  return {
    mode,
    isAssertNoDiff: mode === ASSERT_MODE,
    evidenceRoot,
    manualDir,
    fitnessDir
  };
}
