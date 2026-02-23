import { execSync } from 'node:child_process';

const chain = [
  'npm run -s verify:env:authority',
  'npm run -s edge:profit:00:real:stub',
  'npm run -s edge:profit:00:real:run',
  'npm run -s edge:profit:00:x2',
  'npm run -s export:final-validated',
  'npm run -s verify:edge:profit:00:release',
  'npm run -s edge:profit:00:doctor',
];

for (const cmd of chain) {
  execSync(cmd, { stdio: 'inherit' });
}
