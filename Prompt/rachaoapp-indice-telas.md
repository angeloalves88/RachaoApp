# RachãoApp — Índice Mestre de Telas

> **Total de telas documentadas:** 34 telas + 4 modais  
> **Data:** Maio de 2026

---

## Mapa completo de telas

| ID | Tela | URL | Bloco | Perfil |
|----|------|-----|-------|--------|
| T01 | Landing Page | `/` | 1 | Público |
| T02 | Login | `/login` | 1 | Público |
| T03 | Cadastro | `/cadastro` | 1 | Público |
| T04 | Onboarding — Seleção de Perfil | `/onboarding` | 1 | Público |
| T05 | Recuperação de Senha | `/recuperar-senha` | 1 | Público |
| T06 | Link de Confirmação de Presença | `/confirmar/[token]` | 1 | Boleiro (sem login) |
| T07 | Dashboard do Presidente | `/dashboard` | 2 | Presidente |
| T08 | Lista de Grupos | `/grupos` | 2 | Presidente |
| T09 | Criar / Editar Grupo | `/grupos/novo` · `/grupos/[id]/editar` | 2 | Presidente |
| T10 | Detalhe do Grupo | `/grupos/[id]` | 2 | Presidente |
| T11 | Ficha do Boleiro | `/grupos/[id]/boleiros/[boleiro_id]` | 2 | Presidente |
| T12 | Adicionar / Editar Boleiro | modal | 2 | Presidente |
| T13 | Criar Partida (Wizard 6 steps) | `/partidas/nova` | 3 | Presidente |
| T14 | Detalhe da Partida | `/partidas/[id]` | 3 | Presidente |
| T15 | Gerenciar Presenças | `/partidas/[id]/presencas` | 4 | Presidente |
| T16 | Reenviar Convites | modal | 4 | Presidente |
| T17 | Notificações | `/notificacoes` | 4 | Todos |
| T18 | Escalação de Times | `/partidas/[id]/escalacao` | 5 | Presidente |
| T19 | Card de Compartilhamento da Escalação | modal | 5 | Presidente |
| T20 | Partida Ao Vivo | `/partidas/[id]/ao-vivo` | 6 | Presidente |
| T20-A | Modal: Registrar Gol | modal sobre T20 | 6 | Presidente |
| T20-B | Modal: Registrar Cartão | modal sobre T20 | 6 | Presidente |
| T20-C | Modal: Registrar Substituição | modal sobre T20 | 6 | Presidente |
| T20-D | Modal: Cartão Azul | modal sobre T20 | 6 | Presidente |
| T21 | Encerrar Partida | modal sobre T20 | 6 | Presidente |
| T22 | Resumo da Partida | `/partidas/[id]/resumo` | 6 | Presidente + público |
| T23 | Gerenciar Vaquinha | `/partidas/[id]/vaquinha` | 7 | Presidente |
| T24 | Enviar Cobrança | modal | 7 | Presidente |
| T25 | Configurar Vaquinha | modal | 7 | Presidente |
| T26 | Dashboard do Dono do Estádio | `/estadio/dashboard` | 8 | Dono do Estádio |
| T27 | Perfil do Estádio | `/estadio/perfil` | 8 | Dono do Estádio |
| T28 | Agenda do Estádio | `/estadio/agenda` | 8 | Dono do Estádio |
| T29 | Aprovação de Vínculo | `/estadio/solicitacoes` | 8 | Dono do Estádio |
| T30 | Página Pública do Estádio | `/estadios/[slug]` | 8 | Público |
| T31 | Perfil Pessoal | `/perfil` | 9 | Todos |
| T32 | Planos e Assinatura | `/planos` | 9 | Todos |
| T33 | Configurações de Notificações | `/configuracoes/notificacoes` | 9 | Todos |
| T34 | Configurações Gerais | `/configuracoes` | 9 | Todos |

---

## Arquivos de documentação

| Arquivo | Conteúdo |
|---------|---------|
| `rachaoapp-prd-v1.md` | PRD completo — requisitos, módulos, modelo de dados, stack |
| `rachaoapp-identidade-visual.md` | Paleta, tipografia, CSS variables, componentes |
| `rachaoapp-telas-bloco1.md` | T01 a T06 — Área pública e onboarding |
| `rachaoapp-telas-bloco2.md` | T07 a T12 — Dashboard e grupos |
| `rachaoapp-telas-bloco3e4.md` | T13 a T17 — Agendamento e presenças |
| `rachaoapp-telas-bloco5e6.md` | T18 a T22 — Escalação e registro de partida |
| `rachaoapp-telas-bloco7a9.md` | T23 a T34 — Vaquinha, Dono do Estádio, Configurações |
