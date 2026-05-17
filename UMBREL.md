# Instalar no Umbrel OS

Há **3 caminhos** — escolha o que faz mais sentido pra você.

---

## Opção A — Docker puro (mais simples se já tem SSH)

No seu servidor Umbrel, abra um terminal (Umbrel UI → Terminal, ou SSH):

```bash
# 1. Clone seu repositório (ou copia a pasta inteira via scp)
git clone https://github.com/SEU-USUARIO/fundos.git
cd fundos

# 2. Crie o arquivo de senha (opcional)
echo "APP_PASSWORD=5842" > .env

# 3. Build + sobe
docker compose up -d --build

# 4. Verifica
docker compose ps
docker compose logs -f fundos
```

Pronto. O app fica em `http://<ip-do-umbrel>:3000`.

Para atualizar depois:
```bash
cd fundos && git pull && docker compose up -d --build
```

Backup do banco:
```bash
docker run --rm -v fundos_fundos_data:/d -v $PWD:/b alpine cp /d/data.db /b/data-$(date +%F).db
```

---

## Opção B — Sideload como App do Umbrel (UI integrada, mais bonito)

Esta é a **forma oficial** do Umbrel para apps de terceiros. O app aparece
no menu inicial igual aos oficiais.

### Pré-requisito: imagem publicada

O Umbrel App Store baixa imagens prontas. Você precisa publicar a sua:

```bash
# No seu PC com Docker:
docker build -t ghcr.io/SEU-USUARIO/fundos:latest .
echo "$GITHUB_TOKEN" | docker login ghcr.io -u SEU-USUARIO --password-stdin
docker push ghcr.io/SEU-USUARIO/fundos:latest
```

Crie o token em github.com/settings/tokens (classic, com escopo `write:packages`).

### Instalar no Umbrel

```bash
# No servidor Umbrel, SSH:
cd ~/umbrel

# Adicione esta pasta umbrel/ como community app store
sudo ./scripts/app install fundos --store https://github.com/SEU-USUARIO/fundos
```

Ou via UI:
1. Settings → App Stores → Add Store
2. Cole `https://github.com/SEU-USUARIO/fundos`
3. Aguarde aparecer. Clique Install.

Depois, no menu principal, o ícone Fundos aparece. Clica → abre via reverse
proxy do próprio Umbrel em `http://umbrel.local/app/fundos` (sem porta).

### Editar URLs antes de subir o repo

Em `umbrel/fundos/umbrel-app.yml` e `docker-compose.yml`, substitua
`SEU-USUARIO` pelo seu user do GitHub.

---

## Opção C — Direto via UI do Umbrel (sem Git)

Funciona se a versão do Umbrel tiver opção de "Custom App" pela interface.
Mais lenta de configurar; recomendo A ou B.

---

## Como configurar a senha

No Umbrel, depois de instalado, edite as env vars do app:

- Opção A: arquivo `.env` na raiz do projeto (já feito acima).
- Opção B: o Umbrel guarda env vars em `~/umbrel/app-data/fundos/`. Edite
  `docker-compose.yml` da app e reinicie via:
  ```
  cd ~/umbrel && ./scripts/app restart fundos
  ```

## Como acessar pelo iPhone

- **Local (na rede de casa):** `http://umbrel.local:3000` (Opção A) ou
  pelo dashboard do Umbrel (Opção B).
- **Fora de casa via Tailscale:** Umbrel tem app Tailscale. Instale, conecte
  na sua tailnet `tail7a0a40.ts.net`, e do iPhone acesse
  `http://umbrel.tail7a0a40.ts.net:3000`.

## Backup

O banco é o arquivo `data.db` dentro do volume `fundos_data`.

```bash
# Backup manual:
docker run --rm \
  -v fundos_fundos_data:/d \
  -v $(pwd):/b alpine \
  cp /d/data.db /b/data-$(date +%F).db

# Restore:
docker compose down
docker run --rm \
  -v fundos_fundos_data:/d \
  -v $(pwd):/b alpine \
  cp /b/data-2026-05-15.db /d/data.db
docker compose up -d
```

Ou use o botão **Exportar JSON** dentro do app (em Configurações). Para
backup automático no Umbrel, adicione no crontab:

```bash
crontab -e
# Linha:
0 23 * * * docker run --rm -v fundos_fundos_data:/d -v /home/umbrel/backups:/b alpine cp /d/data.db /b/data-$(date +\%F).db
```

## Troubleshooting

**Container reinicia em loop**
```bash
docker compose logs --tail=50 fundos
```
Provável causa: schema mudou. Rode `pnpm exec prisma db push` localmente
e suba a imagem nova.

**iPhone não acessa**
- Confira firewall do Umbrel.
- Confira se Tailscale está ativo nos dois (PC = Umbrel, iPhone).
- Tente IP direto (não hostname) primeiro.

**Quero migrar do PC pra Umbrel sem perder dados**
1. No PC, abra Configurações → Exportar JSON.
2. Suba o Umbrel com app vazio.
3. Configurações → Importar JSON. Pronto.
