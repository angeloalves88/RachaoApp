# RachãoApp — Identidade Visual

> **Versão:** 1.0  
> **Data:** Maio de 2026  
> **Direção escolhida:** Azul Noturno + Laranja — Moderno e Urbano

---

## 1. Conceito Visual

**Palavra-chave:** *Pelada noturna sob holofotes*

O RachãoApp captura a energia das peladas que acontecem à noite — o campo iluminado, a tensão do jogo, a galera reunida. O azul escuro simula o céu noturno e a sombra do campo; o laranja queimado remete às luzes artificiais, à bola em movimento, ao gol celebrado. É moderno sem perder a raiz do futebol popular brasileiro.

---

## 2. Paleta de Cores

### Cores Primárias

| Papel | Nome | Hex | Uso |
|-------|------|-----|-----|
| Background principal | Azul Noite | `#0f1b2d` | Fundo de todas as telas |
| Surface 1 | Azul Escuro | `#162236` | Cards, painéis |
| Surface 2 | Azul Médio | `#1c2d45` | Cards elevados, modais |
| Surface offset | Azul Borda | `#243450` | Hover states, separadores |
| Acento primário | Laranja Fogo | `#e8530a` | CTAs, botões primários, destaques |
| Acento hover | Laranja Queimado | `#c94208` | Hover do botão primário |
| Acento highlight | Laranja Suave | `#2d1a0f` | Background de badges laranja |

### Cores de Texto

| Papel | Hex | Uso |
|-------|-----|-----|
| Texto primário | `#e8edf3` | Títulos, conteúdo principal |
| Texto secundário | `#7a8fa6` | Labels, metadados, descrições |
| Texto apagado | `#3d5068` | Placeholders, texto desabilitado |
| Texto inverso | `#0f1b2d` | Texto sobre fundo laranja |

### Cores de Suporte (Status e Dados)

| Papel | Hex | Uso |
|-------|-----|-----|
| Sucesso (Verde) | `#22c55e` | Confirmado, pago, gol registrado |
| Atenção (Amarelo) | `#eab308` | Pendente, cartão amarelo |
| Erro (Vermelho) | `#ef4444` | Recusado, cartão vermelho, inadimplente |
| Info (Azul claro) | `#38bdf8` | Informações neutras, cartão azul |
| Divider | `#1e2f44` | Linhas separadoras |
| Border | `#243450` | Bordas de cards e inputs |

---

## 3. Tipografia

### Fontes

| Papel | Fonte | Fonte de Carregamento | Fallback |
|-------|-------|-----------------------|----------|
| **Display** (títulos, logo) | **Barlow Condensed** Bold/ExtraBold | Google Fonts | Impact, sans-serif |
| **Body** (textos, UI) | **Inter** Regular/Medium/SemiBold | Google Fonts | system-ui, sans-serif |
| **Números / Placar** | **Inter** com `font-variant-numeric: tabular-nums` | Google Fonts | monospace |

**Por que Barlow Condensed:** condensada, esportiva, com energia — usada em camisas, estadios e materiais esportivos. Perfeita para o tom do RachãoApp.  
**Por que Inter:** legível em qualquer tamanho, referência em web apps modernos, funciona muito bem em mobile.

### Escala Tipográfica (Web App — compacta)

```css
/* Escala fluida com clamp() */
--text-xs:   clamp(0.75rem, 0.7rem + 0.25vw, 0.875rem);   /* 12-14px — badges, metadados */
--text-sm:   clamp(0.875rem, 0.8rem + 0.35vw, 1rem);       /* 14-16px — botões, nav */
--text-base: clamp(1rem, 0.95rem + 0.25vw, 1.125rem);      /* 16-18px — corpo do texto */
--text-lg:   clamp(1.125rem, 1rem + 0.75vw, 1.5rem);       /* 18-24px — títulos de seção */
--text-xl:   clamp(1.5rem, 1.2rem + 1.25vw, 2.25rem);      /* 24-36px — título de página (máximo no app) */
```

| Elemento | Fonte | Tamanho | Peso |
|----------|-------|---------|------|
| Logo / Nome do app | Barlow Condensed | 28px | ExtraBold (800) |
| Título de página | Barlow Condensed | `--text-xl` | Bold (700) |
| Título de seção/card | Inter | `--text-lg` | SemiBold (600) |
| Corpo do texto | Inter | `--text-base` | Regular (400) |
| Botões e nav | Inter | `--text-sm` | Medium (500) |
| Badges e labels | Inter | `--text-xs` | Medium (500) — uppercase tracked |
| **Placar** | Inter | `--text-xl` | Bold (700) — tabular-nums |

---

## 4. Bordas e Raios

```css
--radius-sm:   0.375rem;   /* 6px  — badges, inputs pequenos */
--radius-md:   0.5rem;     /* 8px  — botões, inputs */
--radius-lg:   0.75rem;    /* 12px — cards */
--radius-xl:   1rem;       /* 16px — cards de destaque, modais */
--radius-full: 9999px;     /* pílulas — chips de status */
```

---

## 5. Sombras

Sombras frias, combinando com as superfícies azul-escuras:

```css
--shadow-sm: 0 1px 3px oklch(0.05 0.02 240 / 0.4);
--shadow-md: 0 4px 16px oklch(0.05 0.02 240 / 0.5);
--shadow-lg: 0 12px 40px oklch(0.05 0.02 240 / 0.6);
```

---

## 6. CSS Variables — Implementação Completa

```css
:root {
  /* Surfaces */
  --color-bg:               #0f1b2d;
  --color-surface:          #162236;
  --color-surface-2:        #1c2d45;
  --color-surface-offset:   #243450;
  --color-surface-dynamic:  #2a3c5c;
  --color-divider:          #1e2f44;
  --color-border:           #243450;

  /* Texto */
  --color-text:             #e8edf3;
  --color-text-muted:       #7a8fa6;
  --color-text-faint:       #3d5068;
  --color-text-inverse:     #0f1b2d;

  /* Acento primário — Laranja */
  --color-primary:          #e8530a;
  --color-primary-hover:    #c94208;
  --color-primary-active:   #a83506;
  --color-primary-highlight: #2d1a0f;

  /* Status */
  --color-success:          #22c55e;
  --color-success-highlight: #0d2b1a;
  --color-warning:          #eab308;
  --color-warning-highlight: #2b2200;
  --color-error:            #ef4444;
  --color-error-highlight:  #2b0f0f;
  --color-info:             #38bdf8;
  --color-info-highlight:   #0a1f2b;

  /* Tipografia */
  --font-display: 'Barlow Condensed', Impact, sans-serif;
  --font-body:    'Inter', system-ui, sans-serif;

  /* Bordas e sombras */
  --radius-sm:   0.375rem;
  --radius-md:   0.5rem;
  --radius-lg:   0.75rem;
  --radius-xl:   1rem;
  --radius-full: 9999px;

  --shadow-sm: 0 1px 3px oklch(0.05 0.02 240 / 0.4);
  --shadow-md: 0 4px 16px oklch(0.05 0.02 240 / 0.5);
  --shadow-lg: 0 12px 40px oklch(0.05 0.02 240 / 0.6);

  --transition-interactive: 180ms cubic-bezier(0.16, 1, 0.3, 1);

  /* Conteúdo */
  --content-narrow:  640px;
  --content-default: 960px;
  --content-wide:    1200px;
}
```

> **Nota:** O app é dark mode por padrão. Um toggle light mode pode ser adicionado na V2.

---

## 7. Componentes — Padrão Visual

### Botão Primário (CTA)
```css
background: var(--color-primary);       /* Laranja */
color: var(--color-text-inverse);       /* Azul escuro no texto */
border-radius: var(--radius-md);
font: 500 var(--text-sm) var(--font-body);
padding: 0.625rem 1.25rem;
min-height: 44px;                       /* Touch target */
```

### Botão Secundário
```css
background: transparent;
border: 1px solid var(--color-border);
color: var(--color-text);
```

### Card
```css
background: var(--color-surface);
border: 1px solid var(--color-border);
border-radius: var(--radius-lg);
padding: var(--space-4);
box-shadow: var(--shadow-sm);
```

### Badge de Status
```css
/* Confirmado */
background: var(--color-success-highlight);
color: var(--color-success);
border-radius: var(--radius-full);
font-size: var(--text-xs);
padding: 2px 8px;
text-transform: uppercase;
letter-spacing: 0.05em;
```

### Input
```css
background: var(--color-surface-2);
border: 1px solid var(--color-border);
border-radius: var(--radius-md);
color: var(--color-text);
padding: 0.625rem 0.875rem;
min-height: 44px;

/* Focus */
border-color: var(--color-primary);
outline: 2px solid oklch(from var(--color-primary) l c h / 0.25);
```

### Placar
```css
font-family: var(--font-display);
font-size: var(--text-xl);
font-weight: 700;
color: var(--color-text);
font-variant-numeric: tabular-nums;
letter-spacing: -0.02em;
```

---

## 8. Iconografia

- **Biblioteca:** [Lucide Icons](https://lucide.dev) — traço limpo, 24px padrão, `stroke-width: 1.5`
- **Tamanhos:** 16px (inline em texto), 20px (botões e nav), 24px (ações standalone), 32px (empty states)
- **Cor:** herda `currentColor` — sempre combinando com o contexto
- **Ícones específicos do contexto futebolístico:** usar emoji ⚽ 🟨 🟥 como complemento visual em cards de evento

---

## 9. Logotipo — Conceito

**Texto + símbolo geométrico**

- **Texto:** "Rachão" em Barlow Condensed ExtraBold, todo em maiúsculas
- **Símbolo:** Um círculo (bola) com um traço diagonal cortando — remete ao movimento, ao chute, à ação
- **Cor:** Laranja (`#e8530a`) no símbolo, texto em branco
- **Versão compacta (favicon):** Apenas o símbolo da bola em laranja sobre fundo azul escuro

```
  ●/  RACHÃO
  [símbolo] [texto]
```

---

## 10. Tom Visual por Tela

| Tela | Destaque visual | Elemento de identidade |
|------|----------------|----------------------|
| Login / Onboarding | Fundo com gradiente sutil azul + laranja no canto | Logo centralizado, CTA laranja |
| Dashboard do Presidente | Cards de próxima partida com borda laranja | Contador regressivo até o jogo |
| Lista de presença | Badges coloridos por status | Barra de progresso (confirmados/vagas) |
| Escalação | Times em colunas com cores distintas | Animação de drag-and-drop |
| Registro de partida | Placar em destaque central | Cronômetro em laranja pulsante |
| Resumo da partida | Card de artilharia com ícone ⚽ | Destaque do MVP |
| Vaquinha | Barra de progresso arrecadado/total | Badge "Pago" em verde |
| Perfil do Estádio | Foto de capa em destaque | Grade de horários disponíveis |

---

## 11. Referências de Estilo

| Referência | O que usar |
|------------|-----------|
| **Sofascore** | Densidade de informação, cards de partida, placar |
| **ESPN App** | Hierarquia de dados esportivos, tipografia bold |
| **Linear** | Suavidade das transições, dark mode sofisticado |
| **Nubank** | Simplicidade mobile-first, feedback de ações |

