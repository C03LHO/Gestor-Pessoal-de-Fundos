# Backup automático — estratégia 3-2-1

Se você perder o mini servidor (HD queima, roubo, incêndio), com essa
configuração você restaura o app inteiro em minutos.

## A regra 3-2-1

- **3** cópias dos dados (1 ativa + 2 backups)
- **2** mídias diferentes (servidor + disco local OU servidor + nuvem)
- **1** cópia **fora** do local físico (nuvem)

## O que é "os dados"

Tudo está em **um arquivo só**: `data.db`. Plus, o JSON exportado (mais portátil).

Tamanho típico: alguns KB no início, talvez 1-2 MB depois de anos. **Não inflate.**

---

## Configuração recomendada (15 min)

### 1. Backup local diário (já vem pronto)

```
duplo-clique: instalar-backup-diario.bat
```
Roda toda noite às 23h, salva em `backups/`, mantém os 14 últimos.

### 2. Backup em nuvem via rclone

**Instala rclone (uma vez):**

Windows:
```powershell
winget install Rclone.Rclone
```

Linux (Umbrel):
```bash
curl https://rclone.org/install.sh | sudo bash
```

**Configura um remote (uma vez):**

```bash
rclone config
```

Siga o menu interativo:
- `n` = novo remote
- Nome: `gdrive` (ou o que preferir)
- Tipo: escolha o provedor (1 = Mega, 13 = Dropbox, 16 = Google Drive, 6 = Backblaze B2, etc.)
- Autoriza no navegador
- Confirma

**Recomendações de provedor:**

| Provedor | Free tier | Setup | Bom para |
|---|---|---|---|
| **Google Drive** | 15 GB | Simples (browser auth) | Maioria das pessoas |
| **Dropbox** | 2 GB | Simples | Quem já usa |
| **Backblaze B2** | 10 GB | Requer cadastro + chave API | Quem quer mais profissional |
| **Mega** | 20 GB | Simples | Sem cadastro de cartão |
| **OneDrive** | 5 GB | Já vem com Office 365 | Quem tem 365 |

Depois rode:
```
duplo-clique: backup-cloud.bat
```
Se o rclone estiver configurado com remote `gdrive:Fundos-Backup`, ele faz upload automático.

**Para customizar o destino**, edite a primeira linha do `backup-cloud.bat`:
```bat
if "%RCLONE_REMOTE%"=="" set RCLONE_REMOTE=gdrive:Fundos-Backup
```
Troca por `dropbox:`, `b2:meu-bucket`, etc.

### 3. Agenda automática

Após testar manualmente, agende:

**Windows** (Task Scheduler):
```powershell
schtasks /Create /TN "Fundos-Backup-Cloud" `
    /TR "%~dp0backup-cloud.bat" `
    /SC DAILY /ST 23:30 /F
```

**Umbrel/Linux** (crontab):
```bash
crontab -e
# Adicione:
30 23 * * * /home/umbrel/fundos/backup-cloud.sh
```

(Crio o `.sh` equivalente na próxima seção.)

---

## Recuperação — perdi tudo, o que faço?

### Cenário A — Tenho backup local

Pega o arquivo do `backups/`:
```
duplo-clique: restaurar-backup.bat
```
Escolhe a data, restaura.

### Cenário B — Só tenho o backup na nuvem

1. Instala rclone na máquina nova (ou usa pelo browser do provedor).
2. Baixa o arquivo mais recente:
```bash
rclone copy gdrive:Fundos-Backup/data-2026-05-15_2300.db ./
```
3. Renomeia para `data.db` na raiz do projeto.
4. `start-fundos.bat`.

### Cenário C — Só tenho o JSON

1. Instala o app limpo no servidor novo.
2. Login.
3. Vai em **Configurações → Importar JSON**.
4. Escolhe o arquivo `export-2026-05-15_2300.json` da nuvem.

---

## Frequência recomendada

| Tipo | Frequência | Onde |
|---|---|---|
| Local (data.db) | Diário 23h | `backups/` |
| Cloud (data.db + JSON) | Diário 23h30 | `gdrive:Fundos-Backup` |
| Manual antes de mudanças grandes | Sob demanda | Botão "Exportar JSON" em Configurações |

---

## Para Linux/Umbrel — script equivalente

Crio `backup-cloud.sh` que faz a mesma coisa do `.bat`:

```bash
#!/bin/bash
set -e
cd "$(dirname "$0")"

STAMP=$(date +%Y-%m-%d_%H%M)
RCLONE_REMOTE="${RCLONE_REMOTE:-gdrive:Fundos-Backup}"
RETENCAO=30

mkdir -p backups

# Local
cp data.db "backups/data-$STAMP.db"
curl -s -o "backups/export-$STAMP.json" http://localhost:3000/api/export 2>/dev/null || true

# Cloud (se rclone configurado)
if command -v rclone >/dev/null; then
  rclone copy "backups/data-$STAMP.db" "$RCLONE_REMOTE/" --quiet
  [ -f "backups/export-$STAMP.json" ] && rclone copy "backups/export-$STAMP.json" "$RCLONE_REMOTE/" --quiet
  rclone delete "$RCLONE_REMOTE/" --min-age "${RETENCAO}d" --quiet 2>/dev/null || true
fi

# Retenção local
ls -t backups/data-*.db 2>/dev/null | tail -n +15 | xargs -r rm
ls -t backups/export-*.json 2>/dev/null | tail -n +15 | xargs -r rm
```

Salve como `backup-cloud.sh`, dê permissão (`chmod +x`), e agende via crontab.

---

## Para meu cenário pessoal (com Tailscale)

Se você tem outro dispositivo na sua tailnet (notebook que liga eventualmente,
NAS, etc.), backup direto pra ele é o mais rápido e privado:

```bash
# Sync via tailscale
rsync -avz data.db usuario@outropc.tail7a0a40.ts.net:/home/usuario/fundos-backup/
```

Ou com rclone se configurar SSH remote:
```bash
rclone config  # tipo: SFTP, host: outropc.tail7a0a40.ts.net
```

Vantagem: sem expor nada na internet pública, latência baixa, custo zero.
