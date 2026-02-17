# E106 PORCELAIN VECTORS

## Test Vectors
- total: 32
- passed: 32
- failed: 0

## Coverage
- Basic status codes (M, A, D, ??)
- Paths with spaces (quoted)
- Renames (R) with and without spaces
- Copies (C)
- Subdirectories and deep nesting
- Special characters in paths
- Mixed status (AM, MD, RM)
- Submodules

## Results

### PASS: ` M file.txt`
- expected.xy:  M
- expected.path: file.txt
- expected.path2: null
- actual.xy:  M
- actual.path: file.txt
- actual.path2: null

### PASS: `M  file.txt`
- expected.xy: M 
- expected.path: file.txt
- expected.path2: null
- actual.xy: M 
- actual.path: file.txt
- actual.path2: null

### PASS: `MM file.txt`
- expected.xy: MM
- expected.path: file.txt
- expected.path2: null
- actual.xy: MM
- actual.path: file.txt
- actual.path2: null

### PASS: `A  newfile.txt`
- expected.xy: A 
- expected.path: newfile.txt
- expected.path2: null
- actual.xy: A 
- actual.path: newfile.txt
- actual.path2: null

### PASS: `D  deleted.txt`
- expected.xy: D 
- expected.path: deleted.txt
- expected.path2: null
- actual.xy: D 
- actual.path: deleted.txt
- actual.path2: null

### PASS: ` D deleted.txt`
- expected.xy:  D
- expected.path: deleted.txt
- expected.path2: null
- actual.xy:  D
- actual.path: deleted.txt
- actual.path2: null

### PASS: `?? untracked.txt`
- expected.xy: ??
- expected.path: untracked.txt
- expected.path2: null
- actual.xy: ??
- actual.path: untracked.txt
- actual.path2: null

### PASS: ` M "file with spaces.txt"`
- expected.xy:  M
- expected.path: file with spaces.txt
- expected.path2: null
- actual.xy:  M
- actual.path: file with spaces.txt
- actual.path2: null

### PASS: `?? "path/to/file with spaces.js"`
- expected.xy: ??
- expected.path: path/to/file with spaces.js
- expected.path2: null
- actual.xy: ??
- actual.path: path/to/file with spaces.js
- actual.path2: null

### PASS: `A  "new file with spaces.md"`
- expected.xy: A 
- expected.path: new file with spaces.md
- expected.path2: null
- actual.xy: A 
- actual.path: new file with spaces.md
- actual.path2: null

### PASS: `R  old.txt -> new.txt`
- expected.xy: R 
- expected.path: old.txt
- expected.path2: new.txt
- actual.xy: R 
- actual.path: old.txt
- actual.path2: new.txt

### PASS: `RM old.txt -> new.txt`
- expected.xy: RM
- expected.path: old.txt
- expected.path2: new.txt
- actual.xy: RM
- actual.path: old.txt
- actual.path2: new.txt

### PASS: `R  "old name.txt" -> "new name.txt"`
- expected.xy: R 
- expected.path: old name.txt
- expected.path2: new name.txt
- actual.xy: R 
- actual.path: old name.txt
- actual.path2: new name.txt

### PASS: `R  src/old.js -> src/new.js`
- expected.xy: R 
- expected.path: src/old.js
- expected.path2: src/new.js
- actual.xy: R 
- actual.path: src/old.js
- actual.path2: src/new.js

### PASS: `C  original.txt -> copy.txt`
- expected.xy: C 
- expected.path: original.txt
- expected.path2: copy.txt
- actual.xy: C 
- actual.path: original.txt
- actual.path2: copy.txt

### PASS: `C  "source file.txt" -> "dest file.txt"`
- expected.xy: C 
- expected.path: source file.txt
- expected.path2: dest file.txt
- actual.xy: C 
- actual.path: source file.txt
- actual.path2: dest file.txt

### PASS: ` M src/components/Button.jsx`
- expected.xy:  M
- expected.path: src/components/Button.jsx
- expected.path2: null
- actual.xy:  M
- actual.path: src/components/Button.jsx
- actual.path2: null

### PASS: `A  reports/evidence/E106/PREFLIGHT.md`
- expected.xy: A 
- expected.path: reports/evidence/E106/PREFLIGHT.md
- expected.path2: null
- actual.xy: A 
- actual.path: reports/evidence/E106/PREFLIGHT.md
- actual.path2: null

### PASS: `?? .foundation-seal/E106_KILL_LOCK.md`
- expected.xy: ??
- expected.path: .foundation-seal/E106_KILL_LOCK.md
- expected.path2: null
- actual.xy: ??
- actual.path: .foundation-seal/E106_KILL_LOCK.md
- actual.path2: null

### PASS: ` M .gitignore`
- expected.xy:  M
- expected.path: .gitignore
- expected.path2: null
- actual.xy:  M
- actual.path: .gitignore
- actual.path2: null

### PASS: ` M 123file.txt`
- expected.xy:  M
- expected.path: 123file.txt
- expected.path2: null
- actual.xy:  M
- actual.path: 123file.txt
- actual.path2: null

### PASS: ` M file.min.js`
- expected.xy:  M
- expected.path: file.min.js
- expected.path2: null
- actual.xy:  M
- actual.path: file.min.js
- actual.path2: null

### PASS: `?? node_modules/`
- expected.xy: ??
- expected.path: node_modules/
- expected.path2: null
- actual.xy: ??
- actual.path: node_modules/
- actual.path2: null

### PASS: `A  "file  with  multiple  spaces.txt"`
- expected.xy: A 
- expected.path: file  with  multiple  spaces.txt
- expected.path2: null
- actual.xy: A 
- actual.path: file  with  multiple  spaces.txt
- actual.path2: null

### PASS: ` M "file(with)parens.txt"`
- expected.xy:  M
- expected.path: file(with)parens.txt
- expected.path2: null
- actual.xy:  M
- actual.path: file(with)parens.txt
- actual.path2: null

### PASS: `?? "file[brackets].txt"`
- expected.xy: ??
- expected.path: file[brackets].txt
- expected.path2: null
- actual.xy: ??
- actual.path: file[brackets].txt
- actual.path2: null

### PASS: ` M a/b/c/d/e/f/deep.txt`
- expected.xy:  M
- expected.path: a/b/c/d/e/f/deep.txt
- expected.path2: null
- actual.xy:  M
- actual.path: a/b/c/d/e/f/deep.txt
- actual.path2: null

### PASS: `R  src/old/path/file.js -> src/new/path/file.js`
- expected.xy: R 
- expected.path: src/old/path/file.js
- expected.path2: src/new/path/file.js
- actual.xy: R 
- actual.path: src/old/path/file.js
- actual.path2: src/new/path/file.js

### PASS: `AM newfile.txt`
- expected.xy: AM
- expected.path: newfile.txt
- expected.path2: null
- actual.xy: AM
- actual.path: newfile.txt
- actual.path2: null

### PASS: `MD deleted.txt`
- expected.xy: MD
- expected.path: deleted.txt
- expected.path2: null
- actual.xy: MD
- actual.path: deleted.txt
- actual.path2: null

### PASS: ` M submodule/`
- expected.xy:  M
- expected.path: submodule/
- expected.path2: null
- actual.xy:  M
- actual.path: submodule/
- actual.path2: null

### PASS: ` M "file-with-ém.txt"`
- expected.xy:  M
- expected.path: file-with-ém.txt
- expected.path2: null
- actual.xy:  M
- actual.path: file-with-ém.txt
- actual.path2: null

## Verdict
PASS - 32/32 vectors passed
