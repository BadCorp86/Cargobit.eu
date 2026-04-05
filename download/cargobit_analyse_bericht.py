#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
CargoBit.eu Projekt-Analyse-Bericht PDF Generator
"""

from reportlab.lib.pagesizes import A4
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, 
    PageBreak, Image
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
from reportlab.lib.units import cm, inch
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily
import os

# Register fonts
pdfmetrics.registerFont(TTFont('SimHei', '/usr/share/fonts/truetype/chinese/SimHei.ttf'))
pdfmetrics.registerFont(TTFont('Microsoft YaHei', '/usr/share/fonts/truetype/chinese/msyh.ttf'))
pdfmetrics.registerFont(TTFont('Times New Roman', '/usr/share/fonts/truetype/english/Times-New-Roman.ttf'))
registerFontFamily('Microsoft YaHei', normal='Microsoft YaHei', bold='Microsoft YaHei')
registerFontFamily('SimHei', normal='SimHei', bold='SimHei')
registerFontFamily('Times New Roman', normal='Times New Roman', bold='Times New Roman')

# Colors
TABLE_HEADER_COLOR = colors.HexColor('#1F4E79')
TABLE_ROW_ODD = colors.HexColor('#F5F5F5')
ORANGE_COLOR = colors.HexColor('#F97316')
GREEN_COLOR = colors.HexColor('#22C55E')
RED_COLOR = colors.HexColor('#EF4444')

def create_styles():
    styles = getSampleStyleSheet()
    
    # Cover title
    styles.add(ParagraphStyle(
        name='CoverTitle',
        fontName='Microsoft YaHei',
        fontSize=36,
        leading=44,
        alignment=TA_CENTER,
        textColor=colors.HexColor('#1F4E79'),
        spaceAfter=20,
    ))
    
    # Cover subtitle
    styles.add(ParagraphStyle(
        name='CoverSubtitle',
        fontName='SimHei',
        fontSize=18,
        leading=24,
        alignment=TA_CENTER,
        textColor=colors.HexColor('#666666'),
        spaceAfter=30,
    ))
    
    # Section heading (H1)
    styles.add(ParagraphStyle(
        name='SectionHeading',
        fontName='Microsoft YaHei',
        fontSize=18,
        leading=24,
        alignment=TA_LEFT,
        textColor=colors.HexColor('#1F4E79'),
        spaceBefore=20,
        spaceAfter=12,
    ))
    
    # Subsection heading (H2)
    styles.add(ParagraphStyle(
        name='SubsectionHeading',
        fontName='Microsoft YaHei',
        fontSize=14,
        leading=20,
        alignment=TA_LEFT,
        textColor=colors.HexColor('#333333'),
        spaceBefore=16,
        spaceAfter=8,
    ))
    
    # Body text
    styles.add(ParagraphStyle(
        name='BodyTextCN',
        fontName='SimHei',
        fontSize=11,
        leading=18,
        alignment=TA_LEFT,
        textColor=colors.black,
        spaceBefore=6,
        spaceAfter=6,
        wordWrap='CJK',
    ))
    
    # Table header
    styles.add(ParagraphStyle(
        name='TableHeader',
        fontName='SimHei',
        fontSize=10,
        leading=14,
        alignment=TA_CENTER,
        textColor=colors.white,
    ))
    
    # Table cell
    styles.add(ParagraphStyle(
        name='TableCell',
        fontName='SimHei',
        fontSize=9,
        leading=13,
        alignment=TA_LEFT,
        textColor=colors.black,
        wordWrap='CJK',
    ))
    
    # Status good
    styles.add(ParagraphStyle(
        name='StatusGood',
        fontName='SimHei',
        fontSize=9,
        leading=13,
        alignment=TA_CENTER,
        textColor=GREEN_COLOR,
    ))
    
    # Status warning
    styles.add(ParagraphStyle(
        name='StatusWarning',
        fontName='SimHei',
        fontSize=9,
        leading=13,
        alignment=TA_CENTER,
        textColor=colors.HexColor('#EAB308'),
    ))
    
    # Status error
    styles.add(ParagraphStyle(
        name='StatusError',
        fontName='SimHei',
        fontSize=9,
        leading=13,
        alignment=TA_CENTER,
        textColor=RED_COLOR,
    ))
    
    return styles

def create_table(data, col_widths, styles):
    """Create a styled table with the given data."""
    table = Table(data, colWidths=col_widths)
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER_COLOR),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('FONTNAME', (0, 0), (-1, 0), 'SimHei'),
        ('FONTNAME', (0, 1), (-1, -1), 'SimHei'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
    ]))
    
    # Alternating row colors
    for i in range(1, len(data)):
        if i % 2 == 0:
            table.setStyle(TableStyle([
                ('BACKGROUND', (0, i), (-1, i), TABLE_ROW_ODD),
            ]))
    
    return table

def build_report():
    output_path = '/home/z/my-project/download/CargoBit_Projekt_Analyse_Bericht.pdf'
    
    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        rightMargin=2*cm,
        leftMargin=2*cm,
        topMargin=2*cm,
        bottomMargin=2*cm,
        title='CargoBit_Projekt_Analyse_Bericht',
        author='Z.ai',
        creator='Z.ai',
        subject='CargoBit.eu Logistik-Plattform Projekt-Analyse',
    )
    
    styles = create_styles()
    story = []
    
    # ========== COVER PAGE ==========
    story.append(Spacer(1, 80))
    story.append(Paragraph('CargoBit.eu', styles['CoverTitle']))
    story.append(Spacer(1, 20))
    story.append(Paragraph('Projekt-Analyse-Bericht', styles['CoverSubtitle']))
    story.append(Spacer(1, 40))
    story.append(Paragraph('Schwachstellen, UX/UI-Verbesserungen und Workflow-Optimierungen', styles['CoverSubtitle']))
    story.append(Spacer(1, 80))
    story.append(Paragraph('Analyse-Datum: April 2025', styles['BodyTextCN']))
    story.append(Paragraph('Projekt: Next.js 15 Logistik-Plattform', styles['BodyTextCN']))
    story.append(Paragraph('Rollen: Admin, Dispatcher, Driver, Shipper, Support', styles['BodyTextCN']))
    story.append(PageBreak())
    
    # ========== SECTION 1: ROLLEN-SPEZIFISCHE SCHWACHSTELLEN ==========
    story.append(Paragraph('1. Rollen-spezifische Schwachstellen', styles['SectionHeading']))
    
    # 1.1 Admin
    story.append(Paragraph('1.1 Admin-Rolle', styles['SubsectionHeading']))
    story.append(Paragraph(
        'Die Admin-Rolle verfuegt ueber umfassende Berechtigungen, aber einige wichtige Funktionen fehlen noch in der UI. '
        'Die Benutzerverwaltung ist nur teilweise implementiert - es gibt keine Admin-Oberflaeche fuer Benutzer-Suspendierung '
        'oder Verifizierung. Werbeanfragen koennen nicht ueber eine Admin-Review-Oberflaeche bearbeitet werden. '
        'Audit-Logs sind im Prisma-Schema vorhanden, aber es fehlt die API und UI fuer die Anzeige. '
        'System-Einstellungen sind ebenfalls nur im Datenbank-Modell definiert, ohne Nutzeroberflaeche.',
        styles['BodyTextCN']
    ))
    
    admin_data = [
        [Paragraph('<b>Bereich</b>', styles['TableHeader']), 
         Paragraph('<b>Status</b>', styles['TableHeader']), 
         Paragraph('<b>Beschreibung</b>', styles['TableHeader'])],
        [Paragraph('Benutzerverwaltung', styles['TableCell']), 
         Paragraph('Teilweise', styles['StatusWarning']), 
         Paragraph('API vorhanden, keine Admin-UI fuer Suspendierung', styles['TableCell'])],
        [Paragraph('Analytics-Dashboard', styles['TableCell']), 
         Paragraph('Gut', styles['StatusGood']), 
         Paragraph('Umsatz-Chart und KPIs vorhanden', styles['TableCell'])],
        [Paragraph('Werbeanfragen', styles['TableCell']), 
         Paragraph('Fehlt', styles['StatusError']), 
         Paragraph('Keine Admin-Review-Oberflaeche', styles['TableCell'])],
        [Paragraph('Audit-Logs', styles['TableCell']), 
         Paragraph('Fehlt', styles['StatusError']), 
         Paragraph('Prisma-Schema vorhanden, keine API/UI', styles['TableCell'])],
        [Paragraph('System-Einstellungen', styles['TableCell']), 
         Paragraph('Fehlt', styles['StatusError']), 
         Paragraph('Modell existiert, keine UI', styles['TableCell'])],
    ]
    story.append(Spacer(1, 12))
    story.append(create_table(admin_data, [3.5*cm, 2*cm, 9*cm], styles))
    story.append(Spacer(1, 18))
    
    # 1.2 Dispatcher
    story.append(Paragraph('1.2 Dispatcher (Disponent) - Beste Implementierung', styles['SubsectionHeading']))
    story.append(Paragraph(
        'Die Dispatcher-Rolle ist am besten implementiert und verfuegt ueber alle noetigen Funktionen. '
        'Das Dashboard zeigt vollstaendige KPIs, aktive Auftraege und Fahrzeuge an. Das Flottenmanagement '
        'mit Fahrer- und Fahrzeuguebersicht ist gut umgesetzt. Der Kapazitaetsabgleich mit dem innovativen '
        '"3 Paletten frei"-Feature ist ein Highlight. Die Wallet-Funktionalitaet mit Transaktionshistorie '
        'und Gebuehren-Struktur ist ebenfalls vollstaendig implementiert.',
        styles['BodyTextCN']
    ))
    story.append(Paragraph(
        'Verbesserungspotential: Es gibt keine Live-Karte fuer Flotten-Tracking (nur Placeholder). '
        'Die Routenplanung nutzt nur Mock-Daten ohne echte Integration. Eine automatische Fahrer-Zuweisung '
        'bei neuen Auftraegen fehlt ebenfalls.',
        styles['BodyTextCN']
    ))
    
    # 1.3 Driver
    story.append(Paragraph('1.3 Driver (Fahrer) - Gut implementiert', styles['SubsectionHeading']))
    story.append(Paragraph(
        'Die Driver-Rolle ist korrekt ohne Finanzen implementiert - genau wie gefordert. '
        'Das Dashboard zeigt nur operationelle Metriken wie Lieferungen und Stunden. '
        'Der Status-Update-Mechanismus mit 5 Zustaenden (Verfuegbar, Unterwegs, Pause, Offline, Ruhend) '
        'funktioniert gut. Allerdings gibt es wichtige fehlende Features: Keine echte GPS-Navigation '
        '(nur ein Button ohne Karten-Integration), keine Push-Benachrichtigungen fuer neue Auftraege, '
        'kein Offline-Modus fuer Gebiete ohne Empfang, und keine digitale Unterschrift oder '
        'Foto-Dokumentation bei der Lieferung.',
        styles['BodyTextCN']
    ))
    
    # 1.4 Shipper
    story.append(Paragraph('1.4 Shipper (Versender) - Teilweise implementiert', styles['SubsectionHeading']))
    story.append(Paragraph(
        'Die Shipper-Rolle generiert keinen Umsatz sondern hat nur Kosten - dies ist im Dashboard korrekt '
        'als "totalCosts" statt "revenue" implementiert. Die Sendungserstellung mit 3-Schritt-Wizard '
        'und KI-Preisempfehlung funktioniert gut. Das Tracking UI ist vorhanden. '
        'Allerdings fehlt eine Auktions-Uebersicht fuer eigene Auktionen, eine Gebots-Historie, '
        'eine Favoriten-Transporteur-Liste und die Moeglichkeit, wiederkehrende Sendungs-Vorlagen zu erstellen.',
        styles['BodyTextCN']
    ))
    
    # 1.5 Support
    story.append(Paragraph('1.5 Support-Rolle', styles['SubsectionHeading']))
    story.append(Paragraph(
        'Die Support-Rolle ist korrekt ohne Finanzen implementiert. Das Ticket-System mit Liste '
        'und Detail-Ansicht funktioniert. Es fehlen jedoch wichtige Funktionen: Keine Benutzer-Suche, '
        'kein Live-Chat mit Kunden, kein Eskalations-Workflow, keine SLA-Timer pro Ticket, '
        'keine Wissensdatenbank/FAQ-Verwaltung und keine internen Notizen zu Tickets.',
        styles['BodyTextCN']
    ))
    
    story.append(PageBreak())
    
    # ========== SECTION 2: UX/UI VERBESSERUNGSPOTENTIAL ==========
    story.append(Paragraph('2. UX/UI Verbesserungspotential', styles['SectionHeading']))
    
    # 2.1 Navigation
    story.append(Paragraph('2.1 Navigation & Sidebar', styles['SubsectionHeading']))
    story.append(Paragraph(
        'Die Navigation verfuegt ueber eine animierte Sidebar mit Tooltip-Unterstützung und '
        'rollen-basierte Navigation, die korrekt implementiert ist. Die Sprachumschaltung '
        'unterstuetzt 9 Sprachen (DE, EN, PL, CS, EL, TR, SL, HU, RO). '
        'Verbesserungspotential: Es fehlen Breadcrumbs fuer tiefe Navigationsebenen, '
        'kein "Letzte Seiten"-Verlauf, und die mobile Sidebar koennte aggressiver geschlossen werden.',
        styles['BodyTextCN']
    ))
    
    # 2.2 Dashboard
    story.append(Paragraph('2.2 Dashboard-Design', styles['SubsectionHeading']))
    story.append(Paragraph(
        'Das Dashboard zeigt rolle-spezifische KPI-Cards mit Animation und ein responsive Grid-Layout. '
        'Der Willkommens-Banner mit Gradient ist gut gestaltet. '
        'Schwaechen: Die Live-Karte ist nur ein Placeholder ohne echte Funktionalitaet. '
        'Es gibt keine anpassbaren Widgets und keine "Quick Stats" fuer verschiedene Zeitraeume '
        '(Heute/Woche/Monat).',
        styles['BodyTextCN']
    ))
    
    # 2.3 Responsive Design
    story.append(Paragraph('2.3 Responsive Design', styles['SubsectionHeading']))
    
    responsive_data = [
        [Paragraph('<b>Breakpoint</b>', styles['TableHeader']), 
         Paragraph('<b>Bewertung</b>', styles['TableHeader']), 
         Paragraph('<b>Bemerkung</b>', styles['TableHeader'])],
        [Paragraph('Desktop (>1024px)', styles['TableCell']), 
         Paragraph('Sehr gut', styles['StatusGood']), 
         Paragraph('Volle Funktionalitaet', styles['TableCell'])],
        [Paragraph('Tablet (768-1024px)', styles['TableCell']), 
         Paragraph('Gut', styles['StatusGood']), 
         Paragraph('Meiste Features verfuegbar', styles['TableCell'])],
        [Paragraph('Mobile (<768px)', styles['TableCell']), 
         Paragraph('Eingeschraenkt', styles['StatusWarning']), 
         Paragraph('Tabellen horizontal scrollen, Filter versteckt', styles['TableCell'])],
    ]
    story.append(Spacer(1, 12))
    story.append(create_table(responsive_data, [4*cm, 2.5*cm, 8*cm], styles))
    story.append(Spacer(1, 12))
    
    story.append(Paragraph(
        'Empfehlungen fuer Mobile: Tabellen als Card-Liste darstellen, touch-freundliche '
        'Schaltflaechen mit min. 44px Groesse, und Swipe-Gesten fuer schnelle Aktionen implementieren.',
        styles['BodyTextCN']
    ))
    
    story.append(PageBreak())
    
    # ========== SECTION 3: WORKFLOW-OPTIMIERUNGEN ==========
    story.append(Paragraph('3. Workflow-Optimierungen', styles['SectionHeading']))
    
    # 3.1 Sendungserstellung
    story.append(Paragraph('3.1 Sendungserstellungsprozess', styles['SubsectionHeading']))
    story.append(Paragraph(
        'Der aktuelle Flow besteht aus 3 Schritten: Adressen -> Frachtdetails -> Preis/Auktion. '
        'Der Schritt-Indikator ist gut visualisiert. Die KI-Preisempfehlung ist visuell prominent platziert. '
        'Kritische Verbesserungen: Backend-Validierung mit Zod fehlt, keine Adress-Autovervollstaendigung '
        '(Google Places API empfohlen), keine Vorlagen fuer haeufige Routen, und keine Auto-Save-Funktion '
        'fuer Entwuerfe.',
        styles['BodyTextCN']
    ))
    
    # 3.2 Auktions-Workflow
    story.append(Paragraph('3.2 Auktions-Workflow', styles['SubsectionHeading']))
    story.append(Paragraph(
        'Der Auktions-Workflow hat wichtige Luecken: KI-Preisempfehlung und Bid-Floor-Berechnung sind '
        'vorhanden, UI fuer Auktionsdauer-Auswahl ist implementiert. ABER: Es gibt keine /api/auctions Route! '
        'Die Gebots-Abgabe-Funktionalitaet fehlt komplett, und es gibt keine Echtzeit-Auktions-Updates.',
        styles['BodyTextCN']
    ))
    
    story.append(Paragraph(
        'Fehlende API-Endpoints: POST /api/auctions (Auktion erstellen), GET /api/auctions (Auktionen auflisten), '
        'POST /api/auctions/[id]/bids (Gebot abgeben), PUT /api/auctions/[id]/accept (Zuschlag erteilen).',
        styles['BodyTextCN']
    ))
    
    # 3.3 Tracking
    story.append(Paragraph('3.3 Tracking & Status-Updates', styles['SubsectionHeading']))
    story.append(Paragraph(
        'Staerken: GPS-Tracking API (/api/gps) vorhanden, Status-Updates im Shipment-Dialog, '
        'eCMR mit Blockchain-Hash. '
        'Schwaechen: Keine Echtzeit-WebSockets fuer Live-Tracking, keine Push-Benachrichtigungen '
        'bei Status-Aenderungen, und keine Timeline-Visualisierung.',
        styles['BodyTextCN']
    ))
    
    story.append(PageBreak())
    
    # ========== SECTION 4: TECHNISCHE SCHWACHSTELLEN ==========
    story.append(Paragraph('4. Technische Schwachstellen', styles['SectionHeading']))
    
    # 4.1 API-Vollständigkeit
    story.append(Paragraph('4.1 API-Vollstaendigkeit', styles['SubsectionHeading']))
    
    api_data = [
        [Paragraph('<b>API-Endpoint</b>', styles['TableHeader']), 
         Paragraph('<b>Status</b>', styles['TableHeader']), 
         Paragraph('<b>Bemerkung</b>', styles['TableHeader'])],
        [Paragraph('/api/users', styles['TableCell']), 
         Paragraph('Vollstaendig', styles['StatusGood']), 
         Paragraph('CRUD implementiert', styles['TableCell'])],
        [Paragraph('/api/shipments', styles['TableCell']), 
         Paragraph('Vollstaendig', styles['StatusGood']), 
         Paragraph('CRUD + Actions', styles['TableCell'])],
        [Paragraph('/api/wallet', styles['TableCell']), 
         Paragraph('Vollstaendig', styles['StatusGood']), 
         Paragraph('Transaktionen + Fees', styles['TableCell'])],
        [Paragraph('/api/capacity', styles['TableCell']), 
         Paragraph('Vollstaendig', styles['StatusGood']), 
         Paragraph('Mit AI-Parsing', styles['TableCell'])],
        [Paragraph('/api/ecmr', styles['TableCell']), 
         Paragraph('Vollstaendig', styles['StatusGood']), 
         Paragraph('Mit Blockchain-Hash', styles['TableCell'])],
        [Paragraph('/api/ai-pricing', styles['TableCell']), 
         Paragraph('Vollstaendig', styles['StatusGood']), 
         Paragraph('KI-Preisberechnung', styles['TableCell'])],
        [Paragraph('/api/auctions', styles['TableCell']), 
         Paragraph('Fehlt', styles['StatusError']), 
         Paragraph('KRITISCH - Kern-Feature', styles['TableCell'])],
        [Paragraph('/api/notifications', styles['TableCell']), 
         Paragraph('Teilweise', styles['StatusWarning']), 
         Paragraph('GET vorhanden, POST fehlt', styles['TableCell'])],
        [Paragraph('/api/ad-applications', styles['TableCell']), 
         Paragraph('Fehlt', styles['StatusError']), 
         Paragraph('Admin-Review fehlt', styles['TableCell'])],
    ]
    story.append(Spacer(1, 12))
    story.append(create_table(api_data, [4*cm, 2.5*cm, 8*cm], styles))
    story.append(Spacer(1, 18))
    
    # 4.2 Validierungen
    story.append(Paragraph('4.2 Fehlende Validierungen', styles['SubsectionHeading']))
    story.append(Paragraph(
        'Frontend: Keine Zod-Schemas fuer Formulare, keine React Hook Form Integration. '
        'Backend: Keine Input-Validierung in API-Routen, kein Rate-Limiting, keine Auth-Middleware. '
        'Dies stellt ein Sicherheitsrisiko dar und sollte sofort behoben werden.',
        styles['BodyTextCN']
    ))
    
    # 4.3 Error Handling
    story.append(Paragraph('4.3 Error Handling', styles['SubsectionHeading']))
    story.append(Paragraph(
        'Das aktuelle Error-Handling ist unstrukturiert: Keine strukturierten Error-Codes, '
        'keine Error-Logging-Schnittstelle, keine Error-Tracking-Integration (z.B. Sentry), '
        'und keine benutzerfreundlichen Fehlermeldungen. Empfehlung: Einfuehrung einer CargoBitError-Klasse '
        'mit Code, Message, StatusCode und Details.',
        styles['BodyTextCN']
    ))
    
    story.append(PageBreak())
    
    # ========== SECTION 5: EMPFEHLUNGEN NACH PRIORITAET ==========
    story.append(Paragraph('5. Empfehlungen nach Prioritaet', styles['SectionHeading']))
    
    # 5.1 Kritisch
    story.append(Paragraph('5.1 Kritisch (Sofort beheben)', styles['SubsectionHeading']))
    
    critical_data = [
        [Paragraph('<b>#</b>', styles['TableHeader']), 
         Paragraph('<b>Massnahme</b>', styles['TableHeader']), 
         Paragraph('<b>Begruendung</b>', styles['TableHeader']),
         Paragraph('<b>Aufwand</b>', styles['TableHeader'])],
        [Paragraph('1', styles['TableCell']), 
         Paragraph('Auktions-API implementieren', styles['TableCell']), 
         Paragraph('Kern-Feature des Geschaeftsmodells', styles['TableCell']),
         Paragraph('3-5 Tage', styles['TableCell'])],
        [Paragraph('2', styles['TableCell']), 
         Paragraph('Auction-Datenbankmodell', styles['TableCell']), 
         Paragraph('Voraussetzung fuer Auktions-Feature', styles['TableCell']),
         Paragraph('1 Tag', styles['TableCell'])],
        [Paragraph('3', styles['TableCell']), 
         Paragraph('Backend-Validierung (Zod)', styles['TableCell']), 
         Paragraph('Sicherheitsrisiko ohne Input-Validation', styles['TableCell']),
         Paragraph('2 Tage', styles['TableCell'])],
        [Paragraph('4', styles['TableCell']), 
         Paragraph('Auth-Middleware', styles['TableCell']), 
         Paragraph('Keine Authentifizierung in API-Routen', styles['TableCell']),
         Paragraph('2 Tage', styles['TableCell'])],
        [Paragraph('5', styles['TableCell']), 
         Paragraph('PostgreSQL-Migration', styles['TableCell']), 
         Paragraph('SQLite nicht produktionsreif', styles['TableCell']),
         Paragraph('1 Tag', styles['TableCell'])],
    ]
    story.append(Spacer(1, 12))
    story.append(create_table(critical_data, [1*cm, 5*cm, 6*cm, 2.5*cm], styles))
    story.append(Spacer(1, 18))
    
    # 5.2 Wichtig
    story.append(Paragraph('5.2 Wichtig (Naechste Sprint)', styles['SubsectionHeading']))
    
    important_data = [
        [Paragraph('<b>#</b>', styles['TableHeader']), 
         Paragraph('<b>Massnahme</b>', styles['TableHeader']), 
         Paragraph('<b>Begruendung</b>', styles['TableHeader']),
         Paragraph('<b>Aufwand</b>', styles['TableHeader'])],
        [Paragraph('6', styles['TableCell']), 
         Paragraph('WebSocket fuer Live-Tracking', styles['TableCell']), 
         Paragraph('User-Erwartung bei Logistik-App', styles['TableCell']),
         Paragraph('3 Tage', styles['TableCell'])],
        [Paragraph('7', styles['TableCell']), 
         Paragraph('Push-Benachrichtigungen', styles['TableCell']), 
         Paragraph('Mobile User Experience', styles['TableCell']),
         Paragraph('2 Tage', styles['TableCell'])],
        [Paragraph('8', styles['TableCell']), 
         Paragraph('Admin-UI fuer Benutzer', styles['TableCell']), 
         Paragraph('Moderations-Workflow', styles['TableCell']),
         Paragraph('2 Tage', styles['TableCell'])],
        [Paragraph('9', styles['TableCell']), 
         Paragraph('Adress-Autovervollstaendigung', styles['TableCell']), 
         Paragraph('UX-Verbesserung', styles['TableCell']),
         Paragraph('1 Tag', styles['TableCell'])],
        [Paragraph('10', styles['TableCell']), 
         Paragraph('Error-Tracking (Sentry)', styles['TableCell']), 
         Paragraph('Produktions-Ueberwachung', styles['TableCell']),
         Paragraph('0.5 Tage', styles['TableCell'])],
    ]
    story.append(Spacer(1, 12))
    story.append(create_table(important_data, [1*cm, 5*cm, 6*cm, 2.5*cm], styles))
    story.append(Spacer(1, 18))
    
    story.append(PageBreak())
    
    # ========== SECTION 6: ZUSAMMENFASSUNG ==========
    story.append(Paragraph('6. Zusammenfassung', styles['SectionHeading']))
    
    story.append(Paragraph('6.1 Staerken des Projekts', styles['SubsectionHeading']))
    
    strengths = [
        'Umfassendes Rollen-Konzept mit 5 Rollen und korrekter Feature-Trennung',
        'Wallet-System vollstaendig mit Gebuehren-Struktur',
        'KI-Preisempfehlung gut integriert in Sendungserstellung',
        'Kapazitaetsabgleich mit innovativer "3 Paletten frei"-Funktion',
        'eCMR mit Blockchain-Hash fuer zukunftssichere Dokumentation',
        'Mehrsprachigkeit mit 9 unterstuetzten Sprachen',
    ]
    
    for s in strengths:
        story.append(Paragraph(f'• {s}', styles['BodyTextCN']))
    
    story.append(Spacer(1, 12))
    story.append(Paragraph('6.2 Kritische Luecken', styles['SubsectionHeading']))
    
    gaps = [
        'Keine Auktions-API - Haupt-Feature nicht backend-seitig implementiert',
        'Keine Authentifizierung - API-Endpunkte ohne Schutz',
        'Keine Backend-Validierung - Sicherheits- und Datenintegritaetsrisiko',
        'SQLite in Produktion - Skalierbarkeit begrenzt',
    ]
    
    for g in gaps:
        story.append(Paragraph(f'• {g}', styles['BodyTextCN']))
    
    story.append(Spacer(1, 12))
    story.append(Paragraph('6.3 Empfohlene Roadmap', styles['SubsectionHeading']))
    
    story.append(Paragraph(
        '<b>Sprint 1 (Woche 1-2):</b> Auction-Modell und API implementieren, Zod-Validierung fuer alle API-Endpoints, '
        'Auth-Middleware mit JWT.',
        styles['BodyTextCN']
    ))
    story.append(Paragraph(
        '<b>Sprint 2 (Woche 3-4):</b> PostgreSQL-Migration, WebSocket fuer Live-Tracking, Push-Benachrichtigungen.',
        styles['BodyTextCN']
    ))
    story.append(Paragraph(
        '<b>Sprint 3 (Woche 5-6):</b> Admin-Dashboard vervollstaendigen, Error-Tracking und Logging, '
        'Performance-Optimierung.',
        styles['BodyTextCN']
    ))
    
    story.append(Spacer(1, 24))
    story.append(Paragraph(
        '<b>Gesamtbewertung:</b> Das Projekt hat eine solide Architektur und innovative Features, '
        'benoetigt aber kritische Backend-Abschliessungen fuer den produktiven Einsatz. '
        'Die UI ist modern und rollen-spezifisch gut umgesetzt.',
        styles['BodyTextCN']
    ))
    
    # Build PDF
    doc.build(story)
    print(f"PDF erstellt: {output_path}")
    return output_path

if __name__ == '__main__':
    build_report()
