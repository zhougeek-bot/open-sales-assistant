import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const rootDir = path.resolve(path.dirname(__filename), '..');
const evalPath = path.join(rootDir, 'evals', 'sales-replies.json');
const useAi = process.argv.includes('--ai');

function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
    server.on('error', reject);
  });
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`${url} returned HTTP ${response.status}: ${data.error || 'Unknown error'}`);
  }
  return data;
}

async function waitForHealth(baseUrl, child) {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) break;
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.ok) return response.json();
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
  throw new Error('Evaluation server did not become healthy within 15 seconds.');
}

async function stopChild(child) {
  if (child.exitCode !== null) return;
  child.kill('SIGTERM');
  await Promise.race([
    new Promise((resolve) => child.once('exit', resolve)),
    new Promise((resolve) => setTimeout(resolve, 1500))
  ]);
  if (child.exitCode === null) child.kill('SIGKILL');
}

function evaluateReply(testCase, suite, reply) {
  const answer = String(reply.answer || '');
  const normalized = answer.toLowerCase();
  const matchedExpected = testCase.expectedAny.find((term) => normalized.includes(term.toLowerCase()));
  const prohibitedClaim = suite.prohibitedClaims.find((term) => normalized.includes(term.toLowerCase()));
  const checks = {
    nonEmpty: answer.trim().length >= 20,
    relevant: Boolean(matchedExpected),
    safe: !prohibitedClaim,
    mode: reply.mode === (useAi ? 'ai' : 'local-fallback')
  };
  return {
    passed: Object.values(checks).every(Boolean),
    checks,
    matchedExpected: matchedExpected || '',
    prohibitedClaim: prohibitedClaim || ''
  };
}

async function runSuite(suite) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), `osa-eval-${suite.language}-`));
  const dbPath = path.join(tempDir, 'db.json');
  await fs.copyFile(path.join(rootDir, suite.fixture), dbPath);
  const port = await getFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, ['server/index.js'], {
    cwd: rootDir,
    env: {
      ...process.env,
      PORT: String(port),
      PUBLIC_BASE_URL: baseUrl,
      DATA_FILE: dbPath,
      DATA_BACKUP_DIR: path.join(tempDir, 'backups'),
      ...(useAi ? {} : { AI_API_KEY: '' })
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  let serverOutput = '';
  child.stdout.on('data', (chunk) => { serverOutput += chunk.toString(); });
  child.stderr.on('data', (chunk) => { serverOutput += chunk.toString(); });

  try {
    const health = await waitForHealth(baseUrl, child);
    if (health.aiConfigured !== useAi) {
      throw new Error(useAi
        ? 'AI evaluation requires AI_API_KEY in your environment or .env file.'
        : 'Baseline evaluation unexpectedly detected an AI API key.');
    }
    const registration = await fetchJson(`${baseUrl}/api/student/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nickname: `eval-${suite.language}-${Date.now()}` })
    });
    const results = [];
    for (const testCase of suite.cases) {
      const reply = await fetchJson(`${baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${registration.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ question: testCase.question })
      });
      results.push({ testCase, reply, evaluation: evaluateReply(testCase, suite, reply) });
    }
    return results;
  } catch (error) {
    if (serverOutput.trim()) error.message += `\nServer output:\n${serverOutput.trim()}`;
    throw error;
  } finally {
    await stopChild(child);
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

async function main() {
  const dataset = JSON.parse(await fs.readFile(evalPath, 'utf8'));
  if (useAi && (!process.env.AI_API_KEY || process.env.AI_API_KEY.includes('请替换'))) {
    throw new Error('AI evaluation requires a real AI_API_KEY in your environment or .env file.');
  }

  const allResults = [];
  for (const suite of dataset.suites) {
    const results = await runSuite(suite);
    allResults.push(...results);
    for (const result of results) {
      const marker = result.evaluation.passed ? 'PASS' : 'FAIL';
      console.log(`${marker} ${result.testCase.id} [${result.reply.mode}]`);
      if (!result.evaluation.passed) {
        console.log(`  checks: ${JSON.stringify(result.evaluation.checks)}`);
        console.log(`  answer: ${result.reply.answer}`);
      }
    }
  }

  const passed = allResults.filter((result) => result.evaluation.passed).length;
  console.log(`\nSales reply evaluation: ${passed}/${allResults.length} passed (${useAi ? 'AI' : 'baseline'} mode).`);
  if (passed !== allResults.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
