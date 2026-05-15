#!/usr/bin/env node
// Wrapper que carrega .env.local / .env e roda `next dev` na porta WEB_PORT
// (fallback: PORT, depois 3000). Cross-platform (Windows/macOS/Linux).
import { spawn } from 'node:child_process';
import path from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(here, '..');

// Carrega .env.local primeiro (Next convention), depois .env como fallback.
for (const file of ['.env.local', '.env']) {
  const full = path.join(webRoot, file);
  if (!existsSync(full)) continue;
  for (const line of readFileSync(full, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (!m) continue;
    const [, key, rawValue] = m;
    if (key.startsWith('#')) continue;
    if (process.env[key] !== undefined) continue;
    const value = rawValue.replace(/^['"]|['"]$/g, '');
    process.env[key] = value;
  }
}

const port = process.env.WEB_PORT || process.env.PORT || '3000';
const next = spawn('next', ['dev', '--port', port], {
  cwd: webRoot,
  stdio: 'inherit',
  shell: true,
  env: process.env,
});

next.on('exit', (code) => process.exit(code ?? 0));
