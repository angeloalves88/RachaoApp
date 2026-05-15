/**
 * Cadastra boleiros fixos no grupo via API (para testes com pelada real).
 *
 * Uso (na raiz do monorepo ou em apps/web):
 *   pnpm seed:boleiros
 *
 * Lê `apps/web/.env.local` automaticamente (além das variáveis já exportadas no shell).
 *
 * Variáveis obrigatórias no .env.local (ou no ambiente):
 *   RACHAO_SEED_EMAIL / RACHAO_SEED_PASSWORD — conta do Presidente
 *   NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY
 *   NEXT_PUBLIC_API_URL
 *
 * Opcional:
 *   RACHAO_GRUPO_ID — se omitido, usa o primeiro grupo retornado por GET /api/grupos
 *
 * Cada jogador recebe e-mail sintético `seed.*@example.com` (domínio reservado RFC 2606),
 * pois a API exige WhatsApp ou e-mail; você pode editar depois no app.
 */

import { config as loadEnv } from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(__dirname, '../.env.local') });
loadEnv({ path: resolve(__dirname, '../.env') });

type Pos = 'GOL' | 'ZAG' | 'MEI' | 'ATA';

const JOGADORES: Array<{ nome: string; posicao: Pos }> = [
  { nome: 'Vinícius', posicao: 'GOL' },
  { nome: 'Samuel', posicao: 'GOL' },
  { nome: 'Alberto', posicao: 'ZAG' },
  { nome: 'Boquinha', posicao: 'ZAG' },
  { nome: 'Cristiano', posicao: 'ZAG' },
  { nome: 'Fernando Magrão', posicao: 'ZAG' },
  { nome: 'Raphael', posicao: 'ZAG' },
  { nome: 'Thyão', posicao: 'ZAG' },
  { nome: 'Tokoi', posicao: 'ZAG' },
  { nome: 'Zé Belo', posicao: 'ZAG' },
  { nome: 'Edevaldo', posicao: 'ZAG' },
  { nome: 'Cicero', posicao: 'MEI' },
  { nome: 'Dedé', posicao: 'MEI' },
  { nome: 'Erivelton', posicao: 'MEI' },
  { nome: 'Gustavo', posicao: 'MEI' },
  { nome: 'Gabriel', posicao: 'MEI' },
  { nome: 'Hugo', posicao: 'MEI' },
  { nome: 'Jean', posicao: 'MEI' },
  { nome: 'Léo Preto', posicao: 'MEI' },
  { nome: 'José Vitor', posicao: 'MEI' },
  { nome: 'Renatinho', posicao: 'MEI' },
  { nome: 'Rivelino', posicao: 'MEI' },
  { nome: 'Vitão', posicao: 'MEI' },
  { nome: 'Ademir', posicao: 'ATA' },
  { nome: 'Léo Rúbio', posicao: 'ATA' },
  { nome: 'Marquinhos', posicao: 'ATA' },
  { nome: 'Rafael Neguin', posicao: 'ATA' },
  { nome: 'Rafael Rúbio', posicao: 'ATA' },
  { nome: 'Vitinho', posicao: 'ATA' },
  { nome: 'Arthur', posicao: 'ATA' },
];

function limparNome(nome: string): string {
  return nome
    .replace(/\uFE0F/g, '')
    .replace(/[\u{1F300}-\u{1FAFF}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function slugEmailPart(nome: string, idx: number): string {
  const base = limparNome(nome)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
    .slice(0, 40);
  return `${base || 'jogador'}-${idx}`;
}

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '');
  const email = process.env.RACHAO_SEED_EMAIL;
  const password = process.env.RACHAO_SEED_PASSWORD;
  const grupoIdEnv = process.env.RACHAO_GRUPO_ID?.trim();

  if (!supabaseUrl || !anonKey) {
    console.error('Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY.');
    process.exit(1);
  }
  if (!apiUrl) {
    console.error('Defina NEXT_PUBLIC_API_URL.');
    process.exit(1);
  }
  if (!email || !password) {
    console.error('Defina RACHAO_SEED_EMAIL e RACHAO_SEED_PASSWORD (conta Presidente).');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, anonKey);
  const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({ email, password });
  if (authErr || !auth.session?.access_token) {
    console.error('Falha no login Supabase:', authErr?.message ?? 'sem sessão');
    process.exit(1);
  }
  const token = auth.session.access_token;

  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  } as const;

  let grupoId = grupoIdEnv;
  if (!grupoId) {
    const res = await fetch(`${apiUrl}/api/grupos`, { headers });
    if (!res.ok) {
      console.error('GET /api/grupos', res.status, await res.text());
      process.exit(1);
    }
    const body = (await res.json()) as { grupos: Array<{ id: string; nome: string }> };
    const first = body.grupos[0];
    if (!first) {
      console.error('Nenhum grupo encontrado. Crie um grupo no app ou defina RACHAO_GRUPO_ID.');
      process.exit(1);
    }
    grupoId = first.id;
    console.log(`Usando grupo: "${first.nome}" (${grupoId})`);
  }

  let ok = 0;
  let skip = 0;
  let fail = 0;

  for (let i = 0; i < JOGADORES.length; i++) {
    const { nome: rawNome, posicao } = JOGADORES[i]!;
    const nome = limparNome(rawNome);
    const fakeEmail = `seed.${slugEmailPart(nome, i)}@example.com`;

    const res = await fetch(`${apiUrl}/api/grupos/${grupoId}/boleiros`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        nome,
        posicao,
        email: fakeEmail,
        celular: '',
        apelido: null,
      }),
    });

    if (res.status === 201) {
      ok++;
      console.log(`+ ${nome} (${posicao})`);
    } else if (res.status === 409) {
      skip++;
      console.log(`= já existe (contato): ${nome}`);
    } else {
      fail++;
      const t = await res.text();
      console.error(`! ${nome} → ${res.status} ${t}`);
    }
  }

  console.log(`\nResumo: ${ok} criados, ${skip} ignorados (conflito), ${fail} erros.`);
  await supabase.auth.signOut();
  if (fail > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
