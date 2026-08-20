import '../utils/env.js';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

import { validateProductionEnv } from '../config/validateEnv.js';

const PORT = Number(process.env.PORT || 3001);
const HEALTH_URL = `http://127.0.0.1:${PORT}/api/health`;
const START_TIMEOUT_MS = 15000;
const POLL_INTERVAL_MS = 400;

function logStep(message) {
  console.log(`\n[predeploy] ${message}`);
}

function spawnCheckedProcess(args, env = process.env) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, {
      cwd: new URL('..', import.meta.url),
      env,
      stdio: 'inherit',
    });

    child.on('error', reject);
    child.on('exit', (code, signal) => {
      if (signal) {
        reject(new Error(`命令被信号中断：${signal}`));
        return;
      }
      if (code !== 0) {
        reject(new Error(`命令执行失败，退出码 ${code}`));
        return;
      }
      resolve();
    });
  });
}

async function waitForHealth(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let lastError = null;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      const payload = await response.json();
      if (response.ok && payload?.ready === true) {
        return payload;
      }
      lastError = new Error(`健康检查未就绪：HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await delay(POLL_INTERVAL_MS);
  }

  throw lastError || new Error('健康检查超时');
}

async function stopServer(child) {
  if (!child || child.exitCode != null) return;

  const exited = new Promise((resolve) => {
    child.once('exit', () => resolve());
  });

  child.kill('SIGINT');
  const timeout = delay(5000).then(() => {
    if (child.exitCode == null) {
      child.kill('SIGKILL');
    }
  });

  await Promise.race([exited, timeout]);
}

async function main() {
  logStep('校验生产环境变量');
  validateProductionEnv({
    ...process.env,
    NODE_ENV: 'production',
  });
  console.log(`[predeploy] 生产环境变量校验通过，目标端口 ${PORT}`);

  logStep('检查 migration 文件链');
  await spawnCheckedProcess(['scripts/check-migrations.js']);

  logStep('执行数据库迁移');
  await spawnCheckedProcess(['scripts/migrate.js'], {
    ...process.env,
    NODE_ENV: 'production',
    DB_INIT_MODE: 'migrate',
  });

  logStep('以 production + DB_INIT_MODE=connect 启动服务');
  const serverProcess = spawn(process.execPath, ['server.js'], {
    cwd: new URL('..', import.meta.url),
    env: {
      ...process.env,
      NODE_ENV: 'production',
      DB_INIT_MODE: 'connect',
    },
    stdio: 'inherit',
  });

  const serverExitPromise = new Promise((_, reject) => {
    serverProcess.once('error', (error) => {
      reject(error);
    });
    serverProcess.once('exit', (code, signal) => {
      if (code === 0 || signal === 'SIGINT') return;
      reject(new Error(`服务启动进程提前退出：code=${code ?? 'null'}, signal=${signal ?? 'null'}`));
    });
  });

  try {
    const payload = await Promise.race([
      waitForHealth(HEALTH_URL, START_TIMEOUT_MS),
      serverExitPromise,
    ]);
    console.log(`[predeploy] 健康检查通过：${JSON.stringify(payload)}`);
  } finally {
    await stopServer(serverProcess);
  }

  console.log('\n[predeploy] 预部署自检全部通过');
}

main().catch((error) => {
  console.error(`\n[predeploy] 自检失败：${error?.message || error}`);
  process.exit(1);
});
