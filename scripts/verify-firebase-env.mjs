/**
 * Build öncesi Firebase env doğrulaması.
 * Local: .env dosyasını okur. Vercel: dashboard env → process.env (VITE_ öneki zorunlu).
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const ENV_PATH = resolve(ROOT, '.env');

const REQUIRED = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
];

function loadDotEnvFile() {
  if (!existsSync(ENV_PATH)) {
    return;
  }
  const text = readFileSync(ENV_PATH, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    const eq = trimmed.indexOf('=');
    if (eq <= 0) {
      continue;
    }
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] == null || process.env[key] === '') {
      process.env[key] = value;
    }
  }
}

function envValue(key) {
  const raw = process.env[key];
  return raw == null ? '' : String(raw).trim();
}

loadDotEnvFile();

const missing = REQUIRED.filter((key) => !envValue(key));

if (missing.length > 0) {
  console.error('\n[verify-firebase-env] Eksik ortam değişkenleri:\n');
  missing.forEach((key) => console.error(`  - ${key}`));
  console.error(
    '\nLocal: .env.example → .env kopyalayıp Firebase değerlerini girin.',
  );
  console.error(
    'Vercel: Project Settings → Environment Variables → tüm VITE_FIREBASE_* anahtarları → Redeploy\n',
  );
  process.exit(1);
}

const apiKey = envValue('VITE_FIREBASE_API_KEY');
if (!apiKey.startsWith('AIza')) {
  console.warn(
    '[verify-firebase-env] Uyarı: VITE_FIREBASE_API_KEY "AIza" ile başlamıyor; yanlış anahtar olabilir.',
  );
}

console.log('[verify-firebase-env] Firebase env OK:', {
  projectId: envValue('VITE_FIREBASE_PROJECT_ID'),
  apiKeyStart: apiKey.slice(0, 6),
});
