# E106 FOUNDATION SELFTEST

## Test Summary
- total: 14
- passed: 14
- failed: 0

## Module Coverage
- foundation_ci: isCIMode, forbidEnvInCI
- foundation_sums: rewriteSums, verifySums, readSumsCoreText
- foundation_git: parsePorcelainLine (via e106_porcelain_vectors)

## Test Results

### PASS: foundation_ci: isCIMode returns boolean

### PASS: foundation_ci: isCIMode truthy for CI=true

### PASS: foundation_ci: isCIMode truthy for CI=1

### PASS: foundation_ci: isCIMode falsy for CI=false

### PASS: foundation_ci: isCIMode falsy for CI=0

### PASS: foundation_ci: forbidEnvInCI allows UPDATE_ when CI=false

### PASS: foundation_sums: rewriteSums creates deterministic output

### PASS: foundation_sums: verifySums detects tampering

### PASS: foundation_sums: readSumsCoreText excludes specified suffixes

### PASS: foundation_git: parsePorcelainLine handles basic modification

### PASS: foundation_git: parsePorcelainLine handles quoted paths

### PASS: foundation_git: parsePorcelainLine handles renames

### PASS: foundation_git: parsePorcelainLine handles copies

### PASS: foundation_git: parsePorcelainLine handles untracked

## Verdict
PASS - All foundation modules behave correctly
