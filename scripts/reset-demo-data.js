import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const rootDir = path.resolve(path.dirname(__filename), '..');
const dbPath = path.join(rootDir, 'data', 'db.json');
const fixturesDir = path.join(rootDir, 'data', 'fixtures');

function parseLang() {
  const index = process.argv.findIndex((arg) => arg === '--lang');
  const value = index >= 0 ? process.argv[index + 1] : 'en';
  if (value === 'en' || value === 'zh-CN') return value;
  throw new Error('Unsupported demo language. Use --lang en or --lang zh-CN.');
}

async function main() {
  const lang = parseLang();
  const fixturePath = path.join(fixturesDir, `demo.${lang}.json`);
  const fixture = await fs.readFile(fixturePath, 'utf8');

  JSON.parse(fixture);
  await fs.mkdir(path.dirname(dbPath), { recursive: true });
  await fs.writeFile(dbPath, fixture, 'utf8');
  console.log(`Restored data/db.json from ${path.relative(rootDir, fixturePath)}.`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
