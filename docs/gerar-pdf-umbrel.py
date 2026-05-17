"""
Gera PDF: Deploy do Fundos no Umbrel + acesso pelo iPhone via Tailscale.
Uso diagramas vetoriais para ilustrar arquitetura e fluxos.
"""

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, PageBreak,
    Table, TableStyle, ListFlowable, ListItem, KeepTogether, Flowable,
)
from reportlab.lib.enums import TA_CENTER
import os

OUTPUT = os.path.join(os.path.dirname(__file__), "..", "guia-umbrel-iphone.pdf")

styles = getSampleStyleSheet()

PRETO = colors.HexColor("#09090b")
VERDE = colors.HexColor("#10b981")
ZINC_400 = colors.HexColor("#a1a1aa")
ZINC_600 = colors.HexColor("#52525b")
ZINC_800 = colors.HexColor("#27272a")
ZINC_900 = colors.HexColor("#18181b")
AMBAR = colors.HexColor("#f59e0b")
ROSA = colors.HexColor("#f43f5e")
SKY = colors.HexColor("#0ea5e9")
VIOLET = colors.HexColor("#8b5cf6")

styles.add(ParagraphStyle(name="Capa", fontName="Helvetica-Bold", fontSize=32, leading=40,
    alignment=TA_CENTER, textColor=PRETO, spaceAfter=6))
styles.add(ParagraphStyle(name="CapaSub", fontName="Helvetica", fontSize=14, leading=18,
    alignment=TA_CENTER, textColor=ZINC_600, spaceAfter=40))
styles.add(ParagraphStyle(name="H1", fontName="Helvetica-Bold", fontSize=22, leading=28,
    textColor=PRETO, spaceBefore=18, spaceAfter=10))
styles.add(ParagraphStyle(name="H2", fontName="Helvetica-Bold", fontSize=15, leading=20,
    textColor=PRETO, spaceBefore=14, spaceAfter=6))
styles.add(ParagraphStyle(name="H3", fontName="Helvetica-Bold", fontSize=12, leading=16,
    textColor=ZINC_800, spaceBefore=10, spaceAfter=4))
styles.add(ParagraphStyle(name="Corpo", fontName="Helvetica", fontSize=10.5, leading=15,
    textColor=PRETO, spaceAfter=6))
styles.add(ParagraphStyle(name="Codigo", fontName="Courier-Bold", fontSize=9.5, leading=13,
    textColor=VERDE, backColor=ZINC_900, leftIndent=8, rightIndent=8,
    spaceBefore=4, spaceAfter=8, borderPadding=6))
styles.add(ParagraphStyle(name="Nota", fontName="Helvetica-Oblique", fontSize=10, leading=14,
    textColor=ZINC_600, leftIndent=12, rightIndent=12,
    backColor=colors.HexColor("#fef3c7"), borderPadding=8,
    spaceBefore=6, spaceAfter=6, borderColor=AMBAR, borderWidth=0.5))
styles.add(ParagraphStyle(name="Aviso", fontName="Helvetica", fontSize=10, leading=14,
    textColor=PRETO, leftIndent=12, rightIndent=12,
    backColor=colors.HexColor("#fee2e2"), borderPadding=8,
    spaceBefore=6, spaceAfter=6, borderColor=ROSA, borderWidth=0.5))
styles.add(ParagraphStyle(name="Dica", fontName="Helvetica", fontSize=10, leading=14,
    textColor=PRETO, leftIndent=12, rightIndent=12,
    backColor=colors.HexColor("#dcfce7"), borderPadding=8,
    spaceBefore=6, spaceAfter=6, borderColor=VERDE, borderWidth=0.5))
styles.add(ParagraphStyle(name="Legenda", fontName="Helvetica-Oblique", fontSize=8.5,
    textColor=ZINC_600, alignment=TA_CENTER, spaceAfter=12, spaceBefore=2))


# ============ Diagramas ============

class DiagramaArquitetura(Flowable):
    """Mostra a arquitetura: iPhone → Tailscale → Umbrel → Docker → Fundos."""
    def __init__(self, largura=17*cm, altura=10*cm):
        super().__init__()
        self.width = largura
        self.height = altura

    def draw(self):
        c = self.canv
        # iPhone à esquerda
        self._device(c, 0.5*cm, self.height/2 - 2*cm, 3*cm, 4*cm, SKY, "iPhone",
                     ["Safari + PWA", "Fundos.app", "Face ID"])
        # Nuvem Tailscale
        self._cloud(c, 4.5*cm, self.height/2 - 1*cm, 4*cm, 2*cm, VIOLET, "Tailscale",
                    "WireGuard VPN")
        # Umbrel à direita
        self._device(c, 10*cm, self.height/2 - 2.5*cm, 6.5*cm, 5*cm, ZINC_900, "Umbrel OS",
                     ["Docker Engine", "", "Container Fundos:", "  Next.js 15", "  SQLite + data.db", "  Volume backup"])

        # Setas
        c.setStrokeColor(ZINC_600)
        c.setLineWidth(1.5)
        # iPhone → Tailscale
        c.line(3.5*cm, self.height/2, 4.5*cm, self.height/2)
        # Tailscale → Umbrel
        c.line(8.5*cm, self.height/2, 10*cm, self.height/2)
        # Cabeças
        for x in [4.5*cm, 10*cm]:
            c.line(x - 5, self.height/2 + 4, x, self.height/2)
            c.line(x - 5, self.height/2 - 4, x, self.height/2)

        # Legendas
        c.setFillColor(ZINC_600)
        c.setFont("Helvetica", 8)
        c.drawCentredString(4*cm, self.height/2 + 8, "HTTPS")
        c.drawCentredString(9.25*cm, self.height/2 + 8, "porta 3000")

    def _device(self, c, x, y, w, h, cor, titulo, linhas):
        c.setFillColor(cor)
        c.roundRect(x, y, w, h, 8, fill=1, stroke=0)
        c.setFillColor(colors.white)
        c.setFont("Helvetica-Bold", 11)
        c.drawCentredString(x + w/2, y + h - 18, titulo)
        c.setFont("Helvetica", 9)
        for i, l in enumerate(linhas):
            c.drawCentredString(x + w/2, y + h - 36 - i*12, l)

    def _cloud(self, c, x, y, w, h, cor, titulo, sub):
        # "nuvem" simplificada
        c.setFillColor(cor)
        c.roundRect(x, y, w, h, 20, fill=1, stroke=0)
        c.setFillColor(colors.white)
        c.setFont("Helvetica-Bold", 10)
        c.drawCentredString(x + w/2, y + h - 16, titulo)
        c.setFont("Helvetica", 8)
        c.drawCentredString(x + w/2, y + h - 30, sub)


class DiagramaTerminal(Flowable):
    def __init__(self, titulo, linhas, largura=16*cm):
        super().__init__()
        self.titulo = titulo
        self.linhas = linhas
        self.width = largura
        self.altura_titulo = 22
        self.altura_linha = 13
        self.height = self.altura_titulo + len(linhas) * self.altura_linha + 16

    def draw(self):
        c = self.canv
        c.setFillColor(ZINC_900)
        c.setStrokeColor(ZINC_800)
        c.roundRect(0, 0, self.width, self.height, 6, fill=1, stroke=1)
        c.setFillColor(ZINC_800)
        c.rect(0, self.height - self.altura_titulo, self.width, self.altura_titulo, fill=1, stroke=0)
        for i, cor in enumerate([colors.HexColor("#ff5f57"), colors.HexColor("#febc2e"), colors.HexColor("#28c840")]):
            c.setFillColor(cor)
            c.circle(12 + i*16, self.height - self.altura_titulo/2, 5, fill=1, stroke=0)
        c.setFillColor(ZINC_400)
        c.setFont("Helvetica", 9)
        c.drawCentredString(self.width/2, self.height - self.altura_titulo/2 - 3, self.titulo)
        y = self.height - self.altura_titulo - 14
        c.setFont("Courier", 9)
        for l in self.linhas:
            if l.startswith("$"):
                c.setFillColor(VERDE)
            elif l.startswith(">"):
                c.setFillColor(SKY)
            elif l.startswith("#"):
                c.setFillColor(ZINC_400)
            else:
                c.setFillColor(colors.white)
            c.drawString(10, y, l)
            y -= self.altura_linha


class DiagramaIPhone(Flowable):
    """Desenha 3 telinhas de iPhone representando passos do PWA."""
    def __init__(self, telas, largura=17*cm):
        super().__init__()
        self.telas = telas
        self.width = largura
        self.height = 9*cm

    def draw(self):
        c = self.canv
        n = len(self.telas)
        w_telef = 4*cm
        h_telef = 8*cm
        gap = (self.width - n * w_telef) / (n + 1)
        for i, (titulo, conteudo) in enumerate(self.telas):
            x = gap + i * (w_telef + gap)
            y = 0.5*cm
            # Corpo do iPhone
            c.setFillColor(PRETO)
            c.roundRect(x, y, w_telef, h_telef, 18, fill=1, stroke=0)
            # Tela
            c.setFillColor(colors.white)
            c.roundRect(x + 6, y + 6, w_telef - 12, h_telef - 12, 12, fill=1, stroke=0)
            # Notch
            c.setFillColor(PRETO)
            c.roundRect(x + w_telef/2 - 30, y + h_telef - 6, 60, 14, 7, fill=1, stroke=0)
            # Título da tela
            c.setFillColor(PRETO)
            c.setFont("Helvetica-Bold", 9)
            c.drawCentredString(x + w_telef/2, y + h_telef - 30, titulo)
            # Conteúdo simulado (linhas)
            c.setFont("Helvetica", 7)
            for j, l in enumerate(conteudo):
                c.setFillColor(ZINC_600 if j > 0 else PRETO)
                c.drawCentredString(x + w_telef/2, y + h_telef - 50 - j*12, l)
            # Botão home
            c.setStrokeColor(ZINC_400)
            c.setLineWidth(0.8)
            c.line(x + w_telef/2 - 20, y + 12, x + w_telef/2 + 20, y + 12)
            # Legenda
            c.setFillColor(ZINC_800)
            c.setFont("Helvetica-Bold", 9)
            c.drawCentredString(x + w_telef/2, 4, f"Passo {i+1}")


class DiagramaFluxoDeploy(Flowable):
    """Sequencial: build → push → instalar → rodar."""
    def __init__(self, largura=17*cm, altura=4.5*cm):
        super().__init__()
        self.width = largura
        self.height = altura

    def draw(self):
        c = self.canv
        passos = [
            ("Build local", "docker build", VERDE),
            ("Push imagem", "ghcr.io/seu-user", SKY),
            ("SSH Umbrel", "git clone +\ndocker compose", VIOLET),
            ("Container", "rodando 24/7", colors.HexColor("#ec4899")),
        ]
        n = len(passos)
        w_caixa = (self.width - (n-1)*0.8*cm) / n
        h_caixa = self.height * 0.7
        y = self.height * 0.15
        for i, (t, sub, cor) in enumerate(passos):
            x = i * (w_caixa + 0.8*cm)
            c.setFillColor(cor)
            c.roundRect(x, y, w_caixa, h_caixa, 8, fill=1, stroke=0)
            c.setFillColor(colors.white)
            c.setFont("Helvetica-Bold", 10)
            c.drawCentredString(x + w_caixa/2, y + h_caixa - 18, t)
            c.setFont("Helvetica", 8)
            for j, l in enumerate(sub.split("\n")):
                c.drawCentredString(x + w_caixa/2, y + h_caixa - 32 - j*10, l)
            if i < n - 1:
                sx = x + w_caixa + 4
                sx2 = x + w_caixa + 0.8*cm - 4
                sy = y + h_caixa/2
                c.setStrokeColor(ZINC_600); c.setLineWidth(1.5)
                c.line(sx, sy, sx2, sy)
                c.line(sx2 - 5, sy + 4, sx2, sy)
                c.line(sx2 - 5, sy - 4, sx2, sy)


def code(t):
    t = t.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\n", "<br/>")
    return Paragraph(t, styles["Codigo"])

def nota(t): return Paragraph("<b>Nota:</b> " + t, styles["Nota"])
def aviso(t): return Paragraph("<b>Atenção:</b> " + t, styles["Aviso"])
def dica(t): return Paragraph("<b>Dica:</b> " + t, styles["Dica"])
def p(t, e="Corpo"): return Paragraph(t, styles[e])


doc = SimpleDocTemplate(
    OUTPUT, pagesize=A4,
    leftMargin=2*cm, rightMargin=2*cm,
    topMargin=2*cm, bottomMargin=2*cm,
    title="Guia Umbrel + iPhone — Fundos",
    author="Fundos",
)

story = []

# ====== CAPA ======
story.append(Spacer(1, 3*cm))
story.append(p("Rodar o Fundos no Umbrel", "Capa"))
story.append(p("e acessar do iPhone com Tailscale, em qualquer lugar", "CapaSub"))

resumo = Table([[Paragraph(
    "<b>O que você vai aprender</b><br/><br/>"
    "• Como o Fundos roda como app no Umbrel OS (Docker)<br/>"
    "• 3 caminhos de deploy: SSH simples, app store comunitária e custom<br/>"
    "• Instalar e configurar Tailscale no Umbrel e no iPhone<br/>"
    "• Acessar pelo Safari e instalar como PWA na tela inicial<br/>"
    "• Backup automático e plano de recuperação<br/>"
    "• Solução de problemas mais comuns",
    ParagraphStyle("c", parent=styles["Corpo"], fontSize=11, leading=18, textColor=PRETO)
)]], colWidths=[16*cm])
resumo.setStyle(TableStyle([
    ("BACKGROUND", (0,0), (-1,-1), colors.HexColor("#f4f4f5")),
    ("BOX", (0,0), (-1,-1), 1, ZINC_800),
    ("LEFTPADDING", (0,0), (-1,-1), 16), ("RIGHTPADDING", (0,0), (-1,-1), 16),
    ("TOPPADDING", (0,0), (-1,-1), 14), ("BOTTOMPADDING", (0,0), (-1,-1), 14),
]))
story.append(resumo)
story.append(Spacer(1, 3*cm))
story.append(p("Versão 1.0 · Tempo estimado: 30 minutos", "CapaSub"))
story.append(PageBreak())

# ====== 1. ARQUITETURA ======
story.append(p("1. Como tudo se conecta", "H1"))
story.append(p(
    "Antes de qualquer comando, vale entender a arquitetura. Você terá 3 "
    "elementos: <b>seu iPhone</b>, a <b>Tailscale</b> (uma VPN privada) e o "
    "<b>Umbrel</b> rodando o app em Docker."
))
story.append(DiagramaArquitetura())
story.append(p("Como o seu iPhone alcança o Fundos rodando no servidor", "Legenda"))

story.append(p(
    "<b>Tailscale</b> é a peça mágica: ela cria uma rede privada própria entre "
    "seus dispositivos. Mesmo que o iPhone esteja em outra cidade no 4G e o "
    "Umbrel em casa, eles se enxergam como se fossem na mesma Wi-Fi. <b>Sem "
    "abrir porta no roteador, sem IP fixo, sem domínio público.</b>"
))

story.append(p(
    "<b>Umbrel OS</b> é uma distribuição Linux feita para servidores caseiros. "
    "Ela roda containers Docker, gerencia apps por uma interface web e tem "
    "scripts prontos para apps comunitários. Funciona em Raspberry Pi, mini PC, "
    "qualquer Linux."
))

story.append(p(
    "<b>Fundos</b> sobe como um container Docker dentro do Umbrel. Os dados "
    "(SQLite) ficam em um volume persistente — quando você atualiza o app, "
    "o banco não se perde."
))

story.append(PageBreak())

# ====== 2. PRÉ-REQUISITOS ======
story.append(p("2. Pré-requisitos", "H1"))

t_pre = Table([
    ["Item", "Comentário"],
    ["Umbrel OS instalado e funcionando", "Veja umbrel.com"],
    ["Acesso SSH ao Umbrel", "Habilitado em Settings → Advanced"],
    ["Conta Tailscale gratuita", "tailscale.com — plano free serve sobrando"],
    ["Repositório do Fundos no GitHub (público ou privado)", "Para deploy via clone"],
    ["Conta GitHub para Container Registry (opcional)", "Se for usar Option B"],
    ["iPhone com iOS 16.4+", "Para PWA + Face ID via Keychain"],
], colWidths=[8*cm, 8*cm])
t_pre.setStyle(TableStyle([
    ("BACKGROUND", (0,0), (-1,0), ZINC_900),
    ("TEXTCOLOR", (0,0), (-1,0), colors.white),
    ("FONTNAME", (0,0), (-1,0), "Helvetica-Bold"),
    ("FONTSIZE", (0,0), (-1,-1), 9.5),
    ("ROWBACKGROUNDS", (0,1), (-1,-1), [colors.white, colors.HexColor("#f4f4f5")]),
    ("BOX", (0,0), (-1,-1), 0.5, ZINC_800),
    ("GRID", (0,0), (-1,-1), 0.3, ZINC_400),
    ("LEFTPADDING", (0,0), (-1,-1), 8), ("RIGHTPADDING", (0,0), (-1,-1), 8),
    ("TOPPADDING", (0,0), (-1,-1), 7), ("BOTTOMPADDING", (0,0), (-1,-1), 7),
    ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
]))
story.append(t_pre)

story.append(PageBreak())

# ====== 3. PREPARAR APP ======
story.append(p("3. Preparar o app para o Docker", "H1"))
story.append(p(
    "O Fundos já vem com Dockerfile e docker-compose prontos. Mas antes de "
    "subir no Umbrel, certifique que o repositório está atualizado com as "
    "alterações que você fez localmente:"
))

story.append(DiagramaTerminal("Terminal local (no PC)", [
    "$ cd C:\\Users\\aurel\\Desktop\\Fundos",
    "$ git add .",
    "$ git commit -m \"Pronto para deploy\"",
    "$ git push origin main",
    "> tudo certo",
]))

story.append(Spacer(1, 8))
story.append(p("3.1 Construir e publicar a imagem Docker (opcional)", "H2"))
story.append(p(
    "Se você quer instalar via Umbrel App Store (Caminho B mais adiante), "
    "precisa publicar a imagem em um registry. O <b>GitHub Container Registry</b> "
    "(ghcr.io) é grátis para repositórios públicos:"
))

story.append(DiagramaTerminal("PowerShell ou terminal", [
    "# 1. Gera token classic em github.com/settings/tokens",
    "#    com permissão write:packages",
    "",
    "$ docker build -t ghcr.io/SEU-USUARIO/fundos:latest .",
    "$ echo $GITHUB_TOKEN | docker login ghcr.io \\",
    "      -u SEU-USUARIO --password-stdin",
    "$ docker push ghcr.io/SEU-USUARIO/fundos:latest",
    "> Push completo. Imagem publicada.",
]))

story.append(dica(
    "Se você prefere não publicar imagem, use o <b>Caminho A</b> da próxima "
    "página: cópia do repo + <code>docker compose up</code>. Mais simples, sem "
    "registry."
))

story.append(PageBreak())

# ====== 4. DEPLOY ======
story.append(p("4. Deploy no Umbrel — 3 caminhos", "H1"))
story.append(DiagramaFluxoDeploy())
story.append(p("Visão geral dos passos do deploy", "Legenda"))

story.append(p("4.1 Caminho A — Docker compose direto via SSH", "H2"))
story.append(p(
    "Mais simples, recomendado para começar. Sem dependência de GitHub Packages."
))

story.append(DiagramaTerminal("SSH no Umbrel: ssh umbrel@umbrel.local", [
    "$ cd ~",
    "$ git clone https://github.com/SEU-USUARIO/fundos.git",
    "$ cd fundos",
    "$ echo \"APP_PASSWORD=5842\" > .env",
    "$ docker compose up -d --build",
    "> Building...",
    "> Container fundos started",
    "$ docker compose logs -f fundos",
    "> ▲ Next.js 15  ✓ Ready in 3.2s",
]))

story.append(p(
    "Pronto. O app fica em <code>http://&lt;ip-do-umbrel&gt;:3000</code> "
    "(geralmente <code>http://umbrel.local:3000</code> na sua rede de casa)."
))

story.append(p("4.2 Caminho B — Umbrel App Store comunitária", "H2"))
story.append(p(
    "O app aparece no menu inicial do Umbrel igual aos oficiais. Precisa da "
    "imagem publicada (passo 3.1)."
))
story.append(p("No painel web do Umbrel:"))
story.append(ListFlowable([
    ListItem(p("<b>Settings → App Stores → Add Store</b>")),
    ListItem(p("Cole a URL do seu repositório GitHub")),
    ListItem(p("Aguarde a indexação (~30s)")),
    ListItem(p("Volte à tela inicial → procure 'Fundos' → <b>Install</b>")),
    ListItem(p("O Umbrel cuida do reverse proxy automaticamente")),
], leftIndent=14, bulletType="1", bulletFormat="%s."))

story.append(p("4.3 Caminho C — Custom App via UI do Umbrel", "H2"))
story.append(p(
    "Algumas versões do Umbrel permitem 'Custom App' direto na UI. Você cola "
    "o docker-compose, dá um nome, e instala. Mais lento de configurar; "
    "recomendo A ou B."
))

story.append(PageBreak())

# ====== 5. ARQUIVOS DO APP NO UMBREL ======
story.append(p("5. Onde os arquivos ficam", "H1"))
story.append(p(
    "Entender a estrutura de pastas ajuda na hora de fazer backup manual ou "
    "debug."
))

t_dirs = Table([
    ["Caminho", "O que tem"],
    ["~/fundos/", "Código do projeto (clone do git)"],
    ["~/fundos/data.db", "Banco SQLite (no volume Docker, persistente)"],
    ["~/fundos/backups/", "Backups locais (se você habilitou)"],
    ["~/.config/rclone/", "Token de OAuth do Google Drive / OneDrive"],
    ["/var/lib/docker/volumes/fundos_fundos_data/", "Volume Docker do data.db"],
], colWidths=[9*cm, 7*cm])
t_dirs.setStyle(TableStyle([
    ("BACKGROUND", (0,0), (-1,0), VIOLET),
    ("TEXTCOLOR", (0,0), (-1,0), colors.white),
    ("FONTNAME", (0,0), (-1,0), "Helvetica-Bold"),
    ("FONTNAME", (0,1), (0,-1), "Courier"),
    ("FONTSIZE", (0,0), (-1,-1), 9),
    ("ROWBACKGROUNDS", (0,1), (-1,-1), [colors.white, colors.HexColor("#f4f4f5")]),
    ("BOX", (0,0), (-1,-1), 0.5, ZINC_800),
    ("GRID", (0,0), (-1,-1), 0.3, ZINC_400),
    ("LEFTPADDING", (0,0), (-1,-1), 8), ("RIGHTPADDING", (0,0), (-1,-1), 8),
    ("TOPPADDING", (0,0), (-1,-1), 6), ("BOTTOMPADDING", (0,0), (-1,-1), 6),
]))
story.append(t_dirs)

story.append(Spacer(1, 12))
story.append(nota(
    "O <b>data.db</b> que importa é o que está no <b>volume Docker</b>. Se "
    "você fizer <code>cp data.db backup.db</code> dentro de <code>~/fundos/</code>, "
    "você pode estar copiando uma cópia desatualizada. Use o botão "
    "<b>'Exportar JSON'</b> dentro do app, ou backup via rclone, que pegam do "
    "lugar certo."
))

story.append(PageBreak())

# ====== 6. TAILSCALE ======
story.append(p("6. Tailscale no Umbrel + iPhone", "H1"))
story.append(p(
    "Tailscale é a peça que permite acessar o app de qualquer lugar (3G, 4G, "
    "Wi-Fi de outro lugar) sem expor o servidor na internet."
))

story.append(p("6.1 Instalar no Umbrel", "H2"))
story.append(p(
    "Algumas versões do Umbrel já trazem Tailscale como app na loja. "
    "Verifique primeiro pela UI. Se não tiver, instalação manual via SSH:"
))
story.append(DiagramaTerminal("SSH no Umbrel", [
    "$ curl -fsSL https://tailscale.com/install.sh | sh",
    "$ sudo tailscale up",
    "",
    "> To authenticate, visit:",
    "> https://login.tailscale.com/a/abc123",
    "",
    "# abra essa URL num browser do seu PC ou celular",
    "# faça login, autorize o dispositivo",
    "",
    "$ tailscale ip",
    "> 100.71.122.103",
    "$ tailscale status",
    "> umbrel  100.71.122.103  ativo",
]))

story.append(p("6.2 Habilitar MagicDNS (recomendado)", "H2"))
story.append(p(
    "No painel <b>admin do Tailscale</b> (login.tailscale.com), vá em DNS e "
    "ative <b>MagicDNS</b>. Isso faz com que você possa acessar pelo nome "
    "(ex: <code>umbrel.tailXXXX.ts.net</code>) em vez de decorar IP."
))

story.append(p("6.3 Instalar no iPhone", "H2"))
story.append(ListFlowable([
    ListItem(p("App Store → procure '<b>Tailscale</b>' → Instalar")),
    ListItem(p("Abra o app → Sign in → use a <b>mesma conta</b> do Umbrel")),
    ListItem(p("Ative o switch principal (deve ficar verde)")),
    ListItem(p("Em 'Machines' deve aparecer o Umbrel")),
    ListItem(p("Toque no Umbrel — veja o hostname (ex: <code>umbrel.tailXXXX.ts.net</code>) e IP")),
], leftIndent=14, bulletType="1", bulletFormat="%s."))

story.append(p("6.4 Testar do iPhone", "H2"))
story.append(p(
    "Com Tailscale ativo, abra Safari e visite:"
))
story.append(code("http://&lt;hostname-do-umbrel&gt;.tailXXXX.ts.net:3000"))
story.append(p(
    "(substitua pela sua tailnet — você vê no painel admin.tailscale.com)"
))
story.append(p("Se não funcionar pelo hostname, tente pelo IP:"))
story.append(code("http://&lt;ip-tailscale-do-umbrel&gt;:3000"))
story.append(aviso(
    "Use <b>http://</b>, não https://. Por padrão o Fundos serve HTTP na "
    "porta 3000. Para HTTPS, use <code>tailscale serve</code> ou um proxy "
    "reverso (não obrigatório)."
))

story.append(PageBreak())

# ====== 7. INSTALAR PWA NO IPHONE ======
story.append(p("7. Instalar como app no iPhone (PWA)", "H1"))
story.append(p(
    "Adicionar o Fundos à tela inicial transforma ele em um app que abre "
    "em tela cheia, com ícone, splash screen e suporte ao Face ID via "
    "iCloud Keychain. É <b>obrigatório</b> instalar como PWA para receber "
    "notificações push (iOS 16.4+)."
))

story.append(DiagramaIPhone([
    ("Safari abre o app", [
        "Fundos", "—",
        "http://umbrel.tail...",
        "ts.net:3000",
        "—",
        "Página inicial",
        "carregada com",
        "sucesso.",
    ]),
    ("Compartilhar →", [
        "Compartilhar",
        "—",
        "Adicionar à",
        "Tela de Início ★",
        "Adicionar aos",
        "Favoritos",
        "Copiar link",
    ]),
    ("Adicionado!", [
        "Tela de Início",
        "—",
        "[ícone Fundos]",
        "—",
        "Toque para",
        "abrir como app",
        "nativo.",
    ]),
]))
story.append(p(
    "Adicionar à Tela de Início — Safari iOS", "Legenda"
))

story.append(p("Passos detalhados:", "H3"))
story.append(ListFlowable([
    ListItem(p("Abra <b>Safari</b> (não Chrome) na URL do Fundos")),
    ListItem(p("Toque no ícone <b>Compartilhar</b> (quadrado com seta para cima)")),
    ListItem(p("Role e toque em <b>Adicionar à Tela de Início</b>")),
    ListItem(p("Confirme o nome 'Fundos' → <b>Adicionar</b> no canto superior direito")),
    ListItem(p("Volte à tela inicial — o ícone do Fundos está lá. Toque para abrir.")),
], leftIndent=14, bulletType="1", bulletFormat="%s."))

story.append(dica(
    "Você verá que ao abrir pelo ícone, <b>não tem barra do Safari nem URL</b>. "
    "É a experiência PWA. Para deslogar, abra Configurações dentro do app."
))

story.append(p("7.1 Face ID para login", "H2"))
story.append(p(
    "Quando você fizer login pela primeira vez, o Safari pergunta se quer "
    "<b>salvar a senha no iCloud Keychain</b>. Aceite. Próximas vezes, ele "
    "preenche automaticamente com Face ID — mesmo na PWA aberta em tela cheia."
))
story.append(p(
    "Para algo ainda mais robusto, configure <b>Passkeys</b> em Configurações "
    "do Fundos. Aí o login é literalmente um Face ID, sem digitar senha. "
    "Requer HTTPS — veja <b>tailscale serve</b> mais adiante."
))

story.append(PageBreak())

# ====== 8. HTTPS COM TAILSCALE SERVE ======
story.append(p("8. HTTPS automático (opcional, mas útil)", "H1"))
story.append(p(
    "Por default, você acessa o Fundos via HTTP. Para certos recursos (como "
    "Passkey/WebAuthn ou alguns padrões PWA mais modernos), o iOS exige HTTPS. "
    "Solução zero-config: <b>Tailscale Serve</b>. Gera certificado válido "
    "para o seu hostname automaticamente."
))

story.append(DiagramaTerminal("SSH no Umbrel", [
    "$ sudo tailscale serve --bg --https=443 http://localhost:3000",
    "> Available within your tailnet:",
    "> https://umbrel.tailXXXX.ts.net/",
    "$ ",
]))

story.append(p("Pronto. Agora você acessa via:"))
story.append(code("https://umbrel.tailXXXX.ts.net"))
story.append(p(
    "Sem porta. Com cadeado verde. Funciona em iPhone, MacBook, Windows, "
    "Android — qualquer dispositivo na sua tailnet."
))

story.append(p("Para usar Passkey:", "H3"))
story.append(p(
    "Edite <code>Configuracao</code> no Prisma Studio do app (ou via SQL) e "
    "defina <code>rpOrigin</code> = <code>https://umbrel.tailXXXX.ts.net</code>. "
    "Reinicie o container. Aí em Configurações → Passkeys → Adicionar funciona."
))

story.append(PageBreak())

# ====== 9. BACKUP ======
story.append(p("9. Backup automático no Umbrel", "H1"))
story.append(p(
    "Já vimos no guia anterior como instalar rclone e conectar Google Drive "
    "ou OneDrive. No Umbrel, o setup é idêntico — mas via SSH:"
))
story.append(DiagramaTerminal("SSH no Umbrel", [
    "$ curl https://rclone.org/install.sh | sudo bash",
    "$ rclone config",
    "# ... menu interativo: cria gdrive: ou onedrive: ...",
    "$ rclone listremotes",
    "> gdrive:",
]))

story.append(p(
    "Depois disso, dentro do app Fundos (acessado pelo iPhone ou PC), vá em "
    "<b>Configurações → Backup automático na nuvem</b>. O app detecta o rclone "
    "instalado no container do Umbrel automaticamente."
))

story.append(aviso(
    "<b>Importante para Umbrel</b>: o rclone instalado no host (~/.config/rclone) "
    "<b>não</b> é acessível pelo container Docker do Fundos. Você precisa "
    "montar o config no docker-compose:"
))
story.append(code(
    "services:\n"
    "  fundos:\n"
    "    ...\n"
    "    volumes:\n"
    "      - fundos_data:/app/data\n"
    "      - /home/umbrel/.config/rclone:/root/.config/rclone:ro\n"
    "    # rclone precisa estar instalado dentro da imagem também\n"
    "    # OU montar binário: -v /usr/bin/rclone:/usr/bin/rclone"
))

story.append(dica(
    "Solução mais limpa: instale rclone <b>dentro</b> do Dockerfile do Fundos. "
    "Adiciona uma linha <code>RUN apk add --no-cache rclone</code> na imagem. "
    "Aí o config é montado do host só com leitura."
))

story.append(p("9.1 Plano 3-2-1", "H2"))
story.append(p(
    "Recomendo as 3 camadas:"
))
story.append(ListFlowable([
    ListItem(p("<b>Camada ativa</b>: <code>data.db</code> rodando no Umbrel")),
    ListItem(p("<b>Camada local</b>: <code>backups/</code> dentro do volume, "
               "diária via script já configurado")),
    ListItem(p("<b>Camada nuvem</b>: rclone copy diário para Google Drive ou "
               "OneDrive, retenção 30 dias")),
], leftIndent=14, bulletType="bullet"))

story.append(PageBreak())

# ====== 10. ATUALIZAÇÕES ======
story.append(p("10. Atualizar o Fundos", "H1"))
story.append(p(
    "Quando você mexer no código (ou eu fizer melhorias futuras), aqui está o "
    "fluxo:"
))

story.append(DiagramaTerminal("Local (PC) → Push", [
    "$ cd C:\\Users\\aurel\\Desktop\\Fundos",
    "$ git add . && git commit -m \"melhorias\"",
    "$ git push origin main",
]))

story.append(Spacer(1, 6))
story.append(DiagramaTerminal("SSH no Umbrel → Pull + rebuild", [
    "$ cd ~/fundos",
    "$ git pull",
    "$ docker compose up -d --build",
    "> recriando container...",
    "> Fundos rodando v 0.2",
]))

story.append(p(
    "O <b>volume Docker</b> preserva o <code>data.db</code> entre rebuilds. "
    "Você não perde nenhum lançamento. As migrations do Prisma rodam "
    "automaticamente via <code>prisma db push</code> que está no CMD do "
    "Dockerfile."
))

story.append(aviso(
    "Antes de qualquer update <b>grande</b> (ex: schema novo), faça um backup "
    "manual via <b>Configurações → Exportar JSON</b> dentro do app. Salva-vidas."
))

story.append(PageBreak())

# ====== 11. TROUBLESHOOTING ======
story.append(p("11. Solução de problemas", "H1"))

problemas = [
    ("Não consigo acessar do iPhone via Tailscale",
     "Confira: (1) Tailscale ativo no iPhone (switch verde no app). "
     "(2) Tailscale rodando no Umbrel: SSH e roda <code>tailscale status</code>. "
     "(3) Tente o IP direto antes do hostname: "
     "<code>http://100.X.X.X:3000</code>. (4) Confirme que o app está rodando: "
     "<code>docker compose ps</code> deve mostrar 'fundos' com status 'Up'."),

    ("Container reinicia em loop",
     "<code>docker compose logs --tail=50 fundos</code>. Causas comuns: "
     "schema mudou sem migration, banco corrompido (restaure backup), env "
     "var APP_PASSWORD faltando."),

    ("Esqueci a senha",
     "Edite o <code>.env</code> em <code>~/fundos/</code> no Umbrel, mude "
     "<code>APP_PASSWORD</code>, e roda <code>docker compose restart fundos</code>. "
     "Senha nova vale na próxima requisição."),

    ("rclone funciona no host mas não dentro do container",
     "Veja a seção 9 — o config do rclone precisa ser montado como volume no "
     "docker-compose, e o binário rclone precisa estar dentro da imagem (ou "
     "também montado). Solução melhor: adicione <code>rclone</code> ao Dockerfile."),

    ("Quero migrar do PC pro Umbrel sem perder dados",
     "(1) No PC: Configurações → Exportar JSON, salva o arquivo. "
     "(2) Sobe app limpo no Umbrel. (3) Login no app (pelo iPhone ou PC). "
     "(4) Configurações → Importar JSON. (5) Pronto, todas as carteiras, "
     "lançamentos, dividendos e watchlist migrados."),

    ("Quero acessar fora da Tailscale (compartilhar com alguém)",
     "Use <b>Tailscale Funnel</b> em vez de Serve. Ele expõe o endpoint na "
     "internet pública com HTTPS, mas usa quota mensal limitada. "
     "<code>tailscale funnel 3000</code>. Para uso casual está OK; só use se "
     "você confia no APP_PASSWORD."),

    ("Performance lenta no iPhone via 4G",
     "Tailscale roteia pela melhor rota possível (peer-to-peer quando "
     "consegue). Se ficar lento, ative DERP server proximamente. Em geral, "
     "Fundos é leve — a página inicial carrega em < 1s mesmo via 4G."),
]
for titulo, descricao in problemas:
    story.append(KeepTogether([
        Paragraph(f"<b>{titulo}</b>", styles["H3"]),
        Paragraph(descricao, styles["Corpo"]),
    ]))

story.append(PageBreak())

# ====== 12. CHECKLIST FINAL ======
story.append(p("12. Checklist final", "H1"))
story.append(p("Quando todos esses itens estiverem ✓, você está pronto:"))

itens_check = [
    "Umbrel OS instalado e acessível via SSH",
    "Tailscale instalado no Umbrel, autenticado, MagicDNS ativo",
    "Tailscale instalado no iPhone, mesma conta, switch ativo",
    "Docker e docker-compose funcionando no Umbrel",
    "Repositório Fundos clonado em ~/fundos/",
    "APP_PASSWORD definida em ~/fundos/.env",
    "Container rodando: docker compose ps mostra 'Up'",
    "Acesso local: http://<ip-umbrel>:3000 abre o app",
    "Acesso Tailscale: http://<host>.tailXXXX.ts.net:3000 abre o app",
    "Login com senha funcionando",
    "App adicionado à Tela de Início do iPhone (PWA)",
    "Senha salva no iCloud Keychain (Face ID nos próximos acessos)",
    "rclone instalado no Umbrel + remote configurado",
    "Backup automático ativado em Configurações → Backup",
    "Teste de 'Backup agora' funcionou — arquivo aparece no Drive/OneDrive",
]

for item in itens_check:
    story.append(Paragraph(
        f"☐ &nbsp; {item}",
        ParagraphStyle("c", parent=styles["Corpo"], leftIndent=12, leading=18)
    ))

story.append(Spacer(1, 20))
story.append(p(
    "Quando completar todos os ☐, você tem um sistema de gestão de FIIs "
    "auto-hospedado, acessível de qualquer lugar com Face ID, com backup "
    "automático na nuvem. <b>Parabéns.</b>", "Corpo"
))

story.append(Spacer(1, 14))
story.append(p("Fim do guia.", "Legenda"))

doc.build(story)
print(f"PDF gerado: {os.path.abspath(OUTPUT)}")
