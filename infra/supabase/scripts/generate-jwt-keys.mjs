#!/usr/bin/env node
/**
 * Gera ANON_KEY e SERVICE_ROLE_KEY assinados com JWT_SECRET.
 * Uso: node infra/supabase/scripts/generate-jwt-keys.mjs [caminho-do-.env]
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = process.argv[2] ?? path.join(__dirname, '..', '.env');

function readJwtSecret(file) {
  const text = fs.readFileSync(file, 'utf8');
  const m = text.match(/^JWT_SECRET=(.+)$/m);
  if (!m) throw new Error(`JWT_SECRET nao encontrado em ${file}`);
  return m[1].trim();
}

function signJwt(payload, secret) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const h = b64(header);
  const p = b64(payload);
  const sig = crypto.createHmac('sha256', secret).update(`${h}.${p}`).digest('base64url');
  return `${h}.${p}.${sig}`;
}

const secret = readJwtSecret(envPath);
const iat = 1641769200;
const exp = 1799535600;

const anonKey = signJwt({ role: 'anon', iss: 'supabase-demo', iat, exp }, secret);
const serviceKey = signJwt(
  {
    role: 'service_role',
    iss: 'supabase-demo',
    iat,
    exp,
    sub: '00000000-0000-0000-0000-000000000000',
  },
  secret,
);

console.log(JSON.stringify({ ANON_KEY: anonKey, SERVICE_ROLE_KEY: serviceKey }, null, 2));
