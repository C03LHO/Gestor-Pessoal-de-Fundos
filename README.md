# Fundos — Gestão pessoal de FIIs

App local de carteira de Fundos Imobiliários: Next.js + SQLite + Prisma.
Integra com Yahoo Finance para cotações e proventos automáticos.

## Setup inicial (uma vez só)

```powershell
pnpm install
pnpm exec prisma db push
pnpm run db:seed   # opcional, popula dados de exemplo
```

## Uso no dia-a-dia

**Desenvolvimento** (hot reload, ideal para mexer no código):
```powershell
pnpm run dev
```

**Produção** (rápido, ideal para uso real e acesso pelo iPhone):
```
1 clique:  start-fundos.bat
```
Na primeira execução o `.bat` faz `pnpm install` + `prisma db push` + `next build`. Depois é só rodar e o servidor sobe em segundos. Aberto em `http://localhost:3000`.

Pra reconstruir o build após mudar código:
```
rebuild-fundos.bat
```

## Acesso pelo iPhone (Tailscale)

Sua tailnet: `tail7a0a40.ts.net` · PC: `asusgabriel`

1. Tailscale rodando no PC e no iPhone (mesma conta).
2. No iPhone, abra **Safari** em **`http://asusgabriel.tail7a0a40.ts.net:3000`**.
3. Botão Compartilhar → **Adicionar à Tela de Início**.
4. Pronto. Ícone "Fundos" abre como app nativo, tela cheia, com Face ID se você configurar senha.

## Senha (opcional, com Face ID via Keychain)

Edite o `.env` e defina:
```
APP_PASSWORD=sua_senha_aqui
```
Reinicie (`start-fundos.bat`). No primeiro acesso vai pedir senha. Safari oferece **Salvar no iCloud Keychain** → confirma com Face ID. Próximos acessos: Safari preenche sozinho com Face ID.

A senha é um cookie httpOnly de 1 ano. Para sair, `POST /api/auth/logout` ou apaga cookies.

## Iniciar com o Windows (auto-boot, sem janela)

```
1 clique:  instalar-no-boot.bat
```
Registra uma tarefa no Task Scheduler que sobe o `Fundos` em background a cada login. Sem console visível.

Para reverter:
```
desinstalar-do-boot.bat
```

## Backup

O banco é o arquivo `data.db`. Copie quando quiser:
```powershell
Copy-Item data.db "data.bak-$(Get-Date -Format yyyy-MM-dd).db"
```

## Rodar em servidor 24/7 (Umbrel / Docker)

Veja **[UMBREL.md](UMBREL.md)** — guia completo de Dockerfile, docker-compose,
estrutura Umbrel App Store e migração do PC pro servidor sem perder dados.

Resumo rápido (servidor com Docker):
```bash
git clone <seu-repo>
cd fundos
echo "APP_PASSWORD=5842" > .env
docker compose up -d --build
```
Acessa em `http://<ip-servidor>:3000`.

## Estrutura

- `src/app/` — páginas (Dashboard, Carteira, Lançamentos, Metas, Simulador) e rotas de API
- `src/lib/domain/` — lógica de negócio (posição, projeção, simulação, previsão)
- `src/lib/mercado/yahoo.ts` — integração Yahoo Finance
- `prisma/schema.prisma` — modelagem do banco
