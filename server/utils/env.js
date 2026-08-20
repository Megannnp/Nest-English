import dotenv from 'dotenv';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const defaultEnvPaths = [
  new URL('../.env', import.meta.url),
  new URL('../.env.local', import.meta.url),
  path.join(os.tmpdir(), 'nest-writing-server.env'),
  '/tmp/nest-writing-server.env',
  process.env.NEST_SERVER_ENV_FILE,
].filter(Boolean);

const originalEnv = { ...process.env };

for (const envPath of defaultEnvPaths) {
  const resolvedPath = envPath instanceof URL
    ? fileURLToPath(envPath)
    : path.resolve(String(envPath));
  const exists = fs.existsSync(resolvedPath);
  if (!exists) continue;

  dotenv.config({
    path: resolvedPath,
    override: true,
  });

  for (const [key, value] of Object.entries(originalEnv)) {
    process.env[key] = value;
  }
}
