import { readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const directory = path.join(root, 'js');
const files = (await readdir(directory)).filter((name) => name.endsWith('.js'));

for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', path.join(directory, file)], { encoding: 'utf8' });
  if (result.status !== 0) {
    process.stderr.write(result.stderr);
    process.exit(result.status ?? 1);
  }
}

console.log(`${files.length} arquivos JavaScript validados.`);
