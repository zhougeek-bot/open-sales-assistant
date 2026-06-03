import { spawn } from 'node:child_process';
import net from 'node:net';

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

async function main() {
  const port = await getFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, ['server/index.js'], {
    env: {
      ...process.env,
      PORT: String(port),
      PUBLIC_BASE_URL: baseUrl,
      AI_API_KEY: ''
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

    console.log('Smoke test passed.');
  } finally {
    child.kill('SIGTERM');
    setTimeout(() => {
      if (child.exitCode === null) child.kill('SIGKILL');
    }, 1000).unref();
  }

  if (child.exitCode && child.exitCode !== 0) {
    throw new Error(`Server exited with ${child.exitCode}:\n${output}`);
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
