#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { resolveEvidenceWriteContext } from '../../core/evidence/evidence_write_mode.mjs';
import { runPaperFitnessLabV1 } from '../../core/paper/paper_fitness_lab_v1.mjs';

const epoch = process.env.EVIDENCE_EPOCH || 'EPOCH-55';
const { manualDir, fitnessDir } = resolveEvidenceWriteContext(epoch);

let passed = 0; let failed = 0;
const checks = [];
const check = (ok, msg) => { checks.push({ ok, msg }); if (ok) { passed += 1; console.log(`✓ ${msg}`); } else { failed += 1; console.error(`✗ ${msg}`); } };

const r1 = runPaperFitnessLabV1({ seed: 5501 });
const r2 = runPaperFitnessLabV1({ seed: 5501 });

check(r1.grid_size > 0 && r1.top_k.length === 3, 'frontier report generated with bounded grid and top-k');
check(r1.frontier_fingerprint === r2.frontier_fingerprint, 'determinism x2 frontier fingerprint invariant');
check(Array.isArray(r1.all_results) && r1.all_results.every((x) => x.params && Number.isFinite(x.score)), 'frontier entries include params + metrics');

fs.mkdirSync(fitnessDir, { recursive: true });
fs.writeFileSync(path.join(manualDir, 'epoch55_frontier.json'), JSON.stringify(r1, null, 2) + '\n');
fs.writeFileSync(path.join(fitnessDir, 'epoch55_frontier.json'), JSON.stringify(r1, null, 2) + '\n');

const result = { epoch: 'EPOCH-55', status: failed === 0 ? 'PASS' : 'FAIL', passed, failed, frontier_fingerprint: r1.frontier_fingerprint, checks };
fs.writeFileSync(path.join(manualDir, 'verify_epoch55_result.json'), JSON.stringify(result, null, 2) + '\n');

if (failed) process.exit(1);
console.log(`PASS verify:epoch55 checks=${passed}`);
