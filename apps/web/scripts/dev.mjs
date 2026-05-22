#!/usr/bin/env node
// Wrapper que carrega .env.local / .env e roda `next dev` na porta WEB_PORT
// (fallback: PORT, depois 3000). Cross-platform (Windows/macOS/Linux).
import { spawn } from 'node:child_process';
import path from 'node:path';
import { existsSync, readFileSync, rmSync } from 'node:fs';
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

/**
 * Next 15 gera symlinks em `.next/types/` (ex.: cache-life.d.ts).
 * No Windows + OneDrive, `readlink` falha com EINVAL — removemos antes do boot.
 */
function cleanNextTypesOnWindows() {
  if (process.platform !== 'win32') return;
  const typesDir = path.join(webRoot, '.next', 'types');
  if (!existsSync(typesDir)) return;
  try {
    rmSync(typesDir, { recursive: true, force: true });
  } catch {
    // Se ainda falhar, apaga o cache inteiro do Next.
    try {
      rmSync(path.join(webRoot, '.next'), { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
}

cleanNextTypesOnWindows();

const port = process.env.WEB_PORT || process.env.PORT || '3000';
const next = spawn('next', ['dev', '--port', port], {
  cwd: webRoot,
  stdio: 'inherit',
  shell: true,
  env: process.env,
});

next.on('exit', (code) => process.exit(code ?? 0));
