import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const rootDir = path.resolve(path.dirname(__filename), '..');
const dbPath = path.join(rootDir, 'data', 'db.json');

async function main() {
  let stdout;
  try {
    ({ stdout } = await execFileAsync('git', ['show', 'HEAD:data/db.json'], {
      cwd: rootDir,
      maxBuffer: 10 * 1024 * 1024
    }));
  } catch (error) {
    console.error('Unable to read data/db.json from Git HEAD.');
    console.error('Run this command from a cloned Git repository with data/db.json committed.');
    throw error;
  }

  JSON.parse(stdout);
  await fs.mkdir(path.dirname(dbPath), { recursive: true });
  await fs.writeFile(dbPath, stdout, 'utf8');
  console.log('Restored data/db.json from Git HEAD.');
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
