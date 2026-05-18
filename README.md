<div align="center">

# Fundos

**Gestão pessoal de Fundos Imobiliários, _local-first_, com cálculo auditável e análise histórica explicável.**

Acompanhe carteira, dividendos e oportunidades de FIIs em um app que roda no seu computador, sincroniza com cotações públicas e cabe no seu bolso via PWA + Tailscale.

[![Stack](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-61dafb?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178c6?logo=typescript)](https://www.typescriptlang.org)
[![Prisma](https://img.shields.io/badge/Prisma-5.22-2D3748?logo=prisma)](https://www.prisma.io)
[![SQLite](https://img.shields.io/badge/SQLite-WAL-003B57?logo=sqlite)](https://www.sqlite.org)
[![Vitest](https://img.shields.io/badge/Vitest-62%20tests-6e9f18?logo=vitest)](https://vitest.dev)

</div>

---

## Visão geral

**Fundos** é um sistema pessoal de acompanhamento de FIIs construído para uso real no dia a dia. Roda local no seu PC (ou em um Umbrel/servidor Docker), guarda seus dados em SQLite e busca cotações e proventos em fontes públicas (Yahoo Finance, Status Invest, Fundamentus, Brapi).

A proposta é simples: **registrar compras e vendas com um clique, ver a verdade sobre a carteira sem planilha, e tomar decisões de aporte com base em análise histórica explicável** — não em achismo.

> Não é um app de corretora. Não envia ordens. Não move dinheiro. É um diário inteligente de carteira.

---

## Destaques

| Pilar | O que entrega |
|---|---|
| **Carteira auditável** | Engine pura recalcula preço médio, lucro realizado e não realizado a partir das movimentações — sem estado preso, sem drift de float. |
| **Dividendos automáticos** | Sync paralelo em 3 fontes (Yahoo · Fundamentus · Status Invest) com dedup mensal e import retroativo ao registrar compras antigas. |
| **Análise histórica explicável** | Cada ticker tem percentil verdadeiro, score 0–100, classe (muito barato → muito caro), confiança e motivos estruturados. |
| **Dashboard com 3 lentes** | Renda acumulada · Top performers do mês · Evolução do patrimônio com KPIs e marcadores de extremos. |
| **Mobile-first PWA** | Instalável no iPhone via Safari, com Face ID por Passkey/Keychain e acesso seguro via Tailscale. |
| **Backup integrado** | Snapshots locais agendados + sync opcional com Google Drive ou OneDrive via rclone. |

---

## Funcionalidades

### Carteira
- Lançamentos de COMPRA, VENDA, APORTE, DIVIDENDO e REINVESTIMENTO
- Múltiplas carteiras com troca rápida e isolamento de dados
- Validação de venda contra posição disponível (impede cotas negativas)
- Edição e exclusão em lote com swipe e undo via toast
- Drill-down por ativo com histórico, dividendos e métricas

### Dividendos
- Import automático ao criar uma compra (retroativo)
- Cadeia de fallback paralela: **Yahoo → Status Invest → Fundamentus → Brapi**
- Deduplicação por mês (resolve ex-date vs data de pagamento)
- Previsão do próximo mês via regressão + sazonalidade
- Calendário de pagamentos com agrupamento por semana

### Análise de valuation
- **Engine `analisarValuation`**: 5 classes (muito barato/barato/justo/caro/muito caro)
- Percentil histórico real (não apenas posição linear no range)
- Score composto 0–100 ponderando percentil, desvio da média, desvio da mediana, drawdown e consistência
- Confiança da análise (alta/média/baixa) com base em quantidade de pontos e volatilidade
- Lista de motivos estruturados (`positivo`/`negativo`/`neutro`) que alimenta a UI
- Avisos automáticos para histórico curto, volatilidade extrema ou série constante

### Dashboard
- KPIs de patrimônio, recebimentos do mês, previsão e meta
- **Renda acumulada** mês a mês (barras + linha de acumulado)
- **Top performers**: valorização e dividendos com toggle mês atual/anterior
- **Evolução do patrimônio** com áreas para valor de mercado vs investido, marcadores de maior patrimônio e maior queda
- Insights automáticos: recordes, marcos, streaks, top pagador
- Sugestões de rebalanceamento por segmento

### Oportunidades
- Watchlist com top 10 FIIs pré-cadastrados (editável)
- Cards com régua histórica, marcadores de média/mediana, percentil e selo de classe
- Filtros por classe e ordenações (score · percentil · perto da mínima · meta)
- Metas de investimento por ativo com progresso visual

### Gráficos
- Página dedicada com mini-charts dos ativos da watchlist
- Modal expandido via **React Portal** com isolamento real de stacking context
- 5 períodos: 1D · 1S · 1M · 6M · 1A
- Recharts customizado: gradientes visíveis, eixos legíveis, tooltip com sombra e valor em destaque

### Mobile e PWA
- Layout responsivo testado de 375px (iPhone SE) a desktop
- Bottom nav · FAB · pull-to-refresh · swipe actions
- Manifest + Service Worker para offline básico
- Suporte a `env(safe-area-inset-*)` para notch e barra inferior

### Segurança e acesso
- Senha de app via cookie httpOnly de 1 ano
- Passkey (WebAuthn) com Face ID/Touch ID
- Push Web (VAPID) para alertas de pagamento
- Anonimizar valores com 1 toque (blur nos `tabular-nums`)

### Backup e sync
- Snapshots agendados do `data.db`
- Backup para Google Drive ou OneDrive via rclone (configurável)
- Retenção por dias e status do último backup visível na UI
- Scripts `.bat` prontos para Windows

---

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | Next.js 15 (App Router · React Server Components) · React 19 · Tailwind 3.4 |
| Linguagem | TypeScript 5.6 estrito |
| Gráficos | Recharts 2.13 com tema central em `src/lib/chart-theme.ts` |
| Validação | Zod |
| Persistência | Prisma 5.22 + SQLite (modo WAL, busy timeout 5s) |
| Auth | Cookie httpOnly + Passkey via `@simplewebauthn` |
| Push | `web-push` com VAPID |
| Testes | Vitest 4 (62 testes — engine de portfólio, valuation, money, projeção, simulação) |
| Cotações | Yahoo Finance (`query1.finance.yahoo.com`), Status Invest, Fundamentus, Brapi |
| Backup | rclone (opcional, configurável) |
| Deploy alternativo | Docker + docker-compose (Umbrel-ready) |

---

## Estrutura do projeto

```
src/
├─ app/                       # Next.js App Router
│  ├─ api/                    # Rotas: lancamentos, mercado, ia, relatorios...
│  ├─ carteira/[ticker]/      # Drill-down por ativo
│  ├─ oportunidades/          # Watchlist + valuation
│  ├─ graficos/               # Mini-charts + modal expandido
│  ├─ lancamentos/            # CRUD + atualizar dividendos
│  ├─ resumo, plano, ia, ...  # Demais páginas
│  └─ page.tsx                # Dashboard
├─ components/
│  ├─ charts/                 # Recharts wrappers (5 charts)
│  ├─ dashboard/              # Seção Evolução & Performance
│  ├─ layout/                 # Sidebar, BottomNav, CarteiraSwitcher
│  └─ ux/                     # Toast, BuscaGlobal, Modal patterns
├─ lib/
│  ├─ domain/                 # ★ Lógica de negócio pura
│  │  ├─ portfolio.ts         # Engine de cálculo (PM, lucro, ciclos)
│  │  ├─ valuation.ts         # Análise histórica explicável
│  │  ├─ dashboard-extras.ts  # 3 visões do dashboard
│  │  ├─ posicao.ts           # Camada de dados sobre portfolio
│  │  ├─ sync-dividendos.ts   # Import + dedup mensal
│  │  ├─ watchlist.ts         # Oportunidades
│  │  └─ ...                  # alertas, insights, previsão, projeção
│  ├─ mercado/                # Yahoo, Status Invest, Fundamentus, Brapi
│  ├─ chart-theme.ts          # Tema central dos gráficos
│  ├─ money.ts                # Aritmética em centavos (sem drift)
│  └─ prisma.ts               # Cliente compartilhado
└─ styles/globals.css
prisma/schema.prisma          # Modelagem do banco
tests/                        # Vitest — 62 testes
```

---

## Como executar

### Pré-requisitos
- **Node 20+** (recomendado 22)
- **pnpm** (`npm i -g pnpm`) — npm/Node 24 tem problema conhecido com Prisma
- Opcional: **Docker** para rodar em servidor

### Setup inicial

```powershell
pnpm install
pnpm exec prisma db push
pnpm run db:seed   # opcional — popula dados de exemplo
```

### Desenvolvimento (hot reload)

```powershell
pnpm run dev
```

Abre em `http://localhost:3000`.

### Produção local (Windows, 1 clique)

```powershell
start-fundos.bat
```

Na primeira execução o `.bat` faz `pnpm install` + `prisma db push` + `next build`. Depois sobe o servidor em segundos.

Reconstruir após mudar código:

```powershell
rebuild-fundos.bat
```

Iniciar automaticamente no login do Windows (Task Scheduler, sem janela):

```powershell
instalar-no-boot.bat
desinstalar-do-boot.bat   # reverter
```

### Scripts de teste e banco

```bash
pnpm test              # Vitest run (62 testes)
pnpm test:watch        # modo watch
pnpm run db:studio     # Prisma Studio
```

### Servidor 24/7 com Docker (Umbrel / VPS)

Consulte **[UMBREL.md](UMBREL.md)** para o guia completo. Resumo:

```bash
git clone <seu-repo>
cd fundos
echo "APP_PASSWORD=sua_senha" > .env
docker compose up -d --build
```

Acessa em `http://<ip>:3000`.

### Acesso pelo iPhone via Tailscale

1. Tailscale instalado no PC e no iPhone (mesma conta).
2. No Safari do iPhone: `http://<seu-host>.<tailnet>.ts.net:3000`.
3. Compartilhar → **Adicionar à Tela de Início** — vira ícone com tela cheia.
4. Com `APP_PASSWORD` setado, o Safari oferece **Salvar no iCloud Keychain** → próximos acessos abrem com Face ID.

---

## Fluxo principal de uso

```
1. Adicionar carteira (uma por estratégia, ou só uma "Principal")
        │
2. Lançar compras de FIIs    ─►  dividendos retroativos importam sozinhos
        │
3. Dashboard mostra
   • patrimônio · variação · meta
   • renda acumulada e do mês
   • top performers e evolução
        │
4. Oportunidades indica fundos historicamente baratos
   com score, percentil e motivos
        │
5. Plano e Simulador projetam quanto tempo até a meta
   ajustando aporte mensal e yield esperado
        │
6. Calendário mostra próximos pagamentos
        │
7. Backup salva o data.db local + cloud (opcional)
```

---

## Como os cálculos funcionam

### Engine de carteira — `src/lib/domain/portfolio.ts`

Função pura, sem I/O. Recebe os lançamentos de um ativo e devolve:

| Campo | Significado |
|---|---|
| `cotas` | quantidade atual (do ciclo aberto) |
| `custoTotal` · `precoMedio` | base do ciclo atual; zeram quando a posição zera |
| `lucroRealizado` | acumulado de `(precoVenda − PM) × qtd` em cada venda |
| `lucroNaoRealizado` | `precoAtual × cotas − custoTotal` |
| `dividendos12m` · `dividendosTotal` | acumulados separados — nunca afetam o PM |
| `ciclos` | quantas vezes a posição zerou (recompra inicia base nova) |
| `warnings` | venda > posição, etc. |

**Regras adotadas:**
- Ordenação determinística: data ASC · COMPRA antes de VENDA no mesmo dia · `id` como tiebreaker
- Venda baixa custo médio (não preço de venda) → PM remanescente fica correto
- Posição zerada reseta `custoTotal` → recompra inicia ciclo novo, sem herança de PM antigo
- Aritmética em centavos via `money.ts` → soma de 100 lançamentos de R$ 0,10 dá R$ 10,00 exato

### Sincronização de dividendos — `src/lib/domain/sync-dividendos.ts`

- 3 fontes consultadas **em paralelo** com timeout de 5s cada
- União por mês (`YYYY-MM`) — resolve diferença entre ex-date (Yahoo) e data de pagamento (Fundamentus)
- `cotasNaData()` calcula posição na data do dividendo para multiplicar pelo valor/cota
- Transação Prisma atômica: todos os dividendos do ciclo são gravados juntos ou nada
- Endpoint de diagnóstico `/api/debug/dividendos/[ticker]` expõe o trace completo

### Análise de valuation — `src/lib/domain/valuation.ts`

```
score = invPercentil   × 0.45    // 100 − percentil_real
      + descontoMedia  × 0.25
      + descontoMediana × 0.15
      + drawdownMax    × 0.10
      + consistência   × 0.05    // CV baixo → bônus
```

- **Percentil real**: fração de preços históricos ≤ atual (robusto a outliers, ≠ posição linear no range)
- **Classe** pelo percentil em bins de 20, com override se desvio da mediana ≥ ±20% (evita conclusões frágeis)
- **Confiança** pela quantidade de pontos e coeficiente de variação
- **Motivos** retornados como `{ texto, peso }[]` — a UI renderiza, não decide

### Patrimônio histórico

Para cada mês entre o primeiro lançamento e hoje:
1. Resolve preço de cada ativo via tabela `Cotacao` (último ≤ fim do mês) com fallback para `precoAtual`
2. Filtra lançamentos até o fim do mês
3. Delega a `recalcularPortfolio` — mesma engine usada na carteira atual

Resultado: a "Evolução do patrimônio" e a "Carteira hoje" sempre batem.

---

## Interface e experiência

- **Dark-only** (`color-scheme: dark` em `globals.css`) — sem toggle de tema; design consistente com a paleta zinc/emerald do Tailwind.
- **Mobile-first**: cards empilhados, FAB para novo lançamento, swipe-to-delete em listas, tabelas com scroll horizontal interno.
- **Toasts** com 4 tipos (`sucesso` · `erro` · `info` · `alerta`) e haptic feedback.
- **Modais** padronizados: bottom-sheet no mobile, centrados no desktop. Modal de gráfico expandido via Portal — escapa de qualquer containing block ancestral.
- **Tema central de gráficos** (`chart-theme.ts`): strokes ≥ 2.5px, gradientes 0.32 → 0 (visíveis em fundo escuro), tooltips com sombra, eixos em 11–12px.

---

## Arquitetura e decisões técnicas

| Decisão | Por quê |
|---|---|
| **SQLite local-first** | Zero serviço externo. Você guarda seus dados. Arquivo `data.db` é o seu backup. |
| **Engine pura para cálculo** | Lógica de PM/lucro/ciclos isolada de I/O → testável, previsível, sem duplicação espalhada em 11 arquivos como era antes. |
| **Aritmética em centavos** | JS `Number` acumula drift em decimais. `money.ts` faz tudo em `Int` interno e converte na borda. |
| **WAL + busy_timeout 5s** | Leituras concorrentes não bloqueiam escritas; transações longas (sync de dividendos) não soltam `SQLITE_BUSY`. |
| **Engine de valuation centralizada** | UI nunca decide se algo está "barato" — só renderiza `classe`, `score`, `motivos`. Zero regra duplicada. |
| **Portal para modal de gráfico** | `position: fixed` quebra dentro de ancestrais com `transform`/`animation`. Portal para `document.body` resolve em qualquer browser. |
| **3 fontes de dividendos em paralelo** | Yahoo às vezes falha, Status Invest às vezes bloqueia. Estratégia de união resiste a indisponibilidade isolada. |
| **Dedup por mês** | Yahoo dá ex-date, Fundamentus dá data de pagamento — mesma distribuição. Chave `YYYY-MM` consolida. |
| **Tema de gráfico em TS, não CSS vars** | App é dark-only; um módulo TS centraliza sem overhead de `getComputedStyle`. Trivial migrar para CSS vars se um dia houver light mode. |

---

## Roadmap

### Curto prazo
- [ ] Click-to-expand nos gráficos do dashboard (Dividendos, Patrimônio, Renda acumulada) — mesmo padrão de Portal da página /graficos
- [ ] Período configurável na análise de valuation (6m · 12m · 24m · máximo)
- [ ] Aplicar `money.ts` nos pontos remanescentes de soma em float (OportunidadesClient, Plano, Calendário)

### Médio prazo
- [ ] Suporte a taxas/corretagem/IR — engine já tem campos preparados (`totalInvestidoBruto`, `totalRecebidoVenda`)
- [ ] Lançamento de BONIFICAÇÃO e SPLIT como tipos próprios
- [ ] Bloco de valuation no drill-down do ativo (engine pronta, só falta wiring)
- [ ] Yield e P/VP entrando no score de atratividade

### Longo prazo
- [ ] Migration `Float → Int` no schema (cents nativos no SQLite)
- [ ] Modo multi-usuário com login real
- [ ] App mobile nativo (Capacitor) com push notification iOS

---

## Limitações atuais

- A tabela `Cotacao` só guarda dias em que o app foi aberto. Meses sem snapshot caem para o preço atual com aviso "~base aproximada".
- O ranking de "valorização do mês" no top performers exige cotação anterior. Ativo recém-adicionado fica fora do ranking com aviso.
- O modo expandido (Portal) só está em `/graficos`. Outros charts ainda abrem inline.
- Sem light mode (decisão consciente — app é dark-only).
- Sem suporte a moedas estrangeiras ou outras classes de ativos além de FIIs.
- Yield Curve / DI futuro não é fonte — comparações com CDI usam o histórico do CDI mensal.

---

## Capturas de tela

> _Espaço reservado. Adicionar screenshots em `docs/screenshots/` e referenciar aqui._

```
docs/screenshots/
  ├─ dashboard.png
  ├─ oportunidades.png
  ├─ graficos-modal.png
  └─ lancamentos-mobile.png
```

---

## Testes

```bash
pnpm test
```

Cobertura atual: **62 testes**, dividida em:

| Suite | Foco |
|---|---|
| `tests/portfolio.test.ts` | Engine de carteira — 7 cenários obrigatórios + tiebreaker + drift |
| `tests/valuation.test.ts` | Análise histórica — núcleo, confiança, outliers, override por mediana |
| `tests/money.test.ts` | Aritmética em centavos — sem drift em séries longas |
| `tests/projecao.test.ts` | Projeção de patrimônio até meta |
| `tests/simulacao.test.ts` | Simulador de aportes |
| `tests/estatistica.test.ts` | Regressão linear |
| `tests/aderencia.test.ts` | Score de aderência ao plano |

---

## Backup

Documentação completa em **[BACKUP.md](BACKUP.md)**. Em uma linha:

```powershell
Copy-Item data.db "data.bak-$(Get-Date -Format yyyy-MM-dd).db"
```

Para backup agendado:

```powershell
instalar-backup-diario.bat
```

Para sync cloud (Google Drive ou OneDrive via rclone): configure em **Configurações → Backup**.

---

## Licença

Projeto pessoal. Sem licença pública. Não há autorização para uso comercial sem contato prévio.

---

<div align="center">
<sub>Construído para uso próprio. Otimizado para clareza. Aberto para evoluir.</sub>
</div>
