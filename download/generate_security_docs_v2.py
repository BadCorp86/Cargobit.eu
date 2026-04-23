#!/usr/bin/env python3
"""
Generate all three Security Architecture documents:
1. Investor/Board Version
2. Technical Deep-Dive
3. Compliance Documentation
"""

import os
import subprocess
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY, TA_RIGHT
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily
from pypdf import PdfReader, PdfWriter, Transformation

# ━━ Cascade Palette ━━
PAGE_BG = colors.HexColor('#f4f3f2')
SECTION_BG = colors.HexColor('#ecebea')
CARD_BG = colors.HexColor('#ecebe8')
TABLE_STRIPE = colors.HexColor('#f1f0ef')
HEADER_FILL = colors.HexColor('#544c37')
COVER_BLOCK = colors.HexColor('#625a42')
BORDER = colors.HexColor('#c3bca8')
ACCENT = colors.HexColor('#5831cc')
ACCENT_2 = colors.HexColor('#45b27b')
TEXT_PRIMARY = colors.HexColor('#191817')
TEXT_MUTED = colors.HexColor('#828078')

PAGE_WIDTH, PAGE_HEIGHT = A4
LEFT_MARGIN = 0.8 * inch
RIGHT_MARGIN = 0.8 * inch
TOP_MARGIN = 0.7 * inch
BOTTOM_MARGIN = 0.7 * inch
CONTENT_WIDTH = PAGE_WIDTH - LEFT_MARGIN - RIGHT_MARGIN

pdfmetrics.registerFont(TTFont('Times New Roman', '/usr/share/fonts/truetype/english/Times-New-Roman.ttf'))
pdfmetrics.registerFont(TTFont('Calibri', '/usr/share/fonts/truetype/english/calibri-regular.ttf'))
pdfmetrics.registerFont(TTFont('SimHei', '/usr/share/fonts/truetype/chinese/SimHei.ttf'))
registerFontFamily('Times New Roman', normal='Times New Roman', bold='Times New Roman')

def create_styles():
    styles = getSampleStyleSheet()
    
    styles.add(ParagraphStyle(name='H1', fontName='Times New Roman', fontSize=18, leading=24,
        textColor=HEADER_FILL, alignment=TA_LEFT, spaceBefore=16, spaceAfter=10))
    styles.add(ParagraphStyle(name='H2', fontName='Times New Roman', fontSize=14, leading=20,
        textColor=TEXT_PRIMARY, alignment=TA_LEFT, spaceBefore=12, spaceAfter=8))
    styles.add(ParagraphStyle(name='H3', fontName='Times New Roman', fontSize=12, leading=16,
        textColor=TEXT_MUTED, alignment=TA_LEFT, spaceBefore=8, spaceAfter=6))
    styles.add(ParagraphStyle(name='Body', fontName='Times New Roman', fontSize=10.5, leading=16,
        textColor=TEXT_PRIMARY, alignment=TA_JUSTIFY, spaceBefore=0, spaceAfter=8))
    styles.add(ParagraphStyle(name='Bullet', fontName='Times New Roman', fontSize=10.5, leading=15,
        textColor=TEXT_PRIMARY, alignment=TA_LEFT, spaceBefore=2, spaceAfter=2, leftIndent=20))
    styles.add(ParagraphStyle(name='TableHeader', fontName='Times New Roman', fontSize=10, leading=14,
        textColor=colors.white, alignment=TA_CENTER))
    styles.add(ParagraphStyle(name='TableCell', fontName='Times New Roman', fontSize=9.5, leading=13,
        textColor=TEXT_PRIMARY, alignment=TA_LEFT))
    styles.add(ParagraphStyle(name='TableCellCenter', fontName='Times New Roman', fontSize=9.5, leading=13,
        textColor=TEXT_PRIMARY, alignment=TA_CENTER))
    styles.add(ParagraphStyle(name='Caption', fontName='Times New Roman', fontSize=9, leading=12,
        textColor=TEXT_MUTED, alignment=TA_CENTER, spaceBefore=4, spaceAfter=12))
    styles.add(ParagraphStyle(name='Executive', fontName='Times New Roman', fontSize=11, leading=18,
        textColor=TEXT_PRIMARY, alignment=TA_JUSTIFY, spaceBefore=0, spaceAfter=12))
    
    return styles

def create_table(data, col_widths, header_rows=1):
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
    for i in range(header_rows, len(data)):
        if i % 2 == 0:
            style_commands.append(('BACKGROUND', (0, i), (-1, i), TABLE_STRIPE))
        else:
            style_commands.append(('BACKGROUND', (0, i), (-1, i), colors.white))
    table.setStyle(TableStyle(style_commands))
    return table

# ========== DOCUMENT 1: INVESTOR/BOARD VERSION ==========
def build_investor_document():
    styles = create_styles()
    story = []
    
    story.append(Paragraph("Executive Summary", styles['H1']))
    exec_text = """Fraud ist einer der größten Kostenblöcke in digitalen Plattformen. Regulatorische Anforderungen steigen (ISO, SOC2, GDPR), und Sicherheitsvorfälle sind geschäftskritisch. Der <b>Hybrid Security Layer</b> ist unsere Antwort: Eine einheitliche Sicherheitsarchitektur, die Fraud in Echtzeit erkennt, risk-basierte Entscheidungen trifft, Compliance-Audits vereinfacht und operationale Risiken reduziert."""
    story.append(Paragraph(exec_text, styles['Executive']))
    story.append(Spacer(1, 12))
    
    story.append(Paragraph("1. Why This Matters", styles['H1']))
    why_items = [
        "<b>Fraud-Kosten</b>: Einer der größten Kostenblöcke in digitalen Plattformen",
        "<b>Regulatorischer Druck</b>: ISO 27001, SOC2, GDPR Anforderungen steigen",
        "<b>Geschäftskritische Vorfälle</b>: Sicherheitsincidents bedrohen Reputation und Vertrauen"
    ]
    for item in why_items:
        story.append(Paragraph(f"• {item}", styles['Bullet']))
    story.append(Spacer(1, 8))
    
    story.append(Paragraph("2. What We Built", styles['H1']))
    built_text = """Ein <b>Hybrid Security Layer</b>, der fünf kritische Sicherheitsfunktionen in einer einheitlichen Plattform vereint:"""
    story.append(Paragraph(built_text, styles['Body']))
    
    built_data = [
        [Paragraph('<b>Komponente</b>', styles['TableHeader']),
         Paragraph('<b>Funktion</b>', styles['TableHeader']),
         Paragraph('<b>Business Value</b>', styles['TableHeader'])],
        [Paragraph('Security Gateway', styles['TableCell']),
         Paragraph('Central Decision Point', styles['TableCell']),
         Paragraph('Konsistente Sicherheitslogik', styles['TableCell'])],
        [Paragraph('Risk Engine', styles['TableCell']),
         Paragraph('Real-Time Scoring', styles['TableCell']),
         Paragraph('Automatisierte Risikoentscheidungen', styles['TableCell'])],
        [Paragraph('Mitigation Service', styles['TableCell']),
         Paragraph('Adaptive Controls', styles['TableCell']),
         Paragraph('Balance zwischen Sicherheit und UX', styles['TableCell'])],
        [Paragraph('Audit Service', styles['TableCell']),
         Paragraph('Immutable Ledger', styles['TableCell']),
         Paragraph('Audit-Ready für Compliance', styles['TableCell'])],
        [Paragraph('Notification Service', styles['TableCell']),
         Paragraph('Alerts & Escalations', styles['TableCell']),
         Paragraph('Schnelle Reaktion auf Incidents', styles['TableCell'])]
    ]
    story.append(create_table(built_data, [CONTENT_WIDTH * 0.25, CONTENT_WIDTH * 0.35, CONTENT_WIDTH * 0.40]))
    story.append(Spacer(1, 6))
    story.append(Paragraph("Tabelle 1: Security-Layer Komponenten", styles['Caption']))
    story.append(Spacer(1, 12))
    
    story.append(Paragraph("3. Strategic Benefits", styles['H1']))
    benefits_data = [
        [Paragraph('<b>Benefit</b>', styles['TableHeader']),
         Paragraph('<b>Metrik</b>', styles['TableHeader']),
         Paragraph('<b>Impact</b>', styles['TableHeader'])],
        [Paragraph('Fraud-Reduktion', styles['TableCell']),
         Paragraph('30-60%', styles['TableCellCenter']),
         Paragraph('Direkte Kostenersparnis', styles['TableCell'])],
        [Paragraph('Compliance-Readiness', styles['TableCell']),
         Paragraph('ISO/SOC2-aligned', styles['TableCellCenter']),
         Paragraph('Reduzierte Audit-Kosten', styles['TableCell'])],
        [Paragraph('Operational Efficiency', styles['TableCell']),
         Paragraph('80% weniger manuelle Reviews', styles['TableCellCenter']),
         Paragraph('Skalierbare Operations', styles['TableCell'])],
        [Paragraph('Performance', styles['TableCell']),
         Paragraph('1000+ RPS', styles['TableCellCenter']),
         Paragraph('Horizontale Skalierung', styles['TableCell'])]
    ]
    story.append(create_table(benefits_data, [CONTENT_WIDTH * 0.30, CONTENT_WIDTH * 0.25, CONTENT_WIDTH * 0.45]))
    story.append(Spacer(1, 6))
    story.append(Paragraph("Tabelle 2: Strategic Benefits", styles['Caption']))
    story.append(Spacer(1, 12))
    
    story.append(Paragraph("4. Competitive Advantage", styles['H1']))
    comp_items = [
        "<b>Einheitliche Sicherheitslogik</b> → Schnelleres Produktwachstum",
        "<b>Weniger technische Schulden</b> → Geringere Wartungskosten",
        "<b>Bessere Auditierbarkeit</b> → Geringere regulatorische Risiken"
    ]
    for item in comp_items:
        story.append(Paragraph(f"• {item}", styles['Bullet']))
    story.append(Spacer(1, 12))
    
    story.append(Paragraph("5. Investment Case", styles['H1']))
    invest_text = """Die Investition in den Hybrid Security Layer zahlt sich durch:</p><p>• <b>Reduzierte langfristige Kosten</b> durch Fraud-Prävention<br/>• <b>Erhöhtes Plattformvertrauen</b> bei Kunden und Partnern<br/>• <b>Ermöglicht Expansion</b> in regulierte Märkte (Finanzwesen, Healthcare)</p><p>Diese Sicherheitsarchitektur ist ein <b>strategischer Wettbewerbsvorteil</b>, kein reines IT-Projekt."""
    story.append(Paragraph(invest_text, styles['Body']))
    
    return story

# ========== DOCUMENT 2: TECHNICAL DEEP-DIVE ==========
def build_technical_document():
    styles = create_styles()
    story = []
    
    story.append(Paragraph("1. Core Architecture", styles['H1']))
    arch_text = """Die Core Architecture besteht aus fünf Services, die über definierte APIs kommunizieren. Der <b>Security Gateway</b> fungiert als Decision Layer, die <b>Risk Engine</b> liefert Real-Time Scoring, der <b>Mitigation Service</b> führt adaptive Controls aus, der <b>Audit Service</b> speichert immutable Events, und der <b>Notification Service</b> versendet Alerts."""
    story.append(Paragraph(arch_text, styles['Body']))
    story.append(Spacer(1, 8))
    
    arch_data = [
        [Paragraph('<b>Service</b>', styles['TableHeader']),
         Paragraph('<b>Port</b>', styles['TableHeader']),
         Paragraph('<b>Tech Stack</b>', styles['TableHeader']),
         Paragraph('<b>Scaling</b>', styles['TableHeader'])],
        [Paragraph('Security Gateway', styles['TableCell']),
         Paragraph('3004', styles['TableCellCenter']),
         Paragraph('Node.js / Express', styles['TableCell']),
         Paragraph('Horizontal', styles['TableCell'])],
        [Paragraph('Risk Engine', styles['TableCell']),
         Paragraph('3003', styles['TableCellCenter']),
         Paragraph('Python / FastAPI', styles['TableCell']),
         Paragraph('Horizontal', styles['TableCell'])],
        [Paragraph('Mitigation Service', styles['TableCell']),
         Paragraph('3005', styles['TableCellCenter']),
         Paragraph('Node.js / BullMQ', styles['TableCell']),
         Paragraph('Worker Pool', styles['TableCell'])],
        [Paragraph('Audit Service', styles['TableCell']),
         Paragraph('3006', styles['TableCellCenter']),
         Paragraph('Go / PostgreSQL', styles['TableCell']),
         Paragraph('Write-Sharding', styles['TableCell'])],
        [Paragraph('Notification Service', styles['TableCell']),
         Paragraph('3007', styles['TableCellCenter']),
         Paragraph('Node.js / SendGrid', styles['TableCell']),
         Paragraph('Horizontal', styles['TableCell'])]
    ]
    story.append(create_table(arch_data, [CONTENT_WIDTH * 0.25, CONTENT_WIDTH * 0.12, CONTENT_WIDTH * 0.35, CONTENT_WIDTH * 0.28]))
    story.append(Spacer(1, 6))
    story.append(Paragraph("Tabelle 1: Service Architecture", styles['Caption']))
    story.append(Spacer(1, 12))
    
    story.append(Paragraph("2. Data Flows", styles['H1']))
    flow_text = """Der Data Flow folgt einem klaren Muster: <b>Domain → Gateway → Risk → Mitigation → Audit → Notification</b>. Alle Services verwenden Correlation-IDs für Traceability. Requests sind idempotent, was sichere Retries ermöglicht."""
    story.append(Paragraph(flow_text, styles['Body']))
    story.append(Spacer(1, 8))
    
    flow_items = [
        "<b>Correlation-IDs</b>: Durchgängige Trace-ID über alle Services",
        "<b>Idempotency</b>: Sichere Retries ohne Side-Effects",
        "<b>Async Processing</b>: Queue-basierte Mitigations für Non-Blocking UX"
    ]
    for item in flow_items:
        story.append(Paragraph(f"• {item}", styles['Bullet']))
    story.append(Spacer(1, 12))
    
    story.append(Paragraph("3. Reliability Patterns", styles['H1']))
    rel_data = [
        [Paragraph('<b>Pattern</b>', styles['TableHeader']),
         Paragraph('<b>Implementation</b>', styles['TableHeader']),
         Paragraph('<b>Ziel</b>', styles['TableHeader'])],
        [Paragraph('Circuit Breaker', styles['TableCell']),
         Paragraph('Hystrix / resilience4j', styles['TableCell']),
         Paragraph('Cascading Failures verhindern', styles['TableCell'])],
        [Paragraph('Retries + Backoff', styles['TableCell']),
         Paragraph('Exponential Backoff, Jitter', styles['TableCell']),
         Paragraph('Transient Errors handhaben', styles['TableCell'])],
        [Paragraph('Horizontal Scaling', styles['TableCell']),
         Paragraph('Kubernetes HPA', styles['TableCell']),
         Paragraph('Traffic-Spitzen abfangen', styles['TableCell'])],
        [Paragraph('Queue-Based Mitigation', styles['TableCell']),
         Paragraph('Redis / RabbitMQ', styles['TableCell']),
         Paragraph('Asynchrone Verarbeitung', styles['TableCell'])]
    ]
    story.append(create_table(rel_data, [CONTENT_WIDTH * 0.28, CONTENT_WIDTH * 0.35, CONTENT_WIDTH * 0.37]))
    story.append(Spacer(1, 6))
    story.append(Paragraph("Tabelle 2: Reliability Patterns", styles['Caption']))
    story.append(Spacer(1, 12))
    
    story.append(Paragraph("4. Security Controls", styles['H1']))
    sec_items = [
        "<b>mTLS</b>: Service-to-Service Encryption",
        "<b>Service-JWT</b>: 5-min expiry, automatic rotation",
        "<b>AES-256 at rest</b>: Database encryption",
        "<b>PFS enforced</b>: Perfect Forward Secrecy"
    ]
    for item in sec_items:
        story.append(Paragraph(f"• {item}", styles['Bullet']))
    story.append(Spacer(1, 12))
    
    story.append(Paragraph("5. Observability", styles['H1']))
    obs_data = [
        [Paragraph('<b>Komponente</b>', styles['TableHeader']),
         Paragraph('<b>KPI</b>', styles['TableHeader']),
         Paragraph('<b>Target</b>', styles['TableHeader'])],
        [Paragraph('Gateway', styles['TableCell']),
         Paragraph('P95 Latency', styles['TableCell']),
         Paragraph('< 120 ms', styles['TableCellCenter'])],
        [Paragraph('Risk Engine', styles['TableCell']),
         Paragraph('P95 Latency', styles['TableCell']),
         Paragraph('< 80 ms', styles['TableCellCenter'])],
        [Paragraph('Mitigation Queue', styles['TableCell']),
         Paragraph('Queue Lag', styles['TableCell']),
         Paragraph('< 2s', styles['TableCellCenter'])],
        [Paragraph('Audit Service', styles['TableCell']),
         Paragraph('Write Latency', styles['TableCell']),
         Paragraph('< 50 ms', styles['TableCellCenter'])]
    ]
    story.append(create_table(obs_data, [CONTENT_WIDTH * 0.30, CONTENT_WIDTH * 0.35, CONTENT_WIDTH * 0.35]))
    story.append(Spacer(1, 6))
    story.append(Paragraph("Tabelle 3: Performance KPIs", styles['Caption']))
    story.append(Spacer(1, 12))
    
    story.append(Paragraph("6. Operational Readiness", styles['H1']))
    ops_items = [
        "<b>Incident Playbooks</b>: Für alle 5 Haupt-Szenarien",
        "<b>On-Call Runbook</b>: Standard-Checklisten für Engineers",
        "<b>Grafana Dashboards</b>: Real-Time Monitoring",
        "<b>Alertmanager Integration</b>: Multi-Channel Alerts"
    ]
    for item in ops_items:
        story.append(Paragraph(f"• {item}", styles['Bullet']))
    
    return story

# ========== DOCUMENT 3: COMPLIANCE DOCUMENTATION ==========
def build_compliance_document():
    styles = create_styles()
    story = []
    
    story.append(Paragraph("1. Scope", styles['H1']))
    scope_text = """Dieses Dokument definiert die Compliance-Abdeckung des <b>Hybrid Security Layer</b>. Der Scope umfasst die Services: Security Gateway, Risk Engine, Mitigation Service, Audit Service und Notification Service. Alle Services sind in der Cloud-Infrastruktur gehostet und unterliegen den entsprechenden Security Controls."""
    story.append(Paragraph(scope_text, styles['Body']))
    story.append(Spacer(1, 12))
    
    story.append(Paragraph("2. Controls Mapping", styles['H1']))
    
    story.append(Paragraph("2.1 ISO 27001 Mapping", styles['H2']))
    iso_data = [
        [Paragraph('<b>Kapitel</b>', styles['TableHeader']),
         Paragraph('<b>Control</b>', styles['TableHeader']),
         Paragraph('<b>Implementation</b>', styles['TableHeader'])],
        [Paragraph('A.5', styles['TableCell']),
         Paragraph('Policies', styles['TableCell']),
         Paragraph('Security Policies dokumentiert, jährlich reviewt', styles['TableCell'])],
        [Paragraph('A.8', styles['TableCell']),
         Paragraph('Asset Management', styles['TableCell']),
         Paragraph('Service-Inventar, Data Classification Policy', styles['TableCell'])],
        [Paragraph('A.12', styles['TableCell']),
         Paragraph('Operations Security', styles['TableCell']),
         Paragraph('Monitoring, Logging, Incident Response', styles['TableCell'])],
        [Paragraph('A.16', styles['TableCell']),
         Paragraph('Incident Management', styles['TableCell']),
         Paragraph('Playbooks + Runbooks, 24/7 On-Call', styles['TableCell'])]
    ]
    story.append(create_table(iso_data, [CONTENT_WIDTH * 0.12, CONTENT_WIDTH * 0.28, CONTENT_WIDTH * 0.60]))
    story.append(Spacer(1, 6))
    story.append(Paragraph("Tabelle 1: ISO 27001 Controls Mapping", styles['Caption']))
    story.append(Spacer(1, 8))
    
    story.append(Paragraph("2.2 SOC2 Mapping", styles['H2']))
    soc2_data = [
        [Paragraph('<b>Trust Service</b>', styles['TableHeader']),
         Paragraph('<b>Control</b>', styles['TableHeader']),
         Paragraph('<b>Implementation</b>', styles['TableHeader'])],
        [Paragraph('Security', styles['TableCell']),
         Paragraph('Access Controls, Encryption, Audit Logs', styles['TableCell']),
         Paragraph('RBAC, AES-256, Immutable Audit Trail', styles['TableCell'])],
        [Paragraph('Availability', styles['TableCell']),
         Paragraph('Autoscaling, Circuit Breakers', styles['TableCell']),
         Paragraph('Kubernetes HPA, resilience4j', styles['TableCell'])],
        [Paragraph('Processing Integrity', styles['TableCell']),
         Paragraph('Risk-Scoring, Mitigations', styles['TableCell']),
         Paragraph('Deterministic Rules, State Machines', styles['TableCell'])],
        [Paragraph('Confidentiality', styles['TableCell']),
         Paragraph('Data Minimization, Encryption', styles['TableCell']),
         Paragraph('PII-Scrubbing, TLS 1.3', styles['TableCell'])],
        [Paragraph('Privacy', styles['TableCell']),
         Paragraph('Retention Policies', styles['TableCell']),
         Paragraph('Audit: 5 Jahre, Risk: 2 Jahre, Mitigation: 1 Jahr', styles['TableCell'])]
    ]
    story.append(create_table(soc2_data, [CONTENT_WIDTH * 0.18, CONTENT_WIDTH * 0.35, CONTENT_WIDTH * 0.47]))
    story.append(Spacer(1, 6))
    story.append(Paragraph("Tabelle 2: SOC2 Controls Mapping", styles['Caption']))
    story.append(Spacer(1, 12))
    
    story.append(Paragraph("3. Key Compliance Features", styles['H1']))
    features_items = [
        "<b>Immutable Audit-Trail</b>: WORM-Storage, Hash-Chain pro Entity",
        "<b>Least Privilege RBAC</b>: Granulare Berechtigungen, SoD Enforcement",
        "<b>Zero-Trust Service-Auth</b>: mTLS + Service-JWT mit 5-min expiry",
        "<b>Data Retention Policies</b>: Automatische Löschung nach definierter Zeit",
        "<b>Secrets Management</b>: Vault-basiert, 24h Rotation"
    ]
    for item in features_items:
        story.append(Paragraph(f"• {item}", styles['Bullet']))
    story.append(Spacer(1, 12))
    
    story.append(Paragraph("4. Evidence Artifacts", styles['H1']))
    artifacts_data = [
        [Paragraph('<b>Artifact</b>', styles['TableHeader']),
         Paragraph('<b>Format</b>', styles['TableHeader']),
         Paragraph('<b>Location</b>', styles['TableHeader'])],
        [Paragraph('Architecture Diagrams', styles['TableCell']),
         Paragraph('C4 Model / PNG', styles['TableCell']),
         Paragraph('Confluence / Git', styles['TableCell'])],
        [Paragraph('Audit Log Samples', styles['TableCell']),
         Paragraph('JSON', styles['TableCell']),
         Paragraph('Secure Storage', styles['TableCell'])],
        [Paragraph('Risk Rules Documentation', styles['TableCell']),
         Paragraph('Markdown / YAML', styles['TableCell']),
         Paragraph('Git Repository', styles['TableCell'])],
        [Paragraph('Incident Reports', styles['TableCell']),
         Paragraph('PDF', styles['TableCell']),
         Paragraph('Secure Storage', styles['TableCell'])],
        [Paragraph('Monitoring Dashboards', styles['TableCell']),
         Paragraph('Grafana', styles['TableCell']),
         Paragraph('Internal URL', styles['TableCell'])],
        [Paragraph('CI/CD Test Matrix', styles['TableCell']),
         Paragraph('JUnit / Allure', styles['TableCell']),
         Paragraph('CI System', styles['TableCell'])]
    ]
    story.append(create_table(artifacts_data, [CONTENT_WIDTH * 0.35, CONTENT_WIDTH * 0.25, CONTENT_WIDTH * 0.40]))
    story.append(Spacer(1, 6))
    story.append(Paragraph("Tabelle 3: Evidence Artifacts", styles['Caption']))
    story.append(Spacer(1, 12))
    
    story.append(Paragraph("5. Risk Management", styles['H1']))
    risk_text = """Das Risk Management folgt einem strukturierten Ansatz:</p><p>• <b>STRIDE Threat Model</b>: Regelmäßige Analyse aller Threat-Vektoren<br/>• <b>Mitigation Controls</b>: Mapping von Threats zu Controls<br/>• <b>Override Governance</b>: 4-Augen-Prinzip für Risk-Overrides<br/>• <b>Fraud Detection Rules</b>: Kontinuierliche Optimierung basierend auf Incidents"""
    story.append(Paragraph(risk_text, styles['Body']))
    
    return story

# ========== COVER GENERATION ==========
def create_cover_html(title, subtitle, doc_type):
    return f'''<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>{title}</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Playfair+Display:wght@700&display=swap" rel="stylesheet">
    <style>
        :root {{
            --primary: #544c37;
            --accent: #5831cc;
            --text: #191817;
            --muted: #828078;
            --bg: #f4f3f2;
        }}
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        @page {{ size: 794px 1123px; margin: 0; }}
        html, body {{
            width: 794px;
            height: 1123px;
            background: var(--bg);
            font-family: 'Inter', sans-serif;
            overflow: hidden;
        }}
        .cover {{
            position: relative;
            width: 100%;
            height: 100%;
        }}
        .watermark {{
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
        }}
        .color-dash {{
            position: absolute;
            left: 95px;
            top: 168px;
            width: 50px;
            height: 5px;
            background: var(--accent);
        }}
        .meta-line {{
            position: absolute;
            left: 95px;
            top: 760px;
            width: 2px;
            height: 120px;
            background: var(--primary);
            opacity: 0.3;
        }}
        .content {{
            position: absolute;
            left: 95px;
            top: 0;
            bottom: 0;
            width: 600px;
        }}
        .kicker {{
            position: absolute;
            top: 190px;
            font-size: 13px;
            font-weight: 400;
            letter-spacing: 3px;
            text-transform: uppercase;
            color: var(--muted);
            opacity: 0.6;
        }}
        .title {{
            position: absolute;
            top: 250px;
            font-family: 'Playfair Display', serif;
            font-size: 44px;
            font-weight: 700;
            line-height: 1.2;
            color: var(--text);
            max-width: 500px;
        }}
        .title-line {{
            display: block;
            margin-bottom: 8px;
        }}
        .summary {{
            position: absolute;
            top: 480px;
            font-size: 15px;
            line-height: 1.7;
            color: var(--text);
            max-width: 480px;
            opacity: 0.85;
        }}
        .meta {{
            position: absolute;
            top: 770px;
            left: 115px;
            font-size: 14px;
            line-height: 2.0;
            color: var(--text);
        }}
        .footer {{
            position: absolute;
            bottom: 95px;
            right: 95px;
            font-size: 12px;
            letter-spacing: 2px;
            text-transform: uppercase;
            color: var(--muted);
            opacity: 0.6;
        }}
    </style>
</head>
<body>
    <div class="cover">
        <div class="watermark">SECURITY</div>
        <div class="color-dash"></div>
        <div class="meta-line"></div>
        <div class="content">
            <div class="kicker">{doc_type}</div>
            <div class="title">{title}</div>
            <div class="summary">{subtitle}</div>
            <div class="meta">
                <span>CargoBit Platform</span><br/>
                <span>Version 1.0</span><br/>
                <span>April 2026</span>
            </div>
        </div>
        <div class="footer">Confidential</div>
    </div>
</body>
</html>'''

def render_cover(html_path, pdf_path):
    scripts_dir = "/home/z/my-project/skills/pdf/scripts"
    subprocess.run(['node', os.path.join(scripts_dir, 'html2poster.js'), html_path, '--output', pdf_path, '--width', '794px'], check=True)

def normalize_page_to_a4(page):
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
    writer = PdfWriter()
    cover_page = PdfReader(cover_pdf).pages[0]
    writer.add_page(normalize_page_to_a4(cover_page))
    for page in PdfReader(body_pdf).pages:
        writer.add_page(normalize_page_to_a4(page))
    writer.add_metadata({'/Title': 'Security Architecture', '/Author': 'CargoBit', '/Creator': 'Z.ai'})
    with open(output_pdf, 'wb') as f:
        writer.write(f)

def generate_document(name, doc_type, title, subtitle, build_func):
    output_dir = "/home/z/my-project/download"
    
    cover_html = os.path.join(output_dir, f"{name}_cover.html")
    cover_pdf = os.path.join(output_dir, f"{name}_cover.pdf")
    body_pdf = os.path.join(output_dir, f"{name}_body.pdf")
    final_pdf = os.path.join(output_dir, f"CargoBit_{name}.pdf")
    
    # Generate cover
    html_content = create_cover_html(title, subtitle, doc_type)
    with open(cover_html, 'w') as f:
        f.write(html_content)
    render_cover(cover_html, cover_pdf)
    
    # Generate body
    doc = SimpleDocTemplate(body_pdf, pagesize=A4, leftMargin=LEFT_MARGIN, rightMargin=RIGHT_MARGIN,
        topMargin=TOP_MARGIN, bottomMargin=BOTTOM_MARGIN)
    doc.build(build_func())
    
    # Merge
    merge_pdfs(cover_pdf, body_pdf, final_pdf)
    
    # Cleanup
    os.remove(cover_html)
    os.remove(cover_pdf)
    os.remove(body_pdf)
    
    import os as os_module
    size = os_module.path.getsize(final_pdf)
    print(f"✅ {name}: {final_pdf} ({size/1024:.1f} KB)")

def main():
    print("Generating Security Architecture Documents...")
    
    # Document 1: Investor/Board Version
    generate_document(
        "Investor_Board_Summary",
        "Investor & Board Documentation",
        "Hybrid Security Layer<br/>Investor Summary",
        "Strategic overview of the security platform investment for board members and investors.",
        build_investor_document
    )
    
    # Document 2: Technical Deep-Dive
    generate_document(
        "Technical_DeepDive",
        "Engineering Documentation",
        "Security Architecture<br/>Technical Deep-Dive",
        "Detailed technical documentation for engineering leads covering architecture, data flows, and operational practices.",
        build_technical_document
    )
    
    # Document 3: Compliance Documentation
    generate_document(
        "Compliance_Documentation",
        "ISO 27001 / SOC2 Documentation",
        "Security Architecture<br/>Compliance Documentation",
        "Audit-ready documentation mapping security controls to ISO 27001 and SOC2 requirements.",
        build_compliance_document
    )
    
    print("\n✅ All documents generated successfully!")

if __name__ == "__main__":
    main()
