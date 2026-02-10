# Treasure Engine

Repository bootstrap baseline with deterministic verification gates.

## Prerequisites
- Node.js 20+
- npm 11+

## Install
```bash
npm ci
```

If `npm ci` fails due to lockfile drift, run:
```bash
npm install
```
and commit the updated `package-lock.json`.

## Verification gates
```bash
npm run verify:e2
npm run verify:phase2
npm run verify:paper
```

Critical anti-flake reruns:
```bash
npm run verify:e2
npm run verify:paper
```

## Evidence
Bootstrap evidence is stored in:
- `reports/evidence/BOOTSTRAP/`

Final export artifacts:
- `FINAL_VALIDATED.zip`
- `FINAL_VALIDATED.zip.sha256`
