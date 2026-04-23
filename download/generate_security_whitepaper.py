#!/usr/bin/env python3
"""
Security Architecture Whitepaper - Executive Level
CargoBit Hybrid Security Layer for Enterprise Risk, Fraud Prevention & Compliance
"""

import os
import sys
import subprocess
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch, mm
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY, TA_RIGHT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, Image, KeepTogether, ListFlowable, ListItem
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily
from pypdf import PdfReader, PdfWriter, Transformation

# ━━ Cascade Palette ━━
PAGE_BG       = colors.HexColor('#f4f3f2')
SECTION_BG    = colors.HexColor('#ecebea')
CARD_BG       = colors.HexColor('#ecebe8')
TABLE_STRIPE  = colors.HexColor('#f1f0ef')
HEADER_FILL   = colors.HexColor('#544c37')
COVER_BLOCK   = colors.HexColor('#625a42')
BORDER        = colors.HexColor('#c3bca8')
ICON          = colors.HexColor('#897436')
ACCENT        = colors.HexColor('#5831cc')
ACCENT_2      = colors.HexColor('#45b27b')
TEXT_PRIMARY  = colors.HexColor('#191817')
TEXT_MUTED    = colors.HexColor('#828078')
SEM_SUCCESS   = colors.HexColor('#45935f')
SEM_WARNING   = colors.HexColor('#947a45')
SEM_ERROR     = colors.HexColor('#914841')
SEM_INFO      = colors.HexColor('#4d7298')

# Page setup
PAGE_WIDTH, PAGE_HEIGHT = A4
LEFT_MARGIN = 0.8 * inch
RIGHT_MARGIN = 0.8 * inch
TOP_MARGIN = 0.7 * inch
BOTTOM_MARGIN = 0.7 * inch
CONTENT_WIDTH = PAGE_WIDTH - LEFT_MARGIN - RIGHT_MARGIN

# Register fonts
pdfmetrics.registerFont(TTFont('Times New Roman', '/usr/share/fonts/truetype/english/Times-New-Roman.ttf'))
pdfmetrics.registerFont(TTFont('Calibri', '/usr/share/fonts/truetype/english/calibri-regular.ttf'))
pdfmetrics.registerFont(TTFont('SimHei', '/usr/share/fonts/truetype/chinese/SimHei.ttf'))
registerFontFamily('Times New Roman', normal='Times New Roman', bold='Times New Roman')
registerFontFamily('Calibri', normal='Calibri', bold='Calibri')

def create_styles():
    """Create paragraph styles for the document."""
    styles = getSampleStyleSheet()
    
    # Title style (for section headers)
    styles.add(ParagraphStyle(
        name='DocTitle',
        fontName='Times New Roman',
        fontSize=26,
        leading=32,
        textColor=TEXT_PRIMARY,
        alignment=TA_LEFT,
        spaceBefore=0,
        spaceAfter=6
    ))
    
    # H1 style
    styles.add(ParagraphStyle(
        name='H1',
        fontName='Times New Roman',
        fontSize=18,
        leading=24,
        textColor=HEADER_FILL,
        alignment=TA_LEFT,
        spaceBefore=18,
        spaceAfter=10
    ))
    
    # H2 style
    styles.add(ParagraphStyle(
        name='H2',
        fontName='Times New Roman',
        fontSize=14,
        leading=20,
        textColor=TEXT_PRIMARY,
        alignment=TA_LEFT,
        spaceBefore=14,
        spaceAfter=8
    ))
    
    # H3 style
    styles.add(ParagraphStyle(
        name='H3',
        fontName='Times New Roman',
        fontSize=12,
        leading=16,
        textColor=TEXT_MUTED,
        alignment=TA_LEFT,
        spaceBefore=10,
        spaceAfter=6
    ))
    
    # Body style
    styles.add(ParagraphStyle(
        name='Body',
        fontName='Times New Roman',
        fontSize=10.5,
        leading=16,
        textColor=TEXT_PRIMARY,
        alignment=TA_JUSTIFY,
        spaceBefore=0,
        spaceAfter=8,
        firstLineIndent=0
    ))
    
    # Bullet style
    styles.add(ParagraphStyle(
        name='DocBullet',
        fontName='Times New Roman',
        fontSize=10.5,
        leading=15,
        textColor=TEXT_PRIMARY,
        alignment=TA_LEFT,
        spaceBefore=2,
        spaceAfter=2,
        leftIndent=20,
        bulletIndent=10
    ))
    
    # Table header style
    styles.add(ParagraphStyle(
        name='TableHeader',
        fontName='Times New Roman',
        fontSize=10,
        leading=14,
        textColor=colors.white,
        alignment=TA_CENTER
    ))
    
    # Table cell style
    styles.add(ParagraphStyle(
        name='TableCell',
        fontName='Times New Roman',
        fontSize=9.5,
        leading=13,
        textColor=TEXT_PRIMARY,
        alignment=TA_LEFT
    ))
    
    # Table cell center
    styles.add(ParagraphStyle(
        name='TableCellCenter',
        fontName='Times New Roman',
        fontSize=9.5,
        leading=13,
        textColor=TEXT_PRIMARY,
        alignment=TA_CENTER
    ))
    
    # Caption style
    styles.add(ParagraphStyle(
        name='Caption',
        fontName='Times New Roman',
        fontSize=9,
        leading=12,
        textColor=TEXT_MUTED,
        alignment=TA_CENTER,
        spaceBefore=4,
        spaceAfter=12
    ))
    
    # Executive Summary style
    styles.add(ParagraphStyle(
        name='Executive',
        fontName='Times New Roman',
        fontSize=11,
        leading=18,
        textColor=TEXT_PRIMARY,
        alignment=TA_JUSTIFY,
        spaceBefore=0,
        spaceAfter=12
    ))
    
    return styles

def create_table(data, col_widths, header_rows=1):
    """Create a styled table with consistent formatting."""
    table = Table(data, colWidths=col_widths, hAlign='CENTER')
    
    style_commands = [
        ('BACKGROUND', (0, 0), (-1, header_rows-1), HEADER_FILL),
        ('TEXTCOLOR', (0, 0), (-1, header_rows-1), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]
    
    # Add alternating row colors for body rows
    for i in range(header_rows, len(data)):
        if i % 2 == 0:
            style_commands.append(('BACKGROUND', (0, i), (-1, i), TABLE_STRIPE))
        else:
            style_commands.append(('BACKGROUND', (0, i), (-1, i), colors.white))
    
    table.setStyle(TableStyle(style_commands))
    return table

def build_document():
    """Build the main document body."""
    styles = create_styles()
    story = []
    
    # ========== EXECUTIVE SUMMARY ==========
    story.append(Paragraph("Executive Summary", styles['H1']))
    story.append(Spacer(1, 6))
    
    exec_text = """Das Unternehmen betreibt eine moderne, hochgradig vernetzte Plattform, in der sicherheitskritische Entscheidungen — wie Zahlungen, Vertragsannahmen, Identitätsänderungen oder Unternehmensaktionen — in Echtzeit getroffen werden müssen. Um diese Entscheidungen zuverlässig, auditierbar und skalierbar zu machen, wurde ein <b>Hybrid Security Layer</b> entwickelt, der Rollen & Berechtigungen (RBAC), Risikobewertung (Risk-Engine), Mitigationsmaßnahmen (Delay, 2FA, GPS), Audit-Logging, Benachrichtigungen & Eskalationen und Support-Overrides in einem einzigen, konsistenten Sicherheitsmodell vereint. Der Security-Layer ist Zero-Trust-fähig, ISO-27001-konform, SOC2-auditierbar und operational robust."""
    story.append(Paragraph(exec_text, styles['Executive']))
    story.append(Spacer(1, 12))
    
    # ========== ARCHITEKTURZIELE ==========
    story.append(Paragraph("2. Architekturziele", styles['H1']))
    
    # 2.1 Sicherheit
    story.append(Paragraph("2.1 Sicherheit", styles['H2']))
    security_goals = [
        "Schutz vor Fraud, Missbrauch und unautorisierten Aktionen",
        "Fail-Safe Verhalten bei Systemfehlern",
        "Minimierung von False Positives und False Negatives"
    ]
    for goal in security_goals:
        story.append(Paragraph(f"• {goal}", styles['DocBullet']))
    story.append(Spacer(1, 8))
    
    # 2.2 Compliance
    story.append(Paragraph("2.2 Compliance", styles['H2']))
    compliance_goals = [
        "Vollständige Auditierbarkeit",
        "Nachvollziehbarkeit jeder sicherheitsrelevanten Entscheidung",
        "Datenhaltung gemäß GDPR, ISO 27001, SOC2"
    ]
    for goal in compliance_goals:
        story.append(Paragraph(f"• {goal}", styles['DocBullet']))
    story.append(Spacer(1, 8))
    
    # 2.3 Skalierbarkeit
    story.append(Paragraph("2.3 Skalierbarkeit", styles['H2']))
    scale_goals = [
        "1000+ Requests pro Sekunde",
        "Horizontale Skalierung aller Komponenten",
        "Resilienz gegen Lastspitzen und Fraud-Wellen"
    ]
    for goal in scale_goals:
        story.append(Paragraph(f"• {goal}", styles['DocBullet']))
    story.append(Spacer(1, 8))
    
    # 2.4 Operationale Stabilität
    story.append(Paragraph("2.4 Operationale Stabilität", styles['H2']))
    ops_goals = [
        "Monitoring & Alerting",
        "Incident-Response-Playbooks",
        "On-Call-Runbooks"
    ]
    for goal in ops_goals:
        story.append(Paragraph(f"• {goal}", styles['DocBullet']))
    story.append(Spacer(1, 12))
    
    # ========== HIGH-LEVEL ARCHITECTURE ==========
    story.append(Paragraph("3. High-Level Architecture Overview", styles['H1']))
    
    arch_intro = """Der Security-Layer besteht aus fünf Kernkomponenten: <b>Security Gateway</b>, <b>Risk Engine</b>, <b>Mitigation Service</b>, <b>Audit Service</b> und <b>Notification Service</b>. Diese Komponenten arbeiten zusammen, um jede sicherheitsrelevante Aktion zu prüfen, zu bewerten und zu dokumentieren. Die folgende Tabelle gibt einen Überblick über die einzelnen Komponenten und ihre Verantwortlichkeiten."""
    story.append(Paragraph(arch_intro, styles['Body']))
    story.append(Spacer(1, 10))
    
    # Architecture Components Table
    arch_data = [
        [Paragraph('<b>Komponente</b>', styles['TableHeader']),
         Paragraph('<b>Verantwortlichkeit</b>', styles['TableHeader']),
         Paragraph('<b>Key Features</b>', styles['TableHeader'])],
        [Paragraph('Security Gateway', styles['TableCell']),
         Paragraph('Single Point of Decision für alle sicherheitsrelevanten Aktionen', styles['TableCell']),
         Paragraph('Stateless, Idempotent, Fail-Safe, Zero-Trust', styles['TableCell'])],
        [Paragraph('Risk Engine', styles['TableCell']),
         Paragraph('Real-Time Risk Scoring für jede Aktion', styles['TableCell']),
         Paragraph('Regelbasiert, Historische Timeline, Override-Mechanismus', styles['TableCell'])],
        [Paragraph('Mitigation Service', styles['TableCell']),
         Paragraph('Adaptive Security Controls (Delay, 2FA, GPS)', styles['TableCell']),
         Paragraph('State Machine, Priorisierung, Monitoring', styles['TableCell'])],
        [Paragraph('Audit Service', styles['TableCell']),
         Paragraph('Immutable Security Ledger', styles['TableCell']),
         Paragraph('Append-only, WORM-Storage, Hash-Chain', styles['TableCell'])],
        [Paragraph('Notification Service', styles['TableCell']),
         Paragraph('Security Alerts & Eskalationen', styles['TableCell']),
         Paragraph('Multi-Channel (Slack, Email, SMS), Templates', styles['TableCell'])]
    ]
    
    arch_table = create_table(arch_data, [CONTENT_WIDTH * 0.25, CONTENT_WIDTH * 0.40, CONTENT_WIDTH * 0.35])
    story.append(arch_table)
    story.append(Spacer(1, 6))
    story.append(Paragraph("Tabelle 1: Security-Layer Kernkomponenten", styles['Caption']))
    story.append(Spacer(1, 12))
    
    # ========== SECURITY GATEWAY ==========
    story.append(Paragraph("4. Security Gateway (Decision Layer)", styles['H1']))
    
    gateway_intro = """Der Security Gateway ist der <b>Single Point of Decision</b> für alle sicherheitsrelevanten Aktionen. Er verhindert, dass Domain-Services eigene Sicherheitslogik implementieren — und garantiert damit Konsistenz, Auditierbarkeit und Compliance. Der Gateway validiert Berechtigungen (RBAC), bewertet Risiko (via Risk-Engine), wendet Mitigationsmaßnahmen an, erstellt Audit-Events, sendet Notifications und erstellt Support-Tickets bei High-Risk."""
    story.append(Paragraph(gateway_intro, styles['Body']))
    story.append(Spacer(1, 8))
    
    story.append(Paragraph("Designprinzipien", styles['H3']))
    design_principles = [
        "<b>Stateless</b>: Keine Session-Abhängigkeit",
        "<b>Idempotent</b>: Mehrfache Requests liefern gleiche Ergebnisse",
        "<b>Fail-Safe</b>: Risk-Engine Down → Block",
        "<b>Zero-Trust</b>: mTLS + Service-JWT"
    ]
    for p in design_principles:
        story.append(Paragraph(f"• {p}", styles['DocBullet']))
    story.append(Spacer(1, 12))
    
    # ========== RISK ENGINE ==========
    story.append(Paragraph("5. Risk Engine (Real-Time Risk Scoring)", styles['H1']))
    
    risk_intro = """Die Risk-Engine bewertet jede Aktion anhand von Transaktionsdaten, Geo-Daten, historischen Mustern, Unternehmens- und Nutzerprofilen, Fraud-Regeln und Machine-Learning-Signalen (optional). Die Bewertung erfolgt in Echtzeit mit einer P95-Latenz von unter 80ms."""
    story.append(Paragraph(risk_intro, styles['Body']))
    story.append(Spacer(1, 8))
    
    story.append(Paragraph("Risk Levels", styles['H3']))
    story.append(Spacer(1, 6))
    
    # Risk Levels Table
    risk_data = [
        [Paragraph('<b>Level</b>', styles['TableHeader']),
         Paragraph('<b>Score</b>', styles['TableHeader']),
         Paragraph('<b>Entscheidung</b>', styles['TableHeader']),
         Paragraph('<b>Beschreibung</b>', styles['TableHeader'])],
        [Paragraph('Green', styles['TableCellCenter']),
         Paragraph('0 - 30', styles['TableCellCenter']),
         Paragraph('Aktion erlaubt', styles['TableCell']),
         Paragraph('Normaler Geschäftsprozess ohne Einschränkungen', styles['TableCell'])],
        [Paragraph('Yellow', styles['TableCellCenter']),
         Paragraph('31 - 60', styles['TableCellCenter']),
         Paragraph('Aktion erlaubt mit Mitigation', styles['TableCell']),
         Paragraph('Zusätzliche Sicherheitsmaßnahmen erforderlich', styles['TableCell'])],
        [Paragraph('Red', styles['TableCellCenter']),
         Paragraph('61 - 100', styles['TableCellCenter']),
         Paragraph('Aktion blockiert', styles['TableCell']),
         Paragraph('Manuelle Prüfung durch Support erforderlich', styles['TableCell'])]
    ]
    
    risk_table = create_table(risk_data, [CONTENT_WIDTH * 0.15, CONTENT_WIDTH * 0.15, CONTENT_WIDTH * 0.30, CONTENT_WIDTH * 0.40])
    story.append(risk_table)
    story.append(Spacer(1, 6))
    story.append(Paragraph("Tabelle 2: Risk Level Definitionen", styles['Caption']))
    story.append(Spacer(1, 8))
    
    story.append(Paragraph("Key Features", styles['H3']))
    risk_features = [
        "Regelbasierte und datengetriebene Bewertung",
        "Historische Risk-Timeline pro Entity",
        "Override-Mechanismus für Support & Compliance",
        "Hash-Chain für Integrität der Score-Historie"
    ]
    for f in risk_features:
        story.append(Paragraph(f"• {f}", styles['DocBullet']))
    story.append(Spacer(1, 12))
    
    # ========== MITIGATION SERVICE ==========
    story.append(Paragraph("6. Mitigation Service (Adaptive Security Controls)", styles['H1']))
    
    mit_intro = """Der Mitigation-Service führt zusätzliche Sicherheitsmaßnahmen aus, um Yellow-Risiken zu entschärfen, ohne legitime Nutzer zu blockieren. Die Maßnahmen umfassen Delay (z.B. Auszahlung verzögern), 2FA (SMS, App, Email), GPS-Check und Extra Logging."""
    story.append(Paragraph(mit_intro, styles['Body']))
    story.append(Spacer(1, 8))
    
    story.append(Paragraph("State Machine", styles['H3']))
    state_text = """Die Mitigation-States folgen einer definierten State Machine: <b>pending → waiting_for_user → completed</b> oder <b>pending → scheduled → executing → completed</b>. Fehlgeschlagene Mitigations gehen in den Zustand <b>failed</b> oder <b>expired</b> über."""
    story.append(Paragraph(state_text, styles['Body']))
    story.append(Spacer(1, 8))
    
    # Mitigation Actions Table
    mit_data = [
        [Paragraph('<b>Mitigation</b>', styles['TableHeader']),
         Paragraph('<b>Beschreibung</b>', styles['TableHeader']),
         Paragraph('<b>Use Case</b>', styles['TableHeader'])],
        [Paragraph('DELAY_24H', styles['TableCell']),
         Paragraph('24h Wartezeit bei Payouts', styles['TableCell']),
         Paragraph('Neue IBAN + hoher Betrag', styles['TableCell'])],
        [Paragraph('TWO_FACTOR_CHALLENGE', styles['TableCell']),
         Paragraph('2FA-Verifizierung erforderlich', styles['TableCell']),
         Paragraph('Login von neuem Gerät', styles['TableCell'])],
        [Paragraph('GPS_VERIFICATION', styles['TableCell']),
         Paragraph('GPS-Verifikation erforderlich', styles['TableCell']),
         Paragraph('Transport-Abweichungen', styles['TableCell'])],
        [Paragraph('EXTRA_LOGGING', styles['TableCell']),
         Paragraph('Erweitertes Logging aktiviert', styles['TableCell']),
         Paragraph('Verdächtige Aktivitätsmuster', styles['TableCell'])],
        [Paragraph('DOCUMENT_RECHECK', styles['TableCell']),
         Paragraph('Dokumente werden erneut geprüft', styles['TableCell']),
         Paragraph('KYC/KYB Auffälligkeiten', styles['TableCell'])]
    ]
    
    mit_table = create_table(mit_data, [CONTENT_WIDTH * 0.28, CONTENT_WIDTH * 0.38, CONTENT_WIDTH * 0.34])
    story.append(mit_table)
    story.append(Spacer(1, 6))
    story.append(Paragraph("Tabelle 3: Mitigation Actions", styles['Caption']))
    story.append(Spacer(1, 12))
    
    # ========== AUDIT SERVICE ==========
    story.append(Paragraph("7. Audit Service (Immutable Security Ledger)", styles['H1']))
    
    audit_intro = """Der Audit-Service ist das zentrale Sicherheitsjournal. Er ist <b>Append-only</b>, verwendet <b>WORM-Storage</b>, bildet eine <b>Hash-Chain</b> pro Entity und ist vollständig unveränderbar und ISO-27001-konform."""
    story.append(Paragraph(audit_intro, styles['Body']))
    story.append(Spacer(1, 8))
    
    story.append(Paragraph("Audit-Events enthalten", styles['H3']))
    audit_fields = [
        "<b>actorId</b>: ID des ausführenden Akteurs",
        "<b>action</b>: Art der Aktion",
        "<b>decision</b>: Entscheidung (allowed, blocked, mitigated)",
        "<b>riskScore</b>: Risikobewertung zum Zeitpunkt der Entscheidung",
        "<b>correlationId</b>: Korrelations-ID für Traceability",
        "<b>timestamp</b>: Zeitstempel",
        "<b>metadata</b>: Zusätzliche Kontextinformationen"
    ]
    for f in audit_fields:
        story.append(Paragraph(f"• {f}", styles['DocBullet']))
    story.append(Spacer(1, 8))
    
    audit_why = """Der Audit-Service ermöglicht Forensik, Compliance, Fraud-Analyse und Support-Nachvollziehbarkeit. Er ist ein kritischer Bestandteil für regulatorische Anforderungen und interne Sicherheitsuntersuchungen."""
    story.append(Paragraph(audit_why, styles['Body']))
    story.append(Spacer(1, 12))
    
    # ========== NOTIFICATION SERVICE ==========
    story.append(Paragraph("8. Notification Service (Security Alerts & Escalations)", styles['H1']))
    
    notif_intro = """Der Notification-Service informiert über sicherheitsrelevante Ereignisse und erreicht Stakeholder über mehrere Kanäle: Slack, Email, SMS und Webhooks. Zu den typischen Benachrichtigungen gehören High-Risk Block, Mitigation Required, Risk Override und System-Degradation."""
    story.append(Paragraph(notif_intro, styles['Body']))
    story.append(Spacer(1, 8))
    
    # Notification Channels Table
    notif_data = [
        [Paragraph('<b>Kanal</b>', styles['TableHeader']),
         Paragraph('<b>Use Case</b>', styles['TableHeader']),
         Paragraph('<b>Empfänger</b>', styles['TableHeader'])],
        [Paragraph('Slack', styles['TableCell']),
         Paragraph('Real-Time Alerts für Teams', styles['TableCell']),
         Paragraph('Security-Team, Support', styles['TableCell'])],
        [Paragraph('Email', styles['TableCell']),
         Paragraph('Formelle Benachrichtigungen', styles['TableCell']),
         Paragraph('Compliance, Management', styles['TableCell'])],
        [Paragraph('SMS', styles['TableCell']),
         Paragraph('Kritische Eskalationen', styles['TableCell']),
         Paragraph('On-Call Engineers', styles['TableCell'])],
        [Paragraph('Webhooks', styles['TableCell']),
         Paragraph('Integration in externe Systeme', styles['TableCell']),
         Paragraph('SIEM, Ticket-Systeme', styles['TableCell'])]
    ]
    
    notif_table = create_table(notif_data, [CONTENT_WIDTH * 0.20, CONTENT_WIDTH * 0.40, CONTENT_WIDTH * 0.40])
    story.append(notif_table)
    story.append(Spacer(1, 6))
    story.append(Paragraph("Tabelle 4: Notification Kanäle", styles['Caption']))
    story.append(Spacer(1, 12))
    
    # ========== SECURITY CONTROLS & POLICIES ==========
    story.append(Paragraph("9. Security Controls & Policies", styles['H1']))
    
    story.append(Paragraph("9.1 RBAC (Role-Based Access Control)", styles['H2']))
    rbac_text = """Das RBAC-System definiert klare Override-Rechte pro Rolle: <b>Support</b> kann Yellow → Green freigeben, <b>Compliance</b> kann alle Level überstimmen, <b>Admins</b> haben KEINE Override-Rechte (Separation of Duties). Diese Trennung verhindert interne Betrugsfälle und stellt sicher, dass kritische Entscheidungen immer von mindestens zwei unabhängigen Parteien validiert werden."""
    story.append(Paragraph(rbac_text, styles['Body']))
    story.append(Spacer(1, 8))
    
    # RBAC Table
    rbac_data = [
        [Paragraph('<b>Rolle</b>', styles['TableHeader']),
         Paragraph('<b>Override-Rechte</b>', styles['TableHeader']),
         Paragraph('<b>Einschränkungen</b>', styles['TableHeader'])],
        [Paragraph('User', styles['TableCell']),
         Paragraph('Keine', styles['TableCell']),
         Paragraph('Kann nur eigene Daten einsehen', styles['TableCell'])],
        [Paragraph('Support', styles['TableCell']),
         Paragraph('Yellow → Green', styles['TableCell']),
         Paragraph('Benötigt Dokumentation', styles['TableCell'])],
        [Paragraph('Compliance', styles['TableCell']),
         Paragraph('Alle Level', styles['TableCell']),
         Paragraph('Vollständige Audit-Pflicht', styles['TableCell'])],
        [Paragraph('Security-Engineer', styles['TableCell']),
         Paragraph('Policy-Änderungen', styles['TableCell']),
         Paragraph('Keine operativen Overrides', styles['TableCell'])],
        [Paragraph('Admin', styles['TableCell']),
         Paragraph('Keine (SoD!)', styles['TableCell']),
         Paragraph('Nur System-Konfiguration', styles['TableCell'])]
    ]
    
    rbac_table = create_table(rbac_data, [CONTENT_WIDTH * 0.22, CONTENT_WIDTH * 0.28, CONTENT_WIDTH * 0.50])
    story.append(rbac_table)
    story.append(Spacer(1, 6))
    story.append(Paragraph("Tabelle 5: RBAC Rollen-Matrix", styles['Caption']))
    story.append(Spacer(1, 8))
    
    story.append(Paragraph("9.2 Secrets Management", styles['H2']))
    secrets = ["Vault-basiert", "Rotation alle 24h", "Keine Secrets im Code"]
    for s in secrets:
        story.append(Paragraph(f"• {s}", styles['DocBullet']))
    story.append(Spacer(1, 6))
    
    story.append(Paragraph("9.3 Encryption", styles['H2']))
    encryption = ["TLS 1.3", "AES-256 at rest", "PFS enforced"]
    for e in encryption:
        story.append(Paragraph(f"• {e}", styles['DocBullet']))
    story.append(Spacer(1, 6))
    
    story.append(Paragraph("9.4 Logging", styles['H2']))
    logging = ["Keine PII in Logs", "Sensitive Daten gehasht"]
    for l in logging:
        story.append(Paragraph(f"• {l}", styles['DocBullet']))
    story.append(Spacer(1, 6))
    
    story.append(Paragraph("9.5 Data Retention", styles['H2']))
    
    # Retention Table
    ret_data = [
        [Paragraph('<b>Datentyp</b>', styles['TableHeader']),
         Paragraph('<b>Retentionszeit</b>', styles['TableHeader'])],
        [Paragraph('Audit-Logs', styles['TableCell']),
         Paragraph('5 Jahre', styles['TableCellCenter'])],
        [Paragraph('Risk-Scores', styles['TableCell']),
         Paragraph('2 Jahre', styles['TableCellCenter'])],
        [Paragraph('Mitigation-Daten', styles['TableCell']),
         Paragraph('1 Jahr', styles['TableCellCenter'])]
    ]
    
    ret_table = create_table(ret_data, [CONTENT_WIDTH * 0.50, CONTENT_WIDTH * 0.50])
    story.append(ret_table)
    story.append(Spacer(1, 6))
    story.append(Paragraph("Tabelle 6: Data Retention Policy", styles['Caption']))
    story.append(Spacer(1, 12))
    
    # ========== RESILIENCE & RELIABILITY ==========
    story.append(Paragraph("10. Resilience & Reliability", styles['H1']))
    
    story.append(Paragraph("10.1 Fail-Safe Design", styles['H2']))
    failsafe_text = """Das System ist für Fail-Safe Verhalten ausgelegt: Bei Risk-Engine Down werden alle Aktionen geblockt, bei Mitigation Down werden Yellow-Aktionen geblockt, bei Notification Down werden Nachrichten in eine Retry Queue gestellt."""
    story.append(Paragraph(failsafe_text, styles['Body']))
    story.append(Spacer(1, 8))
    
    story.append(Paragraph("10.2 Circuit Breakers", styles['H2']))
    cb_text = """Circuit Breaker schützen kritische Komponenten: Der Gateway schützt die Risk-Engine, die Risk-Engine schützt die Datenbank. Bei Überschreitung von Fehlerschwellen werden automatisch Fallback-Strategien aktiviert."""
    story.append(Paragraph(cb_text, styles['Body']))
    story.append(Spacer(1, 8))
    
    story.append(Paragraph("10.3 Autoscaling", styles['H2']))
    autoscaling = ["Gateway horizontal skalierbar", "Mitigation Worker horizontal skalierbar", "Notification Worker horizontal skalierbar"]
    for a in autoscaling:
        story.append(Paragraph(f"• {a}", styles['DocBullet']))
    story.append(Spacer(1, 12))
    
    # ========== MONITORING & OBSERVABILITY ==========
    story.append(Paragraph("11. Monitoring & Observability", styles['H1']))
    
    story.append(Paragraph("KPIs", styles['H3']))
    
    # KPI Table
    kpi_data = [
        [Paragraph('<b>Komponente</b>', styles['TableHeader']),
         Paragraph('<b>KPI</b>', styles['TableHeader']),
         Paragraph('<b>Target</b>', styles['TableHeader'])],
        [Paragraph('Gateway', styles['TableCell']),
         Paragraph('P95 Latency', styles['TableCell']),
         Paragraph('< 120 ms', styles['TableCellCenter'])],
        [Paragraph('Risk-Engine', styles['TableCell']),
         Paragraph('P95 Latency', styles['TableCell']),
         Paragraph('< 80 ms', styles['TableCellCenter'])],
        [Paragraph('Mitigation Queue', styles['TableCell']),
         Paragraph('Queue Lag', styles['TableCell']),
         Paragraph('< 2 Sekunden', styles['TableCellCenter'])],
        [Paragraph('Audit Service', styles['TableCell']),
         Paragraph('Write Latency', styles['TableCell']),
         Paragraph('< 50 ms', styles['TableCellCenter'])]
    ]
    
    kpi_table = create_table(kpi_data, [CONTENT_WIDTH * 0.30, CONTENT_WIDTH * 0.35, CONTENT_WIDTH * 0.35])
    story.append(kpi_table)
    story.append(Spacer(1, 6))
    story.append(Paragraph("Tabelle 7: Performance KPIs", styles['Caption']))
    story.append(Spacer(1, 8))
    
    story.append(Paragraph("Dashboards", styles['H3']))
    dashboards = ["Decision Breakdown (Allowed / Mitigated / Blocked)", "Risk-Level Distribution", "Mitigation State Overview", "Audit Integrity Check", "Notification Delivery Rate"]
    for d in dashboards:
        story.append(Paragraph(f"• {d}", styles['DocBullet']))
    story.append(Spacer(1, 12))
    
    # ========== INCIDENT RESPONSE ==========
    story.append(Paragraph("12. Incident Response", styles['H1']))
    
    incident_intro = """Das Incident Response System deckt fünf Hauptszenarien ab: High-Risk Spike, Risk-Engine Down, Mitigation Queue Overload, Audit-Service Failure und Notification Failure. Für jedes Szenario existieren detaillierte Playbooks mit Detection, Immediate Action, Triage, Mitigation, Recovery und Post-Incident Prozessen."""
    story.append(Paragraph(incident_intro, styles['Body']))
    story.append(Spacer(1, 8))
    
    # Incident Table
    incident_data = [
        [Paragraph('<b>Szenario</b>', styles['TableHeader']),
         Paragraph('<b>Severity</b>', styles['TableHeader']),
         Paragraph('<b>Reaktionszeit</b>', styles['TableHeader']),
         Paragraph('<b>Eskalation</b>', styles['TableHeader'])],
        [Paragraph('High-Risk Spike / Fraud-Welle', styles['TableCell']),
         Paragraph('SEV-1', styles['TableCellCenter']),
         Paragraph('5 Minuten', styles['TableCellCenter']),
         Paragraph('Security + Compliance + Platform', styles['TableCell'])],
        [Paragraph('Risk-Engine Down', styles['TableCell']),
         Paragraph('SEV-1', styles['TableCellCenter']),
         Paragraph('5 Minuten', styles['TableCellCenter']),
         Paragraph('Security + Platform', styles['TableCell'])],
        [Paragraph('Mitigation Queue Overload', styles['TableCell']),
         Paragraph('SEV-2', styles['TableCellCenter']),
         Paragraph('15 Minuten', styles['TableCellCenter']),
         Paragraph('Security + Backend', styles['TableCell'])],
        [Paragraph('Audit-Service Failure', styles['TableCell']),
         Paragraph('SEV-1', styles['TableCellCenter']),
         Paragraph('5 Minuten', styles['TableCellCenter']),
         Paragraph('Security + Compliance', styles['TableCell'])],
        [Paragraph('Notification Failure', styles['TableCell']),
         Paragraph('SEV-2', styles['TableCellCenter']),
         Paragraph('15 Minuten', styles['TableCellCenter']),
         Paragraph('Security + Backend', styles['TableCell'])]
    ]
    
    incident_table = create_table(incident_data, [CONTENT_WIDTH * 0.32, CONTENT_WIDTH * 0.15, CONTENT_WIDTH * 0.18, CONTENT_WIDTH * 0.35])
    story.append(incident_table)
    story.append(Spacer(1, 6))
    story.append(Paragraph("Tabelle 8: Incident Response Matrix", styles['Caption']))
    story.append(Spacer(1, 12))
    
    # ========== COMPLIANCE ALIGNMENT ==========
    story.append(Paragraph("13. Compliance Alignment", styles['H1']))
    
    compliance_intro = """Der Security-Layer erfüllt Anforderungen aus ISO 27001, SOC2 und GDPR. Die folgende Tabelle zeigt die spezifische Abdeckung pro Standard."""
    story.append(Paragraph(compliance_intro, styles['Body']))
    story.append(Spacer(1, 8))
    
    # Compliance Table
    comp_data = [
        [Paragraph('<b>Standard</b>', styles['TableHeader']),
         Paragraph('<b>Abgedeckte Bereiche</b>', styles['TableHeader'])],
        [Paragraph('ISO 27001', styles['TableCell']),
         Paragraph('A.5 Policies, A.8 Asset Management, A.12 Operations Security, A.16 Incident Management', styles['TableCell'])],
        [Paragraph('SOC2', styles['TableCell']),
         Paragraph('Security, Availability, Processing Integrity', styles['TableCell'])],
        [Paragraph('GDPR', styles['TableCell']),
         Paragraph('Data Minimization, Integrity & Confidentiality, Right to Erasure (Retention Policies)', styles['TableCell'])]
    ]
    
    comp_table = create_table(comp_data, [CONTENT_WIDTH * 0.20, CONTENT_WIDTH * 0.80])
    story.append(comp_table)
    story.append(Spacer(1, 6))
    story.append(Paragraph("Tabelle 9: Compliance-Abdeckung", styles['Caption']))
    story.append(Spacer(1, 12))
    
    # ========== STRATEGIC BENEFITS ==========
    story.append(Paragraph("14. Strategic Benefits", styles['H1']))
    
    story.append(Paragraph("Für das Unternehmen", styles['H2']))
    company_benefits = [
        "Reduzierte Fraud-Kosten durch präventive Maßnahmen",
        "Schnellere Sicherheitsentscheidungen durch Automatisierung",
        "Weniger False Positives durch kontextsensitive Bewertung",
        "Höhere Kundenzufriedenheit durch nahtlose Sicherheit",
        "Bessere Compliance-Position für regulatorische Audits"
    ]
    for b in company_benefits:
        story.append(Paragraph(f"• {b}", styles['DocBullet']))
    story.append(Spacer(1, 8))
    
    story.append(Paragraph("Für Engineering", styles['H2']))
    eng_benefits = [
        "Einheitliche Sicherheitslogik in allen Services",
        "Weniger Komplexität in Domain-Services",
        "Bessere Testbarkeit durch isolierte Komponenten",
        "Klare Verantwortlichkeiten und Schnittstellen"
    ]
    for b in eng_benefits:
        story.append(Paragraph(f"• {b}", styles['DocBullet']))
    story.append(Spacer(1, 8))
    
    story.append(Paragraph("Für Compliance & Audit", styles['H2']))
    audit_benefits = [
        "Vollständige Nachvollziehbarkeit aller Entscheidungen",
        "Unveränderbare Audit-Trails für Forensik",
        "Klare Policies & Controls für Audits"
    ]
    for b in audit_benefits:
        story.append(Paragraph(f"• {b}", styles['DocBullet']))
    story.append(Spacer(1, 12))
    
    # ========== CONCLUSION ==========
    story.append(Paragraph("15. Conclusion", styles['H1']))
    
    conclusion = """Der <b>Hybrid Security Layer</b> ist eine moderne, skalierbare und auditierbare Sicherheitsarchitektur, die Fraud verhindert, Compliance stärkt, Engineering entlastet und Operations stabilisiert. Er ist ein <b>strategischer Wettbewerbsvorteil</b>, kein reines Sicherheitsfeature. Durch die Integration von RBAC, Risk-Scoring, Mitigations, Audit-Logging und Notifications in einem konsistenten Modell wird sichergestellt, dass jede sicherheitsrelevante Entscheidung nachvollziehbar, kontrollierbar und conform ist. Die Investition in diese Plattform zahlt sich durch reduzierte Fraud-Verluste, schnellere Time-to-Market für neue Features und verbesserte regulatorische Compliance aus."""
    story.append(Paragraph(conclusion, styles['Body']))
    
    return story

def create_cover_html():
    """Create cover HTML using Template 03 (Monolith) - Authority intent for formal documents."""
    return '''<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Security Architecture Whitepaper</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Playfair+Display:wght@700&display=swap" rel="stylesheet">
    <style>
        :root {
            --primary: #544c37;
            --accent: #5831cc;
            --text: #191817;
            --muted: #828078;
            --bg: #f4f3f2;
        }
        
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        @page {
            size: 794px 1123px;
            margin: 0;
        }
        
        html, body {
            width: 794px;
            height: 1123px;
            background: var(--bg);
            font-family: 'Inter', sans-serif;
            overflow: hidden;
        }
        
        .cover {
            position: relative;
            width: 100%;
            height: 100%;
        }
        
        /* Layer 1 - Background watermark */
        .watermark {
            position: absolute;
            right: 40px;
            top: 50%;
            transform: translateY(-50%) rotate(90deg);
            font-family: 'Playfair Display', serif;
            font-size: 160px;
            font-weight: 700;
            color: var(--primary);
            opacity: 0.04;
            white-space: nowrap;
            transform-origin: center center;
        }
        
        /* Layer 2 - Structure lines */
        .color-dash {
            position: absolute;
            left: 95px;
            top: 168px;
            width: 50px;
            height: 5px;
            background: var(--accent);
        }
        
        .meta-line {
            position: absolute;
            left: 95px;
            top: 760px;
            width: 2px;
            height: 120px;
            background: var(--primary);
            opacity: 0.3;
        }
        
        /* Layer 3 - Content */
        .content {
            position: absolute;
            left: 95px;
            top: 0;
            bottom: 0;
            width: 600px;
        }
        
        .kicker {
            position: absolute;
            top: 190px;
            font-size: 13px;
            font-weight: 400;
            letter-spacing: 3px;
            text-transform: uppercase;
            color: var(--muted);
            opacity: 0.6;
        }
        
        .title {
            position: absolute;
            top: 250px;
            font-family: 'Playfair Display', serif;
            font-size: 48px;
            font-weight: 700;
            line-height: 1.2;
            color: var(--text);
            max-width: 500px;
        }
        
        .title-line {
            display: block;
            margin-bottom: 8px;
        }
        
        .summary {
            position: absolute;
            top: 480px;
            font-size: 15px;
            line-height: 1.7;
            color: var(--text);
            max-width: 480px;
            opacity: 0.85;
        }
        
        .meta {
            position: absolute;
            top: 770px;
            left: 115px;
            font-size: 14px;
            line-height: 2.0;
            color: var(--text);
        }
        
        .meta-item {
            display: block;
        }
        
        .footer {
            position: absolute;
            bottom: 95px;
            right: 95px;
            font-size: 12px;
            letter-spacing: 2px;
            text-transform: uppercase;
            color: var(--muted);
            opacity: 0.6;
        }
    </style>
</head>
<body>
    <div class="cover">
        <!-- Layer 1: Background -->
        <div class="watermark">SECURITY</div>
        
        <!-- Layer 2: Structure -->
        <div class="color-dash"></div>
        <div class="meta-line"></div>
        
        <!-- Layer 3: Content -->
        <div class="content">
            <div class="kicker">Enterprise Security Architecture</div>
            <div class="title">
                <span class="title-line">Hybrid Security Layer</span>
                <span class="title-line">for Risk, Fraud Prevention</span>
                <span class="title-line">& Compliance</span>
            </div>
            <div class="summary">
                This whitepaper presents a comprehensive security architecture that integrates RBAC, risk scoring, mitigations, audit logging, and notifications into a unified, Zero-Trust-capable platform designed for enterprise-scale operations.
            </div>
            <div class="meta">
                <span class="meta-item">CargoBit Platform</span>
                <span class="meta-item">Version 1.0</span>
                <span class="meta-item">April 2026</span>
            </div>
        </div>
        <div class="footer">Confidential</div>
    </div>
</body>
</html>'''

def render_cover(html_path, pdf_path):
    """Render HTML cover to PDF using html2poster.js."""
    scripts_dir = "/home/z/my-project/skills/pdf/scripts"
    subprocess.run([
        'node', os.path.join(scripts_dir, 'html2poster.js'),
        html_path, '--output', pdf_path,
        '--width', '794px'
    ], check=True)

def normalize_page_to_a4(page):
    """Scale a page to A4 if its dimensions don't match."""
    A4_W, A4_H = 595.28, 841.89
    box = page.mediabox
    w, h = float(box.width), float(box.height)
    if abs(w - A4_W) > 2 or abs(h - A4_H) > 2:
        sx, sy = A4_W / w, A4_H / h
        page.add_transformation(Transformation().scale(sx=sx, sy=sy))
        page.mediabox.lower_left = (0, 0)
        page.mediabox.upper_right = (A4_W, A4_H)
    return page

def merge_pdfs(cover_pdf, body_pdf, output_pdf):
    """Merge cover and body PDFs into a single output."""
    A4_W, A4_H = 595.28, 841.89
    writer = PdfWriter()
    
    # Cover as page 1
    cover_page = PdfReader(cover_pdf).pages[0]
    writer.add_page(normalize_page_to_a4(cover_page))
    
    # Body pages follow
    for page in PdfReader(body_pdf).pages:
        writer.add_page(normalize_page_to_a4(page))
    
    writer.add_metadata({
        '/Title': 'Security Architecture Whitepaper',
        '/Author': 'CargoBit Security Team',
        '/Creator': 'Z.ai',
        '/Subject': 'Hybrid Security Layer for Enterprise Risk, Fraud Prevention & Compliance'
    })
    
    with open(output_pdf, 'wb') as f:
        writer.write(f)

def main():
    output_dir = "/home/z/my-project/download"
    
    # Paths
    cover_html = os.path.join(output_dir, "security_whitepaper_cover.html")
    cover_pdf = os.path.join(output_dir, "security_whitepaper_cover.pdf")
    body_pdf = os.path.join(output_dir, "security_whitepaper_body.pdf")
    final_pdf = os.path.join(output_dir, "CargoBit_Security_Architecture_Whitepaper.pdf")
    
    # Step 1: Generate cover HTML
    print("Generating cover HTML...")
    cover_html_content = create_cover_html()
    with open(cover_html, 'w', encoding='utf-8') as f:
        f.write(cover_html_content)
    
    # Step 2: Render cover to PDF
    print("Rendering cover PDF...")
    render_cover(cover_html, cover_pdf)
    
    # Step 3: Generate body PDF
    print("Generating body PDF...")
    doc = SimpleDocTemplate(
        body_pdf,
        pagesize=A4,
        leftMargin=LEFT_MARGIN,
        rightMargin=RIGHT_MARGIN,
        topMargin=TOP_MARGIN,
        bottomMargin=BOTTOM_MARGIN
    )
    story = build_document()
    doc.build(story)
    
    # Step 4: Merge cover and body
    print("Merging PDFs...")
    merge_pdfs(cover_pdf, body_pdf, final_pdf)
    
    # Cleanup intermediate files
    os.remove(cover_pdf)
    os.remove(body_pdf)
    
    print(f"\n✅ Whitepaper generated: {final_pdf}")
    
    # Get file info
    size = os.path.getsize(final_pdf)
    print(f"   Size: {size / 1024:.1f} KB")
    
    # Count pages
    reader = PdfReader(final_pdf)
    print(f"   Pages: {len(reader.pages)}")

if __name__ == "__main__":
    main()
