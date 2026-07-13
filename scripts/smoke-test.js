import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';

const requiredPages = [
  ['/', '咨询助手'],
  ['/login.html', '后台登录'],
  ['/admin.html', '知识库后台管理']
];

const requiredAssets = [
  ['/i18n.js', 'language-toggle']
];

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

async function waitForHealth(baseUrl, child) {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) break;
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.ok) return response;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
  throw new Error('Server did not become healthy within 15 seconds.');
}

async function fetchText(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${url} returned HTTP ${response.status}`);
  }
  return response.text();
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}: ${data.error || 'Unknown error'}`);
  return data;
}

async function main() {
  const port = await getFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'open-sales-assistant-'));
  const adminUsername = 'smoke-admin';
  const adminPassword = 'SmokeTest@123456';
  const child = spawn(process.execPath, ['server/index.js'], {
    env: {
      ...process.env,
      PORT: String(port),
      PUBLIC_BASE_URL: baseUrl,
      AI_API_KEY: '',
      DATA_FILE: path.join(tempDir, 'db.json'),
      DATA_BACKUP_DIR: path.join(tempDir, 'backups'),
      ADMIN_USERNAME: adminUsername,
      ADMIN_PASSWORD: adminPassword
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  let output = '';
  child.stdout.on('data', (chunk) => {
    output += chunk.toString();
  });
  child.stderr.on('data', (chunk) => {
    output += chunk.toString();
  });

  try {
    const healthResponse = await waitForHealth(baseUrl, child);
    const health = await healthResponse.json();
    if (health.service !== 'open-sales-assistant') {
      throw new Error(`Unexpected service name: ${health.service}`);
    }
    if (health.aiConfigured !== false) {
      throw new Error('Smoke test expects AI to be unconfigured.');
    }

    const demoLanguageResponse = await fetch(`${baseUrl}/api/demo-language`);
    const demoLanguage = await demoLanguageResponse.json();
    if (!['en', 'zh-CN'].includes(demoLanguage.language)) {
      throw new Error(`Unexpected demo language: ${demoLanguage.language}`);
    }

    for (const [route, expectedTitle] of requiredPages) {
      const html = await fetchText(`${baseUrl}${route}`);
      if (!html.includes(`<title>${expectedTitle}</title>`)) {
        throw new Error(`${route} did not include expected title: ${expectedTitle}`);
      }
    }

    for (const [route, expectedText] of requiredAssets) {
      const content = await fetchText(`${baseUrl}${route}`);
      if (!content.includes(expectedText)) {
        throw new Error(`${route} did not include expected content: ${expectedText}`);
      }
    }

    const login = await fetchJson(`${baseUrl}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: adminUsername, password: adminPassword })
    });
    const authHeaders = {
      Authorization: `Bearer ${login.token}`,
      'Content-Type': 'application/json'
    };
    const material = await fetchJson(`${baseUrl}/api/materials/text`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        title: 'Smoke test product',
        category: 'Demo',
        content: 'A practical sales assistant for small teams.'
      })
    });
    const suggestion = material.suggestions[0];
    if (!suggestion) throw new Error('Material analysis did not create a review suggestion.');
    const emptyAcceptance = await fetch(`${baseUrl}/api/knowledge/suggestions/${suggestion.id}/accept`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ content: '' })
    });
    if (emptyAcceptance.status !== 400) {
      throw new Error(`Empty suggestion acceptance returned HTTP ${emptyAcceptance.status}, expected 400.`);
    }
    const editedContent = 'Edited and approved sales guidance.';
    const accepted = await fetchJson(`${baseUrl}/api/knowledge/suggestions/${suggestion.id}/accept`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        title: 'Reviewed guidance',
        scenario: 'Smoke test',
        content: editedContent
      })
    });
    if (!accepted.knowledge.salesPlaybook.some((item) => item.content === editedContent)) {
      throw new Error('Edited suggestion content was not accepted into the knowledge base.');
    }

    const duplicateResponse = await fetch(`${baseUrl}/api/knowledge/suggestions/${suggestion.id}/accept`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ content: editedContent })
    });
    if (duplicateResponse.status !== 409) {
      throw new Error(`Duplicate suggestion acceptance returned HTTP ${duplicateResponse.status}, expected 409.`);
    }

    console.log('Smoke test passed.');
  } finally {
    child.kill('SIGTERM');
    setTimeout(() => {
      if (child.exitCode === null) child.kill('SIGKILL');
    }, 1000).unref();
    await fs.rm(tempDir, { recursive: true, force: true });
  }

  if (child.exitCode && child.exitCode !== 0) {
    throw new Error(`Server exited with ${child.exitCode}:\n${output}`);
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
