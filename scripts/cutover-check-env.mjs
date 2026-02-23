import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function parseEnvFile(filePath) {
  const raw = readFileSync(filePath, 'utf8');
  const env = {};
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx <= 0) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    env[key] = value;
  }
  return env;
}

const filePath = resolve(process.cwd(), '.env.production');
const env = parseEnvFile(filePath);

const expected = {
  VITE_API_URL: process.env.CUTOVER_EXPECTED_API_URL || 'https://api.brndland.com',
  VITE_ENVIRONMENT: process.env.CUTOVER_EXPECTED_ENV || 'production',
};

const failures = [];
const checks = [];

for (const [key, expectedValue] of Object.entries(expected)) {
  const actual = env[key];
  if (actual !== expectedValue) {
    failures.push(`${key} expected="${expectedValue}" actual="${actual ?? ''}"`);
  } else {
    checks.push(`${key}=${actual}`);
  }
}

if (!env.VITE_APP_HOST) {
  failures.push('VITE_APP_HOST missing in .env.production');
} else {
  checks.push(`VITE_APP_HOST=${env.VITE_APP_HOST}`);
}

if (!env.VITE_APP_FRAME_URL) {
  failures.push('VITE_APP_FRAME_URL missing in .env.production');
} else {
  checks.push(`VITE_APP_FRAME_URL=${env.VITE_APP_FRAME_URL}`);
}

console.log('🔍 Frontend cutover env check');
for (const check of checks) console.log(`✅ ${check}`);
for (const failure of failures) console.log(`❌ ${failure}`);

if (failures.length > 0) {
  process.exitCode = 1;
} else {
  console.log('✅ Environment check passed');
}
