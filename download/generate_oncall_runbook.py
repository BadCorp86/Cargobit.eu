#!/usr/bin/env python3
"""
CargoBit Security-Gateway: On-Call Operational Runbook
Quick Reference Guide for On-Call Engineers
"""

import os
import sys
import subprocess
from datetime import datetime

# Add PDF skill scripts to path
PDF_SKILL_DIR = "/home/z/my-project/skills/pdf"
sys.path.insert(0, os.path.join(PDF_SKILL_DIR, "scripts"))

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch, mm
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, KeepTogether, ListFlowable, ListItem, Image
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily
from pypdf import PdfReader, PdfWriter, Transformation

# ============================================================================
# PALETTE (from cascade generator - dark mode for operational docs)
# ============================================================================
PAGE_BG       = colors.HexColor('#f7f7f6')
SECTION_BG    = colors.HexColor('#f1f1f0')
CARD_BG       = colors.HexColor('#edece8')
TABLE_STRIPE  = colors.HexColor('#f1f1ef')
HEADER_FILL   = colors.HexColor('#686049')
COVER_BLOCK   = colors.HexColor('#8a7d53')
BORDER        = colors.HexColor('#c5bea8')
ICON          = colors.HexColor('#8c7c4c')
ACCENT        = colors.HexColor('#2c6f86')
ACCENT_SEC    = colors.HexColor('#48c948')
TEXT_PRIMARY  = colors.HexColor('#1e1d1b')
TEXT_MUTED    = colors.HexColor('#87857d')
SUCCESS       = colors.HexColor('#417653')
WARNING       = colors.HexColor('#b08c46')
ERROR         = colors.HexColor('#8d4741')
INFO          = colors.HexColor('#55799d')

# ============================================================================
# FONT SETUP
# ============================================================================
pdfmetrics.registerFont(TTFont('Microsoft YaHei', '/usr/share/fonts/truetype/chinese/msyh.ttf'))
pdfmetrics.registerFont(TTFont('SimHei', '/usr/share/fonts/truetype/chinese/SimHei.ttf'))
pdfmetrics.registerFont(TTFont('Times New Roman', '/usr/share/fonts/truetype/english/Times-New-Roman.ttf'))
pdfmetrics.registerFont(TTFont('DejaVuSans', '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf'))

registerFontFamily('Times New Roman', normal='Times New Roman', bold='Times New Roman')
registerFontFamily('SimHei', normal='SimHei', bold='SimHei')

# ============================================================================
# STYLES
# ============================================================================
def create_styles():
    styles = getSampleStyleSheet()
    
    # Title style
    styles.add(ParagraphStyle(
        name='DocTitle',
        fontName='Times New Roman',
        fontSize=22,
        leading=28,
        textColor=TEXT_PRIMARY,
        alignment=TA_LEFT,
        spaceBefore=0,
        spaceAfter=10,
    ))
    
    # H1 style
    styles.add(ParagraphStyle(
        name='H1',
        fontName='Times New Roman',
        fontSize=16,
        leading=22,
        textColor=ACCENT,
        alignment=TA_LEFT,
        spaceBefore=14,
        spaceAfter=8,
    ))
    
    # H2 style
    styles.add(ParagraphStyle(
        name='H2',
        fontName='Times New Roman',
        fontSize=13,
        leading=18,
        textColor=HEADER_FILL,
        alignment=TA_LEFT,
        spaceBefore=12,
        spaceAfter=6,
    ))
    
    # H3 style
    styles.add(ParagraphStyle(
        name='H3',
        fontName='Times New Roman',
        fontSize=11,
        leading=16,
        textColor=TEXT_PRIMARY,
        alignment=TA_LEFT,
        spaceBefore=8,
        spaceAfter=4,
    ))
    
    # Body style
    styles.add(ParagraphStyle(
        name='Body',
        fontName='Times New Roman',
        fontSize=10,
        leading=15,
        textColor=TEXT_PRIMARY,
        alignment=TA_LEFT,
        spaceBefore=0,
        spaceAfter=6,
    ))
    
    # Bullet style
    styles.add(ParagraphStyle(
        name='BulletItem',
        fontName='Times New Roman',
        fontSize=10,
        leading=15,
        textColor=TEXT_PRIMARY,
        alignment=TA_LEFT,
        leftIndent=18,
        spaceBefore=2,
        spaceAfter=2,
    ))
    
    # Alert box style
    styles.add(ParagraphStyle(
        name='AlertBox',
        fontName='Times New Roman',
        fontSize=10,
        leading=15,
        textColor=TEXT_PRIMARY,
        alignment=TA_LEFT,
        backColor=CARD_BG,
        borderPadding=6,
        spaceBefore=6,
        spaceAfter=6,
    ))
    
    # Table header style
    styles.add(ParagraphStyle(
        name='TableHeader',
        fontName='Times New Roman',
        fontSize=9,
        leading=13,
        textColor=colors.white,
        alignment=TA_CENTER,
    ))
    
    # Table cell style
    styles.add(ParagraphStyle(
        name='TableCell',
        fontName='Times New Roman',
        fontSize=9,
        leading=13,
        textColor=TEXT_PRIMARY,
        alignment=TA_LEFT,
    ))
    
    # Table cell center
    styles.add(ParagraphStyle(
        name='TableCellCenter',
        fontName='Times New Roman',
        fontSize=9,
        leading=13,
        textColor=TEXT_PRIMARY,
        alignment=TA_CENTER,
    ))
    
    # Caption style
    styles.add(ParagraphStyle(
        name='Caption',
        fontName='Times New Roman',
        fontSize=8,
        leading=11,
        textColor=TEXT_MUTED,
        alignment=TA_CENTER,
        spaceBefore=3,
        spaceAfter=10,
    ))
    
    # Code style
    styles.add(ParagraphStyle(
        name='CodeBlock',
        fontName='DejaVuSans',
        fontSize=8.5,
        leading=12,
        textColor=TEXT_PRIMARY,
        backColor=SECTION_BG,
        borderPadding=4,
        spaceBefore=4,
        spaceAfter=4,
    ))
    
    return styles

# ============================================================================
# COVER HTML
# ============================================================================
COVER_HTML = '''<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>On-Call Operational Runbook</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
    <style>
        :root {
            --c-bg: #f7f7f6;
            --c-accent: #2c6f86;
            --c-text: #1e1d1b;
            --c-muted: #87857d;
            --c-block: #686049;
            --c-border: #c5bea8;
            --c-error: #8d4741;
            --c-warning: #b08c46;
            --c-success: #417653;
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        @page {
            size: 794px 1123px;
            margin: 0;
        }
        
        html, body {
            width: 794px;
            height: 1123px;
            margin: 0;
            padding: 0;
            background: var(--c-bg);
            font-family: 'Inter', sans-serif;
            overflow: hidden;
        }
        
        .cover {
            position: relative;
            width: 100%;
            height: 100%;
            padding: 80px 60px;
        }
        
        /* Top decorative line */
        .top-line {
            position: absolute;
            top: 60px;
            left: 60px;
            right: 60px;
            height: 3px;
            background: var(--c-error);
        }
        
        /* Kicker */
        .kicker {
            font-size: 12px;
            font-weight: 500;
            letter-spacing: 2px;
            text-transform: uppercase;
            color: var(--c-muted);
            margin-top: 40px;
        }
        
        /* Main title */
        .title {
            font-size: 40px;
            font-weight: 700;
            color: var(--c-text);
            line-height: 1.2;
            margin-top: 20px;
            max-width: 600px;
        }
        
        .title-line {
            display: block;
        }
        
        /* Subtitle */
        .subtitle {
            font-size: 16px;
            font-weight: 400;
            color: var(--c-accent);
            margin-top: 16px;
            line-height: 1.5;
        }
        
        /* Severity indicators */
        .severity-row {
            position: absolute;
            top: 320px;
            left: 60px;
            right: 60px;
            display: flex;
            gap: 20px;
        }
        
        .severity-box {
            flex: 1;
            padding: 12px 16px;
            background: white;
            border-left: 3px solid var(--c-border);
        }
        
        .severity-box.sev1 { border-left-color: var(--c-error); }
        .severity-box.sev2 { border-left-color: var(--c-warning); }
        .severity-box.sev3 { border-left-color: var(--c-accent); }
        .severity-box.sev4 { border-left-color: var(--c-success); }
        
        .severity-label {
            font-size: 11px;
            font-weight: 600;
            letter-spacing: 1px;
            text-transform: uppercase;
            margin-bottom: 4px;
        }
        
        .severity-box.sev1 .severity-label { color: var(--c-error); }
        .severity-box.sev2 .severity-label { color: var(--c-warning); }
        .severity-box.sev3 .severity-label { color: var(--c-accent); }
        .severity-box.sev4 .severity-label { color: var(--c-success); }
        
        .severity-time {
            font-size: 14px;
            font-weight: 600;
            color: var(--c-text);
        }
        
        /* Summary box */
        .summary-box {
            position: absolute;
            bottom: 220px;
            left: 60px;
            right: 60px;
            padding: 20px 24px;
            background: white;
            border-left: 4px solid var(--c-accent);
        }
        
        .summary-title {
            font-size: 11px;
            font-weight: 600;
            letter-spacing: 1px;
            text-transform: uppercase;
            color: var(--c-accent);
            margin-bottom: 8px;
        }
        
        .summary-text {
            font-size: 13px;
            line-height: 1.6;
            color: var(--c-text);
        }
        
        /* Meta info */
        .meta {
            position: absolute;
            bottom: 80px;
            left: 60px;
            right: 60px;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
        }
        
        .meta-left {
            font-size: 11px;
            color: var(--c-muted);
            line-height: 1.8;
        }
        
        .meta-right {
            font-size: 10px;
            color: var(--c-muted);
            text-align: right;
        }
        
        /* Bottom line */
        .bottom-line {
            position: absolute;
            bottom: 60px;
            left: 60px;
            right: 60px;
            height: 1px;
            background: var(--c-border);
        }
        
        /* Vertical accent */
        .vertical-accent {
            position: absolute;
            left: 60px;
            top: 140px;
            width: 1px;
            height: 80px;
            background: var(--c-border);
        }
    </style>
</head>
<body>
    <div class="cover">
        <div class="top-line"></div>
        <div class="vertical-accent"></div>
        
        <div class="kicker">CargoBit Security Operations</div>
        
        <h1 class="title">
            <span class="title-line">On-Call Operational</span>
            <span class="title-line">Runbook</span>
        </h1>
        
        <p class="subtitle">Quick Reference Guide for Security-Layer Incidents<br/>Gateway, Risk-Engine, Mitigation, Audit, Notification</p>
        
        <div class="severity-row">
            <div class="severity-box sev1">
                <div class="severity-label">SEV-1 Critical</div>
                <div class="severity-time">5 min response</div>
            </div>
            <div class="severity-box sev2">
                <div class="severity-label">SEV-2 High</div>
                <div class="severity-time">15 min response</div>
            </div>
            <div class="severity-box sev3">
                <div class="severity-label">SEV-3 Medium</div>
                <div class="severity-time">60 min response</div>
            </div>
            <div class="severity-box sev4">
                <div class="severity-label">SEV-4 Low</div>
                <div class="severity-time">24 h response</div>
            </div>
        </div>
        
        <div class="summary-box">
            <div class="summary-title">Purpose</div>
            <div class="summary-text">
                This runbook provides immediate, actionable guidance for on-call engineers handling security-layer incidents. 
                Keep this document accessible at all times during on-call shifts. Follow the standard checklist for every incident, 
                then apply specific procedures based on incident type.
            </div>
        </div>
        
        <div class="meta">
            <div class="meta-left">
                <strong>Classification:</strong> Internal - Operations<br/>
                <strong>Review Cycle:</strong> Monthly
            </div>
            <div class="meta-right">
                Version 1.0<br/>
                April 2026
            </div>
        </div>
        
        <div class="bottom-line"></div>
    </div>
</body>
</html>
'''

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================
def create_table(data, col_widths, styles):
    """Create a styled table with header and alternating rows."""
    table = Table(data, colWidths=col_widths, hAlign='CENTER')
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), HEADER_FILL),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Times New Roman'),
        ('FONTSIZE', (0, 0), (-1, 0), 9),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 6),
        ('TOPPADDING', (0, 0), (-1, 0), 6),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 1), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 5),
    ]))
    
    # Alternating row colors
    for i in range(1, len(data)):
        if i % 2 == 0:
            table.setStyle(TableStyle([('BACKGROUND', (0, i), (-1, i), TABLE_STRIPE)]))
    
    return table

# ============================================================================
# DOCUMENT CONTENT
# ============================================================================
def build_document():
    styles = create_styles()
    story = []
    
    # Page margins
    left_margin = 0.9 * inch
    right_margin = 0.9 * inch
    available_width = A4[0] - left_margin - right_margin
    
    # ========================================================================
    # SECTION 1: GRUNDPRINZIPIEN
    # ========================================================================
    story.append(Paragraph('<b>1. Grundprinzipien für On-Call</b>', styles['DocTitle']))
    story.append(Spacer(1, 10))
    
    story.append(Paragraph('<b>1.1 Ziele</b>', styles['H2']))
    
    objectives = [
        'Sicherheitsvorfälle schnell erkennen',
        'Schaden minimieren',
        'Fraud verhindern',
        'System stabil halten',
        'Compliance sicherstellen',
    ]
    
    for obj in objectives:
        story.append(Paragraph(f'<bullet>&bull;</bullet> {obj}', styles['BulletItem']))
    
    story.append(Spacer(1, 8))
    story.append(Paragraph('<b>1.2 On-Call Verantwortlichkeiten</b>', styles['H2']))
    
    responsibilities = [
        'Alerts entgegennehmen und bestätigen',
        'Diagnose sofort starten',
        'Sofortmaßnahmen einleiten',
        'Eskalieren wenn nötig',
        'Incident dokumentieren',
        'Post-Incident-Daten sammeln',
    ]
    
    for resp in responsibilities:
        story.append(Paragraph(f'<bullet>&bull;</bullet> {resp}', styles['BulletItem']))
    
    story.append(Spacer(1, 8))
    story.append(Paragraph('<b>1.3 Tools - Immer griffbereit</b>', styles['H2']))
    
    tools_data = [
        [Paragraph('<b>Tool</b>', styles['TableHeader']), 
         Paragraph('<b>Zugang</b>', styles['TableHeader']), 
         Paragraph('<b>Zweck</b>', styles['TableHeader'])],
        [Paragraph('Grafana Dashboard', styles['TableCell']), 
         Paragraph('grafana.cargobit.internal', styles['TableCell']),
         Paragraph('Metrics, Risk-Level Distribution', styles['TableCell'])],
        [Paragraph('Alertmanager', styles['TableCell']), 
         Paragraph('alertmanager.cargobit.internal', styles['TableCell']),
         Paragraph('Active alerts, Silences', styles['TableCell'])],
        [Paragraph('Logs (Kibana/Loki)', styles['TableCell']), 
         Paragraph('logs.cargobit.internal', styles['TableCell']),
         Paragraph('Gateway, Risk, Mitigation logs', styles['TableCell'])],
        [Paragraph('Deployment Dashboard', styles['TableCell']), 
         Paragraph('deploy.cargobit.internal', styles['TableCell']),
         Paragraph('Recent deployments, Rollback', styles['TableCell'])],
        [Paragraph('Runbooks', styles['TableCell']), 
         Paragraph('runbooks.cargobit.internal', styles['TableCell']),
         Paragraph('Dieses Dokument + Details', styles['TableCell'])],
    ]
    
    tools_table = create_table(tools_data, [available_width * 0.30, available_width * 0.35, available_width * 0.35], styles)
    story.append(tools_table)
    story.append(Spacer(1, 3))
    story.append(Paragraph('Tabelle 1: On-Call Tools', styles['Caption']))
    
    story.append(PageBreak())
    
    # ========================================================================
    # SECTION 2: STANDARD-CHECKLISTE
    # ========================================================================
    story.append(Paragraph('<b>2. Standard-Checkliste (für jeden Incident)</b>', styles['DocTitle']))
    story.append(Spacer(1, 10))
    
    story.append(Paragraph(
        'Diese Checkliste wird IMMER abgearbeitet, egal welcher Incident auftritt.',
        styles['Body']
    ))
    
    story.append(Spacer(1, 8))
    story.append(Paragraph('<b>2.1 Sofort (0-2 Minuten)</b>', styles['H2']))
    
    immediate_data = [
        [Paragraph('<b>Schritt</b>', styles['TableHeader']), 
         Paragraph('<b>Aktion</b>', styles['TableHeader']), 
         Paragraph('<b>Check</b>', styles['TableHeader'])],
        [Paragraph('1', styles['TableCellCenter']), 
         Paragraph('Alert bestätigen', styles['TableCell']),
         Paragraph('Alertmanager → Acknowledge', styles['TableCell'])],
        [Paragraph('2', styles['TableCellCenter']), 
         Paragraph('Severity prüfen', styles['TableCell']),
         Paragraph('SEV-1 bis SEV-4', styles['TableCell'])],
        [Paragraph('3', styles['TableCellCenter']), 
         Paragraph('Betroffene Services identifizieren', styles['TableCell']),
         Paragraph('Gateway, Risk, Mitigation, Audit, Notification', styles['TableCell'])],
        [Paragraph('4', styles['TableCellCenter']), 
         Paragraph('Traffic-Level prüfen (RPS)', styles['TableCell']),
         Paragraph('Baseline vergleichen', styles['TableCell'])],
    ]
    
    immediate_table = create_table(immediate_data, [available_width * 0.12, available_width * 0.40, available_width * 0.48], styles)
    story.append(immediate_table)
    story.append(Spacer(1, 3))
    story.append(Paragraph('Tabelle 2: Sofort-Checkliste', styles['Caption']))
    
    story.append(Spacer(1, 8))
    story.append(Paragraph('<b>2.2 Diagnose (2-10 Minuten)</b>', styles['H2']))
    
    diagnosis_data = [
        [Paragraph('<b>Prüfung</b>', styles['TableHeader']), 
         Paragraph('<b>Tool</b>', styles['TableHeader']), 
         Paragraph('<b>Suche nach</b>', styles['TableHeader'])],
        [Paragraph('Logs', styles['TableCell']), 
         Paragraph('Kibana / Loki', styles['TableCell']),
         Paragraph('ERROR, WARN, Exception', styles['TableCell'])],
        [Paragraph('Latenzen', styles['TableCell']), 
         Paragraph('Grafana', styles['TableCell']),
         Paragraph('p99 > Baseline', styles['TableCell'])],
        [Paragraph('Error-Rates', styles['TableCell']), 
         Paragraph('Grafana', styles['TableCell']),
         Paragraph('> 0.1% = Warnung, > 1% = Kritisch', styles['TableCell'])],
        [Paragraph('Queue-Lag', styles['TableCell']), 
         Paragraph('Grafana', styles['TableCell']),
         Paragraph('> 2s = Warnung, > 5s = Kritisch', styles['TableCell'])],
        [Paragraph('Letzte Deployments', styles['TableCell']), 
         Paragraph('Deploy Dashboard', styles['TableCell']),
         Paragraph('Änderungen in letzten 2h', styles['TableCell'])],
    ]
    
    diagnosis_table = create_table(diagnosis_data, [available_width * 0.25, available_width * 0.30, available_width * 0.45], styles)
    story.append(diagnosis_table)
    story.append(Spacer(1, 3))
    story.append(Paragraph('Tabelle 3: Diagnose-Checkliste', styles['Caption']))
    
    story.append(Spacer(1, 8))
    story.append(Paragraph('<b>2.3 Entscheidung (10-15 Minuten)</b>', styles['H2']))
    
    decision_data = [
        [Paragraph('<b>Frage</b>', styles['TableHeader']), 
         Paragraph('<b>Ja →</b>', styles['TableHeader']), 
         Paragraph('<b>Nein →</b>', styles['TableHeader'])],
        [Paragraph('Echter Incident?', styles['TableCell']), 
         Paragraph('Weiter mit Maßnahmen', styles['TableCell']),
         Paragraph('Alert schließen, False Positive loggen', styles['TableCell'])],
        [Paragraph('SEV-1 oder SEV-2?', styles['TableCell']), 
         Paragraph('Sofort eskalieren', styles['TableCell']),
         Paragraph('Normale Bearbeitung', styles['TableCell'])],
        [Paragraph('Known Issue?', styles['TableCell']), 
         Paragraph('Known-Issue-Playbook anwenden', styles['TableCell']),
         Paragraph('Neue Diagnose starten', styles['TableCell'])],
    ]
    
    decision_table = create_table(decision_data, [available_width * 0.30, available_width * 0.35, available_width * 0.35], styles)
    story.append(decision_table)
    story.append(Spacer(1, 3))
    story.append(Paragraph('Tabelle 4: Entscheidungs-Matrix', styles['Caption']))
    
    story.append(Spacer(1, 8))
    story.append(Paragraph('<b>2.4 Maßnahmen (15-60 Minuten)</b>', styles['H2']))
    story.append(Paragraph('→ Siehe Incident-Typ-spezifische Abschnitte (3-7)', styles['Body']))
    
    story.append(Spacer(1, 8))
    story.append(Paragraph('<b>2.5 Recovery</b>', styles['H2']))
    
    recovery_steps = [
        'System stabilisieren (Metrics normalisieren)',
        'Alerts normalisieren (keine neuen Alerts)',
        'Audit-Trail prüfen (alle Events geschrieben)',
        'Queue-Lag < 2 Sekunden',
    ]
    
    for step in recovery_steps:
        story.append(Paragraph(f'<bullet>&bull;</bullet> {step}', styles['BulletItem']))
    
    story.append(Spacer(1, 8))
    story.append(Paragraph('<b>2.6 Dokumentation</b>', styles['H2']))
    
    doc_steps = [
        'Incident-Report ausfüllen (Template in Confluence)',
        'Timeline erstellen (von Alert bis Recovery)',
        'Logs sichern (für Post-Mortem)',
    ]
    
    for step in doc_steps:
        story.append(Paragraph(f'<bullet>&bull;</bullet> {step}', styles['BulletItem']))
    
    story.append(PageBreak())
    
    # ========================================================================
    # SECTION 3: INCIDENT-TYP A
    # ========================================================================
    story.append(Paragraph('<b>3. Incident-Typ A: High-Risk Spike / Fraud-Welle</b>', styles['DocTitle']))
    story.append(Spacer(1, 10))
    
    story.append(Paragraph('<b>Severity: SEV-1 (Critical)</b>', styles['H3']))
    
    story.append(Spacer(1, 6))
    story.append(Paragraph('<b>3.1 Symptome</b>', styles['H2']))
    
    symptoms_a = [
        'Viele RED-Decisions in kurzer Zeit',
        'Block-Rate steigt signifikant',
        'Notification-Service sendet viele High-Risk Alerts',
        'Support meldet ungewöhnlich viele Tickets',
    ]
    
    for s in symptoms_a:
        story.append(Paragraph(f'<bullet>&bull;</bullet> {s}', styles['BulletItem']))
    
    story.append(Spacer(1, 6))
    story.append(Paragraph('<b>3.2 Diagnose</b>', styles['H2']))
    
    diag_a_data = [
        [Paragraph('<b>Check</b>', styles['TableHeader']), 
         Paragraph('<b>Grafana Panel</b>', styles['TableHeader']), 
         Paragraph('<b>Suche nach</b>', styles['TableHeader'])],
        [Paragraph('Risk-Level Distribution', styles['TableCell']), 
         Paragraph('Risk Dashboard → Level', styles['TableCell']),
         Paragraph('RED > 20% of total', styles['TableCell'])],
        [Paragraph('Triggered Rules', styles['TableCell']), 
         Paragraph('Risk Dashboard → Rules', styles['TableCell']),
         Paragraph('Top 10 Rules identifizieren', styles['TableCell'])],
        [Paragraph('Geo-Anomalien', styles['TableCell']), 
         Paragraph('Risk Dashboard → Geo', styles['TableCell']),
         Paragraph('Regionale Häufung', styles['TableCell'])],
        [Paragraph('User/Company Cluster', styles['TableCell']), 
         Paragraph('Risk Dashboard → Entities', styles['TableCell']),
         Paragraph('Gleiche Company, IP-Range', styles['TableCell'])],
    ]
    
    diag_a_table = create_table(diag_a_data, [available_width * 0.30, available_width * 0.35, available_width * 0.35], styles)
    story.append(diag_a_table)
    
    story.append(Spacer(1, 6))
    story.append(Paragraph('<b>3.3 Sofortmaßnahmen</b>', styles['H2']))
    
    action_a_data = [
        [Paragraph('<b>Maßnahme</b>', styles['TableHeader']), 
         Paragraph('<b>Kommando/Aktion</b>', styles['TableHeader']), 
         Paragraph('<b>Wann</b>', styles['TableHeader'])],
        [Paragraph('Strict Mode aktivieren', styles['TableCell']), 
         Paragraph('Gateway Config: strict_mode=true', styles['TableCell']),
         Paragraph('Bei bestätigter Fraud-Welle', styles['TableCell'])],
        [Paragraph('Regel deaktivieren', styles['TableCell']), 
         Paragraph('API: PUT /risk/rules/{id} → active=false', styles['TableCell']),
         Paragraph('Bei feuernder Regel', styles['TableCell'])],
        [Paragraph('Geo-Blockade', styles['TableCell']), 
         Paragraph('Gateway Config: geo_block=["XX"]', styles['TableCell']),
         Paragraph('Bei regionalem Spike', styles['TableCell'])],
        [Paragraph('Benachrichtigung', styles['TableCell']), 
         Paragraph('Slack: #incident-security', styles['TableCell']),
         Paragraph('Sofort bei SEV-1', styles['TableCell'])],
    ]
    
    action_a_table = create_table(action_a_data, [available_width * 0.28, available_width * 0.42, available_width * 0.30], styles)
    story.append(action_a_table)
    
    story.append(Spacer(1, 6))
    story.append(Paragraph('<b>3.4 Eskalation</b>', styles['H2']))
    story.append(Paragraph('<bullet>&bull;</bullet> <b>Security-Engineer:</b> security-oncall@cargobit.eu', styles['BulletItem']))
    story.append(Paragraph('<bullet>&bull;</bullet> <b>Compliance:</b> compliance@cargobit.eu', styles['BulletItem']))
    
    story.append(Spacer(1, 6))
    story.append(Paragraph('<b>3.5 Recovery</b>', styles['H2']))
    story.append(Paragraph('<bullet>&bull;</bullet> Strict Mode deaktivieren', styles['BulletItem']))
    story.append(Paragraph('<bullet>&bull;</bullet> Risk-Rules neu trainieren/anpassen', styles['BulletItem']))
    story.append(Paragraph('<bullet>&bull;</bullet> Fraud-Pattern in Regelwerk aufnehmen', styles['BulletItem']))
    
    story.append(PageBreak())
    
    # ========================================================================
    # SECTION 4: INCIDENT-TYP B
    # ========================================================================
    story.append(Paragraph('<b>4. Incident-Typ B: Risk-Engine Down / Degraded</b>', styles['DocTitle']))
    story.append(Spacer(1, 10))
    
    story.append(Paragraph('<b>Severity: SEV-1 (Critical)</b>', styles['H3']))
    
    story.append(Spacer(1, 6))
    story.append(Paragraph('<b>4.1 Symptome</b>', styles['H2']))
    
    symptoms_b = [
        'Gateway Latenz steigt signifikant',
        'Viele RISK_ENGINE_UNAVAILABLE Errors in Logs',
        'Circuit-Breaker Status: OPEN',
        'Risk-Engine Healthcheck: ROT',
    ]
    
    for s in symptoms_b:
        story.append(Paragraph(f'<bullet>&bull;</bullet> {s}', styles['BulletItem']))
    
    story.append(Spacer(1, 6))
    story.append(Paragraph('<b>4.2 Diagnose</b>', styles['H2']))
    
    diag_b_data = [
        [Paragraph('<b>Check</b>', styles['TableHeader']), 
         Paragraph('<b>Tool/Kommando</b>', styles['TableHeader']), 
         Paragraph('<b>Suche nach</b>', styles['TableHeader'])],
        [Paragraph('Health Check', styles['TableCell']), 
         Paragraph('curl localhost:3003/risk/health', styles['TableCell']),
         Paragraph('Status != 200', styles['TableCell'])],
        [Paragraph('Logs', styles['TableCell']), 
         Paragraph('Kibana: service=risk-engine', styles['TableCell']),
         Paragraph('Error, Exception, OOM', styles['TableCell'])],
        [Paragraph('DB-Latenz', styles['TableCell']), 
         Paragraph('Grafana: DB Dashboard', styles['TableCell']),
         Paragraph('p99 > 100ms', styles['TableCell'])],
        [Paragraph('CPU/Memory', styles['TableCell']), 
         Paragraph('Kubernetes: kubectl top pods', styles['TableCell']),
         Paragraph('CPU > 80%, Mem > 90%', styles['TableCell'])],
        [Paragraph('Recent Deployments', styles['TableCell']), 
         Paragraph('Deploy Dashboard', styles['TableCell']),
         Paragraph('Änderungen in letzten 2h', styles['TableCell'])],
    ]
    
    diag_b_table = create_table(diag_b_data, [available_width * 0.25, available_width * 0.40, available_width * 0.35], styles)
    story.append(diag_b_table)
    
    story.append(Spacer(1, 6))
    story.append(Paragraph('<b>4.3 Sofortmaßnahmen</b>', styles['H2']))
    
    action_b_data = [
        [Paragraph('<b>Option</b>', styles['TableHeader']), 
         Paragraph('<b>Kommando/Aktion</b>', styles['TableHeader']), 
         Paragraph('<b>Wann</b>', styles['TableHeader'])],
        [Paragraph('Restart', styles['TableCell']), 
         Paragraph('kubectl rollout restart deployment/risk-engine', styles['TableCell']),
         Paragraph('Bei Service hängend', styles['TableCell'])],
        [Paragraph('Rollback', styles['TableCell']), 
         Paragraph('kubectl rollout undo deployment/risk-engine', styles['TableCell']),
         Paragraph('Nach neuem Deployment', styles['TableCell'])],
        [Paragraph('Fail-Safe aktivieren', styles['TableCell']), 
         Paragraph('Gateway Config: fail_safe=block', styles['TableCell']),
         Paragraph('Bei langem Ausfall', styles['TableCell'])],
    ]
    
    action_b_table = create_table(action_b_data, [available_width * 0.22, available_width * 0.48, available_width * 0.30], styles)
    story.append(action_b_table)
    
    story.append(Spacer(1, 6))
    story.append(Paragraph('<b>4.4 Eskalation</b>', styles['H2']))
    story.append(Paragraph('<bullet>&bull;</bullet> <b>Backend-Team Risk-Engine:</b> backend-risk@cargobit.eu', styles['BulletItem']))
    story.append(Paragraph('<bullet>&bull;</bullet> <b>Platform-Team:</b> platform-oncall@cargobit.eu', styles['BulletItem']))
    
    story.append(Spacer(1, 6))
    story.append(Paragraph('<b>4.5 Recovery</b>', styles['H2']))
    story.append(Paragraph('<bullet>&bull;</bullet> Circuit-Breaker schließen (Status: CLOSED)', styles['BulletItem']))
    story.append(Paragraph('<bullet>&bull;</bullet> Latenzen normalisieren (p99 < 100ms)', styles['BulletItem']))
    story.append(Paragraph('<bullet>&bull;</bullet> Audit-Trail prüfen (alle Events geschrieben)', styles['BulletItem']))
    
    story.append(PageBreak())
    
    # ========================================================================
    # SECTION 5: INCIDENT-TYP C
    # ========================================================================
    story.append(Paragraph('<b>5. Incident-Typ C: Mitigation-Queue Overload</b>', styles['DocTitle']))
    story.append(Spacer(1, 10))
    
    story.append(Paragraph('<b>Severity: SEV-2 (High)</b>', styles['H3']))
    
    story.append(Spacer(1, 6))
    story.append(Paragraph('<b>5.1 Symptome</b>', styles['H2']))
    
    symptoms_c = [
        'Queue-Lag > 5 Sekunden',
        'Verzögerte 2FA-Verifikationen',
        'Verzögerte Delay-Mitigations',
        'Worker CPU hoch (> 80%)',
    ]
    
    for s in symptoms_c:
        story.append(Paragraph(f'<bullet>&bull;</bullet> {s}', styles['BulletItem']))
    
    story.append(Spacer(1, 6))
    story.append(Paragraph('<b>5.2 Diagnose</b>', styles['H2']))
    
    diag_c_data = [
        [Paragraph('<b>Check</b>', styles['TableHeader']), 
         Paragraph('<b>Grafana Panel</b>', styles['TableHeader']), 
         Paragraph('<b>Threshold</b>', styles['TableHeader'])],
        [Paragraph('Queue-Lag', styles['TableCell']), 
         Paragraph('Mitigation Dashboard → Lag', styles['TableCell']),
         Paragraph('> 5s = Kritisch', styles['TableCell'])],
        [Paragraph('Worker Count', styles['TableCell']), 
         Paragraph('Mitigation Dashboard → Workers', styles['TableCell']),
         Paragraph('Vergleich mit Queue-Tiefe', styles['TableCell'])],
        [Paragraph('Dead-Letter Queue', styles['TableCell']), 
         Paragraph('Mitigation Dashboard → DLQ', styles['TableCell']),
         Paragraph('> 100 = Cleanup nötig', styles['TableCell'])],
        [Paragraph('Mitigation Types', styles['TableCell']), 
         Paragraph('Mitigation Dashboard → Types', styles['TableCell']),
         Paragraph('Anteil Delay/2FA/GPS', styles['TableCell'])],
    ]
    
    diag_c_table = create_table(diag_c_data, [available_width * 0.30, available_width * 0.40, available_width * 0.30], styles)
    story.append(diag_c_table)
    
    story.append(Spacer(1, 6))
    story.append(Paragraph('<b>5.3 Sofortmaßnahmen</b>', styles['H2']))
    
    action_c_data = [
        [Paragraph('<b>Maßnahme</b>', styles['TableHeader']), 
         Paragraph('<b>Kommando/Aktion</b>', styles['TableHeader']), 
         Paragraph('<b>Priorität</b>', styles['TableHeader'])],
        [Paragraph('Worker skalieren', styles['TableCell']), 
         Paragraph('kubectl scale deployment mitigation-worker --replicas=10', styles['TableCell']),
         Paragraph('1 (Sofort)', styles['TableCell'])],
        [Paragraph('Priorisierung', styles['TableCell']), 
         Paragraph('Queue Config: priority=2FA>GPS>Delay', styles['TableCell']),
         Paragraph('2 (Wenn Lag > 10s)', styles['TableCell'])],
        [Paragraph('Delay deaktivieren', styles['TableCell']), 
         Paragraph('Mitigation Config: delay_enabled=false', styles['TableCell']),
         Paragraph('3 (Nur bei Extremsituation)', styles['TableCell'])],
        [Paragraph('DLQ cleanup', styles['TableCell']), 
         Paragraph('Admin Tool: dlq-flush', styles['TableCell']),
         Paragraph('4 (Nach Stabilisierung)', styles['TableCell'])],
    ]
    
    action_c_table = create_table(action_c_data, [available_width * 0.25, available_width * 0.45, available_width * 0.30], styles)
    story.append(action_c_table)
    
    story.append(Spacer(1, 6))
    story.append(Paragraph('<b>5.4 Eskalation</b>', styles['H2']))
    story.append(Paragraph('<bullet>&bull;</bullet> <b>Mitigation-Service Team:</b> mitigation-team@cargobit.eu', styles['BulletItem']))
    story.append(Paragraph('<bullet>&bull;</bullet> <b>Platform-Team:</b> platform-oncall@cargobit.eu', styles['BulletItem']))
    
    story.append(Spacer(1, 6))
    story.append(Paragraph('<b>5.5 Recovery</b>', styles['H2']))
    story.append(Paragraph('<bullet>&bull;</bullet> Queue-Lag < 2 Sekunden', styles['BulletItem']))
    story.append(Paragraph('<bullet>&bull;</bullet> Worker stabil (CPU < 70%)', styles['BulletItem']))
    story.append(Paragraph('<bullet>&bull;</bullet> Delay-Mitigations wieder aktiviert', styles['BulletItem']))
    
    story.append(PageBreak())
    
    # ========================================================================
    # SECTION 6: INCIDENT-TYP D
    # ========================================================================
    story.append(Paragraph('<b>6. Incident-Typ D: Audit-Service Probleme</b>', styles['DocTitle']))
    story.append(Spacer(1, 10))
    
    story.append(Paragraph('<b>Severity: SEV-1 (Critical) - Compliance-relevant!</b>', styles['H3']))
    
    story.append(Spacer(1, 6))
    story.append(Paragraph('<b>6.1 Symptome</b>', styles['H2']))
    
    symptoms_d = [
        'Audit-Write-Errors in Logs',
        'Audit-DB Latenz hoch',
        'Missing Audit Events Alerts',
        'Hash-Chain Validation Errors',
    ]
    
    for s in symptoms_d:
        story.append(Paragraph(f'<bullet>&bull;</bullet> {s}', styles['BulletItem']))
    
    story.append(Spacer(1, 6))
    story.append(Paragraph('<b>6.2 Diagnose</b>', styles['H2']))
    
    diag_d_data = [
        [Paragraph('<b>Check</b>', styles['TableHeader']), 
         Paragraph('<b>Tool</b>', styles['TableHeader']), 
         Paragraph('<b>Suche nach</b>', styles['TableHeader'])],
        [Paragraph('DB-Latenz', styles['TableCell']), 
         Paragraph('Grafana: Audit DB Dashboard', styles['TableCell']),
         Paragraph('p99 > 50ms', styles['TableCell'])],
        [Paragraph('Storage', styles['TableCell']), 
         Paragraph('DB Admin: storage check', styles['TableCell']),
         Paragraph('> 80% full', styles['TableCell'])],
        [Paragraph('Write-Errors', styles['TableCell']), 
         Paragraph('Kibana: audit_write_error', styles['TableCell']),
         Paragraph('> 0 = Kritisch', styles['TableCell'])],
    ]
    
    diag_d_table = create_table(diag_d_data, [available_width * 0.30, available_width * 0.35, available_width * 0.35], styles)
    story.append(diag_d_table)
    
    story.append(Spacer(1, 6))
    story.append(Paragraph('<b>6.3 Sofortmaßnahmen</b>', styles['H2']))
    
    action_d_data = [
        [Paragraph('<b>Maßnahme</b>', styles['TableHeader']), 
         Paragraph('<b>Kommando/Aktion</b>', styles['TableHeader']), 
         Paragraph('<b>Hinweis</b>', styles['TableHeader'])],
        [Paragraph('Restart', styles['TableCell']), 
         Paragraph('kubectl rollout restart deployment/audit-service', styles['TableCell']),
         Paragraph('Bei Service hängend', styles['TableCell'])],
        [Paragraph('DB-Failover', styles['TableCell']), 
         Paragraph('DB Admin Console: Failover', styles['TableCell']),
         Paragraph('Nur wenn Primary down', styles['TableCell'])],
        [Paragraph('Write-Queue flush', styles['TableCell']), 
         Paragraph('Admin Tool: audit-queue-flush', styles['TableCell']),
         Paragraph('Gepufferte Events schreiben', styles['TableCell'])],
    ]
    
    action_d_table = create_table(action_d_data, [available_width * 0.25, available_width * 0.45, available_width * 0.30], styles)
    story.append(action_d_table)
    
    story.append(Spacer(1, 6))
    story.append(Paragraph('<b>6.4 Eskalation</b>', styles['H2']))
    story.append(Paragraph('<bullet>&bull;</bullet> <b>Security-Engineer:</b> security-oncall@cargobit.eu (Compliance-relevant!)', styles['BulletItem']))
    story.append(Paragraph('<bullet>&bull;</bullet> <b>DB-Team:</b> db-team@cargobit.eu', styles['BulletItem']))
    
    story.append(Spacer(1, 6))
    story.append(Paragraph('<b>6.5 Recovery</b>', styles['H2']))
    story.append(Paragraph('<bullet>&bull;</bullet> Audit-Trail Validierung (alle Events vorhanden)', styles['BulletItem']))
    story.append(Paragraph('<bullet>&bull;</bullet> Hash-Chain prüfen (Integrität bestätigt)', styles['BulletItem']))
    story.append(Paragraph('<bullet>&bull;</bullet> Compliance benachrichtigen', styles['BulletItem']))
    
    story.append(Spacer(1, 12))
    
    # ========================================================================
    # SECTION 7: INCIDENT-TYP E
    # ========================================================================
    story.append(Paragraph('<b>7. Incident-Typ E: Notification-Service Failure</b>', styles['DocTitle']))
    story.append(Spacer(1, 10))
    
    story.append(Paragraph('<b>Severity: SEV-2 (High)</b>', styles['H3']))
    
    story.append(Spacer(1, 6))
    story.append(Paragraph('<b>7.1 Symptome</b>', styles['H2']))
    
    symptoms_e = [
        'Slack Alerts kommen nicht an',
        'Email Delivery Failures',
        'Notification Queue wächst',
    ]
    
    for s in symptoms_e:
        story.append(Paragraph(f'<bullet>&bull;</bullet> {s}', styles['BulletItem']))
    
    story.append(Spacer(1, 6))
    story.append(Paragraph('<b>7.2 Diagnose</b>', styles['H2']))
    
    diag_e_data = [
        [Paragraph('<b>Check</b>', styles['TableHeader']), 
         Paragraph('<b>Tool</b>', styles['TableHeader']), 
         Paragraph('<b>Suche nach</b>', styles['TableHeader'])],
        [Paragraph('Delivery-Latency', styles['TableCell']), 
         Paragraph('Notification Dashboard', styles['TableCell']),
         Paragraph('p99 > 30s', styles['TableCell'])],
        [Paragraph('Queue-Lag', styles['TableCell']), 
         Paragraph('Notification Dashboard', styles['TableCell']),
         Paragraph('> 60s = Kritisch', styles['TableCell'])],
        [Paragraph('Provider-Status', styles['TableCell']), 
         Paragraph('Provider Status Page', styles['TableCell']),
         Paragraph('Outage bekannt?', styles['TableCell'])],
    ]
    
    diag_e_table = create_table(diag_e_data, [available_width * 0.30, available_width * 0.35, available_width * 0.35], styles)
    story.append(diag_e_table)
    
    story.append(Spacer(1, 6))
    story.append(Paragraph('<b>7.3 Sofortmaßnahmen</b>', styles['H2']))
    
    action_e_data = [
        [Paragraph('<b>Maßnahme</b>', styles['TableHeader']), 
         Paragraph('<b>Kommando/Aktion</b>', styles['TableHeader']), 
         Paragraph('<b>Hinweis</b>', styles['TableHeader'])],
        [Paragraph('Provider wechseln', styles['TableCell']), 
         Paragraph('Notification Config: provider=fallback', styles['TableCell']),
         Paragraph('Fallback-Slack/Email', styles['TableCell'])],
        [Paragraph('Worker skalieren', styles['TableCell']), 
         Paragraph('kubectl scale deployment notification-worker --replicas=5', styles['TableCell']),
         Paragraph('Bei Queue-Backlog', styles['TableCell'])],
        [Paragraph('DLQ prüfen', styles['TableCell']), 
         Paragraph('Admin Tool: notification-dlq-check', styles['TableCell']),
         Paragraph('Fehlgeschlagene Messages', styles['TableCell'])],
    ]
    
    action_e_table = create_table(action_e_data, [available_width * 0.25, available_width * 0.45, available_width * 0.30], styles)
    story.append(action_e_table)
    
    story.append(Spacer(1, 6))
    story.append(Paragraph('<b>7.4 Eskalation</b>', styles['H2']))
    story.append(Paragraph('<bullet>&bull;</bullet> <b>Notification-Team:</b> notification-team@cargobit.eu', styles['BulletItem']))
    story.append(Paragraph('<bullet>&bull;</bullet> <b>Platform-Team:</b> platform-oncall@cargobit.eu', styles['BulletItem']))
    
    story.append(Spacer(1, 6))
    story.append(Paragraph('<b>7.5 Recovery</b>', styles['H2']))
    story.append(Paragraph('<bullet>&bull;</bullet> Delivery-Rate normal (> 99%)', styles['BulletItem']))
    story.append(Paragraph('<bullet>&bull;</bullet> Queue-Lag < 2 Sekunden', styles['BulletItem']))
    
    story.append(PageBreak())
    
    # ========================================================================
    # SECTION 8: ESKALATIONSMATRIX
    # ========================================================================
    story.append(Paragraph('<b>8. Eskalationsmatrix</b>', styles['DocTitle']))
    story.append(Spacer(1, 10))
    
    escalation_data = [
        [Paragraph('<b>Severity</b>', styles['TableHeader']), 
         Paragraph('<b>Beschreibung</b>', styles['TableHeader']), 
         Paragraph('<b>Max. Reaktionszeit</b>', styles['TableHeader']),
         Paragraph('<b>Eskalation</b>', styles['TableHeader'])],
        [Paragraph('SEV-1', styles['TableCell']), 
         Paragraph('Fraud-Welle, Risk-Engine Down, Audit-Failure', styles['TableCell']),
         Paragraph('5 Minuten', styles['TableCellCenter']),
         Paragraph('Security + Compliance + Platform', styles['TableCell'])],
        [Paragraph('SEV-2', styles['TableCell']), 
         Paragraph('Mitigation-Queue Overload, Notification Failure', styles['TableCell']),
         Paragraph('15 Minuten', styles['TableCellCenter']),
         Paragraph('Security + Backend', styles['TableCell'])],
        [Paragraph('SEV-3', styles['TableCell']), 
         Paragraph('Minor Errors, Slowdowns', styles['TableCell']),
         Paragraph('60 Minuten', styles['TableCellCenter']),
         Paragraph('Backend', styles['TableCell'])],
        [Paragraph('SEV-4', styles['TableCell']), 
         Paragraph('Non-Critical', styles['TableCell']),
         Paragraph('24 Stunden', styles['TableCellCenter']),
         Paragraph('Team Lead', styles['TableCell'])],
    ]
    
    escalation_table = create_table(escalation_data, [available_width * 0.12, available_width * 0.38, available_width * 0.20, available_width * 0.30], styles)
    story.append(escalation_table)
    story.append(Spacer(1, 3))
    story.append(Paragraph('Tabelle 5: Eskalationsmatrix', styles['Caption']))
    
    story.append(Spacer(1, 12))
    
    # ========================================================================
    # SECTION 9: KOMMUNIKATIONSPLAN
    # ========================================================================
    story.append(Paragraph('<b>9. Kommunikationsplan</b>', styles['DocTitle']))
    story.append(Spacer(1, 10))
    
    comm_data = [
        [Paragraph('<b>Severity</b>', styles['TableHeader']), 
         Paragraph('<b>Slack Channel</b>', styles['TableHeader']), 
         Paragraph('<b>Email an</b>', styles['TableHeader']),
         Paragraph('<b>Besonderheiten</b>', styles['TableHeader'])],
        [Paragraph('SEV-1', styles['TableCell']), 
         Paragraph('#incident-security', styles['TableCell']),
         Paragraph('Security, Compliance, Platform', styles['TableCell']),
         Paragraph('Incident Commander bestimmen', styles['TableCell'])],
        [Paragraph('SEV-2', styles['TableCell']), 
         Paragraph('#incident-backend', styles['TableCell']),
         Paragraph('Backend Team', styles['TableCell']),
         Paragraph('Reguläre Updates', styles['TableCell'])],
        [Paragraph('SEV-3', styles['TableCell']), 
         Paragraph('#dev-ops', styles['TableCell']),
         Paragraph('-', styles['TableCell']),
         Paragraph('Ticket erstellen', styles['TableCell'])],
        [Paragraph('SEV-4', styles['TableCell']), 
         Paragraph('-', styles['TableCell']),
         Paragraph('-', styles['TableCell']),
         Paragraph('Nur Ticket, kein Channel', styles['TableCell'])],
    ]
    
    comm_table = create_table(comm_data, [available_width * 0.15, available_width * 0.25, available_width * 0.30, available_width * 0.30], styles)
    story.append(comm_table)
    story.append(Spacer(1, 3))
    story.append(Paragraph('Tabelle 6: Kommunikationsplan', styles['Caption']))
    
    story.append(Spacer(1, 12))
    
    # ========================================================================
    # SECTION 10: POST-INCIDENT
    # ========================================================================
    story.append(Paragraph('<b>10. Post-Incident Anforderungen</b>', styles['DocTitle']))
    story.append(Spacer(1, 10))
    
    post_data = [
        [Paragraph('<b>Zeitrahmen</b>', styles['TableHeader']), 
         Paragraph('<b>Aufgabe</b>', styles['TableHeader']), 
         Paragraph('<b>Verantwortlich</b>', styles['TableHeader'])],
        [Paragraph('24h', styles['TableCellCenter']), 
         Paragraph('Timeline erstellen', styles['TableCell']),
         Paragraph('On-Call Engineer', styles['TableCell'])],
        [Paragraph('24h', styles['TableCellCenter']), 
         Paragraph('Root Cause identifizieren', styles['TableCell']),
         Paragraph('On-Call + Team', styles['TableCell'])],
        [Paragraph('24h', styles['TableCellCenter']), 
         Paragraph('Impact Assessment', styles['TableCell']),
         Paragraph('On-Call Engineer', styles['TableCell'])],
        [Paragraph('48h', styles['TableCellCenter']), 
         Paragraph('Fix implementieren', styles['TableCell']),
         Paragraph('Entsprechendes Team', styles['TableCell'])],
        [Paragraph('48h', styles['TableCellCenter']), 
         Paragraph('Regression Tests', styles['TableCell']),
         Paragraph('QA Team', styles['TableCell'])],
        [Paragraph('72h', styles['TableCellCenter']), 
         Paragraph('Post-Mortem Meeting', styles['TableCell']),
         Paragraph('Team Lead', styles['TableCell'])],
        [Paragraph('72h', styles['TableCellCenter']), 
         Paragraph('Lessons Learned dokumentieren', styles['TableCell']),
         Paragraph('On-Call Engineer', styles['TableCell'])],
        [Paragraph('72h', styles['TableCellCenter']), 
         Paragraph('Risk-Rules aktualisieren (falls nötig)', styles['TableCell']),
         Paragraph('Security-Engineer', styles['TableCell'])],
    ]
    
    post_table = create_table(post_data, [available_width * 0.15, available_width * 0.50, available_width * 0.35], styles)
    story.append(post_table)
    story.append(Spacer(1, 3))
    story.append(Paragraph('Tabelle 7: Post-Incident Checkliste', styles['Caption']))
    
    story.append(Spacer(1, 16))
    
    # ========================================================================
    # KEY CONTACTS
    # ========================================================================
    story.append(Paragraph('<b>Key Contacts</b>', styles['H1']))
    story.append(Spacer(1, 8))
    
    contacts_data = [
        [Paragraph('<b>Team</b>', styles['TableHeader']), 
         Paragraph('<b>Email</b>', styles['TableHeader']), 
         Paragraph('<b>Slack</b>', styles['TableHeader'])],
        [Paragraph('Security On-Call', styles['TableCell']), 
         Paragraph('security-oncall@cargobit.eu', styles['TableCell']),
         Paragraph('#security-oncall', styles['TableCell'])],
        [Paragraph('Backend On-Call', styles['TableCell']), 
         Paragraph('backend-oncall@cargobit.eu', styles['TableCell']),
         Paragraph('#backend-oncall', styles['TableCell'])],
        [Paragraph('Platform On-Call', styles['TableCell']), 
         Paragraph('platform-oncall@cargobit.eu', styles['TableCell']),
         Paragraph('#platform-oncall', styles['TableCell'])],
        [Paragraph('Compliance', styles['TableCell']), 
         Paragraph('compliance@cargobit.eu', styles['TableCell']),
         Paragraph('#compliance', styles['TableCell'])],
        [Paragraph('Incident Commander', styles['TableCell']), 
         Paragraph('incident-commander@cargobit.eu', styles['TableCell']),
         Paragraph('#incidents', styles['TableCell'])],
    ]
    
    contacts_table = create_table(contacts_data, [available_width * 0.30, available_width * 0.40, available_width * 0.30], styles)
    story.append(contacts_table)
    story.append(Spacer(1, 3))
    story.append(Paragraph('Tabelle 8: Key Contacts', styles['Caption']))
    
    return story

# ============================================================================
# MAIN
# ============================================================================
def main():
    output_dir = '/home/z/my-project/download'
    body_pdf = os.path.join(output_dir, 'oncall_runbook_body.pdf')
    cover_html = os.path.join(output_dir, 'oncall_runbook_cover.html')
    cover_pdf = os.path.join(output_dir, 'oncall_runbook_cover.pdf')
    final_pdf = os.path.join(output_dir, 'CargoBit_OnCall_Operational_Runbook.pdf')
    
    # 1. Generate Cover HTML
    print("Step 1: Generating cover HTML...")
    with open(cover_html, 'w', encoding='utf-8') as f:
        f.write(COVER_HTML)
    
    # 2. Generate Body PDF
    print("Step 2: Generating body PDF...")
    doc = SimpleDocTemplate(
        body_pdf,
        pagesize=A4,
        leftMargin=0.9 * inch,
        rightMargin=0.9 * inch,
        topMargin=0.7 * inch,
        bottomMargin=0.7 * inch,
    )
    
    story = build_document()
    doc.build(story)
    
    # 3. Render Cover PDF
    print("Step 3: Rendering cover PDF...")
    scripts_dir = os.path.join(PDF_SKILL_DIR, 'scripts')
    subprocess.run([
        'node', os.path.join(scripts_dir, 'html2poster.js'),
        cover_html, '--output', cover_pdf, '--width', '794px',
    ], check=True)
    
    # 4. Merge Cover + Body
    print("Step 4: Merging cover and body PDFs...")
    
    A4_W, A4_H = 595.28, 841.89
    
    def normalize_page(page):
        box = page.mediabox
        w, h = float(box.width), float(box.height)
        if abs(w - A4_W) > 2 or abs(h - A4_H) > 2:
            sx, sy = A4_W / w, A4_H / h
            page.add_transformation(Transformation().scale(sx=sx, sy=sy))
            page.mediabox.lower_left = (0, 0)
            page.mediabox.upper_right = (A4_W, A4_H)
        return page
    
    writer = PdfWriter()
    
    # Cover as page 1
    cover_page = PdfReader(cover_pdf).pages[0]
    writer.add_page(normalize_page(cover_page))
    
    # Body pages follow
    for page in PdfReader(body_pdf).pages:
        writer.add_page(normalize_page(page))
    
    writer.add_metadata({
        '/Title': 'CargoBit On-Call Operational Runbook',
        '/Author': 'CargoBit Security Operations',
        '/Creator': 'Z.ai PDF Generator',
        '/Subject': 'Quick reference guide for on-call engineers',
    })
    
    with open(final_pdf, 'wb') as f:
        writer.write(f)
    
    # Cleanup temp files
    os.remove(body_pdf)
    os.remove(cover_pdf)
    
    print(f"\n✅ PDF generated: {final_pdf}")
    
    # Get file size
    size_kb = os.path.getsize(final_pdf) / 1024
    print(f"   File size: {size_kb:.1f} KB")

if __name__ == '__main__':
    main()
