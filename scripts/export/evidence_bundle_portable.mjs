import { runBounded } from '../executor/spawn_bounded.mjs';

const r = runBounded('npm run -s export:evidence-bundle', { env: { ...process.env, EVIDENCE_BUNDLE_PORTABLE: '1' }, cwd: process.cwd(), maxBuffer: 16 * 1024 * 1024 });
process.stdout.write(r.stdout || '');
process.stderr.write(r.stderr || '');
process.exit(r.ec);
