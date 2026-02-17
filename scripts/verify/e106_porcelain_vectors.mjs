#!/usr/bin/env node
// E106 Enhanced Porcelain Test Vectors
// Extension of foundation_git_vectors with additional edge cases

export const E106_PORCELAIN_VECTORS = [
  // Basic status codes (from foundation)
  { line: ' M file.txt', expected: { xy: ' M', path: 'file.txt', path2: null } },
  { line: 'M  file.txt', expected: { xy: 'M ', path: 'file.txt', path2: null } },
  { line: 'MM file.txt', expected: { xy: 'MM', path: 'file.txt', path2: null } },
  { line: 'A  newfile.txt', expected: { xy: 'A ', path: 'newfile.txt', path2: null } },
  { line: 'D  deleted.txt', expected: { xy: 'D ', path: 'deleted.txt', path2: null } },
  { line: ' D deleted.txt', expected: { xy: ' D', path: 'deleted.txt', path2: null } },
  { line: '?? untracked.txt', expected: { xy: '??', path: 'untracked.txt', path2: null } },

  // Paths with spaces (quoted)
  { line: ' M "file with spaces.txt"', expected: { xy: ' M', path: 'file with spaces.txt', path2: null } },
  { line: '?? "path/to/file with spaces.js"', expected: { xy: '??', path: 'path/to/file with spaces.js', path2: null } },
  { line: 'A  "new file with spaces.md"', expected: { xy: 'A ', path: 'new file with spaces.md', path2: null } },

  // Renames (R)
  { line: 'R  old.txt -> new.txt', expected: { xy: 'R ', path: 'old.txt', path2: 'new.txt' } },
  { line: 'RM old.txt -> new.txt', expected: { xy: 'RM', path: 'old.txt', path2: 'new.txt' } },
  { line: 'R  "old name.txt" -> "new name.txt"', expected: { xy: 'R ', path: 'old name.txt', path2: 'new name.txt' } },
  { line: 'R  src/old.js -> src/new.js', expected: { xy: 'R ', path: 'src/old.js', path2: 'src/new.js' } },

  // Copies (C)
  { line: 'C  original.txt -> copy.txt', expected: { xy: 'C ', path: 'original.txt', path2: 'copy.txt' } },
  { line: 'C  "source file.txt" -> "dest file.txt"', expected: { xy: 'C ', path: 'source file.txt', path2: 'dest file.txt' } },

  // Subdirectories
  { line: ' M src/components/Button.jsx', expected: { xy: ' M', path: 'src/components/Button.jsx', path2: null } },
  { line: 'A  reports/evidence/E106/PREFLIGHT.md', expected: { xy: 'A ', path: 'reports/evidence/E106/PREFLIGHT.md', path2: null } },
  { line: '?? .foundation-seal/E106_KILL_LOCK.md', expected: { xy: '??', path: '.foundation-seal/E106_KILL_LOCK.md', path2: null } },

  // Edge cases
  { line: ' M .gitignore', expected: { xy: ' M', path: '.gitignore', path2: null } },
  { line: ' M 123file.txt', expected: { xy: ' M', path: '123file.txt', path2: null } },
  { line: ' M file.min.js', expected: { xy: ' M', path: 'file.min.js', path2: null } },
  { line: '?? node_modules/', expected: { xy: '??', path: 'node_modules/', path2: null } },

  // E106 new vectors: Multiple spaces in path
  { line: 'A  "file  with  multiple  spaces.txt"', expected: { xy: 'A ', path: 'file  with  multiple  spaces.txt', path2: null } },

  // E106 new vectors: Paths with special characters (quoted)
  { line: ' M "file(with)parens.txt"', expected: { xy: ' M', path: 'file(with)parens.txt', path2: null } },
  { line: '?? "file[brackets].txt"', expected: { xy: '??', path: 'file[brackets].txt', path2: null } },

  // E106 new vectors: Deep nesting
  { line: ' M a/b/c/d/e/f/deep.txt', expected: { xy: ' M', path: 'a/b/c/d/e/f/deep.txt', path2: null } },

  // E106 new vectors: Rename with deep paths
  { line: 'R  src/old/path/file.js -> src/new/path/file.js', expected: { xy: 'R ', path: 'src/old/path/file.js', path2: 'src/new/path/file.js' } },

  // E106 new vectors: Mixed status (staged + unstaged)
  { line: 'AM newfile.txt', expected: { xy: 'AM', path: 'newfile.txt', path2: null } },
  { line: 'MD deleted.txt', expected: { xy: 'MD', path: 'deleted.txt', path2: null } },

  // E106 new vectors: Submodule
  { line: ' M submodule/', expected: { xy: ' M', path: 'submodule/', path2: null } },

  // E106 new vectors: UTF-8 paths (if git quotes them)
  { line: ' M "file-with-ém.txt"', expected: { xy: ' M', path: 'file-with-ém.txt', path2: null } }
];

/**
 * Parse a single porcelain line into structured format
 * @param {string} line - Git status porcelain line
 * @returns {{ xy: string, path: string, path2: string | null }}
 */
export function parsePorcelainLine(line) {
  if (line.length < 3) return null;

  const xy = line.slice(0, 2);
  let pathPart = line.slice(3);

  // Handle renames and copies (R/C) with "path1 -> path2" format
  if ((xy[0] === 'R' || xy[0] === 'C') && pathPart.includes(' -> ')) {
    const parts = pathPart.split(' -> ');
    if (parts.length === 2) {
      const path1 = unquotePath(parts[0]);
      const path2 = unquotePath(parts[1]);
      return { xy, path: path1, path2 };
    }
  }

  // Regular files
  const path = unquotePath(pathPart);
  return { xy, path, path2: null };
}

/**
 * Unquote git paths (removes surrounding quotes and handles escapes)
 * @param {string} p - Potentially quoted path
 * @returns {string} Unquoted path
 */
function unquotePath(p) {
  const trimmed = p.trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}
