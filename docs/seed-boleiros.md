# Cadastro em massa de boleiros (teste / pelada real)

Script que usa a API autenticada para criar os jogadores listados no grupo.

## Pré-requisitos

- `pnpm dev` rodando (Next + API).
- `apps/web/.env.local` com Supabase e API (como no app), **e** as variáveis de seed abaixo.

## Variáveis no `apps/web/.env.local`

| Variável | Obrigatório | Descrição |
|----------|-------------|-----------|
| `RACHAO_SEED_EMAIL` | Sim | E-mail da conta **Presidente** |
| `RACHAO_SEED_PASSWORD` | Sim | Senha dessa conta |
| `RACHAO_GRUPO_ID` | Não | ID do grupo. Se vazio, usa o **primeiro** grupo retornado pela API |
| `NEXT_PUBLIC_SUPABASE_URL` | Sim | Já usado pelo app |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Sim | Já usado pelo app |
| `NEXT_PUBLIC_API_URL` | Sim | Já usado pelo app (ex.: `http://localhost:3333`) |

**Não commite** e-mail/senha de seed no Git.

## Como executar

Na **raiz do monorepo**:

```bash
pnpm seed:boleiros
```

Equivalente (dentro de `apps/web`):

```bash
pnpm seed:boleiros
```

O script carrega `apps/web/.env.local` sozinho.

## Comportamento

- Cada jogador ganha e-mail sintético `seed.*@example.com` (a API exige e-mail ou celular com 11 dígitos). Você pode corrigir depois no app.
- Nome com emoji é gravado sem o emoji.
- Se já existir boleiro com o mesmo contato no grupo, a API responde conflito e o script só marca como “já existe”.

## Alterar a lista de jogadores

Edite o array `JOGADORES` em:

`apps/web/scripts/seed-boleiros.ts`

## Arquivos relacionados

- Script: `apps/web/scripts/seed-boleiros.ts`
- Comando no `package.json` da raiz: `seed:boleiros` → delega para `@rachao/web`
- Exemplo de env: `apps/web/.env.example` (seção do seed)
