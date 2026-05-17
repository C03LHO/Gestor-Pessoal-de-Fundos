"""
Gera PDF: Como rodar o Fundos no Umbrel via Portainer.io.
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

OUTPUT = os.path.join(os.path.dirname(__file__), "..", "guia-portainer.pdf")

styles = getSampleStyleSheet()

PRETO       = colors.HexColor("#09090b")
VERDE       = colors.HexColor("#10b981")
VERDE_C     = colors.HexColor("#34d399")
ZINC_400    = colors.HexColor("#a1a1aa")
ZINC_600    = colors.HexColor("#52525b")
ZINC_800    = colors.HexColor("#27272a")
ZINC_900    = colors.HexColor("#18181b")
AMBAR       = colors.HexColor("#f59e0b")
ROSA        = colors.HexColor("#f43f5e")
SKY         = colors.HexColor("#0ea5e9")
PORTAINER   = colors.HexColor("#13bef9")
PORTAINER2  = colors.HexColor("#1a4263")

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
styles.add(ParagraphStyle(name="Codigo", fontName="Courier-Bold", fontSize=9, leading=12.5,
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


# ============ Diagramas / Mockups ============

class MockupPortainer(Flowable):
    """Mockup da tela Stacks do Portainer com sidebar + topbar + conteúdo."""
    def __init__(self, titulo_tela, conteudo, largura=17*cm, altura=10*cm):
        super().__init__()
        self.width = largura
        self.height = altura
        self.titulo_tela = titulo_tela
        self.conteudo = conteudo

    def draw(self):
        c = self.canv
        # Window frame
        c.setFillColor(colors.HexColor("#e4e4e7"))
        c.roundRect(0, 0, self.width, self.height, 6, fill=1, stroke=0)
        # Title bar
        c.setFillColor(colors.HexColor("#d4d4d8"))
        c.roundRect(0, self.height - 28, self.width, 28, 6, fill=1, stroke=0)
        # Mac dots
        for i, cor in enumerate([colors.HexColor("#ff5f57"), colors.HexColor("#febc2e"), colors.HexColor("#28c840")]):
            c.setFillColor(cor)
            c.circle(14 + i*16, self.height - 14, 5, fill=1, stroke=0)
        # URL bar
        c.setFillColor(colors.white)
        c.roundRect(80, self.height - 22, self.width - 120, 16, 4, fill=1, stroke=0)
        c.setFillColor(ZINC_600)
        c.setFont("Helvetica", 8)
        c.drawString(86, self.height - 17, "https://umbrel.local:9443/#!/2/docker/stacks")

        # Sidebar
        c.setFillColor(PORTAINER2)
        c.rect(0, 0, 3*cm, self.height - 28, fill=1, stroke=0)
        # Logo Portainer
        c.setFillColor(PORTAINER)
        c.roundRect(0.4*cm, self.height - 60, 2.2*cm, 24, 4, fill=1, stroke=0)
        c.setFillColor(colors.white)
        c.setFont("Helvetica-Bold", 9)
        c.drawCentredString(1.5*cm, self.height - 53, "portainer.io")

        # Menu
        menu_itens = [
            ("Home", False), ("Dashboard", False), ("Stacks", True),
            ("Containers", False), ("Images", False), ("Networks", False),
            ("Volumes", False), ("Events", False), ("Settings", False),
        ]
        c.setFont("Helvetica", 8.5)
        for i, (texto, ativo) in enumerate(menu_itens):
            y = self.height - 95 - i * 20
            if ativo:
                c.setFillColor(PORTAINER)
                c.rect(0, y - 4, 3*cm, 18, fill=1, stroke=0)
                c.setFillColor(colors.white)
            else:
                c.setFillColor(colors.HexColor("#9ca3af"))
            c.drawString(0.5*cm, y, texto)

        # Conteúdo
        c.setFillColor(colors.white)
        c.rect(3*cm, 0, self.width - 3*cm, self.height - 28, fill=1, stroke=0)
        # Título da tela
        c.setFillColor(PRETO)
        c.setFont("Helvetica-Bold", 14)
        c.drawString(3.4*cm, self.height - 50, self.titulo_tela)

        # Conteúdo customizado
        y = self.height - 80
        for linha in self.conteudo:
            if isinstance(linha, tuple):
                texto, cor = linha
                c.setFillColor(cor)
            else:
                texto = linha
                c.setFillColor(PRETO)
            c.setFont("Helvetica", 9)
            c.drawString(3.4*cm, y, texto)
            y -= 14


class FluxoDeploy(Flowable):
    """Fluxo: Push GitHub → Portainer pull → Build → Container UP."""
    def __init__(self, largura=17*cm, altura=4.5*cm):
        super().__init__()
        self.width = largura
        self.height = altura

    def draw(self):
        c = self.canv
        passos = [
            ("Você", "git push", SKY, "código\nno GitHub"),
            ("Portainer", "Stack from\nGit Repo", PORTAINER, "clona\nrepositório"),
            ("Docker", "build", VERDE, "compila\nimagem"),
            ("Container", "running", colors.HexColor("#ec4899"), "Fundos\nem produção"),
        ]
        n = len(passos)
        w = (self.width - (n-1)*0.7*cm) / n
        h = self.height * 0.75
        y = self.height * 0.12
        for i, (t, sub1, cor, sub2) in enumerate(passos):
            x = i * (w + 0.7*cm)
            c.setFillColor(cor)
            c.roundRect(x, y, w, h, 8, fill=1, stroke=0)
            c.setFillColor(colors.white)
            c.setFont("Helvetica-Bold", 10)
            c.drawCentredString(x + w/2, y + h - 18, t)
            c.setFont("Helvetica", 8)
            c.drawCentredString(x + w/2, y + h - 32, sub1.split("\n")[0])
            if "\n" in sub1: c.drawCentredString(x + w/2, y + h - 42, sub1.split("\n")[1])
            c.setFont("Helvetica-Oblique", 7)
            c.setFillColor(colors.HexColor("#f3f4f6"))
            for j, l in enumerate(sub2.split("\n")):
                c.drawCentredString(x + w/2, y + 14 - j*9, l)
            if i < n - 1:
                sx = x + w + 4
                sx2 = x + w + 0.7*cm - 4
                sy = y + h/2
                c.setStrokeColor(ZINC_600); c.setLineWidth(1.5)
                c.line(sx, sy, sx2, sy)
                c.line(sx2 - 5, sy + 4, sx2, sy)
                c.line(sx2 - 5, sy - 4, sx2, sy)


class FormStack(Flowable):
    """Mockup do formulário 'Add stack' do Portainer com campos."""
    def __init__(self, largura=17*cm, altura=14*cm):
        super().__init__()
        self.width = largura
        self.height = altura

    def draw(self):
        c = self.canv
        c.setFillColor(colors.white)
        c.setStrokeColor(colors.HexColor("#d4d4d8"))
        c.roundRect(0, 0, self.width, self.height, 8, fill=1, stroke=1)

        # Header
        c.setFillColor(PRETO)
        c.setFont("Helvetica-Bold", 14)
        c.drawString(20, self.height - 30, "Create stack")
        c.setFillColor(ZINC_600)
        c.setFont("Helvetica", 9)
        c.drawString(20, self.height - 48, "Stacks > Add stack")

        # Campos
        y = self.height - 80
        # Nome
        c.setFillColor(PRETO)
        c.setFont("Helvetica-Bold", 10)
        c.drawString(20, y, "Name *")
        c.setFillColor(colors.HexColor("#f4f4f5"))
        c.setStrokeColor(colors.HexColor("#d4d4d8"))
        c.rect(20, y - 30, self.width - 40, 22, fill=1, stroke=1)
        c.setFillColor(PRETO)
        c.setFont("Courier", 10)
        c.drawString(28, y - 24, "fundos")
        y -= 56

        # Build method
        c.setFillColor(PRETO)
        c.setFont("Helvetica-Bold", 10)
        c.drawString(20, y, "Build method")
        y -= 24
        opcoes = [("Web editor", False), ("Upload", False), ("Repository", True), ("Custom template", False)]
        x = 20
        for opt, ativo in opcoes:
            w = 4*cm
            if ativo:
                c.setFillColor(PORTAINER)
                c.setStrokeColor(PORTAINER)
                c.roundRect(x, y - 4, w, 24, 4, fill=1, stroke=1)
                c.setFillColor(colors.white)
            else:
                c.setFillColor(colors.white)
                c.setStrokeColor(colors.HexColor("#d4d4d8"))
                c.roundRect(x, y - 4, w, 24, 4, fill=1, stroke=1)
                c.setFillColor(ZINC_600)
            c.setFont("Helvetica", 9)
            c.drawCentredString(x + w/2, y + 6, opt)
            x += w + 8
        y -= 50

        # Git URL
        c.setFillColor(PRETO)
        c.setFont("Helvetica-Bold", 10)
        c.drawString(20, y, "Repository URL *")
        c.setFillColor(colors.HexColor("#f4f4f5"))
        c.setStrokeColor(colors.HexColor("#d4d4d8"))
        c.rect(20, y - 30, self.width - 40, 22, fill=1, stroke=1)
        c.setFillColor(PRETO)
        c.setFont("Courier", 9)
        c.drawString(28, y - 24, "https://github.com/SEU-USUARIO/fundos")
        y -= 56

        # Reference
        c.setFillColor(PRETO)
        c.setFont("Helvetica-Bold", 10)
        c.drawString(20, y, "Repository reference")
        c.setFillColor(colors.HexColor("#f4f4f5"))
        c.rect(20, y - 30, 8*cm, 22, fill=1, stroke=1)
        c.setFillColor(PRETO)
        c.setFont("Courier", 9)
        c.drawString(28, y - 24, "refs/heads/main")
        y -= 56

        # Compose path
        c.setFillColor(PRETO)
        c.setFont("Helvetica-Bold", 10)
        c.drawString(20, y, "Compose path")
        c.setFillColor(colors.HexColor("#f4f4f5"))
        c.rect(20, y - 30, 8*cm, 22, fill=1, stroke=1)
        c.setFillColor(PRETO)
        c.setFont("Courier", 9)
        c.drawString(28, y - 24, "docker-compose.yml")
        y -= 56

        # Env vars
        c.setFillColor(PRETO)
        c.setFont("Helvetica-Bold", 10)
        c.drawString(20, y, "Environment variables")
        c.setFillColor(ZINC_600)
        c.setFont("Helvetica", 8)
        c.drawString(20, y - 12, "Definidas em .env do repo OU adicionadas aqui:")
        y -= 36
        # Linha de env
        c.setFillColor(colors.HexColor("#f4f4f5"))
        c.rect(20, y - 22, 4*cm, 22, fill=1, stroke=1)
        c.rect(20 + 4*cm + 8, y - 22, 4*cm, 22, fill=1, stroke=1)
        c.setFillColor(PRETO)
        c.setFont("Courier", 9)
        c.drawString(28, y - 16, "APP_PASSWORD")
        c.drawString(28 + 4*cm + 8, y - 16, "5842")
        y -= 50

        # Deploy button
        c.setFillColor(PORTAINER)
        c.roundRect(20, y - 30, 4*cm, 30, 4, fill=1, stroke=0)
        c.setFillColor(colors.white)
        c.setFont("Helvetica-Bold", 11)
        c.drawCentredString(20 + 2*cm, y - 12, "Deploy the stack")


class FluxoArquitetura(Flowable):
    """Diagrama: iPhone → Tailscale → Umbrel(Portainer → Container Fundos → SQLite)."""
    def __init__(self, largura=17*cm, altura=9*cm):
        super().__init__()
        self.width = largura
        self.height = altura

    def draw(self):
        c = self.canv
        # iPhone
        self._dev(c, 0.3*cm, 1.5*cm, 2.5*cm, 4*cm, SKY, "iPhone", ["Safari + PWA"])
        # Cloud Tailscale
        self._cloud(c, 3.5*cm, 2.5*cm, 3.5*cm, 2*cm, colors.HexColor("#8b5cf6"), "Tailscale", "VPN privada")
        # Umbrel (outer box)
        c.setFillColor(ZINC_900)
        c.setStrokeColor(ZINC_800)
        c.roundRect(7.8*cm, 0.5*cm, 9*cm, 6*cm, 8, fill=1, stroke=1)
        c.setFillColor(colors.white)
        c.setFont("Helvetica-Bold", 11)
        c.drawString(8.1*cm, 5.7*cm, "Umbrel OS")
        c.setFillColor(ZINC_400)
        c.setFont("Helvetica", 8)
        c.drawString(8.1*cm, 5.3*cm, "Docker Engine")
        # Portainer box dentro Umbrel
        c.setFillColor(PORTAINER)
        c.roundRect(8.1*cm, 3.6*cm, 4*cm, 1.4*cm, 5, fill=1, stroke=0)
        c.setFillColor(colors.white)
        c.setFont("Helvetica-Bold", 10)
        c.drawCentredString(10.1*cm, 4.6*cm, "Portainer")
        c.setFont("Helvetica", 7)
        c.drawCentredString(10.1*cm, 4.0*cm, "porta 9443")
        # Container Fundos
        c.setFillColor(VERDE)
        c.roundRect(12.3*cm, 3.6*cm, 4*cm, 1.4*cm, 5, fill=1, stroke=0)
        c.setFillColor(colors.white)
        c.setFont("Helvetica-Bold", 10)
        c.drawCentredString(14.3*cm, 4.6*cm, "Container Fundos")
        c.setFont("Helvetica", 7)
        c.drawCentredString(14.3*cm, 4.0*cm, "Next.js · porta 3000")
        # Volume DB
        c.setFillColor(colors.HexColor("#ec4899"))
        c.roundRect(10*cm, 1*cm, 4.5*cm, 1.2*cm, 5, fill=1, stroke=0)
        c.setFillColor(colors.white)
        c.setFont("Helvetica-Bold", 9)
        c.drawCentredString(12.25*cm, 1.8*cm, "Volume Docker")
        c.setFont("Helvetica", 7)
        c.drawCentredString(12.25*cm, 1.3*cm, "data.db (SQLite persistente)")

        # Setas
        c.setStrokeColor(ZINC_600); c.setLineWidth(1.5)
        # iPhone -> Tailscale
        c.line(2.8*cm, 3.5*cm, 3.5*cm, 3.5*cm)
        # Tailscale -> Umbrel
        c.line(7*cm, 3.5*cm, 7.8*cm, 3.5*cm)
        # Portainer manages Container
        c.setStrokeColor(PORTAINER)
        c.setDash(2, 2)
        c.line(12.1*cm, 4.3*cm, 12.3*cm, 4.3*cm)
        c.setDash()
        # Container -> Volume
        c.setStrokeColor(ZINC_600)
        c.line(14.3*cm, 3.6*cm, 12.25*cm, 2.2*cm)

        # Legendas
        c.setFillColor(ZINC_600)
        c.setFont("Helvetica", 7)
        c.drawCentredString(3.15*cm, 6.0*cm, "HTTPS")
        c.drawCentredString(7.4*cm, 6.0*cm, ":3000")

    def _dev(self, c, x, y, w, h, cor, titulo, linhas):
        c.setFillColor(cor)
        c.roundRect(x, y, w, h, 8, fill=1, stroke=0)
        c.setFillColor(colors.white)
        c.setFont("Helvetica-Bold", 10)
        c.drawCentredString(x + w/2, y + h - 16, titulo)
        c.setFont("Helvetica", 8)
        for i, l in enumerate(linhas):
            c.drawCentredString(x + w/2, y + h - 32 - i*12, l)

    def _cloud(self, c, x, y, w, h, cor, titulo, sub):
        c.setFillColor(cor)
        c.roundRect(x, y, w, h, 20, fill=1, stroke=0)
        c.setFillColor(colors.white)
        c.setFont("Helvetica-Bold", 10)
        c.drawCentredString(x + w/2, y + h - 14, titulo)
        c.setFont("Helvetica", 8)
        c.drawCentredString(x + w/2, y + h - 26, sub)


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
    title="Guia Portainer + Umbrel — Fundos",
    author="Fundos",
)

story = []

# ====== CAPA ======
story.append(Spacer(1, 3*cm))
story.append(p("Fundos no Umbrel", "Capa"))
story.append(p("via Portainer — sem terminal, tudo pela interface web", "CapaSub"))

resumo = Table([[Paragraph(
    "<b>O que você vai aprender</b><br/><br/>"
    "• O que é Portainer e por que ele simplifica o gerenciamento de containers<br/>"
    "• Instalar Portainer dentro do Umbrel App Store<br/>"
    "• Primeiro acesso e criação do usuário admin<br/>"
    "• Subir o Fundos como Stack (3 caminhos diferentes)<br/>"
    "• Gerenciar variáveis de ambiente, logs e atualizações<br/>"
    "• Acessar pelo iPhone via Tailscale<br/>"
    "• Backup e recuperação · troubleshooting",
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
story.append(p("Versão 1.0 · Tempo estimado: 25 minutos", "CapaSub"))
story.append(PageBreak())

# ====== 1. O QUE É PORTAINER ======
story.append(p("1. O que é o Portainer", "H1"))
story.append(p(
    "O <b>Portainer</b> é uma <b>interface web para gerenciar Docker</b> sem precisar do terminal. "
    "Você cria, atualiza, vê logs, faz backup e monitora containers tudo pelo navegador. "
    "Funciona em Linux, Windows, Mac, Raspberry Pi, NAS — qualquer lugar que rode Docker."
))

story.append(p(
    "<b>Por que usar Portainer no Umbrel?</b> O Umbrel já tem App Store, mas para apps "
    "<b>customizados</b> (como o Fundos) a UI nativa é limitada. O Portainer entra como "
    "uma camada de gerenciamento mais poderosa: você pode subir qualquer "
    "<i>docker-compose.yml</i> com 3 cliques, ver logs em tempo real, e atualizar com 1 clique."
))

story.append(p("1.1 Como o Portainer se encaixa no Umbrel", "H2"))
story.append(FluxoArquitetura())
story.append(p("Arquitetura completa: iPhone → Tailscale → Umbrel (Portainer + Container)", "Legenda"))

story.append(p(
    "O Portainer fica entre <b>você</b> e o <b>Docker Engine do Umbrel</b>. Não é mais um "
    "container especial — é só uma UI bonita pro Docker que já existe."
))

story.append(p("1.2 Diferenças em relação ao deploy via SSH", "H2"))
t_dif = Table([
    ["Aspecto", "SSH + docker compose", "Portainer"],
    ["Aprendizado", "Precisa saber comandos Docker", "GUI guiada, formulários"],
    ["Deploy", "Comandos no terminal", "3 cliques na UI"],
    ["Logs", "docker compose logs", "Aba 'Logs' tempo real"],
    ["Atualização", "git pull + rebuild", "Botão 'Pull and redeploy'"],
    ["Variáveis", "Editar .env manualmente", "Tela de env vars"],
    ["Monitoramento", "docker ps + grep", "Dashboard visual com gráficos"],
    ["Multi-usuário", "Não", "Sim, com permissões"],
    ["Mobile", "Acesso via SSH", "UI responsiva no browser"],
], colWidths=[4*cm, 6*cm, 6*cm])
t_dif.setStyle(TableStyle([
    ("BACKGROUND", (0,0), (-1,0), ZINC_900),
    ("TEXTCOLOR", (0,0), (-1,0), colors.white),
    ("FONTNAME", (0,0), (-1,0), "Helvetica-Bold"),
    ("FONTSIZE", (0,0), (-1,-1), 9),
    ("ROWBACKGROUNDS", (0,1), (-1,-1), [colors.white, colors.HexColor("#f4f4f5")]),
    ("BOX", (0,0), (-1,-1), 0.5, ZINC_800),
    ("GRID", (0,0), (-1,-1), 0.3, ZINC_400),
    ("LEFTPADDING", (0,0), (-1,-1), 8), ("RIGHTPADDING", (0,0), (-1,-1), 8),
    ("TOPPADDING", (0,0), (-1,-1), 5), ("BOTTOMPADDING", (0,0), (-1,-1), 5),
    ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
]))
story.append(t_dif)

story.append(PageBreak())

# ====== 2. INSTALAR PORTAINER ======
story.append(p("2. Instalar o Portainer no Umbrel", "H1"))
story.append(p(
    "Existem 2 caminhos. Recomendo o A (Umbrel App Store) — é o mais simples."
))

story.append(p("2.1 Caminho A — App Store do Umbrel (recomendado)", "H2"))
story.append(ListFlowable([
    ListItem(p("Acesse a UI do Umbrel no navegador (geralmente <code>http://umbrel.local</code>)")),
    ListItem(p("Toque no ícone <b>App Store</b> no menu inferior")),
    ListItem(p("Use a busca: digite <b>Portainer</b>")),
    ListItem(p("Toque em <b>Install</b> no card do Portainer CE")),
    ListItem(p("Aguarde ~30 segundos. Quando aparecer <b>Open</b>, está pronto")),
], leftIndent=14, bulletType="1", bulletFormat="%s."))

story.append(p("2.2 Caminho B — Instalação manual via SSH", "H2"))
story.append(p(
    "Se a App Store do Umbrel não tem Portainer (algumas versões antigas) ou você "
    "prefere instalação manual:"
))
story.append(DiagramaTerminal("SSH no Umbrel", [
    "$ docker volume create portainer_data",
    "$ docker run -d \\",
    "    --name portainer \\",
    "    --restart unless-stopped \\",
    "    -p 9000:9000 -p 9443:9443 \\",
    "    -v /var/run/docker.sock:/var/run/docker.sock \\",
    "    -v portainer_data:/data \\",
    "    portainer/portainer-ce:latest",
    "> Container portainer iniciado",
]))

story.append(aviso(
    "O <b>volume <code>/var/run/docker.sock</code></b> dá ao Portainer "
    "<b>acesso total ao Docker</b> do host. Trate o Portainer como um administrador root. "
    "Use uma senha forte (próximo passo)."
))

story.append(PageBreak())

# ====== 3. PRIMEIRO ACESSO ======
story.append(p("3. Primeiro acesso e setup do admin", "H1"))

story.append(p(
    "Abra no seu navegador (PC, Mac ou iPhone via Tailscale):"
))
story.append(code("https://&lt;ip-do-umbrel&gt;:9443"))
story.append(p(
    "(ou <code>http://...:9000</code> se preferir sem HTTPS)"
))

story.append(aviso(
    "Vai aparecer aviso de certificado <b>auto-assinado</b>. É normal — o Portainer "
    "gera um cert local. Clique em <b>Avançado → Acessar mesmo assim</b>. Em produção "
    "com Tailscale Serve você pode ter cert válido (veja seção 9)."
))

story.append(p("3.1 Criar usuário admin", "H2"))
story.append(p(
    "Na primeira tela, o Portainer pede pra criar o usuário admin:"
))
story.append(ListFlowable([
    ListItem(p("<b>Username:</b> admin (ou o que preferir)")),
    ListItem(p("<b>Password:</b> mínimo 12 caracteres — use senha forte")),
    ListItem(p("<b>Confirm password:</b> repita")),
    ListItem(p("Clique <b>Create user</b>")),
], leftIndent=14, bulletType="1", bulletFormat="%s."))

story.append(p("3.2 Selecionar ambiente", "H2"))
story.append(p(
    "Na tela seguinte, escolha <b>Get Started</b> (não 'Add environments'). Isso "
    "conecta com o Docker local — exatamente o que queremos para gerenciar o Umbrel."
))

story.append(p("3.3 Tour rápido da interface", "H2"))
story.append(MockupPortainer(
    "Stacks (3 ambientes ativos)",
    [
        "Name             Image / Compose          Status          Last update",
        "─" * 80,
        ("portainer        portainer-ce:latest      ● Running       há 5 minutos", VERDE),
        ("watchtower       containrrr/watchtower    ● Running       há 2 dias", VERDE),
        ("[+ Add stack]    ", PORTAINER),
        "",
        "  Use Stacks para subir docker-compose como projetos.",
        "  Use Containers para ver/gerenciar containers individuais.",
        "  Use Volumes para inspecionar dados persistentes.",
    ],
))
story.append(p("Tela inicial do Portainer — menu lateral à esquerda, conteúdo principal à direita", "Legenda"))

story.append(p("Itens importantes do menu lateral:", "H3"))
t_menu = Table([
    ["Menu", "Para que serve"],
    ["Home / Dashboard", "Visão geral, RAM/CPU, containers ativos"],
    ["Stacks", "Onde você vai gerenciar o Fundos (= docker compose)"],
    ["Containers", "Lista de todos os containers individuais"],
    ["Images", "Imagens Docker baixadas, espaço usado"],
    ["Networks", "Redes Docker, raramente precisa mexer"],
    ["Volumes", "Dados persistentes — onde o data.db do Fundos vive"],
    ["Events", "Histórico do que aconteceu no Docker"],
    ["Settings", "Configurações do Portainer (usuários, registries)"],
], colWidths=[5*cm, 11*cm])
t_menu.setStyle(TableStyle([
    ("BACKGROUND", (0,0), (-1,0), PORTAINER2),
    ("TEXTCOLOR", (0,0), (-1,0), colors.white),
    ("FONTNAME", (0,0), (-1,0), "Helvetica-Bold"),
    ("FONTSIZE", (0,0), (-1,-1), 9),
    ("ROWBACKGROUNDS", (0,1), (-1,-1), [colors.white, colors.HexColor("#f4f4f5")]),
    ("BOX", (0,0), (-1,-1), 0.5, ZINC_800),
    ("GRID", (0,0), (-1,-1), 0.3, ZINC_400),
    ("LEFTPADDING", (0,0), (-1,-1), 8), ("RIGHTPADDING", (0,0), (-1,-1), 8),
    ("TOPPADDING", (0,0), (-1,-1), 5), ("BOTTOMPADDING", (0,0), (-1,-1), 5),
]))
story.append(t_menu)

story.append(PageBreak())

# ====== 4. SUBIR O FUNDOS ======
story.append(p("4. Subir o Fundos como Stack", "H1"))
story.append(p(
    "No Portainer, <b>uma Stack = um docker-compose.yml</b>. Vamos criar uma para o "
    "Fundos. Há 3 caminhos — recomendo o <b>Repository</b> (caminho A), que é o mais "
    "robusto e fácil de atualizar depois."
))
story.append(FluxoDeploy())
story.append(p("Fluxo do deploy via Git Repository", "Legenda"))

story.append(p("4.1 Caminho A — Git Repository (recomendado)", "H2"))
story.append(p(
    "Vantagens: atualizações com 1 clique, versionamento via git, e o Portainer "
    "pode até puxar automaticamente quando você der <i>git push</i>."
))

story.append(p("Pré-requisitos:", "H3"))
story.append(ListFlowable([
    ListItem(p("Seu projeto Fundos no GitHub (público ou privado)")),
    ListItem(p("Arquivo <code>docker-compose.yml</code> na raiz")),
    ListItem(p("<code>Dockerfile</code> na raiz (já vem pronto)")),
], leftIndent=14, bulletType="bullet"))

story.append(p("Passos no Portainer:", "H3"))
story.append(ListFlowable([
    ListItem(p("Menu lateral → <b>Stacks</b>")),
    ListItem(p("Botão <b>+ Add stack</b> no topo")),
    ListItem(p("Preencha conforme o formulário abaixo")),
    ListItem(p("Botão <b>Deploy the stack</b> no final")),
], leftIndent=14, bulletType="1", bulletFormat="%s."))

story.append(FormStack())
story.append(p("Formulário 'Add stack' do Portainer com configuração para o Fundos", "Legenda"))

story.append(PageBreak())

story.append(p("Detalhes de cada campo:", "H3"))
t_campos = Table([
    ["Campo", "Valor a digitar", "Observação"],
    ["Name", "fundos", "minúsculo, sem espaço"],
    ["Build method", "Repository", "última coluna"],
    ["Repository URL", "https://github.com/SEU/fundos", "troque SEU pelo seu user"],
    ["Repository auth", "(deixe vazio se público)", "ou token Personal Access"],
    ["Repository reference", "refs/heads/main", "ou refs/heads/master"],
    ["Compose path", "docker-compose.yml", "padrão, geralmente OK"],
    ["Auto update", "(opcional)", "ativa polling do git"],
    ["Polling interval", "5m", "se Auto update on"],
    ["Environment variables", "APP_PASSWORD = 5842", "+ Add another variable"],
    ["", "TZ = America/Sao_Paulo", ""],
], colWidths=[5*cm, 6*cm, 5*cm])
t_campos.setStyle(TableStyle([
    ("BACKGROUND", (0,0), (-1,0), PORTAINER),
    ("TEXTCOLOR", (0,0), (-1,0), colors.white),
    ("FONTNAME", (0,0), (-1,0), "Helvetica-Bold"),
    ("FONTNAME", (1,1), (1,-1), "Courier"),
    ("FONTSIZE", (0,0), (-1,-1), 9),
    ("ROWBACKGROUNDS", (0,1), (-1,-1), [colors.white, colors.HexColor("#f4f4f5")]),
    ("BOX", (0,0), (-1,-1), 0.5, ZINC_800),
    ("GRID", (0,0), (-1,-1), 0.3, ZINC_400),
    ("LEFTPADDING", (0,0), (-1,-1), 6), ("RIGHTPADDING", (0,0), (-1,-1), 6),
    ("TOPPADDING", (0,0), (-1,-1), 5), ("BOTTOMPADDING", (0,0), (-1,-1), 5),
    ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
]))
story.append(t_campos)

story.append(Spacer(1, 8))
story.append(dica(
    "<b>Repositório privado?</b> Crie um <b>Personal Access Token</b> no GitHub "
    "(Settings → Developer settings → Personal access tokens → Tokens classic) "
    "com permissão <code>repo</code>. Ative a opção <i>Authentication</i> no formulário "
    "e cole o token."
))

story.append(p("4.2 Caminho B — Web editor (cola o YAML)", "H2"))
story.append(p(
    "Mais simples se você só quer testar uma vez. Sem versionamento."
))
story.append(ListFlowable([
    ListItem(p("Stacks → + Add stack")),
    ListItem(p("Build method: <b>Web editor</b>")),
    ListItem(p("Cole o conteúdo do <code>docker-compose.yml</code> no editor")),
    ListItem(p("Adicione env vars: APP_PASSWORD, TZ")),
    ListItem(p("Deploy the stack")),
], leftIndent=14, bulletType="1", bulletFormat="%s."))

story.append(p("4.3 Caminho C — Upload do YAML", "H2"))
story.append(p(
    "Igual ao B, mas você faz upload de um arquivo <code>.yml</code> em vez de colar."
))

story.append(PageBreak())

# ====== 5. SUBINDO PELA PRIMEIRA VEZ ======
story.append(p("5. O que acontece após o Deploy", "H1"))
story.append(p(
    "Quando você clica <b>Deploy the stack</b>, o Portainer faz, em ordem:"
))
story.append(ListFlowable([
    ListItem(p("Clona seu repositório git em uma pasta interna do Portainer")),
    ListItem(p("Lê o <code>docker-compose.yml</code>")),
    ListItem(p("Constrói a imagem Docker conforme o <code>Dockerfile</code> "
               "<i>(primeira vez demora 2-5 minutos)</i>")),
    ListItem(p("Cria o volume <code>fundos_data</code> para o banco SQLite")),
    ListItem(p("Sobe o container com as env vars que você definiu")),
    ListItem(p("Mostra o status na lista de Stacks")),
], leftIndent=14, bulletType="1", bulletFormat="%s."))

story.append(MockupPortainer(
    "Stacks > fundos (status: ● Running)",
    [
        "Container       Image             Status           Ports             ",
        "─" * 80,
        ("fundos_web_1    fundos:latest     ● Running        0.0.0.0:3000→3000", VERDE),
        "",
        "  Stack details",
        "  Created: 2 minutes ago",
        "  Last update: 2 minutes ago",
        "  Compose file: docker-compose.yml",
        "  Repository: github.com/SEU/fundos (main)",
        "",
        ("  [ Logs ]  [ Stop this stack ]  [ Editor ]  [ Pull and redeploy ]", PORTAINER),
    ],
))
story.append(p("Stack 'fundos' rodando — você pode parar, ver logs ou redeploy a qualquer momento", "Legenda"))

story.append(p("5.1 Conferir que está funcionando", "H2"))
story.append(p(
    "Em outra aba, acesse:"
))
story.append(code("http://&lt;ip-do-umbrel&gt;:3000"))
story.append(p(
    "Deve aparecer a tela de login do Fundos. Use sua senha (<code>5842</code> ou a que "
    "você definiu na variável <code>APP_PASSWORD</code>)."
))

story.append(p("5.2 Ver os logs em tempo real", "H2"))
story.append(p(
    "Se algo der errado, ou só pra ver as requisições chegando, clique em "
    "<b>Containers → fundos_web_1 → Logs</b>. Ou direto no Stack: aba <b>Logs</b>."
))
story.append(DiagramaTerminal("Portainer > Logs em tempo real", [
    "# Auto-refresh ativado",
    "$ next-server starting...",
    "> ▲ Next.js 15.5.18",
    "> ✓ Ready in 3.2s",
    "{\"t\":\"2026-05-16T22:00:00Z\",\"nivel\":\"info\",\"msg\":\"scheduler.start\"}",
    "> GET / 200 in 124ms",
    "> POST /api/lancamentos 201 in 89ms",
]))

story.append(PageBreak())

# ====== 6. ATUALIZAR O FUNDOS ======
story.append(p("6. Atualizar quando o código mudar", "H1"))
story.append(p(
    "Esse é o maior ganho de usar Portainer: <b>atualização com 1 clique</b>."
))

story.append(p("Fluxo:", "H3"))
story.append(ListFlowable([
    ListItem(p("Você faz git push das mudanças no seu PC")),
    ListItem(p("No Portainer: Stacks → fundos → botão <b>Pull and redeploy</b>")),
    ListItem(p("Confirme. Portainer baixa o código novo, faz build, troca o container")),
    ListItem(p("O volume com o <code>data.db</code> é preservado. Zero perda de dados.")),
], leftIndent=14, bulletType="1", bulletFormat="%s."))

story.append(p("6.1 Auto-update (Portainer puxando sozinho)", "H2"))
story.append(p(
    "Se ativou <b>Auto update</b> no formulário do Stack, o Portainer faz polling do "
    "git e atualiza automaticamente. Intervalo recomendado: 5-15 minutos."
))
story.append(aviso(
    "Auto-update + git push em produção = qualquer commit no main vai direto pro "
    "servidor sem teste. Considere usar uma branch <code>prod</code> separada e fazer "
    "pull request consciente."
))

story.append(p("6.2 Rollback se algo quebrar", "H2"))
story.append(p(
    "Se a versão nova quebrar, faça <i>git revert</i> do commit ruim no seu repo, e "
    "no Portainer clique <b>Pull and redeploy</b> de novo. O Portainer volta pro estado "
    "anterior em segundos."
))
story.append(dica(
    "Antes de mudanças <b>grandes</b> (schema novo, nova versão major), exporta o "
    "JSON pelo app (Configurações → Exportar JSON). É seu plano B se algo der errado."
))

story.append(PageBreak())

# ====== 7. ENV VARS E SEGREDOS ======
story.append(p("7. Gerenciar variáveis de ambiente", "H1"))
story.append(p(
    "Senhas, tokens de API e configurações ficam em <b>environment variables</b>. "
    "No Portainer, você gerencia tudo pela UI — sem editar arquivo .env."
))

story.append(p("7.1 Adicionar / alterar uma variável", "H2"))
story.append(ListFlowable([
    ListItem(p("Stacks → fundos → aba <b>Editor</b> ou role até <b>Environment variables</b>")),
    ListItem(p("Clique <b>+ Add an environment variable</b>")),
    ListItem(p("Digite <b>name</b> (ex: APP_PASSWORD) e <b>value</b> (ex: minha-senha)")),
    ListItem(p("Clique <b>Update the stack</b>. Portainer recria o container com a nova var.")),
], leftIndent=14, bulletType="1", bulletFormat="%s."))

story.append(p("7.2 Variáveis úteis no Fundos", "H2"))
t_envs = Table([
    ["Variável", "Para que serve", "Exemplo"],
    ["APP_PASSWORD", "Senha de acesso ao app", "5842"],
    ["TZ", "Fuso horário", "America/Sao_Paulo"],
    ["DATABASE_URL", "Caminho do SQLite (não mude)", "file:/app/data/data.db"],
    ["NODE_ENV", "Modo de execução (auto)", "production"],
], colWidths=[5*cm, 7*cm, 4*cm])
t_envs.setStyle(TableStyle([
    ("BACKGROUND", (0,0), (-1,0), PORTAINER),
    ("TEXTCOLOR", (0,0), (-1,0), colors.white),
    ("FONTNAME", (0,0), (-1,0), "Helvetica-Bold"),
    ("FONTNAME", (0,1), (0,-1), "Courier"),
    ("FONTNAME", (2,1), (2,-1), "Courier"),
    ("FONTSIZE", (0,0), (-1,-1), 9),
    ("ROWBACKGROUNDS", (0,1), (-1,-1), [colors.white, colors.HexColor("#f4f4f5")]),
    ("BOX", (0,0), (-1,-1), 0.5, ZINC_800),
    ("GRID", (0,0), (-1,-1), 0.3, ZINC_400),
    ("LEFTPADDING", (0,0), (-1,-1), 6), ("RIGHTPADDING", (0,0), (-1,-1), 6),
    ("TOPPADDING", (0,0), (-1,-1), 5), ("BOTTOMPADDING", (0,0), (-1,-1), 5),
    ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
]))
story.append(t_envs)

story.append(PageBreak())

# ====== 8. VOLUMES E BACKUP ======
story.append(p("8. Volumes (onde mora o data.db)", "H1"))
story.append(p(
    "O <b>data.db</b> do Fundos fica num <i>Docker volume</i> chamado <code>fundos_data</code>. "
    "Isso garante que ele sobreviva a updates, rebuilds e reinícios."
))

story.append(p("8.1 Ver os volumes", "H2"))
story.append(p(
    "Menu lateral → <b>Volumes</b>. Você verá <code>fundos_data</code> e seu tamanho."
))

story.append(MockupPortainer(
    "Volumes",
    [
        "Name              Driver    Size       Mounted by                Created",
        "─" * 80,
        ("fundos_data       local     2.4 MB     fundos_web_1              há 2 dias", VERDE),
        ("portainer_data    local     18.5 MB    portainer                 há 5 dias", PORTAINER),
        "",
        "  Clique no volume para inspecionar arquivos, baixar conteúdo ou apagar.",
        "  NUNCA apague o volume fundos_data sem ter feito backup.",
    ],
))

story.append(p("8.2 Baixar o conteúdo de um volume", "H2"))
story.append(p(
    "Portainer não tem botão de download direto. Para fazer backup do volume "
    "via Portainer, use a <b>Console</b> de um container que monte esse volume:"
))
story.append(ListFlowable([
    ListItem(p("Containers → fundos_web_1 → ícone <b>Console</b> (terminal)")),
    ListItem(p("Selecione <code>/bin/sh</code> e Connect")),
    ListItem(p("Rode <code>cat /app/data/data.db | base64</code> para ver o conteúdo")),
], leftIndent=14, bulletType="bullet"))
story.append(dica(
    "Mas <b>muito mais simples</b>: dentro do app Fundos, vá em <b>Configurações → "
    "Exportar JSON</b>. Você recebe um arquivo portável com tudo. Ou configure o "
    "<b>backup automático na nuvem via rclone</b> (veja o guia rclone)."
))

story.append(PageBreak())

# ====== 9. ACESSO PELO IPHONE ======
story.append(p("9. Acessar pelo iPhone via Tailscale", "H1"))
story.append(p(
    "Mesmo fluxo do guia anterior. Lembrete rápido:"
))
story.append(ListFlowable([
    ListItem(p("Instale Tailscale no Umbrel (App Store ou via terminal)")),
    ListItem(p("Instale Tailscale no iPhone (App Store)")),
    ListItem(p("Faça login com a mesma conta nos dois")),
    ListItem(p("No iPhone Safari, acesse <code>http://&lt;hostname-umbrel&gt;.tailXXXX.ts.net:3000</code>")),
    ListItem(p("Tela de login do Fundos aparece. Logue.")),
    ListItem(p("Compartilhar → Adicionar à Tela de Início → app instalado como PWA")),
], leftIndent=14, bulletType="1", bulletFormat="%s."))

story.append(p("9.1 Acessar o Portainer do iPhone", "H2"))
story.append(p(
    "O Portainer também é acessível via Tailscale:"
))
story.append(code("https://&lt;hostname-umbrel&gt;.tailXXXX.ts.net:9443"))
story.append(p(
    "Útil pra parar/restart containers de qualquer lugar. A UI do Portainer é "
    "<b>responsiva</b> — funciona bem no iPhone."
))

story.append(PageBreak())

# ====== 10. WATCHTOWER (BONUS) ======
story.append(p("10. Bônus: Watchtower (updates automáticos de imagens)", "H1"))
story.append(p(
    "Se você usa imagens pré-publicadas (em vez de build do git), o <b>Watchtower</b> "
    "monitora o registry e atualiza containers automaticamente quando aparece uma "
    "imagem nova."
))
story.append(p(
    "Stack pronto pra colar no Portainer:"
))
story.append(code(
    "version: '3'\n"
    "services:\n"
    "  watchtower:\n"
    "    image: containrrr/watchtower\n"
    "    restart: unless-stopped\n"
    "    volumes:\n"
    "      - /var/run/docker.sock:/var/run/docker.sock\n"
    "    environment:\n"
    "      WATCHTOWER_POLL_INTERVAL: 3600       # checa a cada hora\n"
    "      WATCHTOWER_INCLUDE_RESTARTING: 'true'\n"
    "      WATCHTOWER_CLEANUP: 'true'           # apaga imagens antigas\n"
    "    command: --label-enable\n"
))
story.append(p(
    "Marca os containers que devem ser atualizados adicionando uma label no "
    "docker-compose do Fundos:"
))
story.append(code(
    "services:\n"
    "  web:\n"
    "    image: ghcr.io/SEU/fundos:latest\n"
    "    labels:\n"
    "      com.centurylinklabs.watchtower.enable: 'true'"
))
story.append(p(
    "Daí em diante, sempre que você publicar uma imagem nova com a tag "
    "<code>:latest</code>, o Watchtower atualiza sozinho em até 1 hora."
))
story.append(aviso(
    "Watchtower só faz sentido se você usa imagens pré-publicadas. Se você está "
    "usando o método <b>Repository</b> do Portainer (build no servidor), use o "
    "<b>Auto update</b> do próprio Portainer."
))

story.append(PageBreak())

# ====== 11. TROUBLESHOOTING ======
story.append(p("11. Solução de problemas", "H1"))

problemas = [
    ("Portainer não abre (timeout no 9443)",
     "Confira: (1) o container portainer está rodando: <code>docker ps | grep portainer</code>. "
     "(2) a porta 9443 está exposta (no install via SSH, deveria estar). "
     "(3) firewall do Umbrel não está bloqueando. Tente 9000 (HTTP) como alternativa."),

    ("Stack falha no build com 'no such file Dockerfile'",
     "Você esqueceu de subir o Dockerfile pro git. Confira no GitHub: o arquivo "
     "<code>Dockerfile</code> precisa estar na <b>raiz</b> do repositório. Faça "
     "git add + push e tente Pull and redeploy."),

    ("Build demora 10+ minutos",
     "Primeira build é assim mesmo (baixa imagem Node, instala pnpm, instala todas as "
     "deps, faz prisma generate, next build). Builds seguintes ficam em 1-2 min "
     "graças ao cache do Docker."),

    ("Container fica restartando em loop",
     "Vá em Containers → fundos_web_1 → Logs. Causas comuns: APP_PASSWORD não definida, "
     "porta 3000 em uso, banco corrompido. Veja a stacktrace exata nos logs."),

    ("Esqueci o usuário admin do Portainer",
     "Pare o container Portainer e suba de novo com <code>--reset-password</code>: "
     "<code>docker run --rm -v portainer_data:/data portainer/helper-reset-password</code>. "
     "Ele dá uma senha temporária — anote, faça login e troque."),

    ("Quero migrar do método SSH+compose pro Portainer",
     "Pare o stack antigo (docker compose down). NÃO apague o volume. No Portainer, "
     "crie uma stack apontando pro mesmo repo. O Portainer vai reutilizar o volume "
     "existente automaticamente — seus dados continuam intactos."),

    ("Como ver consumo de RAM/CPU?",
     "Containers → click no nome → aba Stats. Mostra gráfico em tempo real. "
     "Útil pra debugar lentidão. O Fundos consome ~150 MB de RAM em idle."),

    ("Portainer dá 'docker socket not found'",
     "Quando instalado via Umbrel App, normalmente está OK. Se manual: garanta "
     "que o volume <code>-v /var/run/docker.sock:/var/run/docker.sock</code> foi "
     "montado no comando docker run."),
]
for titulo, descricao in problemas:
    story.append(KeepTogether([
        Paragraph(f"<b>{titulo}</b>", styles["H3"]),
        Paragraph(descricao, styles["Corpo"]),
    ]))

story.append(PageBreak())

# ====== 12. CHECKLIST FINAL ======
story.append(p("12. Checklist final", "H1"))

itens_check = [
    "Umbrel OS rodando e acessível",
    "Portainer instalado (via App Store ou docker run)",
    "Primeiro acesso em https://...:9443 funcionou",
    "Usuário admin criado com senha forte",
    "Repositório Fundos no GitHub com Dockerfile e docker-compose.yml",
    "Stack 'fundos' criada via Repository no Portainer",
    "Variáveis APP_PASSWORD e TZ configuradas",
    "Status do stack: ● Running (verde)",
    "Container fundos_web_1: ● Up + porta 3000 mapeada",
    "Acesso local http://<ip-umbrel>:3000 abre o app",
    "Acesso via Tailscale do iPhone funciona",
    "App adicionado à Tela de Início (PWA)",
    "Login com senha entrou OK",
    "Volume fundos_data aparece em Volumes",
    "Logs do container mostram 'Next.js Ready' sem erros",
    "Testou 'Pull and redeploy' (atualização funciona)",
    "(opcional) Backup automático via rclone configurado",
]

for item in itens_check:
    story.append(Paragraph(
        f"☐ &nbsp; {item}",
        ParagraphStyle("c", parent=styles["Corpo"], leftIndent=12, leading=18)
    ))

story.append(Spacer(1, 20))
story.append(p(
    "Com todos os ☐ marcados: sua infra está completa. <b>Update do app = 1 clique. "
    "Logs e RAM = 1 clique. Restore = 1 clique.</b> A vida fica muito mais fácil "
    "com Portainer.", "Corpo"
))

story.append(Spacer(1, 14))
story.append(p("Fim do guia.", "Legenda"))

doc.build(story)
print(f"PDF gerado: {os.path.abspath(OUTPUT)}")
