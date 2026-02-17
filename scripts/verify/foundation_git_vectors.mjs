#!/usr/bin/env node
// Git Porcelain Test Vectors - Deterministic parser validation
export const PORCELAIN_VECTORS = [
  // Basic modifications
  {
    line: ' M file.txt',
    expected: { xy: ' M', path: 'file.txt', path2: null }
  },
  {
    line: 'M  file.txt',
    expected: { xy: 'M ', path: 'file.txt', path2: null }
  },
  {
    line: 'MM file.txt',
    expected: { xy: 'MM', path: 'file.txt', path2: null }
  },

  // Additions/Deletions
  {
    line: 'A  newfile.txt',
    expected: { xy: 'A ', path: 'newfile.txt', path2: null }
  },
  {
    line: 'D  deleted.txt',
    expected: { xy: 'D ', path: 'deleted.txt', path2: null }
  },

  // Untracked
  {
    line: '?? untracked.txt',
    expected: { xy: '??', path: 'untracked.txt', path2: null }
  },

  // Paths with spaces (quoted)
  {
    line: ' M "file with spaces.txt"',
    expected: { xy: ' M', path: 'file with spaces.txt', path2: null }
  },
  {
    line: '?? "path/to/file with spaces.js"',
    expected: { xy: '??', path: 'path/to/file with spaces.js', path2: null }
  },

  // Renames (R)
  {
    line: 'R  old.txt -> new.txt',
    expected: { xy: 'R ', path: 'old.txt', path2: 'new.txt' }
  },
  {
    line: 'RM old.txt -> new.txt',
    expected: { xy: 'RM', path: 'old.txt', path2: 'new.txt' }
  },

  // Copies (C)
  {
    line: 'C  original.txt -> copy.txt',
    expected: { xy: 'C ', path: 'original.txt', path2: 'copy.txt' }
  },

  // Renames with spaces (quoted paths)
  {
    line: 'R  "old name.txt" -> "new name.txt"',
    expected: { xy: 'R ', path: 'old name.txt', path2: 'new name.txt' }
  },

  // Submodules (if present)
  {
    line: ' M submodule/',
    expected: { xy: ' M', path: 'submodule/', path2: null }
  },

  // Files in subdirectories
  {
    line: ' M src/components/Button.jsx',
    expected: { xy: ' M', path: 'src/components/Button.jsx', path2: null }
  },
  {
    line: 'A  reports/evidence/E104/PREFLIGHT.md',
    expected: { xy: 'A ', path: 'reports/evidence/E104/PREFLIGHT.md', path2: null }
  },

  // Edge case: file starting with digit
  {
    line: ' M 123file.txt',
    expected: { xy: ' M', path: '123file.txt', path2: null }
  },

  // Edge case: file with dots
  {
    line: ' M .gitignore',
    expected: { xy: ' M', path: '.gitignore', path2: null }
  },
  {
    line: 'A  .foundation-seal/E104_KILL_LOCK.md',
    expected: { xy: 'A ', path: '.foundation-seal/E104_KILL_LOCK.md', path2: null }
  }
];
