#!/usr/bin/env python3
"""
CargoBit Sicherheitsarchitektur - Rollen, Berechtigungen & Anti-Fraud System
Enterprise Security Documentation
"""
import sys
import os
sys.path.insert(0, '/home/z/my-project/skills/pdf/scripts')

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch, mm
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Table, TableStyle, Spacer,
    PageBreak, ListFlowable, ListItem, Image, KeepTogether
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily
from pdf import install_font_fallback

# ========== FONTS ==========
pdfmetrics.registerFont(TTFont('Microsoft YaHei', '/usr/share/fonts/truetype/chinese/msyh.ttf'))
pdfmetrics.registerFont(TTFont('SimHei', '/usr/share/fonts/truetype/chinese/SimHei.ttf'))
pdfmetrics.registerFont(TTFont('Times New Roman', '/usr/share/fonts/truetype/english/Times-New-Roman.ttf'))
pdfmetrics.registerFont(TTFont('DejaVuSans', '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf'))

registerFontFamily('Microsoft YaHei', normal='Microsoft YaHei', bold='Microsoft YaHei')
registerFontFamily('SimHei', normal='SimHei', bold='SimHei')
registerFontFamily('Times New Roman', normal='Times New Roman', bold='Times New Roman')
install_font_fallback()

# ========== COLORS ==========
ACCENT = colors.HexColor('#522aca')
TEXT_PRIMARY = colors.HexColor('#232220')
TEXT_MUTED = colors.HexColor('#8d8a81')
BG_SURFACE = colors.HexColor('#dfdcd3')
BG_PAGE = colors.HexColor('#f1f0ee')
TABLE_HEADER_COLOR = ACCENT
TABLE_HEADER_TEXT = colors.white
TABLE_ROW_EVEN = colors.white
TABLE_ROW_ODD = BG_SURFACE

# ========== STYLES ==========
styles = getSampleStyleSheet()

styles.add(ParagraphStyle(
    name='TitleMain', fontName='Microsoft YaHei', fontSize=28,
    textColor=ACCENT, alignment=TA_CENTER, spaceAfter=12,
    leading=36
))
styles.add(ParagraphStyle(
    name='Subtitle', fontName='Microsoft YaHei', fontSize=14,
    textColor=TEXT_MUTED, alignment=TA_CENTER, spaceAfter=24,
    leading=20
))
styles.add(ParagraphStyle(
    name='H1', fontName='Microsoft YaHei', fontSize=18,
    textColor=ACCENT, spaceBefore=24, spaceAfter=12,
    leading=24, wordWrap='CJK'
))
styles.add(ParagraphStyle(
    name='H2', fontName='Microsoft YaHei', fontSize=14,
    textColor=TEXT_PRIMARY, spaceBefore=18, spaceAfter=8,
    leading=20, wordWrap='CJK'
))
styles.add(ParagraphStyle(
    name='H3', fontName='Microsoft YaHei', fontSize=12,
    textColor=TEXT_PRIMARY, spaceBefore=12, spaceAfter=6,
    leading=16, wordWrap='CJK'
))
styles.add(ParagraphStyle(
    name='Body', fontName='SimHei', fontSize=10.5,
    textColor=TEXT_PRIMARY, alignment=TA_LEFT,
    spaceBefore=0, spaceAfter=8, leading=18, wordWrap='CJK',
    firstLineIndent=24
))
styles.add(ParagraphStyle(
    name='BodyNoIndent', fontName='SimHei', fontSize=10.5,
    textColor=TEXT_PRIMARY, alignment=TA_LEFT,
    spaceBefore=0, spaceAfter=8, leading=18, wordWrap='CJK'
))
styles.add(ParagraphStyle(
    name='TableHeader', fontName='Microsoft YaHei', fontSize=10,
    textColor=colors.white, alignment=TA_CENTER, leading=14
))
styles.add(ParagraphStyle(
    name='TableCell', fontName='SimHei', fontSize=9,
    textColor=TEXT_PRIMARY, alignment=TA_CENTER, leading=13, wordWrap='CJK'
))
styles.add(ParagraphStyle(
    name='TableCellLeft', fontName='SimHei', fontSize=9,
    textColor=TEXT_PRIMARY, alignment=TA_LEFT, leading=13, wordWrap='CJK'
))
styles.add(ParagraphStyle(
    name='Caption', fontName='SimHei', fontSize=9,
    textColor=TEXT_MUTED, alignment=TA_CENTER, spaceBefore=4, spaceAfter=12
))
styles.add(ParagraphStyle(
    name='Note', fontName='SimHei', fontSize=9,
    textColor=TEXT_MUTED, alignment=TA_LEFT,
    leftIndent=20, spaceBefore=4, spaceAfter=8, leading=14, wordWrap='CJK'
))
styles.add(ParagraphStyle(
    name='CodeStyle', fontName='DejaVuSans', fontSize=9,
    textColor=TEXT_PRIMARY, alignment=TA_LEFT,
    leftIndent=10, spaceBefore=4, spaceAfter=4, leading=14,
    backColor=BG_SURFACE
))

def create_table(data, col_widths, header_rows=1):
    """Create a styled table."""
    table = Table(data, colWidths=col_widths, hAlign='CENTER')
    style_commands = [
        ('BACKGROUND', (0, 0), (-1, header_rows-1), TABLE_HEADER_COLOR),
        ('TEXTCOLOR', (0, 0), (-1, header_rows-1), TABLE_HEADER_TEXT),
        ('GRID', (0, 0), (-1, -1), 0.5, TEXT_MUTED),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]
    for i in range(header_rows, len(data)):
        if i % 2 == 0:
            style_commands.append(('BACKGROUND', (0, i), (-1, i), TABLE_ROW_ODD))
        else:
            style_commands.append(('BACKGROUND', (0, i), (-1, i), TABLE_ROW_EVEN))
    table.setStyle(TableStyle(style_commands))
    return table

# ========== DOCUMENT ==========
output_path = '/home/z/my-project/download/CargoBit_Security_Architecture.pdf'
doc = SimpleDocTemplate(
    output_path, pagesize=A4,
    leftMargin=25*mm, rightMargin=25*mm,
    topMargin=20*mm, bottomMargin=20*mm
)
story = []

# ========== TITLE PAGE ==========
story.append(Spacer(1, 60))
story.append(Paragraph('CargoBit', styles['TitleMain']))
story.append(Spacer(1, 10))
story.append(Paragraph('Sicherheitsarchitektur', styles['TitleMain']))
story.append(Spacer(1, 20))
story.append(Paragraph('Rollen, Berechtigungen & Anti-Fraud System', styles['Subtitle']))
story.append(Paragraph('Enterprise Security Documentation v1.0', styles['Subtitle']))
story.append(Spacer(1, 40))

# Info table
info_data = [
    [Paragraph('<b>Dokument-Typ</b>', styles['TableCell']), Paragraph('Technische Architektur', styles['TableCell'])],
    [Paragraph('<b>System</b>', styles['TableCell']), Paragraph('CargoBit Logistik-Plattform', styles['TableCell'])],
    [Paragraph('<b>Geltungsbereich</b>', styles['TableCell']), Paragraph('Europaweit (EU + UK + CH)', styles['TableCell'])],
    [Paragraph('<b>Klassifikation</b>', styles['TableCell']), Paragraph('Intern - Vertraulich', styles['TableCell'])],
]
story.append(create_table(info_data, [100, 300]))
story.append(PageBreak())

# ========== TABLE OF CONTENTS ==========
story.append(Paragraph('<b>Inhaltsverzeichnis</b>', styles['H1']))
story.append(Spacer(1, 12))

toc_items = [
    ('1.', 'Rollenuebersicht und Grundprinzipien', '3'),
    ('2.', 'Berechtigungslogik pro Rolle', '4'),
    ('3.', 'KYC/KYB Verifikations-Workflows', '8'),
    ('4.', 'Anti-Fraud System Architecture', '10'),
    ('5.', 'Risk Scoring Algorithmus', '12'),
    ('6.', 'Technische Sicherheitsmassnahmen', '14'),
    ('7.', 'Audit-Logging & Compliance', '16'),
]

for num, title, page in toc_items:
    story.append(Paragraph(f'{num} {title} {"."*50} {page}', styles['BodyNoIndent']))
story.append(PageBreak())

# ========== SECTION 1: ROLLENUEBERSICHT ==========
story.append(Paragraph('1. Rollenuebersicht und Grundprinzipien', styles['H1']))
story.append(Spacer(1, 8))

story.append(Paragraph('1.1 Systemrollen', styles['H2']))
story.append(Paragraph(
    'CargoBit implementiert ein rollenbasiertes Zugriffskontrollsystem (RBAC), das sieben definierte Rollen umfasst. '
    'Jede Rolle wurde spezifisch fuer die Anforderungen einer europaeischen Logistikplattform entwickelt und folgt '
    'dem Prinzip der geringsten Privilegien (Least Privilege). Die Rollendefinition beruecksichtigt sowohl operative '
    'Notwendigkeiten als auch regulatorische Anforderungen aus GDPR, AML-Richtlinien und Verkehrsrecht.',
    styles['Body']
))

roles_data = [
    [Paragraph('<b>Rolle</b>', styles['TableHeader']), 
     Paragraph('<b>Beschreibung</b>', styles['TableHeader']),
     Paragraph('<b>Zugriffsebene</b>', styles['TableHeader'])],
    [Paragraph('ADMIN', styles['TableCell']), 
     Paragraph('Systemadministration, volle Kontrolle', styles['TableCellLeft']),
     Paragraph('Vollzugriff', styles['TableCell'])],
    [Paragraph('SUPPORT', styles['TableCell']), 
     Paragraph('Kundensupport, Ticket-Bearbeitung', styles['TableCellLeft']),
     Paragraph('Lesend + Tickets', styles['TableCell'])],
    [Paragraph('SHIPPER_COMPANY', styles['TableCell']), 
     Paragraph('Versender mit Unternehmenskonto', styles['TableCellLeft']),
     Paragraph('Eigene Transporte', styles['TableCell'])],
    [Paragraph('SHIPPER_PRIVATE', styles['TableCell']), 
     Paragraph('Privatversender', styles['TableCellLeft']),
     Paragraph('Eigene Transporte', styles['TableCell'])],
    [Paragraph('DISPATCHER', styles['TableCell']), 
     Paragraph('Disponent, Flottenverwaltung', styles['TableCellLeft']),
     Paragraph('Firmen-Flotte', styles['TableCell'])],
    [Paragraph('DRIVER_SELF_EMPLOYED', styles['TableCell']), 
     Paragraph('Selbststaendiger Fahrer', styles['TableCellLeft']),
     Paragraph('Eigene Auftraege', styles['TableCell'])],
    [Paragraph('MARKETER', styles['TableCell']), 
     Paragraph('Marketing-Kampagnen', styles['TableCellLeft']),
     Paragraph('Kampagnen-Verwaltung', styles['TableCell'])],
]
story.append(Spacer(1, 8))
story.append(create_table(roles_data, [100, 230, 80]))
story.append(Paragraph('Tabelle 1.1: Systemrollen-Uebersicht', styles['Caption']))

story.append(Paragraph('1.2 Sicherheitsgrundsaetze', styles['H2']))
story.append(Paragraph(
    'Die Berechtigungsarchitektur basiert auf vier fundamentalen Sicherheitsprinzipien, die in allen Systembereichen '
    'konsequent angewendet werden. Diese Grundsaetze bilden die Basis fuer alle Zugriffskontrollentscheidungen und '
    'stellen sicher, dass Benutzer nur diejenigen Funktionen und Daten sehen koennen, die fuer ihre Arbeit '
    'erforderlich sind. Die konsequente Umsetzung dieser Prinzipien schuetzt sowohl vor internen Missbrauch als auch '
    'vor externen Angriffen.',
    styles['Body']
))

principles_data = [
    [Paragraph('<b>Prinzip</b>', styles['TableHeader']), 
     Paragraph('<b>Beschreibung</b>', styles['TableHeader']),
     Paragraph('<b>Implementierung</b>', styles['TableHeader'])],
    [Paragraph('Least Privilege', styles['TableCell']), 
     Paragraph('Minimale noetige Rechte', styles['TableCellLeft']),
     Paragraph('Rollen-spezifische Berechtigungen', styles['TableCellLeft'])],
    [Paragraph('Funktionstrennung', styles['TableCell']), 
     Paragraph('Geld vs. Pruefung getrennt', styles['TableCellLeft']),
     Paragraph('Support darf keine Finanzen', styles['TableCellLeft'])],
    [Paragraph('Mandantentrennung', styles['TableCell']), 
     Paragraph('Firmen-Daten isoliert', styles['TableCellLeft']),
     Paragraph('Company-Scoped Queries', styles['TableCellLeft'])],
    [Paragraph('Audit-Trail', styles['TableCell']), 
     Paragraph('Alle Aktionen protokolliert', styles['TableCellLeft']),
     Paragraph('audit_logs Tabelle', styles['TableCellLeft'])],
]
story.append(Spacer(1, 8))
story.append(create_table(principles_data, [90, 150, 170]))
story.append(Paragraph('Tabelle 1.2: Sicherheitsgrundsaetze', styles['Caption']))

story.append(PageBreak())

# ========== SECTION 2: BERECHTIGUNGEN ==========
story.append(Paragraph('2. Berechtigungslogik pro Rolle', styles['H1']))

story.append(Paragraph('2.1 ADMIN - Systemadministrator', styles['H2']))
story.append(Paragraph(
    'Die ADMIN-Rolle gewaehrt den umfassendsten Zugriff auf das System. Administratoren koennen Benutzerkonten '
    'verwalten, Rollen zuweisen, Systemeinstellungen konfigurieren und Verifikationen final freigeben. Um die '
    'Integritaet des Systems zu gewaehrleisten, duerfen Administratoren keine operativen Transporte erstellen oder '
    'manipulieren. Diese Einschraenkung verhindert Interessenkonflikte und stellt sicher, dass operative und '
    'administrative Funktionen strikt getrennt bleiben.',
    styles['Body']
))

admin_perms_data = [
    [Paragraph('<b>Aktion</b>', styles['TableHeader']), 
     Paragraph('<b>Erlaubt</b>', styles['TableHeader']),
     Paragraph('<b>Einschraenkung</b>', styles['TableHeader'])],
    [Paragraph('Rollen zuweisen', styles['TableCellLeft']), 
     Paragraph('Ja', styles['TableCell']),
     Paragraph('Audit-Pflichtig', styles['TableCellLeft'])],
    [Paragraph('Plaene verwalten', styles['TableCellLeft']), 
     Paragraph('Ja', styles['TableCell']),
     Paragraph('-', styles['TableCellLeft'])],
    [Paragraph('System-Settings', styles['TableCellLeft']), 
     Paragraph('Ja', styles['TableCell']),
     Paragraph('Audit-Pflichtig', styles['TableCellLeft'])],
    [Paragraph('Logs einsehen', styles['TableCellLeft']), 
     Paragraph('Ja', styles['TableCell']),
     Paragraph('-', styles['TableCellLeft'])],
    [Paragraph('Verifikationen freigeben', styles['TableCellLeft']), 
     Paragraph('Ja', styles['TableCell']),
     Paragraph('Nur mit Begründung', styles['TableCellLeft'])],
    [Paragraph('Transporte erstellen', styles['TableCellLeft']), 
     Paragraph('Nein', styles['TableCell']),
     Paragraph('Ausnahme mit Audit', styles['TableCellLeft'])],
    [Paragraph('Wallet-Transaktionen', styles['TableCellLeft']), 
     Paragraph('Nur einsehen', styles['TableCell']),
     Paragraph('Keine Ausloesung', styles['TableCellLeft'])],
]
story.append(Spacer(1, 8))
story.append(create_table(admin_perms_data, [120, 60, 150]))
story.append(Paragraph('Tabelle 2.1: ADMIN-Berechtigungen', styles['Caption']))

story.append(Paragraph('2.2 SUPPORT - Kundensupport', styles['H2']))
story.append(Paragraph(
    'Support-Mitarbeiter haben Zugriff auf Tickets und koennen Transportdaten lesen, um Kunden bei Anfragen zu '
    'unterstuetzen. Sie koennen Benutzer voruebergehend sperren und entsperren, duerfen jedoch keine finanziellen '
    'Transaktionen ausloesen oder Plaene aendern. Diese Einschraenkung ist kritisch fuer die Funktionstrennung, '
    'da Support-Mitarbeiter niemals die Moeglichkeit haben duerfen, Geldbewegungen zu initiieren oder kontrollieren.',
    styles['Body']
))

support_perms_data = [
    [Paragraph('<b>Aktion</b>', styles['TableHeader']), 
     Paragraph('<b>Erlaubt</b>', styles['TableHeader']),
     Paragraph('<b>Notiz</b>', styles['TableHeader'])],
    [Paragraph('Tickets bearbeiten', styles['TableCellLeft']), 
     Paragraph('Ja', styles['TableCell']),
     Paragraph('Volle CRUD', styles['TableCellLeft'])],
    [Paragraph('Transportdaten lesen', styles['TableCellLeft']), 
     Paragraph('Ja', styles['TableCell']),
     Paragraph('Alle Transporte', styles['TableCellLeft'])],
    [Paragraph('Benutzer sperren', styles['TableCellLeft']), 
     Paragraph('Ja', styles['TableCell']),
     Paragraph('Mit Dokumentation', styles['TableCellLeft'])],
    [Paragraph('Wallet-Transaktionen', styles['TableCellLeft']), 
     Paragraph('Nein', styles['TableCell']),
     Paragraph('Komplett gesperrt', styles['TableCellLeft'])],
    [Paragraph('IBAN aendern', styles['TableCellLeft']), 
     Paragraph('Nein', styles['TableCell']),
     Paragraph('-', styles['TableCellLeft'])],
    [Paragraph('Plaene buchen', styles['TableCellLeft']), 
     Paragraph('Nein', styles['TableCell']),
     Paragraph('-', styles['TableCellLeft'])],
    [Paragraph('Angebote abgeben', styles['TableCellLeft']), 
     Paragraph('Nein', styles['TableCell']),
     Paragraph('-', styles['TableCellLeft'])],
]
story.append(Spacer(1, 8))
story.append(create_table(support_perms_data, [120, 60, 150]))
story.append(Paragraph('Tabelle 2.2: SUPPORT-Berechtigungen', styles['Caption']))

story.append(Paragraph('2.3 SHIPPER - Versender', styles['H2']))
story.append(Paragraph(
    'Versender (privat oder als Unternehmen) koennen Transporte anlegen, bearbeiten und stornieren, solange der '
    'Transport noch nicht einem Fahrer zugewiesen wurde. Nach der Zuweisung sind Aenderungen nur noch in Absprache '
    'mit dem zugeordneten Fahrer moeglich. Versender haben Zugriff auf ihre eigenen Dokumente und Rechnungen, '
    'koennen ihre Wallet fuer Einzahlungen und Zahlungen nutzen, haben jedoch keinen Einblick in Fahrerdaten '
    'anderer Transporte oder in die Matching-Algorithmen.',
    styles['Body']
))

story.append(Paragraph('2.4 DISPATCHER - Disponent', styles['H2']))
story.append(Paragraph(
    'Dispatcher arbeiten auf der Carrier-Seite und verwalten die Fahrzeuge und Fahrer ihrer Firma. Sie koennen '
    'Auftraege sehen, die zum Firmenprofil passen, Angebote abgeben und Fahrer sowie Fahrzeuge zuweisen. In '
    'Buero-Workflows koennen Dispatcher Status im Namen des Fahrers setzen. Der Zugriff auf Wallets und Finanzen '
    'anderer Firmen ist strikt unterbunden, genau wie der Einblick in Shipper-Daten ausserhalb der direkt '
    'zugeordneten Auftraege.',
    styles['Body']
))

story.append(Paragraph('2.5 DRIVER - Fahrer', styles['H2']))
story.append(Paragraph(
    'Fahrer sehen ihre zugewiesenen Auftraege und koennen den Status aktualisieren (Abholung, Lieferung, Fotos, '
    'Unterschriften). Sie verwalten ihre eigenen Dokumente wie Fuehrerschein und ADR-Bescheinigung. Fahrer koennen '
    'keine Preise aendern oder Angebote abgeben, es sei denn, dies wurde explizit durch die Firmenkonfiguration '
    'erlaubt. Der Zugriff auf Firmen-Wallets und Auszahlungen ist gesperrt.',
    styles['Body']
))

story.append(PageBreak())

# ========== SECTION 3: KYC/KYB ==========
story.append(Paragraph('3. KYC/KYB Verifikations-Workflows', styles['H1']))

story.append(Paragraph('3.1 KYC - Know Your Customer (Personen)', styles['H2']))
story.append(Paragraph(
    'Die KYC-Verifizierung ist obligatorisch fuer alle Benutzerrollen mit finanziellen oder operativen Funktionen. '
    'Ohne abgeschlossene KYC-Verifizierung bleiben die Benutzerkonten in einem eingeschraenkten Status, der keine '
    'hohen Betraege, keine Gefahrguttransporte und keine internationalen Transporte zulaesst. Die Verifizierung '
    'erfolgt in drei Stufen und beinhaltet die Pruefung von Ausweisdokumenten, Selfie-Match und ggf. '
    'Fuehrerschein sowie ADR-Nachweise.',
    styles['Body']
))

kyc_data = [
    [Paragraph('<b>Stufe</b>', styles['TableHeader']), 
     Paragraph('<b>Dokument</b>', styles['TableHeader']),
     Paragraph('<b>Pruefung</b>', styles['TableHeader']),
     Paragraph('<b>Freigabe</b>', styles['TableHeader'])],
    [Paragraph('1', styles['TableCell']), 
     Paragraph('Ausweis (Personalausweis/Pass)', styles['TableCellLeft']),
     Paragraph('OCR + Echtheitspruefung', styles['TableCellLeft']),
     Paragraph('Automatisch + Manuell', styles['TableCellLeft'])],
    [Paragraph('2', styles['TableCell']), 
     Paragraph('Selfie-Match', styles['TableCellLeft']),
     Paragraph('Face Recognition', styles['TableCellLeft']),
     Paragraph('Automatisch', styles['TableCellLeft'])],
    [Paragraph('3', styles['TableCell']), 
     Paragraph('Fuehrerschein (optional)', styles['TableCellLeft']),
     Paragraph('Klasse + Gueltigkeit', styles['TableCellLeft']),
     Paragraph('Manuell', styles['TableCellLeft'])],
    [Paragraph('4', styles['TableCell']), 
     Paragraph('ADR-Nachweis (optional)', styles['TableCellLeft']),
     Paragraph('Klassen + Gueltigkeit', styles['TableCellLeft']),
     Paragraph('Manuell', styles['TableCellLeft'])],
]
story.append(Spacer(1, 8))
story.append(create_table(kyc_data, [40, 130, 110, 100]))
story.append(Paragraph('Tabelle 3.1: KYC-Verifizierungsstufen', styles['Caption']))

story.append(Paragraph('3.2 KYB - Know Your Business (Unternehmen)', styles['H2']))
story.append(Paragraph(
    'Die KYB-Verifizierung ist zwingend fuer Speditionen, Firmen-Versender und Marketer mit Rechnungsstellung. '
    'Ohne KYB-Abschluss gelten limitierte Auftragssummen, keine Vorauszahlungen und keine Massen-Kampagnen. '
    'Die Unternehmensverifizierung prueft die rechtliche Existenz, die wirtschaftlich Berechtigten und die '
    'steuerliche Registrierung. Fuer Unternehmen aus dem Nicht-EU-Ausland gelten zusaetzliche Anforderungen.',
    styles['Body']
))

kyb_data = [
    [Paragraph('<b>Dokument</b>', styles['TableHeader']), 
     Paragraph('<b>EU-Unternehmen</b>', styles['TableHeader']),
     Paragraph('<b>Nicht-EU</b>', styles['TableHeader'])],
    [Paragraph('Handelsregisterauszug', styles['TableCellLeft']), 
     Paragraph('Pflicht', styles['TableCell']),
     Paragraph('Pflicht + Uebersetzung', styles['TableCellLeft'])],
    [Paragraph('USt-IdNr. Nachweis', styles['TableCellLeft']), 
     Paragraph('Pflicht', styles['TableCell']),
     Paragraph('Optional', styles['TableCellLeft'])],
    [Paragraph('Gesellschafterliste', styles['TableCellLeft']), 
     Paragraph('Pflicht', styles['TableCell']),
     Paragraph('Pflicht', styles['TableCellLeft'])],
    [Paragraph('Wirtschaftlich Berechtigte', styles['TableCellLeft']), 
     Paragraph('UBO-Erklaerung', styles['TableCell']),
     Paragraph('UBO + KYC aller UBOs', styles['TableCellLeft'])],
    [Paragraph('Zertifizierter Ubersetzer', styles['TableCellLeft']), 
     Paragraph('-', styles['TableCell']),
     Paragraph('Alle Dokumente', styles['TableCellLeft'])],
]
story.append(Spacer(1, 8))
story.append(create_table(kyb_data, [120, 100, 140]))
story.append(Paragraph('Tabelle 3.2: KYB-Anforderungen nach Region', styles['Caption']))

story.append(PageBreak())

# ========== SECTION 4: ANTI-FRAUD ==========
story.append(Paragraph('4. Anti-Fraud System Architecture', styles['H1']))

story.append(Paragraph('4.1 Fraud-Detection-Ebenen', styles['H2']))
story.append(Paragraph(
    'Das Anti-Fraud-System von CargoBit arbeitet auf drei Ebenen: Account-Ebene, Transaktions-Ebene und '
    'Transport-Ebene. Jede Ebene nutzt spezifische Erkennungsmechanismen und generiert bei Ueberschreitung '
    'von Schwellenwerten Security-Flags. Das System kombiniert automatische Analysen mit regelbasierten '
    'Pruefungen und kann bei kritischen Faellen automatisch einschreiten.',
    styles['Body']
))

fraud_layers_data = [
    [Paragraph('<b>Ebene</b>', styles['TableHeader']), 
     Paragraph('<b>Pruefung</b>', styles['TableHeader']),
     Paragraph('<b>Aktion bei Flag</b>', styles['TableHeader'])],
    [Paragraph('Account', styles['TableCell']), 
     Paragraph('Login-Patterns, IP-Wechsel, Geraete-Aenderung', styles['TableCellLeft']),
     Paragraph('2FA, Captcha, Temporaere Sperrung', styles['TableCellLeft'])],
    [Paragraph('Transaktion', styles['TableCell']), 
     Paragraph('Hohe Betraege, Neue IBAN, Many Stornos', styles['TableCellLeft']),
     Paragraph('Delay, Manuelle Freigabe, Limit', styles['TableCellLeft'])],
    [Paragraph('Transport', styles['TableCell']), 
     Paragraph('GPS-Plausibilitaet, Fake-Dokumente', styles['TableCellLeft']),
     Paragraph('Verifikations-Workflow, Sperre', styles['TableCellLeft'])],
]
story.append(Spacer(1, 8))
story.append(create_table(fraud_layers_data, [70, 180, 150]))
story.append(Paragraph('Tabelle 4.1: Fraud-Detection-Ebenen', styles['Caption']))

story.append(Paragraph('4.2 Account-Ebene: Erkennungsmechanismen', styles['H2']))
story.append(Paragraph(
    'Auf Account-Ebene ueberwacht das System ungewoehnliche Login-Muster einschliesslich IP-Adressen und '
    'Laenderwechsel. Bei vielen fehlgeschlagenen Logins werden Rate-Limiting und Captcha aktiviert. Neue '
    'Geraete erfordern eine Bestaetigung per E-Mail oder 2FA. Diese Mechanismen schuetzen vor Account-Uebernahmen '
    'und Credential-Stuffing-Angriffen.',
    styles['Body']
))

account_flags_data = [
    [Paragraph('<b>Flag-Typ</b>', styles['TableHeader']), 
     Paragraph('<b>Trigger</b>', styles['TableHeader']),
     Paragraph('<b>Severity</b>', styles['TableHeader'])],
    [Paragraph('UNUSUAL_LOGIN_LOCATION', styles['TableCellLeft']), 
     Paragraph('Login aus neuem Land', styles['TableCellLeft']),
     Paragraph('MEDIUM', styles['TableCell'])],
    [Paragraph('MULTIPLE_FAILED_LOGINS', styles['TableCellLeft']), 
     Paragraph('>5 fehlgeschlagene Versuche', styles['TableCellLeft']),
     Paragraph('LOW', styles['TableCell'])],
    [Paragraph('NEW_DEVICE_DETECTED', styles['TableCellLeft']), 
     Paragraph('Neues Geraet erkannt', styles['TableCellLeft']),
     Paragraph('LOW', styles['TableCell'])],
    [Paragraph('SIMULTANEOUS_SESSIONS', styles['TableCellLeft']), 
     Paragraph('Gleichzeitige Sessions', styles['TableCellLeft']),
     Paragraph('HIGH', styles['TableCell'])],
    [Paragraph('IMPOSSIBLE_TRAVEL', styles['TableCellLeft']), 
     Paragraph('Login von weit entfernten Orten', styles['TableCellLeft']),
     Paragraph('CRITICAL', styles['TableCell'])],
]
story.append(Spacer(1, 8))
story.append(create_table(account_flags_data, [130, 150, 70]))
story.append(Paragraph('Tabelle 4.2: Account-Level Security Flags', styles['Caption']))

story.append(Paragraph('4.3 Transaktions-Ebene', styles['H2']))
story.append(Paragraph(
    'Transaktionen werden auf Anomalien geprueft. Hohe Betraege loesen zusaetzliche Checks aus, entweder als '
    'manuelle Freigabe durch SUPPORT oder als zeitliche Verzoegerung. Die Kombination aus neuer IBAN und '
    'hohem Payout generiert automatisch ein Flag mit vorgeschalteter Verzoegerung. Eine hohe Stornierungsrate '
    'oder viele Schadensmeldungen fuehren zu einem erhoehten Risk-Score fuer den betroffenen Account.',
    styles['Body']
))

story.append(Paragraph('4.4 Transport-Ebene', styles['H2']))
story.append(Paragraph(
    'Auf Transport-Ebene wird die GPS-Plausibilitaet geprueft: Befindet sich der Fahrer tatsaechlich in der '
    'Naehe des angegebenen Standorts? Wiederkehrende Muster wie immer gleiche Shipper-Carrier-Kombinationen '
    'mit auffaelligen Zahlungen werden analysiert. Verdacht auf gefaelschte Dokumente loest einen '
    'Verifikations-Workflow aus, bei dem die Dokumente manuell geprueft werden muessen.',
    styles['Body']
))

story.append(PageBreak())

# ========== SECTION 5: RISK SCORING ==========
story.append(Paragraph('5. Risk Scoring Algorithmus', styles['H1']))

story.append(Paragraph('5.1 Risk-Score-Berechnung', styles['H2']))
story.append(Paragraph(
    'Jeder Benutzer und jedes Unternehmen erhaelt einen Risk-Score zwischen 0 und 100, wobei 0 das geringste '
    'Risiko und 100 das hoechste Risiko darstellt. Der Score setzt sich aus gewichteten Einzelkomponenten '
    'zusammen und wird bei jeder relevanten Aktion neu berechnet. Ueberschreitet der Score kritische Schwellen, '
    'werden automatisch Einschraenkungen aktiviert oder manuelle Pruefungen angefordert.',
    styles['Body']
))

risk_components_data = [
    [Paragraph('<b>Komponente</b>', styles['TableHeader']), 
     Paragraph('<b>Gewicht</b>', styles['TableHeader']),
     Paragraph('<b>Faktoren</b>', styles['TableHeader'])],
    [Paragraph('KYC/KYB Status', styles['TableCellLeft']), 
     Paragraph('25%', styles['TableCell']),
     Paragraph('Verified/Pending/Rejected', styles['TableCellLeft'])],
    [Paragraph('Security Flags', styles['TableCellLeft']), 
     Paragraph('20%', styles['TableCell']),
     Paragraph('Anzahl + Severity', styles['TableCellLeft'])],
    [Paragraph('Transaktions-Historie', styles['TableCellLeft']), 
     Paragraph('20%', styles['TableCell']),
     Paragraph('Stornos, Schaeden, Betraege', styles['TableCellLeft'])],
    [Paragraph('Account-Alter', styles['TableCellLeft']), 
     Paragraph('15%', styles['TableCell']),
     Paragraph('Tage seit Registrierung', styles['TableCellLeft'])],
    [Paragraph('Verhaltens-Anomalien', styles['TableCellLeft']), 
     Paragraph('10%', styles['TableCell']),
     Paragraph('Patterns, GPS, Logins', styles['TableCellLeft'])],
    [Paragraph('Externe Scores', styles['TableCellLeft']), 
     Paragraph('10%', styles['TableCell']),
     Paragraph('Credit-Bureaus (optional)', styles['TableCellLeft'])],
]
story.append(Spacer(1, 8))
story.append(create_table(risk_components_data, [110, 60, 180]))
story.append(Paragraph('Tabelle 5.1: Risk-Score Komponenten', styles['Caption']))

story.append(Paragraph('5.2 Score-Schwellen und Aktionen', styles['H2']))

thresholds_data = [
    [Paragraph('<b>Score-Bereich</b>', styles['TableHeader']), 
     Paragraph('<b>Risiko-Level</b>', styles['TableHeader']),
     Paragraph('<b>Automatische Aktion</b>', styles['TableHeader'])],
    [Paragraph('0-25', styles['TableCell']), 
     Paragraph('LOW', styles['TableCell']),
     Paragraph('Keine Einschraenkungen', styles['TableCellLeft'])],
    [Paragraph('26-50', styles['TableCell']), 
     Paragraph('MEDIUM', styles['TableCell']),
     Paragraph('Transaktions-Limits', styles['TableCellLeft'])],
    [Paragraph('51-75', styles['TableCell']), 
     Paragraph('HIGH', styles['TableCell']),
     Paragraph('Manuelle Freigabe bei Payouts', styles['TableCellLeft'])],
    [Paragraph('76-100', styles['TableCell']), 
     Paragraph('CRITICAL', styles['TableCell']),
     Paragraph('Account gesperrt, Review noetig', styles['TableCellLeft'])],
]
story.append(Spacer(1, 8))
story.append(create_table(thresholds_data, [80, 80, 210]))
story.append(Paragraph('Tabelle 5.2: Risk-Score Schwellenwerte', styles['Caption']))

story.append(PageBreak())

# ========== SECTION 6: TECHNISCHE MASSNAHMEN ==========
story.append(Paragraph('6. Technische Sicherheitsmassnahmen', styles['H1']))

story.append(Paragraph('6.1 Authentifizierung', styles['H2']))
story.append(Paragraph(
    'CargoBit verwendet JWT (JSON Web Tokens) mit kurzer Gueltigkeitsdauer in Kombination mit Refresh-Tokens. '
    'Fuer kritische Rollen wie ADMIN und DISPATCHER grosser Flotten ist 2FA (Zwei-Faktor-Authentifizierung) '
    'zwingend erforderlich. Die Token-Verwaltung beinhaltet automatische Rotation und Revocation bei '
    'Sicherheitsereignissen.',
    styles['Body']
))

auth_data = [
    [Paragraph('<b>Massnahme</b>', styles['TableHeader']), 
     Paragraph('<b>Implementierung</b>', styles['TableHeader']),
     Paragraph('<b>Rollen</b>', styles['TableHeader'])],
    [Paragraph('JWT Access Token', styles['TableCellLeft']), 
     Paragraph('15 Minuten Gueltigkeit', styles['TableCellLeft']),
     Paragraph('Alle', styles['TableCell'])],
    [Paragraph('Refresh Token', styles['TableCellLeft']), 
     Paragraph('7 Tage, Rotation bei Nutzung', styles['TableCellLeft']),
     Paragraph('Alle', styles['TableCell'])],
    [Paragraph('2FA (TOTP)', styles['TableCellLeft']), 
     Paragraph('Google Authenticator kompatibel', styles['TableCellLeft']),
     Paragraph('ADMIN, DISPATCHER', styles['TableCell'])],
    [Paragraph('2FA (SMS)', styles['TableCellLeft']), 
     Paragraph('Fallback-Option', styles['TableCellLeft']),
     Paragraph('Optional alle', styles['TableCell'])],
    [Paragraph('Session-Timeout', styles['TableCellLeft']), 
     Paragraph('30 Minuten Inaktivitaet', styles['TableCellLeft']),
     Paragraph('Alle', styles['TableCell'])],
]
story.append(Spacer(1, 8))
story.append(create_table(auth_data, [100, 150, 100]))
story.append(Paragraph('Tabelle 6.1: Authentifizierungsmassnahmen', styles['Caption']))

story.append(Paragraph('6.2 Transport-Verschlüsselung', styles['H2']))
story.append(Paragraph(
    'Saemtliche Kommunikation erfolgt verschluesselt ueber TLS 1.3. HSTS (HTTP Strict Transport Security) ist '
    'aktiviert, und es gibt keine unverschluesselten Endpunkte. Die SSL/TLS-Zertifikate werden automatisch '
    'erneuert und auf Schwachstellen ueberwacht.',
    styles['Body']
))

story.append(Paragraph('6.3 Daten-Verschluesselung', styles['H2']))
story.append(Paragraph(
    'Passwoerter werden mit Argon2id gehasht, einem modernen und resistenten Algorithmus gegen Brute-Force- '
    'und Rainbow-Table-Angriffe. Sensible Daten wie IBAN, Ausweisdaten und Kreditkarteninformationen werden '
    'zusaetzlich in der Datenbank verschluesselt (AES-256). Die Schluesselverwaltung erfolgt ueber einen '
    'separaten Key-Management-Service.',
    styles['Body']
))

encryption_data = [
    [Paragraph('<b>Datentyp</b>', styles['TableHeader']), 
     Paragraph('<b>Verschluesselung</b>', styles['TableHeader']),
     Paragraph('<b>Key-Management</b>', styles['TableHeader'])],
    [Paragraph('Passwoerter', styles['TableCellLeft']), 
     Paragraph('Argon2id (Hash)', styles['TableCellLeft']),
     Paragraph('Salt per User', styles['TableCellLeft'])],
    [Paragraph('IBAN', styles['TableCellLeft']), 
     Paragraph('AES-256-GCM', styles['TableCellLeft']),
     Paragraph('KMS Rotation', styles['TableCellLeft'])],
    [Paragraph('Ausweisdaten', styles['TableCellLeft']), 
     Paragraph('AES-256-GCM', styles['TableCellLeft']),
     Paragraph('KMS Rotation', styles['TableCellLeft'])],
    [Paragraph('Dokumente (S3)', styles['TableCellLeft']), 
     Paragraph('Server-Side Encryption', styles['TableCellLeft']),
     Paragraph('AWS KMS', styles['TableCellLeft'])],
    [Paragraph('Backups', styles['TableCellLeft']), 
     Paragraph('AES-256', styles['TableCellLeft']),
     Paragraph('Separate Keys', styles['TableCellLeft'])],
]
story.append(Spacer(1, 8))
story.append(create_table(encryption_data, [100, 130, 130]))
story.append(Paragraph('Tabelle 6.2: Datenverschluesselung', styles['Caption']))

story.append(PageBreak())

# ========== SECTION 7: AUDIT LOGGING ==========
story.append(Paragraph('7. Audit-Logging & Compliance', styles['H1']))

story.append(Paragraph('7.1 Audit-Log Struktur', styles['H2']))
story.append(Paragraph(
    'Jede kritische Aktion wird in der audit_logs Tabelle protokolliert. Dies umfasst Rollenaenderungen, '
    'Payouts, Planwechsel, Dokumentfreigaben und alle administrativen Eingriffe. Die Logs enthalten '
    'Zeitstempel, Akteur, Aktionstyp, Entitaet sowie die Daten vor und nach der Aenderung (JSON). '
    'Audit-Logs sind unveraenderbar und werden fuer 7 Jahre aufbewahrt.',
    styles['Body']
))

audit_data = [
    [Paragraph('<b>Aktionstyp</b>', styles['TableHeader']), 
     Paragraph('<b>Beschreibung</b>', styles['TableHeader']),
     Paragraph('<b>Retention</b>', styles['TableHeader'])],
    [Paragraph('LOGIN', styles['TableCellLeft']), 
     Paragraph('Benutzer-Login', styles['TableCellLeft']),
     Paragraph('2 Jahre', styles['TableCell'])],
    [Paragraph('LOGOUT', styles['TableCellLeft']), 
     Paragraph('Benutzer-Logout', styles['TableCellLeft']),
     Paragraph('2 Jahre', styles['TableCell'])],
    [Paragraph('CREATE', styles['TableCellLeft']), 
     Paragraph('Entitaet erstellt', styles['TableCellLeft']),
     Paragraph('7 Jahre', styles['TableCell'])],
    [Paragraph('UPDATE', styles['TableCellLeft']), 
     Paragraph('Entitaet geaendert', styles['TableCellLeft']),
     Paragraph('7 Jahre', styles['TableCell'])],
    [Paragraph('DELETE', styles['TableCellLeft']), 
     Paragraph('Entitaet geloescht', styles['TableCellLeft']),
     Paragraph('7 Jahre', styles['TableCell'])],
    [Paragraph('STATUS_CHANGE', styles['TableCellLeft']), 
     Paragraph('Status geaendert', styles['TableCellLeft']),
     Paragraph('7 Jahre', styles['TableCell'])],
    [Paragraph('PAYOUT', styles['TableCellLeft']), 
     Paragraph('Auszahlung getaetigt', styles['TableCellLeft']),
     Paragraph('10 Jahre', styles['TableCell'])],
    [Paragraph('FRAUD_ALERT', styles['TableCellLeft']), 
     Paragraph('Fraud-Flag gesetzt', styles['TableCellLeft']),
     Paragraph('10 Jahre', styles['TableCell'])],
]
story.append(Spacer(1, 8))
story.append(create_table(audit_data, [90, 150, 80]))
story.append(Paragraph('Tabelle 7.1: Audit-Log Aktionstypen', styles['Caption']))

story.append(Paragraph('7.2 Compliance-Anforderungen', styles['H2']))
story.append(Paragraph(
    'CargoBit erfuellt die Anforderungen der DSGVO (GDPR), der Anti-Geldwaesche-Richtlinie (AML) und der '
    'relevanten Verkehrs- und Frachtrechtsgesetze der EU. Datenschutzanfragen (DSGVO Art. 15, 17, 20) werden '
    'automatisiert verarbeitet. Fuer Finanztransaktionen gelten die Aufbewahrungsfristen der GoBD und '
    'HGB.',
    styles['Body']
))

story.append(Spacer(1, 20))

# Final note
story.append(Paragraph(
    'Dieses Dokument beschreibt die Sicherheitsarchitektur von CargoBit Stand April 2026. '
    'Aktualisierungen erfolgen bei wesentlichen Aenderungen an der Systemarchitektur oder bei '
    'neuen regulatorischen Anforderungen.',
    styles['Note']
))

# ========== BUILD ==========
doc.build(story)
print(f'PDF generated: {output_path}')
