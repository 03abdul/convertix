// Runs Vitest from a cwd with an uppercase Windows drive letter.
// A lowercase one (e:\...) makes Vitest load two copies of itself and every test file fails.
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url)).replace(/^[a-z]:/, (d) => d.toUpperCase());
const bin = `${root}node_modules/vitest/vitest.mjs`;
const result = spawnSync(process.execPath, [bin, 'run', ...process.argv.slice(2)], { cwd: root, stdio: 'inherit' });
process.exit(result.status ?? 1);
