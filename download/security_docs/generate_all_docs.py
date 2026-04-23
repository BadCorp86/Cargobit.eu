#!/usr/bin/env python3
"""Generate all 4 Security Architecture documents"""
import os
import subprocess
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily
from pypdf import PdfReader, PdfWriter, Transformation

# Palette
HEADER_FILL = colors.HexColor('#544c37')
ACCENT = colors.HexColor('#5831cc')
TEXT_PRIMARY = colors.HexColor('#191817')
TEXT_MUTED = colors.HexColor('#828078')
TABLE_STRIPE = colors.HexColor('#f1f0ef')
BORDER = colors.HexColor('#c3bca8')

PAGE_WIDTH, PAGE_HEIGHT = A4
LEFT_MARGIN = RIGHT_MARGIN = 0.8 * inch
TOP_MARGIN = BOTTOM_MARGIN = 0.7 * inch
CONTENT_WIDTH = PAGE_WIDTH - LEFT_MARGIN - RIGHT_MARGIN

pdfmetrics.registerFont(TTFont('Times New Roman', '/usr/share/fonts/truetype/english/Times-New-Roman.ttf'))
registerFontFamily('Times New Roman', normal='Times New Roman', bold='Times New Roman')

def styles():
    s = getSampleStyleSheet()
    s.add(ParagraphStyle(name='H1', fontName='Times New Roman', fontSize=18, leading=24, textColor=HEADER_FILL, spaceBefore=16, spaceAfter=10))
    s.add(ParagraphStyle(name='H2', fontName='Times New Roman', fontSize=14, leading=20, textColor=TEXT_PRIMARY, spaceBefore=12, spaceAfter=8))
    s.add(ParagraphStyle(name='Body', fontName='Times New Roman', fontSize=10.5, leading=16, textColor=TEXT_PRIMARY, alignment=TA_JUSTIFY, spaceAfter=8))
    s.add(ParagraphStyle(name='DocBullet', fontName='Times New Roman', fontSize=10.5, leading=15, textColor=TEXT_PRIMARY, leftIndent=20))
    s.add(ParagraphStyle(name='TableHeader', fontName='Times New Roman', fontSize=10, textColor=colors.white, alignment=TA_CENTER))
    s.add(ParagraphStyle(name='TableCell', fontName='Times New Roman', fontSize=9.5, leading=13, textColor=TEXT_PRIMARY))
    s.add(ParagraphStyle(name='Exec', fontName='Times New Roman', fontSize=11, leading=18, textColor=TEXT_PRIMARY, alignment=TA_JUSTIFY, spaceAfter=12))
    return s

def tbl(data, widths):
    t = Table(data, colWidths=widths, hAlign='CENTER')
    cmds = [('BACKGROUND', (0,0), (-1,0), HEADER_FILL), ('TEXTCOLOR', (0,0), (-1,0), colors.white),
            ('GRID', (0,0), (-1,-1), 0.5, BORDER), ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('LEFTPADDING', (0,0), (-1,-1), 8), ('RIGHTPADDING', (0,0), (-1,-1), 8),
            ('TOPPADDING', (0,0), (-1,-1), 6), ('BOTTOMPADDING', (0,0), (-1,-1), 6)]
    for i in range(1, len(data)):
        cmds.append(('BACKGROUND', (0,i), (-1,i), TABLE_STRIPE if i%2==0 else colors.white))
    t.setStyle(TableStyle(cmds))
    return t

def cover_html(title, subtitle):
    return f'''<!DOCTYPE html><html><head><meta charset="UTF-8"><title>{title}</title>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&display=swap" rel="stylesheet">
<style>:root{{--primary:#544c37;--accent:#5831cc;--text:#191817;--muted:#828078;--bg:#f4f3f2;}}
*{{margin:0;padding:0;box-sizing:border-box;}}@page{{size:794px 1123px;margin:0;}}
html,body{{width:794px;height:1123px;background:var(--bg);font-family:Inter,sans-serif;overflow:hidden;}}
.watermark{{position:absolute;right:40px;top:50%;transform:translateY(-50%) rotate(90deg);font-family:'Playfair Display',serif;
font-size:160px;font-weight:700;color:var(--primary);opacity:0.04;white-space:nowrap;}}
.color-dash{{position:absolute;left:95px;top:168px;width:50px;height:5px;background:var(--accent);}}
.meta-line{{position:absolute;left:95px;top:760px;width:2px;height:120px;background:var(--primary);opacity:0.3;}}
.content{{position:absolute;left:95px;top:0;bottom:0;width:600px;}}
.kicker{{position:absolute;top:190px;font-size:13px;letter-spacing:3px;text-transform:uppercase;color:var(--muted);opacity:0.6;}}
.title{{position:absolute;top:250px;font-family:'Playfair Display',serif;font-size:44px;font-weight:700;line-height:1.2;color:var(--text);max-width:500px;}}
.summary{{position:absolute;top:480px;font-size:15px;line-height:1.7;color:var(--text);max-width:480px;opacity:0.85;}}
.meta{{position:absolute;top:770px;left:115px;font-size:14px;line-height:2.0;color:var(--text);}}
.footer{{position:absolute;bottom:95px;right:95px;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:var(--muted);opacity:0.6;}}</style>
</head><body><div class="watermark">SECURITY</div><div class="color-dash"></div><div class="meta-line"></div>
<div class="content"><div class="kicker">CargoBit Security</div><div class="title">{title}</div>
<div class="summary">{subtitle}</div><div class="meta"><span>CargoBit Platform</span><br/><span>Version 1.0</span><br/><span>April 2026</span></div></div>
<div class="footer">Confidential</div></body></html>'''

def render_cover(html_path, pdf_path):
    subprocess.run(['node', '/home/z/my-project/skills/pdf/scripts/html2poster.js', html_path, '--output', pdf_path, '--width', '794px'], check=True, capture_output=True)

def normalize(page):
    A4_W, A4_H = 595.28, 841.89
    w, h = float(page.mediabox.width), float(page.mediabox.height)
    if abs(w - A4_W) > 2 or abs(h - A4_H) > 2:
        sx, sy = A4_W / w, A4_H / h
        page.add_transformation(Transformation().scale(sx=sx, sy=sy))
        page.mediabox.lower_left = (0, 0)
        page.mediabox.upper_right = (A4_W, A4_H)
    return page

def merge(cover_pdf, body_pdf, out_pdf, title):
    w = PdfWriter()
    w.add_page(normalize(PdfReader(cover_pdf).pages[0]))
    for p in PdfReader(body_pdf).pages:
        w.add_page(normalize(p))
    w.add_metadata({'/Title': title, '/Author': 'CargoBit', '/Creator': 'Z.ai'})
    with open(out_pdf, 'wb') as f:
        w.write(f)

# ===== INVESTOR DOCUMENT =====
def build_investor():
    st = styles()
    story = []
    story.append(Paragraph("Executive Summary", st['H1']))
    story.append(Paragraph("Fraud ist einer der größten Kostenblöcke in digitalen Plattformen. Regulatorische Anforderungen steigen (ISO, SOC2, GDPR), und Sicherheitsvorfälle sind geschäftskritisch. Der <b>Hybrid Security Layer</b> ist unsere Antwort: Eine einheitliche Sicherheitsarchitektur, die Fraud in Echtzeit erkennt, risk-basierte Entscheidungen trifft, Compliance-Audits vereinfacht und operationale Risiken reduziert.", st['Exec']))
    
    story.append(Paragraph("1. Why This Matters", st['H1']))
    for i in ["<b>Fraud-Kosten</b>: Einer der größten Kostenblöcke", "<b>Regulatorischer Druck</b>: ISO 27001, SOC2, GDPR", "<b>Geschäftskritische Vorfälle</b>: Sicherheitsincidents bedrohen Reputation"]:
        story.append(Paragraph(f"• {i}", st['DocBullet']))
    
    story.append(Paragraph("2. What We Built", st['H1']))
    story.append(tbl([
        [Paragraph('<b>Komponente</b>', st['TableHeader']), Paragraph('<b>Funktion</b>', st['TableHeader']), Paragraph('<b>Business Value</b>', st['TableHeader'])],
        [Paragraph('Security Gateway', st['TableCell']), Paragraph('Central Decision', st['TableCell']), Paragraph('Konsistente Logik', st['TableCell'])],
        [Paragraph('Risk Engine', st['TableCell']), Paragraph('Real-Time Scoring', st['TableCell']), Paragraph('Automatisierte Risikoentscheidungen', st['TableCell'])],
        [Paragraph('Mitigation Service', st['TableCell']), Paragraph('Adaptive Controls', st['TableCell']), Paragraph('Balance Sicherheit/UX', st['TableCell'])],
        [Paragraph('Audit Service', st['TableCell']), Paragraph('Immutable Ledger', st['TableCell']), Paragraph('Audit-Ready', st['TableCell'])],
        [Paragraph('Notification', st['TableCell']), Paragraph('Alerts', st['TableCell']), Paragraph('Schnelle Reaktion', st['TableCell'])],
    ], [CONTENT_WIDTH*0.25, CONTENT_WIDTH*0.35, CONTENT_WIDTH*0.40]))
    story.append(Spacer(1, 12))
    
    story.append(Paragraph("3. Strategic Benefits", st['H1']))
    story.append(tbl([
        [Paragraph('<b>Benefit</b>', st['TableHeader']), Paragraph('<b>Metrik</b>', st['TableHeader']), Paragraph('<b>Impact</b>', st['TableHeader'])],
        [Paragraph('Fraud-Reduktion', st['TableCell']), Paragraph('30-60%', st['TableCell']), Paragraph('Direkte Kostenersparnis', st['TableCell'])],
        [Paragraph('Compliance-Readiness', st['TableCell']), Paragraph('ISO/SOC2', st['TableCell']), Paragraph('Reduzierte Audit-Kosten', st['TableCell'])],
        [Paragraph('Operational Efficiency', st['TableCell']), Paragraph('80% weniger Reviews', st['TableCell']), Paragraph('Skalierbare Operations', st['TableCell'])],
    ], [CONTENT_WIDTH*0.30, CONTENT_WIDTH*0.25, CONTENT_WIDTH*0.45]))
    story.append(Spacer(1, 12))
    
    story.append(Paragraph("4. Investment Case", st['H1']))
    story.append(Paragraph("Die Investition in den Hybrid Security Layer zahlt sich durch reduzierte langfristige Kosten, erhöhtes Plattformvertrauen und Ermöglichung der Expansion in regulierte Märkte aus. Diese Sicherheitsarchitektur ist ein <b>strategischer Wettbewerbsvorteil</b>.", st['Body']))
    return story

# ===== TECHNICAL DOCUMENT =====
def build_technical():
    st = styles()
    story = []
    story.append(Paragraph("1. Core Architecture", st['H1']))
    story.append(Paragraph("Die Core Architecture besteht aus fünf Services: <b>Security Gateway</b> (Decision Layer), <b>Risk Engine</b> (Real-Time Scoring), <b>Mitigation Service</b> (Adaptive Controls), <b>Audit Service</b> (Immutable Events) und <b>Notification Service</b> (Alerts).", st['Body']))
    
    story.append(tbl([
        [Paragraph('<b>Service</b>', st['TableHeader']), Paragraph('<b>Port</b>', st['TableHeader']), Paragraph('<b>Tech Stack</b>', st['TableHeader']), Paragraph('<b>Scaling</b>', st['TableHeader'])],
        [Paragraph('Security Gateway', st['TableCell']), Paragraph('3004', st['TableCell']), Paragraph('Node.js / Express', st['TableCell']), Paragraph('Horizontal', st['TableCell'])],
        [Paragraph('Risk Engine', st['TableCell']), Paragraph('3003', st['TableCell']), Paragraph('Python / FastAPI', st['TableCell']), Paragraph('Horizontal', st['TableCell'])],
        [Paragraph('Mitigation Service', st['TableCell']), Paragraph('3005', st['TableCell']), Paragraph('Node.js / BullMQ', st['TableCell']), Paragraph('Worker Pool', st['TableCell'])],
        [Paragraph('Audit Service', st['TableCell']), Paragraph('3006', st['TableCell']), Paragraph('Go / PostgreSQL', st['TableCell']), Paragraph('Write-Sharding', st['TableCell'])],
    ], [CONTENT_WIDTH*0.25, CONTENT_WIDTH*0.12, CONTENT_WIDTH*0.38, CONTENT_WIDTH*0.25]))
    story.append(Spacer(1, 12))
    
    story.append(Paragraph("2. Data Flows", st['H1']))
    story.append(Paragraph("Data Flow: <b>Domain → Gateway → Risk → Mitigation → Audit → Notification</b>. Correlation-IDs für Traceability, idempotente Requests, async Processing via Queues.", st['Body']))
    
    story.append(Paragraph("3. Reliability Patterns", st['H1']))
    story.append(tbl([
        [Paragraph('<b>Pattern</b>', st['TableHeader']), Paragraph('<b>Implementation</b>', st['TableHeader']), Paragraph('<b>Ziel</b>', st['TableHeader'])],
        [Paragraph('Circuit Breaker', st['TableCell']), Paragraph('Hystrix / resilience4j', st['TableCell']), Paragraph('Cascading Failures verhindern', st['TableCell'])],
        [Paragraph('Retries + Backoff', st['TableCell']), Paragraph('Exponential Backoff', st['TableCell']), Paragraph('Transient Errors handhaben', st['TableCell'])],
        [Paragraph('Horizontal Scaling', st['TableCell']), Paragraph('Kubernetes HPA', st['TableCell']), Paragraph('Traffic-Spitzen abfangen', st['TableCell'])],
    ], [CONTENT_WIDTH*0.28, CONTENT_WIDTH*0.35, CONTENT_WIDTH*0.37]))
    story.append(Spacer(1, 12))
    
    story.append(Paragraph("4. Security Controls", st['H1']))
    for i in ["<b>mTLS</b>: Service-to-Service Encryption", "<b>Service-JWT</b>: 5-min expiry, auto rotation", "<b>AES-256 at rest</b>: Database encryption", "<b>PFS enforced</b>: Perfect Forward Secrecy"]:
        story.append(Paragraph(f"• {i}", st['DocBullet']))
    
    story.append(Paragraph("5. Observability", st['H1']))
    story.append(tbl([
        [Paragraph('<b>Komponente</b>', st['TableHeader']), Paragraph('<b>KPI</b>', st['TableHeader']), Paragraph('<b>Target</b>', st['TableHeader'])],
        [Paragraph('Gateway', st['TableCell']), Paragraph('P95 Latency', st['TableCell']), Paragraph('< 120 ms', st['TableCell'])],
        [Paragraph('Risk Engine', st['TableCell']), Paragraph('P95 Latency', st['TableCell']), Paragraph('< 80 ms', st['TableCell'])],
        [Paragraph('Mitigation Queue', st['TableCell']), Paragraph('Queue Lag', st['TableCell']), Paragraph('< 2s', st['TableCell'])],
        [Paragraph('Audit Service', st['TableCell']), Paragraph('Write Latency', st['TableCell']), Paragraph('< 50 ms', st['TableCell'])],
    ], [CONTENT_WIDTH*0.30, CONTENT_WIDTH*0.35, CONTENT_WIDTH*0.35]))
    return story

# ===== COMPLIANCE DOCUMENT =====
def build_compliance():
    st = styles()
    story = []
    story.append(Paragraph("1. Scope", st['H1']))
    story.append(Paragraph("Dieses Dokument definiert die Compliance-Abdeckung des <b>Hybrid Security Layer</b>. Scope: Security Gateway, Risk Engine, Mitigation Service, Audit Service, Notification Service.", st['Body']))
    
    story.append(Paragraph("2. ISO 27001 Mapping", st['H1']))
    story.append(tbl([
        [Paragraph('<b>Kapitel</b>', st['TableHeader']), Paragraph('<b>Control</b>', st['TableHeader']), Paragraph('<b>Implementation</b>', st['TableHeader'])],
        [Paragraph('A.5', st['TableCell']), Paragraph('Policies', st['TableCell']), Paragraph('Security Policies dokumentiert', st['TableCell'])],
        [Paragraph('A.8', st['TableCell']), Paragraph('Asset Management', st['TableCell']), Paragraph('Service-Inventar, Data Classification', st['TableCell'])],
        [Paragraph('A.12', st['TableCell']), Paragraph('Operations Security', st['TableCell']), Paragraph('Monitoring, Logging, Incident Response', st['TableCell'])],
        [Paragraph('A.16', st['TableCell']), Paragraph('Incident Management', st['TableCell']), Paragraph('Playbooks + Runbooks, 24/7 On-Call', st['TableCell'])],
    ], [CONTENT_WIDTH*0.12, CONTENT_WIDTH*0.28, CONTENT_WIDTH*0.60]))
    story.append(Spacer(1, 12))
    
    story.append(Paragraph("3. SOC2 Mapping", st['H1']))
    story.append(tbl([
        [Paragraph('<b>Trust Service</b>', st['TableHeader']), Paragraph('<b>Control</b>', st['TableHeader']), Paragraph('<b>Implementation</b>', st['TableHeader'])],
        [Paragraph('Security', st['TableCell']), Paragraph('Access Controls, Encryption', st['TableCell']), Paragraph('RBAC, AES-256, Immutable Audit', st['TableCell'])],
        [Paragraph('Availability', st['TableCell']), Paragraph('Autoscaling, Circuit Breakers', st['TableCell']), Paragraph('Kubernetes HPA, resilience4j', st['TableCell'])],
        [Paragraph('Processing Integrity', st['TableCell']), Paragraph('Risk-Scoring', st['TableCell']), Paragraph('Deterministic Rules, State Machines', st['TableCell'])],
        [Paragraph('Confidentiality', st['TableCell']), Paragraph('Data Minimization', st['TableCell']), Paragraph('PII-Scrubbing, TLS 1.3', st['TableCell'])],
        [Paragraph('Privacy', st['TableCell']), Paragraph('Retention Policies', st['TableCell']), Paragraph('Audit: 5 Jahre, Risk: 2 Jahre', st['TableCell'])],
    ], [CONTENT_WIDTH*0.18, CONTENT_WIDTH*0.35, CONTENT_WIDTH*0.47]))
    story.append(Spacer(1, 12))
    
    story.append(Paragraph("4. Key Compliance Features", st['H1']))
    for i in ["<b>Immutable Audit-Trail</b>: WORM-Storage, Hash-Chain", "<b>Least Privilege RBAC</b>: Granulare Berechtigungen, SoD", "<b>Zero-Trust Service-Auth</b>: mTLS + JWT", "<b>Secrets Management</b>: Vault-basiert, 24h Rotation"]:
        story.append(Paragraph(f"• {i}", st['DocBullet']))
    
    story.append(Paragraph("5. Evidence Artifacts", st['H1']))
    story.append(tbl([
        [Paragraph('<b>Artifact</b>', st['TableHeader']), Paragraph('<b>Format</b>', st['TableHeader']), Paragraph('<b>Location</b>', st['TableHeader'])],
        [Paragraph('Architecture Diagrams', st['TableCell']), Paragraph('C4 / PNG', st['TableCell']), Paragraph('Confluence / Git', st['TableCell'])],
        [Paragraph('Audit Log Samples', st['TableCell']), Paragraph('JSON', st['TableCell']), Paragraph('Secure Storage', st['TableCell'])],
        [Paragraph('Risk Rules Documentation', st['TableCell']), Paragraph('Markdown', st['TableCell']), Paragraph('Git Repository', st['TableCell'])],
        [Paragraph('Monitoring Dashboards', st['TableCell']), Paragraph('Grafana', st['TableCell']), Paragraph('Internal URL', st['TableCell'])],
    ], [CONTENT_WIDTH*0.35, CONTENT_WIDTH*0.25, CONTENT_WIDTH*0.40]))
    return story

def main():
    out_dir = "/home/z/my-project/download"
    docs = [
        ("investor", "Investor/Board Summary", "Strategic overview for investors and board members covering fraud reduction, compliance readiness, and operational efficiency.", build_investor),
        ("technical", "Technical Deep-Dive", "Architecture and implementation details for engineering leads: core components, data flows, reliability patterns, and observability.", build_technical),
        ("compliance", "Compliance Documentation", "ISO 27001 and SOC2 controls mapping with evidence artifacts for audit readiness.", build_compliance),
    ]
    
    for name, title, subtitle, builder in docs:
        print(f"\n📄 Generating {title}...")
        
        # Cover
        ch = os.path.join(out_dir, f"security_{name}_cover.html")
        cp = os.path.join(out_dir, f"security_{name}_cover.pdf")
        with open(ch, 'w') as f:
            f.write(cover_html(title, subtitle))
        render_cover(ch, cp)
        
        # Body
        bp = os.path.join(out_dir, f"security_{name}_body.pdf")
        doc = SimpleDocTemplate(bp, pagesize=A4, leftMargin=LEFT_MARGIN, rightMargin=RIGHT_MARGIN, topMargin=TOP_MARGIN, bottomMargin=BOTTOM_MARGIN)
        doc.build(builder())
        
        # Merge
        final = os.path.join(out_dir, f"CargoBit_Security_{name.title()}.pdf")
        merge(cp, bp, final, title)
        os.remove(cp)
        os.remove(bp)
        print(f"   ✓ Created: {final} ({os.path.getsize(final)//1024} KB)")
    
    print("\n✅ All 3 PDF documents generated!")

if __name__ == "__main__":
    main()
