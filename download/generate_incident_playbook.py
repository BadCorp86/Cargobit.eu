#!/usr/bin/env python3
"""
CargoBit Security-Gateway: Incident-Response-Playbook
Enterprise Operations Manual for On-Call, Support, Security-Engineers & Compliance
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
# PALETTE (from cascade generator)
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
        fontSize=24,
        leading=32,
        textColor=TEXT_PRIMARY,
        alignment=TA_LEFT,
        spaceBefore=0,
        spaceAfter=12,
    ))
    
    # H1 style
    styles.add(ParagraphStyle(
        name='H1',
        fontName='Times New Roman',
        fontSize=18,
        leading=26,
        textColor=ACCENT,
        alignment=TA_LEFT,
        spaceBefore=18,
        spaceAfter=10,
    ))
    
    # H2 style
    styles.add(ParagraphStyle(
        name='H2',
        fontName='Times New Roman',
        fontSize=14,
        leading=20,
        textColor=HEADER_FILL,
        alignment=TA_LEFT,
        spaceBefore=14,
        spaceAfter=8,
    ))
    
    # H3 style
    styles.add(ParagraphStyle(
        name='H3',
        fontName='Times New Roman',
        fontSize=12,
        leading=18,
        textColor=TEXT_PRIMARY,
        alignment=TA_LEFT,
        spaceBefore=10,
        spaceAfter=6,
    ))
    
    # Body style
    styles.add(ParagraphStyle(
        name='Body',
        fontName='Times New Roman',
        fontSize=10.5,
        leading=16,
        textColor=TEXT_PRIMARY,
        alignment=TA_LEFT,
        spaceBefore=0,
        spaceAfter=8,
    ))
    
    # Bullet style
    styles.add(ParagraphStyle(
        name='BulletItem',
        fontName='Times New Roman',
        fontSize=10.5,
        leading=16,
        textColor=TEXT_PRIMARY,
        alignment=TA_LEFT,
        leftIndent=20,
        spaceBefore=2,
        spaceAfter=2,
    ))
    
    # Alert/Callout style
    styles.add(ParagraphStyle(
        name='Alert',
        fontName='Times New Roman',
        fontSize=10.5,
        leading=16,
        textColor=TEXT_PRIMARY,
        alignment=TA_LEFT,
        backColor=CARD_BG,
        borderPadding=8,
        spaceBefore=8,
        spaceAfter=8,
    ))
    
    # Table header style
    styles.add(ParagraphStyle(
        name='TableHeader',
        fontName='Times New Roman',
        fontSize=10,
        leading=14,
        textColor=colors.white,
        alignment=TA_CENTER,
    ))
    
    # Table cell style
    styles.add(ParagraphStyle(
        name='TableCell',
        fontName='Times New Roman',
        fontSize=9.5,
        leading=14,
        textColor=TEXT_PRIMARY,
        alignment=TA_LEFT,
    ))
    
    # Table cell center
    styles.add(ParagraphStyle(
        name='TableCellCenter',
        fontName='Times New Roman',
        fontSize=9.5,
        leading=14,
        textColor=TEXT_PRIMARY,
        alignment=TA_CENTER,
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
        spaceAfter=12,
    ))
    
    return styles

# ============================================================================
# COVER HTML
# ============================================================================
COVER_HTML = '''<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Incident Response Playbook</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
    <style>
        :root {
            --c-bg: #f7f7f6;
            --c-accent: #2c6f86;
            --c-text: #1e1d1b;
            --c-muted: #87857d;
            --c-block: #686049;
            --c-border: #c5bea8;
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
            background: var(--c-block);
        }
        
        /* Kicker */
        .kicker {
            font-size: 13px;
            font-weight: 500;
            letter-spacing: 2px;
            text-transform: uppercase;
            color: var(--c-muted);
            margin-top: 40px;
        }
        
        /* Main title */
        .title {
            font-size: 42px;
            font-weight: 700;
            color: var(--c-text);
            line-height: 1.2;
            margin-top: 24px;
            max-width: 600px;
        }
        
        .title-line {
            display: block;
        }
        
        /* Subtitle */
        .subtitle {
            font-size: 18px;
            font-weight: 400;
            color: var(--c-accent);
            margin-top: 20px;
            line-height: 1.5;
        }
        
        /* Decorative block */
        .deco-block {
            position: absolute;
            top: 280px;
            right: 60px;
            width: 200px;
            height: 6px;
            background: var(--c-accent);
        }
        
        /* Summary box */
        .summary-box {
            position: absolute;
            bottom: 200px;
            left: 60px;
            right: 60px;
            padding: 24px 28px;
            background: white;
            border-left: 4px solid var(--c-accent);
        }
        
        .summary-title {
            font-size: 12px;
            font-weight: 600;
            letter-spacing: 1px;
            text-transform: uppercase;
            color: var(--c-accent);
            margin-bottom: 8px;
        }
        
        .summary-text {
            font-size: 14px;
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
            font-size: 12px;
            color: var(--c-muted);
            line-height: 1.8;
        }
        
        .meta-right {
            font-size: 11px;
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
            <span class="title-line">Incident-Response</span>
            <span class="title-line">Playbook</span>
        </h1>
        
        <p class="subtitle">Operational Manual for On-Call Engineers,<br/>Support, Security-Engineers & Compliance Teams</p>
        
        <div class="deco-block"></div>
        
        <div class="summary-box">
            <div class="summary-title">Scope</div>
            <div class="summary-text">
                This playbook covers three critical incident scenarios: High-Risk Events (RED-Spike/Fraud-Wave), 
                Risk-Engine Down/Degraded, and Mitigation-Queue Overload. Each scenario includes detection criteria, 
                immediate actions (0-5 min), triage (5-15 min), mitigation (15-60 min), recovery procedures, 
                post-incident review, and owner assignments.
            </div>
        </div>
        
        <div class="meta">
            <div class="meta-left">
                <strong>Document Classification:</strong> Internal - Operations<br/>
                <strong>Review Cycle:</strong> Quarterly
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
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
        ('TOPPADDING', (0, 0), (-1, 0), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 1), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 6),
    ]))
    
    # Alternating row colors
    for i in range(1, len(data)):
        if i % 2 == 0:
            table.setStyle(TableStyle([('BACKGROUND', (0, i), (-1, i), TABLE_STRIPE)]))
    
    return table

def create_scenario_header(title, color, styles):
    """Create a colored scenario header."""
    return Paragraph(f'<font color="{color}"><b>{title}</b></font>', styles['H1'])

# ============================================================================
# DOCUMENT CONTENT
# ============================================================================
def build_document():
    styles = create_styles()
    story = []
    
    # Page margins
    left_margin = 1.0 * inch
    right_margin = 1.0 * inch
    available_width = A4[0] - left_margin - right_margin
    
    # ========================================================================
    # TABLE OF CONTENTS
    # ========================================================================
    story.append(Paragraph('<b>Table of Contents</b>', styles['DocTitle']))
    story.append(Spacer(1, 12))
    
    toc_data = [
        ['Section', 'Page'],
        ['1. Overview & Purpose', '3'],
        ['2. Scenario 1: High-Risk Event (RED-Spike / Fraud-Wave)', '4'],
        ['3. Scenario 2: Risk-Engine Down / Degraded', '7'],
        ['4. Scenario 3: Mitigation-Queue Overload', '10'],
        ['5. Owner Matrix & Escalation Paths', '13'],
        ['6. Quick Reference Cards', '14'],
    ]
    
    toc_table = create_table(toc_data, [available_width * 0.75, available_width * 0.25], styles)
    story.append(toc_table)
    story.append(PageBreak())
    
    # ========================================================================
    # SECTION 1: OVERVIEW
    # ========================================================================
    story.append(Paragraph('<b>1. Overview & Purpose</b>', styles['DocTitle']))
    story.append(Spacer(1, 12))
    
    story.append(Paragraph(
        'This Incident-Response Playbook provides structured, actionable procedures for handling critical '
        'security incidents within the CargoBit Security-Gateway infrastructure. It is designed for immediate '
        'operational use by On-Call Engineers, Support Teams, Security-Engineers, and Compliance Officers.',
        styles['Body']
    ))
    
    story.append(Spacer(1, 8))
    story.append(Paragraph('<b>Key Objectives:</b>', styles['H3']))
    
    objectives = [
        'Minimize Mean Time to Detect (MTTD) and Mean Time to Resolve (MTTR)',
        'Provide clear decision trees for each incident type',
        'Define ownership and escalation paths',
        'Ensure audit trail integrity during incident response',
        'Maintain service availability while protecting against fraud',
    ]
    
    for obj in objectives:
        story.append(Paragraph(f'<bullet>&bull;</bullet> {obj}', styles['BulletItem']))
    
    story.append(Spacer(1, 12))
    story.append(Paragraph('<b>Severity Levels:</b>', styles['H3']))
    
    severity_data = [
        [Paragraph('<b>Level</b>', styles['TableHeader']), 
         Paragraph('<b>Definition</b>', styles['TableHeader']), 
         Paragraph('<b>Response Time</b>', styles['TableHeader']),
         Paragraph('<b>Example</b>', styles['TableHeader'])],
        [Paragraph('P1 - Critical', styles['TableCell']), 
         Paragraph('Service down or security breach in progress', styles['TableCell']),
         Paragraph('< 15 minutes', styles['TableCellCenter']),
         Paragraph('Risk-Engine complete outage', styles['TableCell'])],
        [Paragraph('P2 - High', styles['TableCell']), 
         Paragraph('Significant degradation or fraud pattern detected', styles['TableCell']),
         Paragraph('< 30 minutes', styles['TableCellCenter']),
         Paragraph('Fraud-wave spike, queue overload', styles['TableCell'])],
        [Paragraph('P3 - Medium', styles['TableCell']), 
         Paragraph('Partial degradation, single component affected', styles['TableCell']),
         Paragraph('< 2 hours', styles['TableCellCenter']),
         Paragraph('Increased latency, minor alert spikes', styles['TableCell'])],
        [Paragraph('P4 - Low', styles['TableCell']), 
         Paragraph('Minor issue, workaround available', styles['TableCell']),
         Paragraph('< 24 hours', styles['TableCellCenter']),
         Paragraph('Single rule misfire, cosmetic issues', styles['TableCell'])],
    ]
    
    severity_table = create_table(severity_data, [available_width * 0.15, available_width * 0.35, available_width * 0.20, available_width * 0.30], styles)
    story.append(severity_table)
    story.append(Spacer(1, 6))
    story.append(Paragraph('Table 1: Incident Severity Classification', styles['Caption']))
    
    story.append(PageBreak())
    
    # ========================================================================
    # SCENARIO 1: HIGH-RISK EVENT
    # ========================================================================
    story.append(Paragraph('<b>2. Scenario 1: High-Risk Event (RED-Spike / Fraud-Wave)</b>', styles['DocTitle']))
    story.append(Spacer(1, 12))
    
    # Detection
    story.append(Paragraph('<b>2.1 Detection</b>', styles['H1']))
    story.append(Spacer(1, 8))
    
    story.append(Paragraph('<b>Alert Triggers:</b>', styles['H3']))
    
    detection_bullets = [
        '<b>Grafana Alert:</b> <font face="DejaVuSans">rate(risk_level_total{level="red"}[5m]) > 50</font>',
        '<b>Gateway:</b> Rising block rate in Security-Gateway metrics',
        '<b>Notification-Service:</b> High volume of High-Risk alerts being dispatched',
        '<b>Support:</b> Unusual spike in support tickets related to blocked transactions',
    ]
    
    for bullet in detection_bullets:
        story.append(Paragraph(f'<bullet>&bull;</bullet> {bullet}', styles['BulletItem']))
    
    story.append(Spacer(1, 12))
    
    # Immediate Actions
    story.append(Paragraph('<b>2.2 Immediate Actions (0-5 Minutes)</b>', styles['H1']))
    story.append(Spacer(1, 8))
    
    story.append(Paragraph('<b>On-Call Engineer Responsibilities:</b>', styles['H3']))
    
    immediate_data = [
        [Paragraph('<b>Step</b>', styles['TableHeader']), 
         Paragraph('<b>Action</b>', styles['TableHeader']), 
         Paragraph('<b>Expected Outcome</b>', styles['TableHeader'])],
        [Paragraph('1', styles['TableCellCenter']), 
         Paragraph('Confirm alert in Alertmanager', styles['TableCell']),
         Paragraph('Alert is valid, not a false positive', styles['TableCell'])],
        [Paragraph('2', styles['TableCellCenter']), 
         Paragraph('Check Risk Dashboard: Level Distribution, Triggered Rules (Top 10), Geo-Heatmap', styles['TableCell']),
         Paragraph('Understand scope and pattern of spike', styles['TableCell'])],
        [Paragraph('3', styles['TableCellCenter']), 
         Paragraph('Activate "Fraud-Mode" in Gateway if available', styles['TableCell']),
         Paragraph('Stricter thresholds, optional auto-block for certain rules', styles['TableCell'])],
        [Paragraph('4', styles['TableCellCenter']), 
         Paragraph('Notify Security-Engineer and Compliance', styles['TableCell']),
         Paragraph('Key stakeholders aware, ready for escalation', styles['TableCell'])],
    ]
    
    immediate_table = create_table(immediate_data, [available_width * 0.10, available_width * 0.45, available_width * 0.45], styles)
    story.append(immediate_table)
    story.append(Spacer(1, 6))
    story.append(Paragraph('Table 2: Immediate Actions Checklist', styles['Caption']))
    
    story.append(Spacer(1, 12))
    
    # Triage
    story.append(Paragraph('<b>2.3 Triage (5-15 Minutes)</b>', styles['H1']))
    story.append(Spacer(1, 8))
    
    story.append(Paragraph('<b>Investigation Steps:</b>', styles['H3']))
    
    triage_bullets = [
        'Determine if spike is <b>regional or global</b> (check geo-distribution)',
        'Identify <b>dominant rules</b> triggering: tx_high_amount, user_new_iban, geo_mismatch',
        'Check for <b>specific patterns</b>: same client, company, IP-range, or user cohort',
        'Verify <b>Risk-Engine health</b>: latency, error rate, response codes',
        'Confirm <b>Audit-Events</b> are being written correctly',
    ]
    
    for bullet in triage_bullets:
        story.append(Paragraph(f'<bullet>&bull;</bullet> {bullet}', styles['BulletItem']))
    
    story.append(Spacer(1, 8))
    story.append(Paragraph('<b>Decision Tree:</b>', styles['H3']))
    
    decision_data = [
        [Paragraph('<b>Finding</b>', styles['TableHeader']), 
         Paragraph('<b>Classification</b>', styles['TableHeader']), 
         Paragraph('<b>Next Step</b>', styles['TableHeader'])],
        [Paragraph('Clear fraud pattern identified', styles['TableCell']), 
         Paragraph('Fraud-Wave', styles['TableCell']),
         Paragraph('Proceed to Mitigation Section 2.4', styles['TableCell'])],
        [Paragraph('Rules firing incorrectly on legitimate traffic', styles['TableCell']), 
         Paragraph('False Positive', styles['TableCell']),
         Paragraph('Deactivate problematic rule, proceed to Risk-Engine Playbook', styles['TableCell'])],
        [Paragraph('Risk-Engine returning errors/timeouts', styles['TableCell']), 
         Paragraph('System Issue', styles['TableCell']),
         Paragraph('Switch to Scenario 2 Playbook', styles['TableCell'])],
    ]
    
    decision_table = create_table(decision_data, [available_width * 0.35, available_width * 0.25, available_width * 0.40], styles)
    story.append(decision_table)
    story.append(Spacer(1, 6))
    story.append(Paragraph('Table 3: Triage Decision Matrix', styles['Caption']))
    
    story.append(PageBreak())
    
    # Mitigation
    story.append(Paragraph('<b>2.4 Mitigation (15-60 Minutes)</b>', styles['H1']))
    story.append(Spacer(1, 8))
    
    story.append(Paragraph('<b>Option A: Confirmed Fraud-Wave</b>', styles['H3']))
    
    fraud_mitigation = [
        '<b>Block affected entities:</b> Add user IDs, company IDs, or IP ranges to blocklist',
        '<b>Activate "Strict Mode":</b> Yellow → Red, Delay → Block for affected transaction types',
        '<b>Temporary Geo-Block:</b> If spike is region-specific, implement geo-fencing',
        '<b>Notification cascade:</b> Inform Compliance and Security via Slack/Email/SMS',
        '<b>Documentation:</b> Log all actions with timestamps in incident ticket',
    ]
    
    for bullet in fraud_mitigation:
        story.append(Paragraph(f'<bullet>&bull;</bullet> {bullet}', styles['BulletItem']))
    
    story.append(Spacer(1, 8))
    story.append(Paragraph('<b>Option B: Rule Misconfiguration</b>', styles['H3']))
    
    rule_mitigation = [
        '<b>Deactivate problematic rule:</b> Set rule.active = false in Risk-Rules configuration',
        '<b>Apply override:</b> For affected entities, manually adjust risk level if justified',
        '<b>Prepare hotfix:</b> If bug identified, prepare Risk-Engine patch for deployment',
        '<b>Monitor:</b> Watch for rule re-enable confirmation in deployment logs',
    ]
    
    for bullet in rule_mitigation:
        story.append(Paragraph(f'<bullet>&bull;</bullet> {bullet}', styles['BulletItem']))
    
    story.append(Spacer(1, 12))
    
    # Recovery
    story.append(Paragraph('<b>2.5 Recovery</b>', styles['H1']))
    story.append(Spacer(1, 8))
    
    recovery_data = [
        [Paragraph('<b>Indicator</b>', styles['TableHeader']), 
         Paragraph('<b>Target</b>', styles['TableHeader']), 
         Paragraph('<b>Verification Method</b>', styles['TableHeader'])],
        [Paragraph('Risk-Level Distribution', styles['TableCell']), 
         Paragraph('Normalized to baseline', styles['TableCell']),
         Paragraph('Grafana dashboard comparison', styles['TableCell'])],
        [Paragraph('Block Rate', styles['TableCell']), 
         Paragraph('< 5% of total transactions', styles['TableCell']),
         Paragraph('Gateway metrics', styles['TableCell'])],
        [Paragraph('Strict Mode', styles['TableCell']), 
         Paragraph('Disabled', styles['TableCell']),
         Paragraph('Configuration check', styles['TableCell'])],
        [Paragraph('Audit-Trail Integrity', styles['TableCell']), 
         Paragraph('All events written', styles['TableCell']),
         Paragraph('Audit service health check', styles['TableCell'])],
        [Paragraph('Mitigation Queue', styles['TableCell']), 
         Paragraph('Processed, lag < 2s', styles['TableCell']),
         Paragraph('Queue metrics', styles['TableCell'])],
    ]
    
    recovery_table = create_table(recovery_data, [available_width * 0.30, available_width * 0.30, available_width * 0.40], styles)
    story.append(recovery_table)
    story.append(Spacer(1, 6))
    story.append(Paragraph('Table 4: Recovery Validation Checklist', styles['Caption']))
    
    story.append(Spacer(1, 12))
    
    # Post-Incident
    story.append(Paragraph('<b>2.6 Post-Incident (24-72 Hours)</b>', styles['H1']))
    story.append(Spacer(1, 8))
    
    post_incident = [
        '<b>Root Cause Analysis (RCA):</b> Document timeline, root cause, and contributing factors',
        '<b>Fraud Pattern Integration:</b> Add new fraud patterns to Risk-Engine rule set',
        '<b>Rule Tuning:</b> Adjust thresholds based on false positive analysis',
        '<b>Support Ticket Review:</b> Analyze customer impact and compensation if needed',
        '<b>Compliance Review:</b> Ensure all regulatory reporting requirements are met',
    ]
    
    for bullet in post_incident:
        story.append(Paragraph(f'<bullet>&bull;</bullet> {bullet}', styles['BulletItem']))
    
    story.append(Spacer(1, 12))
    
    # Owner
    story.append(Paragraph('<b>2.7 Owner</b>', styles['H1']))
    story.append(Spacer(1, 8))
    
    owner_data = [
        [Paragraph('<b>Role</b>', styles['TableHeader']), 
         Paragraph('<b>Responsibility</b>', styles['TableHeader']), 
         Paragraph('<b>Escalation Contact</b>', styles['TableHeader'])],
        [Paragraph('Primary: Security-Engineer', styles['TableCell']), 
         Paragraph('Lead incident response, rule adjustments', styles['TableCell']),
         Paragraph('security-oncall@cargobit.eu', styles['TableCell'])],
        [Paragraph('Secondary: On-Call Backend', styles['TableCell']), 
         Paragraph('System-level troubleshooting', styles['TableCell']),
         Paragraph('backend-oncall@cargobit.eu', styles['TableCell'])],
        [Paragraph('Tertiary: Compliance', styles['TableCell']), 
         Paragraph('Regulatory oversight, reporting', styles['TableCell']),
         Paragraph('compliance@cargobit.eu', styles['TableCell'])],
    ]
    
    owner_table = create_table(owner_data, [available_width * 0.30, available_width * 0.40, available_width * 0.30], styles)
    story.append(owner_table)
    story.append(Spacer(1, 6))
    story.append(Paragraph('Table 5: Ownership Matrix for High-Risk Events', styles['Caption']))
    
    story.append(PageBreak())
    
    # ========================================================================
    # SCENARIO 2: RISK-ENGINE DOWN
    # ========================================================================
    story.append(Paragraph('<b>3. Scenario 2: Risk-Engine Down / Degraded</b>', styles['DocTitle']))
    story.append(Spacer(1, 12))
    
    # Detection
    story.append(Paragraph('<b>3.1 Detection</b>', styles['H1']))
    story.append(Spacer(1, 8))
    
    story.append(Paragraph('<b>Alert Triggers:</b>', styles['H3']))
    
    detection2_bullets = [
        '<b>Grafana Alert:</b> <font face="DejaVuSans">rate(risk_engine_timeout_total[5m]) > 5</font>',
        '<b>Gateway Latency:</b> Significant increase in Security-Gateway response times',
        '<b>Decision Breakdown:</b> Unusual spike in "blocked" decisions (Fail-Safe behavior)',
        '<b>Logs:</b> <font face="DejaVuSans">RISK_ENGINE_UNAVAILABLE</font> error entries',
    ]
    
    for bullet in detection2_bullets:
        story.append(Paragraph(f'<bullet>&bull;</bullet> {bullet}', styles['BulletItem']))
    
    story.append(Spacer(1, 12))
    
    # Immediate Actions
    story.append(Paragraph('<b>3.2 Immediate Actions (0-5 Minutes)</b>', styles['H1']))
    story.append(Spacer(1, 8))
    
    story.append(Paragraph('<b>Gateway Fail-Safe Behavior:</b>', styles['H3']))
    story.append(Paragraph(
        'When Risk-Engine is unavailable, the Security-Gateway automatically enters Fail-Safe mode. '
        'The default policy is to <b>block</b> all high-risk transactions to protect against potential fraud.',
        styles['Body']
    ))
    
    story.append(Spacer(1, 8))
    
    immediate2_data = [
        [Paragraph('<b>Step</b>', styles['TableHeader']), 
         Paragraph('<b>Action</b>', styles['TableHeader']), 
         Paragraph('<b>Command/Check</b>', styles['TableHeader'])],
        [Paragraph('1', styles['TableCellCenter']), 
         Paragraph('Confirm alert in Alertmanager', styles['TableCell']),
         Paragraph('Alertmanager UI / PagerDuty', styles['TableCell'])],
        [Paragraph('2', styles['TableCellCenter']), 
         Paragraph('Check Risk-Engine health endpoint', styles['TableCell']),
         Paragraph('<font face="DejaVuSans">GET localhost:3003/risk/health</font>', styles['TableCell'])],
        [Paragraph('3', styles['TableCellCenter']), 
         Paragraph('Check system resources', styles['TableCell']),
         Paragraph('CPU, Memory, DB latency', styles['TableCell'])],
        [Paragraph('4', styles['TableCellCenter']), 
         Paragraph('Verify Circuit-Breaker status', styles['TableCell']),
         Paragraph('Gateway config: circuit_breaker.open', styles['TableCell'])],
    ]
    
    immediate2_table = create_table(immediate2_data, [available_width * 0.10, available_width * 0.40, available_width * 0.50], styles)
    story.append(immediate2_table)
    story.append(Spacer(1, 6))
    story.append(Paragraph('Table 6: Immediate Actions - Risk-Engine Down', styles['Caption']))
    
    story.append(Spacer(1, 12))
    
    # Triage
    story.append(Paragraph('<b>3.3 Triage (5-15 Minutes)</b>', styles['H1']))
    story.append(Spacer(1, 8))
    
    triage2_data = [
        [Paragraph('<b>Check</b>', styles['TableHeader']), 
         Paragraph('<b>Tool</b>', styles['TableHeader']), 
         Paragraph('<b>If Issue Found</b>', styles['TableHeader'])],
        [Paragraph('Pod Restarts', styles['TableCell']), 
         Paragraph('Kubernetes: kubectl get pods', styles['TableCell']),
         Paragraph('Check crash logs, OOM kills', styles['TableCell'])],
        [Paragraph('DB Latency', styles['TableCell']), 
         Paragraph('DB monitoring dashboard', styles['TableCell']),
         Paragraph('Escalate to DB-Team', styles['TableCell'])],
        [Paragraph('Queue Backlog', styles['TableCell']), 
         Paragraph('Queue metrics dashboard', styles['TableCell']),
         Paragraph('Scale consumers if needed', styles['TableCell'])],
        [Paragraph('Recent Deployments', styles['TableCell']), 
         Paragraph('CI/CD pipeline history', styles['TableCell']),
         Paragraph('Identify breaking change', styles['TableCell'])],
        [Paragraph('Network Partition', styles['TableCell']), 
         Paragraph('Network diagnostics', styles['TableCell']),
         Paragraph('Escalate to Platform-Team', styles['TableCell'])],
    ]
    
    triage2_table = create_table(triage2_data, [available_width * 0.25, available_width * 0.40, available_width * 0.35], styles)
    story.append(triage2_table)
    story.append(Spacer(1, 6))
    story.append(Paragraph('Table 7: Triage Checklist - Risk-Engine Down', styles['Caption']))
    
    story.append(Spacer(1, 12))
    
    # Mitigation
    story.append(Paragraph('<b>3.4 Mitigation (15-60 Minutes)</b>', styles['H1']))
    story.append(Spacer(1, 8))
    
    story.append(Paragraph('<b>Option A: Risk-Engine Restart</b>', styles['H3']))
    
    restart_steps = [
        'Initiate rolling restart of Risk-Engine pods',
        'Flush any stale cache entries',
        'Validate health-check endpoint returns 200 OK',
        'Monitor for 5 minutes before declaring recovery',
    ]
    
    for step in restart_steps:
        story.append(Paragraph(f'<bullet>&bull;</bullet> {step}', styles['BulletItem']))
    
    story.append(Spacer(1, 8))
    story.append(Paragraph('<b>Option B: Rollback</b>', styles['H3']))
    
    rollback_steps = [
        'Identify last stable version from deployment history',
        'Deploy previous stable version via CI/CD pipeline',
        'Verify all pods are running the rolled-back version',
    ]
    
    for step in rollback_steps:
        story.append(Paragraph(f'<bullet>&bull;</bullet> {step}', styles['BulletItem']))
    
    story.append(Spacer(1, 8))
    story.append(Paragraph('<b>Option C: Gateway Temporary Mode</b>', styles['H3']))
    
    gateway_mode_data = [
        [Paragraph('<b>Risk Level</b>', styles['TableHeader']), 
         Paragraph('<b>Temporary Behavior</b>', styles['TableHeader']), 
         Paragraph('<b>Use When</b>', styles['TableHeader'])],
        [Paragraph('GREEN', styles['TableCell']), 
         Paragraph('Allow (no risk check)', styles['TableCell']),
         Paragraph('Only if absolutely certain, low risk', styles['TableCell'])],
        [Paragraph('YELLOW', styles['TableCell']), 
         Paragraph('Apply Delay mitigation', styles['TableCell']),
         Paragraph('Default fallback mode', styles['TableCell'])],
        [Paragraph('RED', styles['TableCell']), 
         Paragraph('Block', styles['TableCell']),
         Paragraph('Always - safest option', styles['TableCell'])],
    ]
    
    gateway_mode_table = create_table(gateway_mode_data, [available_width * 0.25, available_width * 0.40, available_width * 0.35], styles)
    story.append(gateway_mode_table)
    story.append(Spacer(1, 6))
    story.append(Paragraph('Table 8: Gateway Temporary Mode Configuration', styles['Caption']))
    
    story.append(PageBreak())
    
    # Recovery
    story.append(Paragraph('<b>3.5 Recovery</b>', styles['H1']))
    story.append(Spacer(1, 8))
    
    recovery2_data = [
        [Paragraph('<b>Indicator</b>', styles['TableHeader']), 
         Paragraph('<b>Target</b>', styles['TableHeader']), 
         Paragraph('<b>Check Interval</b>', styles['TableHeader'])],
        [Paragraph('Risk-Engine Latency', styles['TableCell']), 
         Paragraph('< 100ms p99', styles['TableCell']),
         Paragraph('Every 30 seconds', styles['TableCell'])],
        [Paragraph('Error Rate', styles['TableCell']), 
         Paragraph('< 0.1%', styles['TableCell']),
         Paragraph('Every minute', styles['TableCell'])],
        [Paragraph('Circuit-Breaker', styles['TableCell']), 
         Paragraph('Closed (normal operation)', styles['TableCell']),
         Paragraph('Gateway config', styles['TableCell'])],
        [Paragraph('Audit Events', styles['TableCell']), 
         Paragraph('All events written successfully', styles['TableCell']),
         Paragraph('Audit service logs', styles['TableCell'])],
    ]
    
    recovery2_table = create_table(recovery2_data, [available_width * 0.35, available_width * 0.35, available_width * 0.30], styles)
    story.append(recovery2_table)
    story.append(Spacer(1, 6))
    story.append(Paragraph('Table 9: Recovery Indicators - Risk-Engine', styles['Caption']))
    
    story.append(Spacer(1, 12))
    
    # Post-Incident
    story.append(Paragraph('<b>3.6 Post-Incident (24-72 Hours)</b>', styles['H1']))
    story.append(Spacer(1, 8))
    
    post2_incident = [
        '<b>RCA Documentation:</b> Root cause, timeline, and resolution steps',
        '<b>Regression Tests:</b> Add test case for the specific failure scenario',
        '<b>Load Testing:</b> Run load tests against Risk-Engine to verify stability under stress',
        '<b>DB Index Optimization:</b> If DB latency was a factor, review and optimize indexes',
        '<b>Circuit-Breaker Tuning:</b> Adjust thresholds if fail-safe triggered too early/late',
    ]
    
    for bullet in post2_incident:
        story.append(Paragraph(f'<bullet>&bull;</bullet> {bullet}', styles['BulletItem']))
    
    story.append(Spacer(1, 12))
    
    # Owner
    story.append(Paragraph('<b>3.7 Owner</b>', styles['H1']))
    story.append(Spacer(1, 8))
    
    owner2_data = [
        [Paragraph('<b>Role</b>', styles['TableHeader']), 
         Paragraph('<b>Responsibility</b>', styles['TableHeader']), 
         Paragraph('<b>Escalation Contact</b>', styles['TableHeader'])],
        [Paragraph('Primary: Backend-Team Risk-Engine', styles['TableCell']), 
         Paragraph('Risk-Engine troubleshooting, restart, rollback', styles['TableCell']),
         Paragraph('backend-risk@cargobit.eu', styles['TableCell'])],
        [Paragraph('Secondary: Platform-Team', styles['TableCell']), 
         Paragraph('Infrastructure, Kubernetes, network', styles['TableCell']),
         Paragraph('platform-oncall@cargobit.eu', styles['TableCell'])],
        [Paragraph('Tertiary: Security-Engineer', styles['TableCell']), 
         Paragraph('Security policy oversight during degraded mode', styles['TableCell']),
         Paragraph('security-oncall@cargobit.eu', styles['TableCell'])],
    ]
    
    owner2_table = create_table(owner2_data, [available_width * 0.30, available_width * 0.40, available_width * 0.30], styles)
    story.append(owner2_table)
    story.append(Spacer(1, 6))
    story.append(Paragraph('Table 10: Ownership Matrix - Risk-Engine Down', styles['Caption']))
    
    story.append(PageBreak())
    
    # ========================================================================
    # SCENARIO 3: MITIGATION-QUEUE OVERLOAD
    # ========================================================================
    story.append(Paragraph('<b>4. Scenario 3: Mitigation-Queue Overload</b>', styles['DocTitle']))
    story.append(Spacer(1, 12))
    
    # Detection
    story.append(Paragraph('<b>4.1 Detection</b>', styles['H1']))
    story.append(Spacer(1, 8))
    
    story.append(Paragraph('<b>Alert Triggers:</b>', styles['H3']))
    
    detection3_bullets = [
        '<b>Grafana Alert:</b> <font face="DejaVuSans">mitigation_queue_lag_seconds > 5</font>',
        '<b>Delay Mitigations:</b> Delay actions executing later than scheduled',
        '<b>2FA Delays:</b> Users reporting delayed 2FA verification codes',
        '<b>Worker Metrics:</b> High CPU usage on mitigation workers',
    ]
    
    for bullet in detection3_bullets:
        story.append(Paragraph(f'<bullet>&bull;</bullet> {bullet}', styles['BulletItem']))
    
    story.append(Spacer(1, 12))
    
    # Immediate Actions
    story.append(Paragraph('<b>4.2 Immediate Actions (0-5 Minutes)</b>', styles['H1']))
    story.append(Spacer(1, 8))
    
    immediate3_data = [
        [Paragraph('<b>Step</b>', styles['TableHeader']), 
         Paragraph('<b>Action</b>', styles['TableHeader']), 
         Paragraph('<b>Verification</b>', styles['TableHeader'])],
        [Paragraph('1', styles['TableCellCenter']), 
         Paragraph('Confirm alert and check queue-lag metric', styles['TableCell']),
         Paragraph('Current lag value, trend direction', styles['TableCell'])],
        [Paragraph('2', styles['TableCellCenter']), 
         Paragraph('Check worker count vs. queue depth', styles['TableCell']),
         Paragraph('Worker pool status', styles['TableCell'])],
        [Paragraph('3', styles['TableCellCenter']), 
         Paragraph('Check DB latency', styles['TableCell']),
         Paragraph('DB query times, connection pool', styles['TableCell'])],
        [Paragraph('4', styles['TableCellCenter']), 
         Paragraph('Check for blocked/stuck workers', styles['TableCell']),
         Paragraph('Worker process status', styles['TableCell'])],
    ]
    
    immediate3_table = create_table(immediate3_data, [available_width * 0.10, available_width * 0.45, available_width * 0.45], styles)
    story.append(immediate3_table)
    story.append(Spacer(1, 6))
    story.append(Paragraph('Table 11: Immediate Actions - Queue Overload', styles['Caption']))
    
    story.append(Spacer(1, 12))
    
    # Triage
    story.append(Paragraph('<b>4.3 Triage (5-15 Minutes)</b>', styles['H1']))
    story.append(Spacer(1, 8))
    
    triage3_data = [
        [Paragraph('<b>Check</b>', styles['TableHeader']), 
         Paragraph('<b>Diagnostic</b>', styles['TableHeader']), 
         Paragraph('<b>If Issue Found</b>', styles['TableHeader'])],
        [Paragraph('Active Mitigations', styles['TableCell']), 
         Paragraph('Count by type: Delay, 2FA, GPS, Logging', styles['TableCell']),
         Paragraph('Identify dominant type', styles['TableCell'])],
        [Paragraph('Worker Logs', styles['TableCell']), 
         Paragraph('Error patterns, stuck processes', styles['TableCell']),
         Paragraph('Fix worker issue', styles['TableCell'])],
        [Paragraph('Dead-Letter Queue', styles['TableCell']), 
         Paragraph('Count of failed/undeliverable messages', styles['TableCell']),
         Paragraph('Clear or reprocess', styles['TableCell'])],
        [Paragraph('Recent Deployments', styles['TableCell']), 
         Paragraph('Changes to mitigation service', styles['TableCell']),
         Paragraph('Rollback if needed', styles['TableCell'])],
        [Paragraph('Yellow-Case Volume', styles['TableCell']), 
         Paragraph('Unusual spike in yellow-level transactions', styles['TableCell']),
         Paragraph('May indicate Fraud-Wave (Scenario 1)', styles['TableCell'])],
    ]
    
    triage3_table = create_table(triage3_data, [available_width * 0.25, available_width * 0.40, available_width * 0.35], styles)
    story.append(triage3_table)
    story.append(Spacer(1, 6))
    story.append(Paragraph('Table 12: Triage Checklist - Queue Overload', styles['Caption']))
    
    story.append(Spacer(1, 12))
    
    # Mitigation
    story.append(Paragraph('<b>4.4 Mitigation (15-60 Minutes)</b>', styles['H1']))
    story.append(Spacer(1, 8))
    
    story.append(Paragraph('<b>Option A: Scale Workers</b>', styles['H3']))
    story.append(Paragraph('Increase the number of mitigation worker instances to handle the queue backlog.', styles['Body']))
    story.append(Paragraph('<font face="DejaVuSans">kubectl scale deployment mitigation-worker --replicas=10</font>', styles['BulletItem']))
    
    story.append(Spacer(1, 8))
    story.append(Paragraph('<b>Option B: Enable Priority Mode</b>', styles['H3']))
    story.append(Paragraph('Reconfigure queue to prioritize critical mitigation types:', styles['Body']))
    
    priority_data = [
        [Paragraph('<b>Priority</b>', styles['TableHeader']), 
         Paragraph('<b>Mitigation Type</b>', styles['TableHeader']), 
         Paragraph('<b>Rationale</b>', styles['TableHeader'])],
        [Paragraph('1 (Highest)', styles['TableCellCenter']), 
         Paragraph('2FA Challenge', styles['TableCell']),
         Paragraph('User-blocking, time-sensitive', styles['TableCell'])],
        [Paragraph('2', styles['TableCellCenter']), 
         Paragraph('GPS Verification', styles['TableCell']),
         Paragraph('Transaction completion depends on it', styles['TableCell'])],
        [Paragraph('3 (Lowest)', styles['TableCellCenter']), 
         Paragraph('Delay / Extra Logging', styles['TableCell']),
         Paragraph('Can tolerate some lag', styles['TableCell'])],
    ]
    
    priority_table = create_table(priority_data, [available_width * 0.20, available_width * 0.35, available_width * 0.45], styles)
    story.append(priority_table)
    story.append(Spacer(1, 6))
    story.append(Paragraph('Table 13: Mitigation Priority Order', styles['Caption']))
    
    story.append(Spacer(1, 8))
    story.append(Paragraph('<b>Option C: Temporary Deactivation of Delay Mitigations</b>', styles['H3']))
    story.append(Paragraph(
        'Only in extreme load situations: Temporarily disable Delay mitigations. Gateway will escalate '
        'YELLOW cases to require 2FA instead of Delay. This maintains security while reducing queue load.',
        styles['Body']
    ))
    
    story.append(Spacer(1, 8))
    story.append(Paragraph('<b>Option D: Queue Cleanup</b>', styles['H3']))
    
    cleanup_steps = [
        'Clear Dead-Letter Queue of duplicate/failed events',
        'Remove duplicate mitigation requests (same transaction, same type)',
        'Reset stuck worker processes',
    ]
    
    for step in cleanup_steps:
        story.append(Paragraph(f'<bullet>&bull;</bullet> {step}', styles['BulletItem']))
    
    story.append(PageBreak())
    
    # Recovery
    story.append(Paragraph('<b>4.5 Recovery</b>', styles['H1']))
    story.append(Spacer(1, 8))
    
    recovery3_data = [
        [Paragraph('<b>Indicator</b>', styles['TableHeader']), 
         Paragraph('<b>Target</b>', styles['TableHeader']), 
         Paragraph('<b>Verification</b>', styles['TableHeader'])],
        [Paragraph('Queue Lag', styles['TableCell']), 
         Paragraph('< 2 seconds', styles['TableCell']),
         Paragraph('Queue metrics dashboard', styles['TableCell'])],
        [Paragraph('Worker Stability', styles['TableCell']), 
         Paragraph('No crashes, stable CPU < 70%', styles['TableCell']),
         Paragraph('Worker metrics', styles['TableCell'])],
        [Paragraph('Delay Mitigations', styles['TableCell']), 
         Paragraph('Re-enabled and processing', styles['TableCell']),
         Paragraph('Configuration check', styles['TableCell'])],
        [Paragraph('Audit Events', styles['TableCell']), 
         Paragraph('All mitigation events logged', styles['TableCell']),
         Paragraph('Audit service', styles['TableCell'])],
    ]
    
    recovery3_table = create_table(recovery3_data, [available_width * 0.30, available_width * 0.30, available_width * 0.40], styles)
    story.append(recovery3_table)
    story.append(Spacer(1, 6))
    story.append(Paragraph('Table 14: Recovery Indicators - Queue Overload', styles['Caption']))
    
    story.append(Spacer(1, 12))
    
    # Post-Incident
    story.append(Paragraph('<b>4.6 Post-Incident (24-72 Hours)</b>', styles['H1']))
    story.append(Spacer(1, 8))
    
    post3_incident = [
        '<b>Autoscaling Review:</b> Adjust HPA (Horizontal Pod Autoscaler) thresholds for workers',
        '<b>Queue Monitoring:</b> Add alerts for queue depth and lag trends',
        '<b>Risk Rules Review:</b> Investigate if rules generate too many YELLOW cases',
        '<b>Capacity Planning:</b> Ensure worker pool can handle peak loads + 50% buffer',
        '<b>Dead-Letter Analysis:</b> Identify root cause of failed messages',
    ]
    
    for bullet in post3_incident:
        story.append(Paragraph(f'<bullet>&bull;</bullet> {bullet}', styles['BulletItem']))
    
    story.append(Spacer(1, 12))
    
    # Owner
    story.append(Paragraph('<b>4.7 Owner</b>', styles['H1']))
    story.append(Spacer(1, 8))
    
    owner3_data = [
        [Paragraph('<b>Role</b>', styles['TableHeader']), 
         Paragraph('<b>Responsibility</b>', styles['TableHeader']), 
         Paragraph('<b>Escalation Contact</b>', styles['TableHeader'])],
        [Paragraph('Primary: Mitigation-Service Team', styles['TableCell']), 
         Paragraph('Queue management, worker scaling', styles['TableCell']),
         Paragraph('mitigation-team@cargobit.eu', styles['TableCell'])],
        [Paragraph('Secondary: Platform-Team', styles['TableCell']), 
         Paragraph('Infrastructure scaling, Kubernetes', styles['TableCell']),
         Paragraph('platform-oncall@cargobit.eu', styles['TableCell'])],
        [Paragraph('Tertiary: Security-Engineer', styles['TableCell']), 
         Paragraph('Security impact of temporary deactivations', styles['TableCell']),
         Paragraph('security-oncall@cargobit.eu', styles['TableCell'])],
    ]
    
    owner3_table = create_table(owner3_data, [available_width * 0.30, available_width * 0.40, available_width * 0.30], styles)
    story.append(owner3_table)
    story.append(Spacer(1, 6))
    story.append(Paragraph('Table 15: Ownership Matrix - Queue Overload', styles['Caption']))
    
    story.append(PageBreak())
    
    # ========================================================================
    # SECTION 5: OWNER MATRIX
    # ========================================================================
    story.append(Paragraph('<b>5. Owner Matrix & Escalation Paths</b>', styles['DocTitle']))
    story.append(Spacer(1, 12))
    
    story.append(Paragraph(
        'This section provides a consolidated view of ownership and escalation contacts for all incident types.',
        styles['Body']
    ))
    
    story.append(Spacer(1, 12))
    story.append(Paragraph('<b>5.1 Consolidated Owner Matrix</b>', styles['H1']))
    story.append(Spacer(1, 8))
    
    owner_matrix_data = [
        [Paragraph('<b>Scenario</b>', styles['TableHeader']), 
         Paragraph('<b>Primary</b>', styles['TableHeader']), 
         Paragraph('<b>Secondary</b>', styles['TableHeader']),
         Paragraph('<b>Tertiary</b>', styles['TableHeader'])],
        [Paragraph('High-Risk Event', styles['TableCell']), 
         Paragraph('Security-Engineer', styles['TableCell']),
         Paragraph('On-Call Backend', styles['TableCell']),
         Paragraph('Compliance', styles['TableCell'])],
        [Paragraph('Risk-Engine Down', styles['TableCell']), 
         Paragraph('Backend-Team Risk-Engine', styles['TableCell']),
         Paragraph('Platform-Team', styles['TableCell']),
         Paragraph('Security-Engineer', styles['TableCell'])],
        [Paragraph('Queue Overload', styles['TableCell']), 
         Paragraph('Mitigation-Service Team', styles['TableCell']),
         Paragraph('Platform-Team', styles['TableCell']),
         Paragraph('Security-Engineer', styles['TableCell'])],
    ]
    
    owner_matrix_table = create_table(owner_matrix_data, [available_width * 0.25, available_width * 0.25, available_width * 0.25, available_width * 0.25], styles)
    story.append(owner_matrix_table)
    story.append(Spacer(1, 6))
    story.append(Paragraph('Table 16: Consolidated Owner Matrix', styles['Caption']))
    
    story.append(Spacer(1, 12))
    story.append(Paragraph('<b>5.2 Escalation Timeline</b>', styles['H1']))
    story.append(Spacer(1, 8))
    
    escalation_data = [
        [Paragraph('<b>Time</b>', styles['TableHeader']), 
         Paragraph('<b>Action</b>', styles['TableHeader']), 
         Paragraph('<b>Contact</b>', styles['TableHeader'])],
        [Paragraph('T+0', styles['TableCellCenter']), 
         Paragraph('Alert triggered, On-Call notified', styles['TableCell']),
         Paragraph('PagerDuty / Opsgenie', styles['TableCell'])],
        [Paragraph('T+5min', styles['TableCellCenter']), 
         Paragraph('If no acknowledgment, escalate to Secondary', styles['TableCell']),
         Paragraph('Phone call + Slack', styles['TableCell'])],
        [Paragraph('T+15min', styles['TableCellCenter']), 
         Paragraph('If unresolved, escalate to Tertiary + Manager', styles['TableCell']),
         Paragraph('All channels', styles['TableCell'])],
        [Paragraph('T+30min', styles['TableCellCenter']), 
         Paragraph('If P1 still unresolved, invoke Incident Commander', styles['TableCell']),
         Paragraph('Incident bridge', styles['TableCell'])],
        [Paragraph('T+60min', styles['TableCellCenter']), 
         Paragraph('Executive notification for P1/P2', styles['TableCell']),
         Paragraph('Email + Phone', styles['TableCell'])],
    ]
    
    escalation_table = create_table(escalation_data, [available_width * 0.15, available_width * 0.50, available_width * 0.35], styles)
    story.append(escalation_table)
    story.append(Spacer(1, 6))
    story.append(Paragraph('Table 17: Escalation Timeline', styles['Caption']))
    
    story.append(PageBreak())
    
    # ========================================================================
    # SECTION 6: QUICK REFERENCE CARDS
    # ========================================================================
    story.append(Paragraph('<b>6. Quick Reference Cards</b>', styles['DocTitle']))
    story.append(Spacer(1, 12))
    
    story.append(Paragraph(
        'Print these cards for quick reference during incidents. Each card summarizes the critical steps for one scenario.',
        styles['Body']
    ))
    
    story.append(Spacer(1, 16))
    
    # Card 1: High-Risk Event
    story.append(Paragraph('<b>QUICK REFERENCE CARD 1: HIGH-RISK EVENT</b>', styles['H2']))
    story.append(Spacer(1, 8))
    
    card1_data = [
        [Paragraph('<b>Phase</b>', styles['TableHeader']), 
         Paragraph('<b>Action</b>', styles['TableHeader']), 
         Paragraph('<b>Time</b>', styles['TableHeader'])],
        [Paragraph('Detect', styles['TableCell']), 
         Paragraph('Check: Grafana alert, block rate, support tickets', styles['TableCell']),
         Paragraph('0-2 min', styles['TableCellCenter'])],
        [Paragraph('Immediate', styles['TableCell']), 
         Paragraph('Confirm alert, check dashboard, activate Fraud-Mode', styles['TableCell']),
         Paragraph('0-5 min', styles['TableCellCenter'])],
        [Paragraph('Triage', styles['TableCell']), 
         Paragraph('Scope: regional/global? Pattern? Rules? Engine health?', styles['TableCell']),
         Paragraph('5-15 min', styles['TableCellCenter'])],
        [Paragraph('Mitigate', styles['TableCell']), 
         Paragraph('Block entities, Strict Mode, Geo-block, Notify stakeholders', styles['TableCell']),
         Paragraph('15-60 min', styles['TableCellCenter'])],
        [Paragraph('Recover', styles['TableCell']), 
         Paragraph('Normalize metrics, disable Strict Mode, validate audit', styles['TableCell']),
         Paragraph('As needed', styles['TableCellCenter'])],
        [Paragraph('Post', styles['TableCell']), 
         Paragraph('RCA, rule tuning, compliance review', styles['TableCell']),
         Paragraph('24-72h', styles['TableCellCenter'])],
    ]
    
    card1_table = create_table(card1_data, [available_width * 0.20, available_width * 0.55, available_width * 0.25], styles)
    story.append(card1_table)
    
    story.append(Spacer(1, 20))
    
    # Card 2: Risk-Engine Down
    story.append(Paragraph('<b>QUICK REFERENCE CARD 2: RISK-ENGINE DOWN</b>', styles['H2']))
    story.append(Spacer(1, 8))
    
    card2_data = [
        [Paragraph('<b>Phase</b>', styles['TableHeader']), 
         Paragraph('<b>Action</b>', styles['TableHeader']), 
         Paragraph('<b>Time</b>', styles['TableHeader'])],
        [Paragraph('Detect', styles['TableCell']), 
         Paragraph('Check: timeouts, latency, block rate spike, logs', styles['TableCell']),
         Paragraph('0-2 min', styles['TableCellCenter'])],
        [Paragraph('Immediate', styles['TableCell']), 
         Paragraph('Confirm, check health endpoint, resources, Circuit-Breaker', styles['TableCell']),
         Paragraph('0-5 min', styles['TableCellCenter'])],
        [Paragraph('Triage', styles['TableCell']), 
         Paragraph('Pods? DB? Queue? Deployment? Network?', styles['TableCell']),
         Paragraph('5-15 min', styles['TableCellCenter'])],
        [Paragraph('Mitigate', styles['TableCell']), 
         Paragraph('Restart / Rollback / Gateway Temporary Mode', styles['TableCell']),
         Paragraph('15-60 min', styles['TableCellCenter'])],
        [Paragraph('Recover', styles['TableCell']), 
         Paragraph('Latency < 100ms, errors < 0.1%, Circuit closed', styles['TableCell']),
         Paragraph('As needed', styles['TableCellCenter'])],
        [Paragraph('Post', styles['TableCell']), 
         Paragraph('RCA, regression tests, load test, DB optimization', styles['TableCell']),
         Paragraph('24-72h', styles['TableCellCenter'])],
    ]
    
    card2_table = create_table(card2_data, [available_width * 0.20, available_width * 0.55, available_width * 0.25], styles)
    story.append(card2_table)
    
    story.append(PageBreak())
    
    # Card 3: Queue Overload
    story.append(Paragraph('<b>QUICK REFERENCE CARD 3: QUEUE OVERLOAD</b>', styles['H2']))
    story.append(Spacer(1, 8))
    
    card3_data = [
        [Paragraph('<b>Phase</b>', styles['TableHeader']), 
         Paragraph('<b>Action</b>', styles['TableHeader']), 
         Paragraph('<b>Time</b>', styles['TableHeader'])],
        [Paragraph('Detect', styles['TableCell']), 
         Paragraph('Check: queue lag, delay execution, 2FA delays, worker CPU', styles['TableCell']),
         Paragraph('0-2 min', styles['TableCellCenter'])],
        [Paragraph('Immediate', styles['TableCell']), 
         Paragraph('Confirm alert, check lag, worker count, DB latency', styles['TableCell']),
         Paragraph('0-5 min', styles['TableCellCenter'])],
        [Paragraph('Triage', styles['TableCell']), 
         Paragraph('Mitigation count by type, worker logs, DLQ, deployments', styles['TableCell']),
         Paragraph('5-15 min', styles['TableCellCenter'])],
        [Paragraph('Mitigate', styles['TableCell']), 
         Paragraph('Scale workers / Priority mode / Disable Delay / Queue cleanup', styles['TableCell']),
         Paragraph('15-60 min', styles['TableCellCenter'])],
        [Paragraph('Recover', styles['TableCell']), 
         Paragraph('Lag < 2s, workers stable, Delay re-enabled', styles['TableCell']),
         Paragraph('As needed', styles['TableCellCenter'])],
        [Paragraph('Post', styles['TableCell']), 
         Paragraph('Autoscaling, monitoring, rules review, capacity', styles['TableCell']),
         Paragraph('24-72h', styles['TableCellCenter'])],
    ]
    
    card3_table = create_table(card3_data, [available_width * 0.20, available_width * 0.55, available_width * 0.25], styles)
    story.append(card3_table)
    
    story.append(Spacer(1, 24))
    
    # Key Contacts
    story.append(Paragraph('<b>KEY CONTACTS</b>', styles['H2']))
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
    story.append(Spacer(1, 6))
    story.append(Paragraph('Table 18: Key Contacts Directory', styles['Caption']))
    
    return story

# ============================================================================
# MAIN
# ============================================================================
def main():
    output_dir = '/home/z/my-project/download'
    body_pdf = os.path.join(output_dir, 'incident_playbook_body.pdf')
    cover_html = os.path.join(output_dir, 'incident_playbook_cover.html')
    cover_pdf = os.path.join(output_dir, 'incident_playbook_cover.pdf')
    final_pdf = os.path.join(output_dir, 'CargoBit_Incident_Response_Playbook.pdf')
    
    # 1. Generate Cover HTML
    print("Step 1: Generating cover HTML...")
    with open(cover_html, 'w', encoding='utf-8') as f:
        f.write(COVER_HTML)
    
    # 2. Generate Body PDF
    print("Step 2: Generating body PDF...")
    doc = SimpleDocTemplate(
        body_pdf,
        pagesize=A4,
        leftMargin=1.0 * inch,
        rightMargin=1.0 * inch,
        topMargin=0.8 * inch,
        bottomMargin=0.8 * inch,
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
        '/Title': 'CargoBit Incident Response Playbook',
        '/Author': 'CargoBit Security Operations',
        '/Creator': 'Z.ai PDF Generator',
        '/Subject': 'Operational manual for incident response',
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
