"""
Gera PDF: Como conectar rclone com Google Drive e OneDrive (Windows + Linux).
Em vez de screenshots fakes, uso diagramas vetoriais desenhados via reportlab.
"""

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm, mm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, PageBreak,
    Table, TableStyle, ListFlowable, ListItem, KeepTogether, Flowable,
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT
import os

OUTPUT = os.path.join(os.path.dirname(__file__), "..", "guia-rclone.pdf")

# ============ Estilos ============

styles = getSampleStyleSheet()

PRETO = colors.HexColor("#09090b")
VERDE = colors.HexColor("#10b981")
VERDE_CLARO = colors.HexColor("#34d399")
ZINC_400 = colors.HexColor("#a1a1aa")
ZINC_600 = colors.HexColor("#52525b")
ZINC_800 = colors.HexColor("#27272a")
ZINC_900 = colors.HexColor("#18181b")
AMBAR = colors.HexColor("#f59e0b")
ROSA = colors.HexColor("#f43f5e")
SKY = colors.HexColor("#0ea5e9")

styles.add(ParagraphStyle(
    name="Capa", fontName="Helvetica-Bold", fontSize=32, leading=40,
    alignment=TA_CENTER, textColor=PRETO, spaceAfter=6,
))
styles.add(ParagraphStyle(
    name="CapaSub", fontName="Helvetica", fontSize=14, leading=18,
    alignment=TA_CENTER, textColor=ZINC_600, spaceAfter=40,
))
styles.add(ParagraphStyle(
    name="H1", fontName="Helvetica-Bold", fontSize=22, leading=28,
    textColor=PRETO, spaceBefore=18, spaceAfter=10,
))
styles.add(ParagraphStyle(
    name="H2", fontName="Helvetica-Bold", fontSize=15, leading=20,
    textColor=PRETO, spaceBefore=14, spaceAfter=6,
))
styles.add(ParagraphStyle(
    name="H3", fontName="Helvetica-Bold", fontSize=12, leading=16,
    textColor=ZINC_800, spaceBefore=10, spaceAfter=4,
))
styles.add(ParagraphStyle(
    name="Corpo", fontName="Helvetica", fontSize=10.5, leading=15,
    textColor=PRETO, spaceAfter=6,
))
styles.add(ParagraphStyle(
    name="Codigo", fontName="Courier-Bold", fontSize=9.5, leading=13,
    textColor=VERDE, backColor=ZINC_900, leftIndent=8, rightIndent=8,
    spaceBefore=4, spaceAfter=8, borderPadding=6,
))
styles.add(ParagraphStyle(
    name="Nota", fontName="Helvetica-Oblique", fontSize=10, leading=14,
    textColor=ZINC_600, leftIndent=12, rightIndent=12,
    backColor=colors.HexColor("#fef3c7"), borderPadding=8,
    spaceBefore=6, spaceAfter=6, borderColor=AMBAR, borderWidth=0.5,
))
styles.add(ParagraphStyle(
    name="Aviso", fontName="Helvetica", fontSize=10, leading=14,
    textColor=PRETO, leftIndent=12, rightIndent=12,
    backColor=colors.HexColor("#fee2e2"), borderPadding=8,
    spaceBefore=6, spaceAfter=6, borderColor=ROSA, borderWidth=0.5,
))
styles.add(ParagraphStyle(
    name="Dica", fontName="Helvetica", fontSize=10, leading=14,
    textColor=PRETO, leftIndent=12, rightIndent=12,
    backColor=colors.HexColor("#dcfce7"), borderPadding=8,
    spaceBefore=6, spaceAfter=6, borderColor=VERDE, borderWidth=0.5,
))
styles.add(ParagraphStyle(
    name="Legenda", fontName="Helvetica-Oblique", fontSize=8.5,
    textColor=ZINC_600, alignment=TA_CENTER, spaceAfter=12, spaceBefore=2,
))

# ============ Diagramas (Flowable customizado) ============

class DiagramaFluxo(Flowable):
    """Desenha um fluxo horizontal de caixas com setas entre elas."""
    def __init__(self, etapas, largura=17*cm, altura=4*cm, cor_caixa=VERDE):
        super().__init__()
        self.etapas = etapas
        self.width = largura
        self.height = altura
        self.cor = cor_caixa

    def draw(self):
        c = self.canv
        n = len(self.etapas)
        largura_caixa = (self.width - (n-1)*0.8*cm) / n
        altura_caixa = self.height * 0.6
        y = self.height * 0.2

        for i, (titulo, sub) in enumerate(self.etapas):
            x = i * (largura_caixa + 0.8*cm)
            c.setFillColor(self.cor)
            c.setStrokeColor(self.cor)
            c.roundRect(x, y, largura_caixa, altura_caixa, 8, fill=1, stroke=0)

            c.setFillColor(colors.white)
            c.setFont("Helvetica-Bold", 10)
            c.drawCentredString(x + largura_caixa/2, y + altura_caixa - 18, titulo)
            c.setFont("Helvetica", 8)
            for j, linha in enumerate(sub.split("\n")):
                c.drawCentredString(x + largura_caixa/2, y + altura_caixa - 30 - j*10, linha)

            if i < n - 1:
                sx = x + largura_caixa + 4
                sx2 = x + largura_caixa + 0.8*cm - 4
                sy = y + altura_caixa/2
                c.setStrokeColor(ZINC_600)
                c.setLineWidth(1.5)
                c.line(sx, sy, sx2, sy)
                c.line(sx2 - 5, sy + 4, sx2, sy)
                c.line(sx2 - 5, sy - 4, sx2, sy)


class DiagramaTerminal(Flowable):
    """Mostra uma 'janela de terminal' com texto, simulando saída de comando."""
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

        # Barra superior
        c.setFillColor(ZINC_800)
        c.rect(0, self.height - self.altura_titulo, self.width, self.altura_titulo, fill=1, stroke=0)
        # Bolinhas mac
        for i, cor in enumerate([colors.HexColor("#ff5f57"), colors.HexColor("#febc2e"), colors.HexColor("#28c840")]):
            c.setFillColor(cor)
            c.circle(12 + i*16, self.height - self.altura_titulo/2, 5, fill=1, stroke=0)
        c.setFillColor(ZINC_400)
        c.setFont("Helvetica", 9)
        c.drawCentredString(self.width/2, self.height - self.altura_titulo/2 - 3, self.titulo)

        # Conteúdo
        y = self.height - self.altura_titulo - 14
        c.setFont("Courier", 9)
        for linha in self.linhas:
            if linha.startswith("$"):
                c.setFillColor(VERDE)
            elif linha.startswith(">"):
                c.setFillColor(SKY)
            elif linha.startswith("#"):
                c.setFillColor(ZINC_400)
            else:
                c.setFillColor(colors.white)
            c.drawString(10, y, linha)
            y -= self.altura_linha


class DiagramaOAuth(Flowable):
    """Diagrama mostrando o fluxo OAuth entre Você, rclone e Provedor."""
    def __init__(self, largura=17*cm, altura=8*cm):
        super().__init__()
        self.width = largura
        self.height = altura

    def draw(self):
        c = self.canv
        col_w = self.width / 3

        # Três colunas
        atores = [
            ("Você", "no terminal", colors.HexColor("#0ea5e9")),
            ("rclone", "no PC", VERDE),
            ("Google / Microsoft", "via browser", colors.HexColor("#8b5cf6")),
        ]
        for i, (nome, sub, cor) in enumerate(atores):
            x = i * col_w + col_w/2
            c.setFillColor(cor)
            c.roundRect(x - 50, self.height - 50, 100, 36, 6, fill=1, stroke=0)
            c.setFillColor(colors.white)
            c.setFont("Helvetica-Bold", 11)
            c.drawCentredString(x, self.height - 30, nome)
            c.setFont("Helvetica", 8)
            c.drawCentredString(x, self.height - 42, sub)
            # Linha vertical
            c.setStrokeColor(ZINC_400)
            c.setDash(2, 3)
            c.line(x, self.height - 50, x, 10)
            c.setDash()

        # Setas entre os atores
        passos = [
            (0, 1, "rclone config", self.height - 70),
            (1, 2, "abre browser autorizando", self.height - 110),
            (2, 0, "você clica em Permitir", self.height - 150),
            (2, 1, "Google/MS devolve token", self.height - 190),
            (1, 0, "salva token em ~/.config/rclone/", self.height - 230),
        ]
        c.setFont("Helvetica", 9)
        for de, para, label, y in passos:
            xa = de * col_w + col_w/2
            xb = para * col_w + col_w/2
            cor_seta = VERDE if "token" in label or "salva" in label else ZINC_600
            c.setStrokeColor(cor_seta)
            c.setLineWidth(1.3)
            c.setDash()
            c.line(xa, y, xb, y)
            # Cabeça da seta
            seta_x = xb
            sentido = -1 if xb < xa else 1
            c.line(seta_x - sentido*6, y + 4, seta_x, y)
            c.line(seta_x - sentido*6, y - 4, seta_x, y)

            c.setFillColor(PRETO)
            x_label = (xa + xb) / 2
            c.drawCentredString(x_label, y + 4, label)


# ============ Conteúdo ============

def code(texto):
    """Bloco de código preformatado, escapando HTML."""
    txt = texto.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    txt = txt.replace("\n", "<br/>")
    return Paragraph(txt, styles["Codigo"])

def nota(t): return Paragraph("<b>Nota:</b> " + t, styles["Nota"])
def aviso(t): return Paragraph("<b>Atenção:</b> " + t, styles["Aviso"])
def dica(t): return Paragraph("<b>Dica:</b> " + t, styles["Dica"])
def p(t, estilo="Corpo"): return Paragraph(t, styles[estilo])

# ============ Build ============

doc = SimpleDocTemplate(
    OUTPUT, pagesize=A4,
    leftMargin=2*cm, rightMargin=2*cm,
    topMargin=2*cm, bottomMargin=2*cm,
    title="Guia rclone — Google Drive e OneDrive",
    author="Fundos",
)

story = []

# ====== CAPA ======
story.append(Spacer(1, 4*cm))
story.append(p("Guia rclone", "Capa"))
story.append(p("Conectando Google Drive e OneDrive para backup automático", "CapaSub"))

# Card resumo
resumo = Table([[
    Paragraph(
        "<b>O que você vai aprender</b><br/><br/>"
        "• O que é o rclone e por que ele resolve o problema de backup<br/>"
        "• Instalar no Windows e no Linux (Umbrel)<br/>"
        "• Conectar com Google Drive — passo a passo<br/>"
        "• Conectar com OneDrive — passo a passo<br/>"
        "• Testar a conexão e usar com o app Fundos<br/>"
        "• Solução de problemas mais comuns",
        ParagraphStyle("c", parent=styles["Corpo"], fontSize=11, leading=18,
                       textColor=PRETO)
    )
]], colWidths=[16*cm])
resumo.setStyle(TableStyle([
    ("BACKGROUND", (0,0), (-1,-1), colors.HexColor("#f4f4f5")),
    ("BOX", (0,0), (-1,-1), 1, ZINC_800),
    ("LEFTPADDING", (0,0), (-1,-1), 16),
    ("RIGHTPADDING", (0,0), (-1,-1), 16),
    ("TOPPADDING", (0,0), (-1,-1), 14),
    ("BOTTOMPADDING", (0,0), (-1,-1), 14),
]))
story.append(resumo)
story.append(Spacer(1, 3*cm))
story.append(p("Versão 1.0 · Tempo estimado: 15 minutos", "CapaSub"))
story.append(PageBreak())

# ====== O QUE É RCLONE ======
story.append(p("1. O que é o rclone", "H1"))
story.append(p(
    "O <b>rclone</b> é uma ferramenta open-source de linha de comando que "
    "sincroniza arquivos entre seu computador e mais de 40 serviços de nuvem "
    "(Google Drive, OneDrive, Dropbox, Backblaze, S3, etc.)."
))
story.append(p(
    "Pense nele como um <b>cliente universal de nuvem</b>: você configura uma "
    "vez por provedor (com OAuth no navegador), e depois usa comandos simples "
    "para copiar, sincronizar e listar arquivos."
))
story.append(p(
    "No Fundos, ele é usado para enviar o seu <code>data.db</code> "
    "(banco SQLite com toda sua carteira) automaticamente para o Drive ou "
    "OneDrive todo dia."
))

story.append(Spacer(1, 8))
story.append(p("Por que rclone e não OAuth direto?", "H3"))
story.append(p(
    "Implementar OAuth dentro do app exigiria você criar credenciais no Google "
    "Cloud Console e no Azure AD (~30 min cada). O rclone já tem credenciais "
    "públicas pré-registradas — você só autoriza com sua conta e pronto."
))

# Diagrama fluxo
story.append(Spacer(1, 14))
story.append(DiagramaFluxo([
    ("Instalar rclone", "uma vez\nno PC/servidor"),
    ("rclone config", "criar remote\n(Drive/OneDrive)"),
    ("Browser OAuth", "autoriza com\nsua conta"),
    ("Fundos detecta", "configura e\nbackup diário"),
], altura=3.5*cm))
story.append(p("Visão geral do fluxo", "Legenda"))

story.append(PageBreak())

# ====== 2. INSTALAÇÃO ======
story.append(p("2. Instalar o rclone", "H1"))

story.append(p("2.1 Windows", "H2"))
story.append(p(
    "A forma mais simples é via <b>winget</b> (já vem no Windows 10/11):"
))
story.append(DiagramaTerminal("PowerShell", [
    "$ winget install Rclone.Rclone",
    "",
    "Encontrado: Rclone v1.74.x [Rclone.Rclone]",
    "Baixando... Instalando...",
    "$ ",
]))
story.append(Spacer(1, 8))
story.append(aviso(
    "Após instalar, <b>feche e reabra</b> o PowerShell para o PATH ser "
    "atualizado. Senão, o comando <code>rclone</code> vai dizer 'não "
    "reconhecido'."
))
story.append(p(
    "Teste se funcionou:"
))
story.append(code("rclone version"))
story.append(p(
    "Deve mostrar algo como <code>rclone v1.74.0</code>. Se não funcionar, "
    "veja a seção <b>7. Solução de problemas</b>."
))

story.append(Spacer(1, 8))
story.append(p("2.2 Linux / Umbrel", "H2"))
story.append(p(
    "Conecte via SSH no seu servidor Umbrel e rode:"
))
story.append(DiagramaTerminal("Terminal (Umbrel via SSH)", [
    "$ curl https://rclone.org/install.sh | sudo bash",
    "",
    "rclone v1.74.0 has successfully installed.",
    "Now run \"rclone config\" for setup.",
    "$ rclone version",
    "> rclone v1.74.0",
]))
story.append(dica(
    "Se preferir, no Umbrel também dá pra instalar manualmente: "
    "<code>sudo apt install rclone</code> (versão pode ser mais antiga)."
))

story.append(PageBreak())

# ====== 3. GOOGLE DRIVE ======
story.append(p("3. Conectar com o Google Drive", "H1"))
story.append(p(
    "Esta é a configuração que recomendamos por padrão: <b>15 GB grátis</b>, "
    "interface familiar, fácil de recuperar de qualquer dispositivo."
))

story.append(p("3.1 Iniciar a configuração", "H2"))
story.append(p("Abra o terminal (PowerShell no Windows, SSH no Umbrel) e rode:"))
story.append(code("rclone config"))
story.append(p("Você verá um menu como este:"))

story.append(DiagramaTerminal("rclone config — menu principal", [
    "No remotes found, make a new one?",
    "n) New remote",
    "s) Set configuration password",
    "q) Quit config",
    "n/s/q>",
]))
story.append(p("Digite <b>n</b> e Enter (criar novo remote)."))

story.append(p("3.2 Passos do menu — escolhas exatas", "H2"))

passos_gd = [
    ["Pergunta do rclone", "O que digitar"],
    ["name>", "gdrive"],
    ["Storage> (tipo)", "drive"],
    ["client_id>", "(deixe vazio, Enter)"],
    ["client_secret>", "(deixe vazio, Enter)"],
    ["scope>", "1  (Full access)"],
    ["service_account_file>", "(vazio, Enter)"],
    ["Edit advanced config?", "n"],
    ["Use auto config?", "y"],
    ["Configure this as a Shared Drive?", "n"],
    ["Confirma a configuração?", "y"],
]
tabela = Table(passos_gd, colWidths=[8*cm, 8*cm])
tabela.setStyle(TableStyle([
    ("BACKGROUND", (0,0), (-1,0), VERDE),
    ("TEXTCOLOR", (0,0), (-1,0), colors.white),
    ("FONTNAME", (0,0), (-1,0), "Helvetica-Bold"),
    ("FONTNAME", (0,1), (0,-1), "Courier"),
    ("FONTNAME", (1,1), (1,-1), "Courier-Bold"),
    ("FONTSIZE", (0,0), (-1,-1), 9.5),
    ("ROWBACKGROUNDS", (0,1), (-1,-1), [colors.white, colors.HexColor("#f4f4f5")]),
    ("BOX", (0,0), (-1,-1), 0.5, ZINC_800),
    ("GRID", (0,0), (-1,-1), 0.3, ZINC_400),
    ("LEFTPADDING", (0,0), (-1,-1), 8),
    ("RIGHTPADDING", (0,0), (-1,-1), 8),
    ("TOPPADDING", (0,0), (-1,-1), 6),
    ("BOTTOMPADDING", (0,0), (-1,-1), 6),
]))
story.append(tabela)

story.append(Spacer(1, 12))
story.append(p("3.3 Autorizar no navegador", "H2"))
story.append(p(
    "Ao escolher <b>Use auto config? y</b>, o rclone abre seu navegador "
    "padrão na página de autorização do Google. O fluxo é o seguinte:"
))
story.append(DiagramaOAuth())
story.append(p(
    "Fluxo OAuth quando você responde 'y' a 'Use auto config'", "Legenda"
))

story.append(p("Na tela do Google, você vai ver:", "H3"))
story.append(ListFlowable([
    ListItem(p("<b>\"rclone\" deseja acessar sua Conta do Google\"</b>")),
    ListItem(p("Solicita acesso a: <b>Ver, editar, criar e excluir todos os "
               "seus arquivos do Google Drive</b>")),
    ListItem(p("Você clica <b>Permitir</b>")),
    ListItem(p("Aparece <b>'Success!'</b> — pode fechar a aba")),
    ListItem(p("De volta no terminal, escolha <b>n</b> em 'Shared Drive' e "
               "<b>y</b> para confirmar")),
], leftIndent=20, bulletType="bullet"))

story.append(aviso(
    "Se aparecer <b>'O Google não verificou esse aplicativo'</b>, é normal. "
    "É porque você está usando as credenciais públicas do rclone (não as suas). "
    "Clique em <b>Avançado</b> e depois em <b>Acessar rclone (não seguro)</b>. "
    "É seguro — o token fica só no seu PC, não passa por servidor externo."
))

story.append(p("3.4 Confirmar que funcionou", "H2"))
story.append(code("rclone listremotes"))
story.append(p("Deve mostrar:"))
story.append(DiagramaTerminal("Terminal", [
    "$ rclone listremotes",
    "> gdrive:",
    "$ rclone lsd gdrive:",
    "> -1 2026-05-15 22:14:00 -1 Documentos",
    "> -1 2026-04-02 18:30:00 -1 Fotos",
]))
story.append(p(
    "Pronto. O Google Drive está conectado. Veja como o Fundos usa isso na "
    "seção 5."
))

story.append(PageBreak())

# ====== 4. ONEDRIVE ======
story.append(p("4. Conectar com o OneDrive", "H1"))
story.append(p(
    "Boa opção se você já tem Microsoft 365 (1 TB) ou quer manter os dados "
    "no ecossistema Microsoft."
))

story.append(p("4.1 Iniciar a configuração", "H2"))
story.append(code("rclone config"))
story.append(p("Em <b>n) New remote</b>, escolha as opções:"))

passos_od = [
    ["Pergunta do rclone", "O que digitar"],
    ["name>", "onedrive"],
    ["Storage> (tipo)", "onedrive"],
    ["client_id>", "(vazio, Enter)"],
    ["client_secret>", "(vazio, Enter)"],
    ["region>", "1  (Microsoft Cloud Global)"],
    ["Edit advanced config?", "n"],
    ["Use auto config?", "y"],
    ["Tipo de conta detectado", "1 (OneDrive Personal) ou 2 (Business)"],
    ["Drive a usar", "0  (geralmente o primeiro)"],
    ["Confirma a configuração?", "y"],
]
tabela2 = Table(passos_od, colWidths=[8*cm, 8*cm])
tabela2.setStyle(TableStyle([
    ("BACKGROUND", (0,0), (-1,0), SKY),
    ("TEXTCOLOR", (0,0), (-1,0), colors.white),
    ("FONTNAME", (0,0), (-1,0), "Helvetica-Bold"),
    ("FONTNAME", (0,1), (0,-1), "Courier"),
    ("FONTNAME", (1,1), (1,-1), "Courier-Bold"),
    ("FONTSIZE", (0,0), (-1,-1), 9.5),
    ("ROWBACKGROUNDS", (0,1), (-1,-1), [colors.white, colors.HexColor("#f4f4f5")]),
    ("BOX", (0,0), (-1,-1), 0.5, ZINC_800),
    ("GRID", (0,0), (-1,-1), 0.3, ZINC_400),
    ("LEFTPADDING", (0,0), (-1,-1), 8),
    ("RIGHTPADDING", (0,0), (-1,-1), 8),
    ("TOPPADDING", (0,0), (-1,-1), 6),
    ("BOTTOMPADDING", (0,0), (-1,-1), 6),
]))
story.append(tabela2)
story.append(Spacer(1, 12))

story.append(p("4.2 Autorizar no navegador", "H2"))
story.append(p(
    "Igual ao Google Drive, o rclone abre seu navegador na página da "
    "Microsoft. Você faz login com sua conta (Outlook, Hotmail, Live ou "
    "corporativa) e aceita os escopos solicitados — basicamente acesso de "
    "leitura/escrita ao seu OneDrive."
))

story.append(dica(
    "Em alguns tenants corporativos, a Microsoft exige que o administrador "
    "consinta com o app. Se aparecer mensagem do tipo <b>'É necessária "
    "aprovação do administrador'</b>, use OneDrive Personal (conta @hotmail "
    "ou @outlook) ou fale com o TI da empresa."
))

story.append(p("4.3 Confirmar", "H2"))
story.append(code("rclone listremotes\nrclone lsd onedrive:"))
story.append(p(
    "Se listar pastas (Documentos, Imagens, etc.), está conectado."
))

story.append(PageBreak())

# ====== 5. USAR COM O FUNDOS ======
story.append(p("5. Usar com o app Fundos", "H1"))
story.append(p(
    "Com o rclone configurado, o app Fundos detecta automaticamente os "
    "remotes disponíveis. Não precisa configurar nada manualmente no app."
))

story.append(p("5.1 Verificar no app", "H2"))
story.append(ListFlowable([
    ListItem(p("Abra <code>Configurações</code> no app Fundos")),
    ListItem(p("Role até a seção <b>'Backup automático na nuvem'</b>")),
    ListItem(p("Deve aparecer ✅ rclone detectado e os remotes listados")),
    ListItem(p("Selecione o remote desejado (ex: <code>gdrive:</code>)")),
    ListItem(p("O campo de destino vira <code>gdrive:Fundos-Backup</code>")),
    ListItem(p("Defina hora (default 23:00), retenção (default 30 dias)")),
    ListItem(p("Ative o checkbox <b>'Ativar backup diário automático'</b>")),
    ListItem(p("Clique <b>Salvar</b>")),
    ListItem(p("Clique <b>'Backup agora'</b> para testar imediatamente")),
], leftIndent=14, bulletType="1", bulletFormat="%s.")
)

story.append(Spacer(1, 10))
story.append(p("5.2 O que acontece a cada dia", "H2"))
story.append(DiagramaFluxo([
    ("23:00", "scheduler\ndentro do app"),
    ("Lê data.db", "arquivo SQLite\ndo servidor"),
    ("rclone copyto", "upload para\ngdrive: ou onedrive:"),
    ("Retenção", "apaga > 30 dias\nautomaticamente"),
], altura=3.5*cm))

story.append(Spacer(1, 8))
story.append(p(
    "O arquivo na nuvem fica com nome tipo <code>data-2026-05-16_2300.db</code>. "
    "Se você abrir o Google Drive ou OneDrive no celular, vai ver uma pasta "
    "<b>Fundos-Backup</b> com todos os backups recentes."
))

story.append(p("5.3 Restaurar caso perca o servidor", "H2"))
story.append(p("Em qualquer máquina nova com rclone:"))
story.append(code(
    "rclone config         # configura o mesmo remote\n"
    "rclone copy gdrive:Fundos-Backup/data-2026-05-15_2300.db ./\n"
    "# renomeia para data.db, coloca na pasta do projeto\n"
    "# sobe o app, pronto"
))

story.append(PageBreak())

# ====== 6. AUTOMAÇÃO ======
story.append(p("6. Automação total", "H1"))
story.append(p(
    "O Fundos já roda o backup diariamente via scheduler interno (não precisa "
    "cron). Mas se quiser camadas adicionais de segurança, considere:"
))

story.append(p("6.1 Backup também em disco USB externo", "H2"))
story.append(p(
    "Adicione um segundo remote do tipo <b>local</b> apontando para um HD "
    "externo. Edite manualmente o arquivo de config em "
    "<code>~/.config/rclone/rclone.conf</code> (Linux) ou "
    "<code>%APPDATA%\\rclone\\rclone.conf</code> (Windows)."
))

story.append(p("6.2 Backup encriptado (paranoia)", "H2"))
story.append(p(
    "O rclone tem um wrapper <code>crypt</code> que encripta os arquivos antes "
    "de enviar. Útil se você não quer que Google/Microsoft consigam ler o "
    "<code>data.db</code> em texto puro (apesar de ele ter só números, sem "
    "CPF nem nada pessoalmente identificável)."
))
story.append(code(
    "rclone config\n"
    "n) New remote\n"
    "name> gdrive_crypto\n"
    "Storage> crypt\n"
    "remote> gdrive:Fundos-Backup-Cripto\n"
    "password> (escolha uma senha forte — NUNCA PERCA)"
))
story.append(aviso(
    "Se você perder a senha do <code>crypt</code>, <b>nunca</b> vai conseguir "
    "ler os backups. Salve em gerenciador de senhas (1Password, Bitwarden)."
))

story.append(PageBreak())

# ====== 7. TROUBLESHOOTING ======
story.append(p("7. Solução de problemas comuns", "H1"))

problemas = [
    ("'rclone' não é reconhecido (Windows)",
     "Você instalou via <code>winget</code> mas não reabriu o terminal. "
     "Feche o PowerShell e abra de novo. Se persistir, encontre o executável em "
     "<code>%LOCALAPPDATA%\\Microsoft\\WinGet\\Packages\\Rclone.Rclone_*\\</code> e "
     "cole o caminho completo no campo 'Caminho do rclone' nas Configurações do "
     "Fundos."),

    ("Navegador não abre durante 'rclone config'",
     "Você está rodando via SSH sem GUI? Responda <b>n</b> em 'Use auto config?'. "
     "O rclone vai dar uma URL — abra ela no seu navegador local, autorize, "
     "copie o token resultante e cole no terminal SSH."),

    ("'O Google não verificou esse aplicativo'",
     "Normal. As credenciais públicas do rclone não passaram pela verificação "
     "do Google. Clique <b>Avançado</b> → <b>Acessar rclone (não seguro)</b>. "
     "O token vai só pro seu PC, não pra servidor externo."),

    ("OneDrive corporativo: 'É necessária aprovação do administrador'",
     "Política do tenant. Use OneDrive Personal (Outlook/Hotmail) ou peça pro "
     "TI aprovar o aplicativo rclone-personal-id."),

    ("Erro 401/403 ao fazer backup depois de meses",
     "Token expirou ou foi revogado. Rode <code>rclone config reconnect "
     "gdrive:</code> e refaça o OAuth no browser. Não precisa criar remote novo."),

    ("Backup gigante (vários GB) — quota lotando",
     "Cada noite cria um arquivo. Em 30 dias = 30 arquivos. Reduza a "
     "<b>retenção</b> nas Configurações do Fundos (ex: 14 dias). O "
     "<code>data.db</code> sozinho tem alguns MB no máximo, então 14×alguns MB "
     "fica em centenas de MB."),

    ("Quero mudar de Google Drive para OneDrive",
     "Configure o novo remote ao lado do antigo: <code>rclone config</code> → "
     "novo remote chamado <code>onedrive</code>. Nas Configurações do Fundos, "
     "selecione o novo remote no dropdown. Os backups antigos no Drive ficam "
     "intactos — pode baixar e excluir manualmente quando quiser."),
]

for titulo, descricao in problemas:
    story.append(KeepTogether([
        Paragraph(f"<b>{titulo}</b>", styles["H3"]),
        Paragraph(descricao, styles["Corpo"]),
    ]))

story.append(PageBreak())

# ====== 8. RESUMO ======
story.append(p("8. Resumo de comandos úteis", "H1"))

cmds = [
    ["Listar remotes", "rclone listremotes"],
    ["Listar pastas raiz", "rclone lsd REMOTE:"],
    ["Listar arquivos", "rclone ls REMOTE:pasta"],
    ["Subir um arquivo", "rclone copy data.db REMOTE:Fundos-Backup/"],
    ["Baixar um arquivo", "rclone copy REMOTE:Fundos-Backup/data.db ./"],
    ["Sincronizar (cuidado!)", "rclone sync ./local REMOTE:remoto"],
    ["Apagar arquivos antigos", "rclone delete REMOTE:pasta --min-age 30d"],
    ["Estatísticas", "rclone size REMOTE:Fundos-Backup"],
    ["Refazer OAuth", "rclone config reconnect REMOTE:"],
    ["Remover remote", "rclone config delete REMOTE"],
]
tcmd = Table(cmds, colWidths=[6*cm, 10*cm])
tcmd.setStyle(TableStyle([
    ("FONTNAME", (0,0), (0,-1), "Helvetica"),
    ("FONTNAME", (1,0), (1,-1), "Courier-Bold"),
    ("FONTSIZE", (0,0), (-1,-1), 9.5),
    ("TEXTCOLOR", (1,0), (1,-1), VERDE),
    ("BACKGROUND", (0,0), (-1,-1), ZINC_900),
    ("TEXTCOLOR", (0,0), (0,-1), colors.white),
    ("BOX", (0,0), (-1,-1), 0.5, ZINC_800),
    ("GRID", (0,0), (-1,-1), 0.3, colors.HexColor("#3f3f46")),
    ("LEFTPADDING", (0,0), (-1,-1), 8),
    ("RIGHTPADDING", (0,0), (-1,-1), 8),
    ("TOPPADDING", (0,0), (-1,-1), 6),
    ("BOTTOMPADDING", (0,0), (-1,-1), 6),
]))
story.append(tcmd)

story.append(Spacer(1, 16))
story.append(p("Documentação oficial", "H3"))
story.append(p(
    "• rclone — <font color='#0ea5e9'>https://rclone.org/docs/</font><br/>"
    "• Google Drive — <font color='#0ea5e9'>https://rclone.org/drive/</font><br/>"
    "• OneDrive — <font color='#0ea5e9'>https://rclone.org/onedrive/</font><br/>"
    "• Crypt (encriptação) — <font color='#0ea5e9'>https://rclone.org/crypt/</font>"
))

story.append(Spacer(1, 30))
story.append(p("Fim do guia. Boa sorte com os backups.", "Legenda"))

# Render
doc.build(story)
print(f"PDF gerado: {os.path.abspath(OUTPUT)}")
