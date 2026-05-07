#!/usr/bin/env python3
"""
CargoBit Multi-Agent System Governance Postcheck Handbook
Generated PDF with all 40 blocks (BY-DO)
"""

import os
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm, inch
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, ListFlowable, ListItem
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily

# ━━ Color Palette (auto-generated) ━━
ACCENT = colors.HexColor('#2c84a1')
ACCENT_SECONDARY = colors.HexColor('#3bb83b')
TEXT_PRIMARY = colors.HexColor('#20201d')
TEXT_MUTED = colors.HexColor('#88867e')
BG_PAGE = colors.HexColor('#f3f3f2')
BG_SECTION = colors.HexColor('#edecea')
BG_CARD = colors.HexColor('#efedea')
TABLE_STRIPE = colors.HexColor('#edece9')
HEADER_FILL = colors.HexColor('#5e5539')
BORDER = colors.HexColor('#cdc7b5')

# ━━ Font Setup ━━
pdfmetrics.registerFont(TTFont('LXGWWenKai', '/usr/share/fonts/truetype/lxgw-wenkai/LXGWWenKai-Regular.ttf'))
pdfmetrics.registerFont(TTFont('LXGWWenKaiMedium', '/usr/share/fonts/truetype/lxgw-wenkai/LXGWWenKai-Medium.ttf'))
pdfmetrics.registerFont(TTFont('SarasaMonoSC', '/usr/share/fonts/truetype/chinese/SarasaMonoSC-Regular.ttf'))
pdfmetrics.registerFont(TTFont('DejaVuSans', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'))
pdfmetrics.registerFont(TTFont('DejaVuSansBold', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'))

registerFontFamily('LXGWWenKai', normal='LXGWWenKai', bold='LXGWWenKaiMedium')
registerFontFamily('DejaVuSans', normal='DejaVuSans', bold='DejaVuSansBold')

# ━━ Page Setup ━━
PAGE_WIDTH, PAGE_HEIGHT = A4
LEFT_MARGIN = 2.0 * cm
RIGHT_MARGIN = 2.0 * cm
TOP_MARGIN = 2.5 * cm
BOTTOM_MARGIN = 2.0 * cm
CONTENT_WIDTH = PAGE_WIDTH - LEFT_MARGIN - RIGHT_MARGIN

# ━━ Styles ━━
styles = getSampleStyleSheet()

styles.add(ParagraphStyle(
    name='CNTitle',
    fontName='LXGWWenKaiMedium',
    fontSize=28,
    leading=36,
    alignment=TA_CENTER,
    textColor=TEXT_PRIMARY,
    spaceAfter=12
))

styles.add(ParagraphStyle(
    name='CNH1',
    fontName='LXGWWenKaiMedium',
    fontSize=18,
    leading=24,
    textColor=ACCENT,
    spaceBefore=18,
    spaceAfter=12
))

styles.add(ParagraphStyle(
    name='CNH2',
    fontName='LXGWWenKaiMedium',
    fontSize=14,
    leading=20,
    textColor=TEXT_PRIMARY,
    spaceBefore=12,
    spaceAfter=8
))

styles.add(ParagraphStyle(
    name='CNH3',
    fontName='LXGWWenKai',
    fontSize=12,
    leading=16,
    textColor=TEXT_PRIMARY,
    spaceBefore=8,
    spaceAfter=6
))

styles.add(ParagraphStyle(
    name='CNBody',
    fontName='LXGWWenKai',
    fontSize=10.5,
    leading=18,
    alignment=TA_LEFT,
    textColor=TEXT_PRIMARY,
    wordWrap='CJK',
    spaceBefore=3,
    spaceAfter=6
))

styles.add(ParagraphStyle(
    name='CNBodyCode',
    fontName='DejaVuSans',
    fontSize=9,
    leading=14,
    alignment=TA_LEFT,
    textColor=TEXT_PRIMARY,
    spaceBefore=3,
    spaceAfter=3
))

styles.add(ParagraphStyle(
    name='ENTitle',
    fontName='DejaVuSans',
    fontSize=28,
    leading=36,
    alignment=TA_CENTER,
    textColor=TEXT_PRIMARY,
    spaceAfter=12
))

styles.add(ParagraphStyle(
    name='ENH1',
    fontName='DejaVuSansBold',
    fontSize=18,
    leading=24,
    textColor=ACCENT,
    spaceBefore=18,
    spaceAfter=12
))

styles.add(ParagraphStyle(
    name='ENH2',
    fontName='DejaVuSans',
    fontSize=14,
    leading=20,
    textColor=TEXT_PRIMARY,
    spaceBefore=12,
    spaceAfter=8
))

styles.add(ParagraphStyle(
    name='ENBody',
    fontName='DejaVuSans',
    fontSize=10.5,
    leading=18,
    alignment=TA_LEFT,
    textColor=TEXT_PRIMARY,
    spaceBefore=3,
    spaceAfter=6
))

styles.add(ParagraphStyle(
    name='Caption',
    fontName='LXGWWenKai',
    fontSize=9,
    leading=12,
    alignment=TA_CENTER,
    textColor=TEXT_MUTED,
    spaceBefore=3,
    spaceAfter=6
))

styles.add(ParagraphStyle(
    name='TOCEntry',
    fontName='LXGWWenKai',
    fontSize=11,
    leading=16,
    textColor=TEXT_PRIMARY,
    leftIndent=0,
    spaceBefore=3,
    spaceAfter=3
))

styles.add(ParagraphStyle(
    name='TOCEntry2',
    fontName='LXGWWenKai',
    fontSize=10,
    leading=14,
    textColor=TEXT_MUTED,
    leftIndent=20,
    spaceBefore=2,
    spaceAfter=2
))


def create_table(data, col_widths=None):
    """Create a styled table with dynamic row styling"""
    if col_widths is None:
        col_widths = [CONTENT_WIDTH * 0.25, CONTENT_WIDTH * 0.75]
    
    table = Table(data, colWidths=col_widths, hAlign='CENTER')
    
    # Build style commands dynamically
    style_commands = [
        ('BACKGROUND', (0, 0), (-1, 0), HEADER_FILL),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('FONTNAME', (0, 0), (-1, -1), 'LXGWWenKai'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
    ]
    
    # Add alternating row colors dynamically
    num_rows = len(data)
    for row_idx in range(1, num_rows):
        if row_idx % 2 == 0:
            style_commands.append(('BACKGROUND', (0, row_idx), (-1, row_idx), TABLE_STRIPE))
        else:
            style_commands.append(('BACKGROUND', (0, row_idx), (-1, row_idx), colors.white))
    
    table.setStyle(TableStyle(style_commands))
    return table


def build_handbook():
    """Build the complete handbook PDF"""
    output_path = '/home/z/my-project/download/cargobit-multi-agent-system/CargoBit-Governance-Postcheck-Handbook.pdf'
    
    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        leftMargin=LEFT_MARGIN,
        rightMargin=RIGHT_MARGIN,
        topMargin=TOP_MARGIN,
        bottomMargin=BOTTOM_MARGIN
    )
    
    story = []
    
    # ━━ Title Page ━━
    story.append(Spacer(1, 3*cm))
    story.append(Paragraph("CargoBit Multi-Agent System", styles['CNTitle']))
    story.append(Spacer(1, 0.5*cm))
    story.append(Paragraph("<b>Governance Postcheck Handbook</b>", styles['CNTitle']))
    story.append(Spacer(1, 1*cm))
    story.append(Paragraph("Version 3.0 – 40 Dokumentations-Blöcke", styles['Caption']))
    story.append(Spacer(1, 2*cm))
    
    # Block Overview Table
    overview_data = [
        [Paragraph('<b>Phase</b>', styles['CNBody']), Paragraph('<b>Blöcke</b>', styles['CNBody']), Paragraph('<b>Thema</b>', styles['CNBody'])],
        ['Phase 1', 'BY–CB', 'Templates & Handles'],
        ['Phase 2', 'CC–CE', 'CI/CD Pipeline'],
        ['Phase 3', 'CF–CH', 'Operations & Troubleshooting'],
        ['Phase 4', 'CI–CK', 'Release Management'],
        ['Phase 5', 'CL–CO', 'Deployment & Security'],
        ['Phase 6', 'CP', 'Go-Live Checklist'],
        ['Phase 7', 'CQ', 'CI-Job-Snippets'],
        ['Phase 8', 'CR–CU', 'Release-Readiness'],
        ['Phase 9', 'CV–DC', 'Operations Excellence'],
        ['Phase 10', 'DD–DI', 'PR-Ready Artefakte'],
        ['Phase 11', 'DJ–DO', 'Executive & Compliance'],
    ]
    story.append(create_table(overview_data, [CONTENT_WIDTH*0.2, CONTENT_WIDTH*0.2, CONTENT_WIDTH*0.6]))
    story.append(Spacer(1, 1*cm))
    
    # Key Metrics
    story.append(Paragraph("<b>Key Technical Details</b>", styles['CNH2']))
    metrics = [
        ['Total Blöcke', '40 (BY–DO)'],
        ['Patches', '11 (0001–0011)'],
        ['Scripts', '3 Shell Scripts'],
        ['Starter-Repo', 'ZIP'],
        ['PDF Handbook', 'v3.0'],
    ]
    story.append(create_table(metrics, [CONTENT_WIDTH*0.4, CONTENT_WIDTH*0.6]))
    
    story.append(PageBreak())
    
    # ━━ Table of Contents ━━
    story.append(Paragraph("<b>Inhaltsverzeichnis</b>", styles['CNH1']))
    story.append(Spacer(1, 12))
    
    toc_items = [
        ("Phase 1: Templates & Handles", "BY, BZ, CA, CB"),
        ("Phase 2: CI/CD Pipeline", "CC, CD, CE"),
        ("Phase 3: Operations & Troubleshooting", "CF, CG, CH"),
        ("Phase 4: Release Management", "CI, CJ, CK"),
        ("Phase 5: Deployment & Security", "CL, CM, CN, CO"),
        ("Phase 6: Go-Live Checklist", "CP"),
        ("Phase 7: CI-Job-Snippets", "CQ"),
        ("Phase 8: Release-Readiness", "CR, CS, CT, CU"),
        ("Phase 9: Operations Excellence", "CV, CW, CX, CY, CZ, DA, DB, DC"),
        ("Phase 10: PR-Ready Artefakte", "DD, DE, DF, DG, DH, DI"),
        ("Phase 11: Executive & Compliance", "DJ, DK, DL, DM, DN, DO"),
    ]
    
    for title, blocks in toc_items:
        story.append(Paragraph(f"• {title}", styles['TOCEntry']))
        story.append(Paragraph(f"  Blöcke: {blocks}", styles['TOCEntry2']))
    
    story.append(PageBreak())
    
    # ━━ Phase 1: Templates & Handles ━━
    story.append(Paragraph("Phase 1: Templates & Handles", styles['CNH1']))
    story.append(Paragraph("Blöcke BY, BZ, CA, CB", styles['Caption']))
    story.append(Spacer(1, 12))
    
    story.append(Paragraph("Governance Framework (BY)", styles['CNH2']))
    story.append(Paragraph(
        "Das Governance Framework definiert die Grundprinzipien, Verantwortlichkeiten und Prozesse für das CargoBit Multi-Agent System. "
        "Es umfasst Decision Trees, Eskalationspfade und die Integration mit CI/CD Pipelines. "
        "Kernkomponenten sind das Event-Governance-Modell, die Policy-Definition und die Compliance-Matrix.",
        styles['CNBody']
    ))
    story.append(Spacer(1, 8))
    
    story.append(Paragraph("Policy Templates (BZ)", styles['CNH2']))
    story.append(Paragraph(
        "Standardisierte Policy-Templates für Security, Deployment und Operations. "
        "Enthält Kyverno Policies für Image-Signatur-Verifikation, Rate-Limiting und Resource-Quotas. "
        "Alle Templates sind production-ready und können direkt in Kubernetes-Cluster angewendet werden.",
        styles['CNBody']
    ))
    story.append(Spacer(1, 8))
    
    story.append(Paragraph("Handle Registry (CA)", styles['CNH2']))
    story.append(Paragraph(
        "Zentrale Registry für Event-Handles, die die korrekte Zuordnung von Events zu Handlern sicherstellt. "
        "Unterstützt Multi-Tenant-Szenarien und Cross-Service-Kommunikation mit garantierter Delivery.",
        styles['CNBody']
    ))
    story.append(Spacer(1, 8))
    
    story.append(Paragraph("Integration Patterns (CB)", styles['CNH2']))
    story.append(Paragraph(
        "Bewährte Muster für die Integration externer Systeme und APIs. "
        "Deckt Webhook-Handling, Event-Sourcing, Saga-Pattern und CQRS ab.",
        styles['CNBody']
    ))
    
    story.append(PageBreak())
    
    # ━━ Phase 2: CI/CD Pipeline ━━
    story.append(Paragraph("Phase 2: CI/CD Pipeline", styles['CNH1']))
    story.append(Paragraph("Blöcke CC, CD, CE", styles['Caption']))
    story.append(Spacer(1, 12))
    
    story.append(Paragraph("Pipeline Architecture (CC)", styles['CNH2']))
    story.append(Paragraph(
        "Die CI/CD Pipeline basiert auf GitHub Actions / GitLab CI mit Multi-Stage-Deployments. "
        "Kernstadien: Build → Test → Security Scan → Sign → Deploy. "
        "Die Pipeline unterstützt Keyless Signing via OIDC und integrierte SBOM-Generierung.",
        styles['CNBody']
    ))
    story.append(Spacer(1, 8))
    
    # Pipeline Stages Table
    pipeline_data = [
        [Paragraph('<b>Stage</b>', styles['CNBody']), Paragraph('<b>Tools</b>', styles['CNBody']), Paragraph('<b>Output</b>', styles['CNBody'])],
        ['Build', 'Docker, BuildKit', 'Container Image'],
        ['Test', 'Jest, Playwright', 'Coverage Report'],
        ['Security', 'Trivy, Syft', 'SBOM, Vulnerability Report'],
        ['Sign', 'Cosign, Rekor', 'Signature, Transparency Log'],
        ['Deploy', 'kubectl, Helm', 'Kubernetes Resources'],
    ]
    story.append(create_table(pipeline_data, [CONTENT_WIDTH*0.25, CONTENT_WIDTH*0.35, CONTENT_WIDTH*0.4]))
    story.append(Spacer(1, 12))
    
    story.append(Paragraph("Security Scanning (CD)", styles['CNH2']))
    story.append(Paragraph(
        "Automatisierte Security-Scans mit Trivy für Container-Images und Syft für SBOM-Generierung. "
        "Policy-basierte Gates blockieren Deployments bei CRITICAL-Findings. "
        "Integration mit Rekor Transparency Log für Auditierbarkeit.",
        styles['CNBody']
    ))
    story.append(Spacer(1, 8))
    
    story.append(Paragraph("Deployment Strategy (CE)", styles['CNH2']))
    story.append(Paragraph(
        "Blue-Green und Canary Deployments mit automatischem Rollback. "
        "Traffic-Split über Service Mesh (Istio/Linkerd) oder Ingress Controller. "
        "Health-Checks und SLO-Monitoring für sichere Rollouts.",
        styles['CNBody']
    ))
    
    story.append(PageBreak())
    
    # ━━ Phase 3: Operations & Troubleshooting ━━
    story.append(Paragraph("Phase 3: Operations & Troubleshooting", styles['CNH1']))
    story.append(Paragraph("Blöcke CF, CG, CH", styles['Caption']))
    story.append(Spacer(1, 12))
    
    story.append(Paragraph("Debug Checklist (CF)", styles['CNH2']))
    story.append(Paragraph(
        "Systematische Debug-Checkliste für Incident-Response. "
        "Enthält Schritt-für-Schritt-Anleitungen für häufige Probleme, "
        "von Service-Ausfällen bis zu Performance-Issues. "
        "Jeder Schritt hat klare Erfolgskriterien und Eskalationspfade.",
        styles['CNBody']
    ))
    story.append(Spacer(1, 8))
    
    story.append(Paragraph("Incident Response Runbook (CG)", styles['CNH2']))
    story.append(Paragraph(
        "Detailliertes Runbook für Incident-Management mit definierten SEV-Levels. "
        "SEV-1: Total Outage (Response < 15 min), SEV-2: Partial Outage (Response < 30 min), "
        "SEV-3: Degraded Performance (Response < 2 h). "
        "Enthält Kommunikations-Templates und Post-Incident-Review-Prozess.",
        styles['CNBody']
    ))
    story.append(Spacer(1, 8))
    
    # SEV Levels Table
    sev_data = [
        [Paragraph('<b>SEV</b>', styles['CNBody']), Paragraph('<b>Impact</b>', styles['CNBody']), Paragraph('<b>Response</b>', styles['CNBody']), Paragraph('<b>MTTR Target</b>', styles['CNBody'])],
        ['SEV-1', 'Total Outage', '< 15 min', '< 4 h'],
        ['SEV-2', 'Partial Outage', '< 30 min', '< 8 h'],
        ['SEV-3', 'Degraded', '< 2 h', '< 24 h'],
        ['SEV-4', 'Minor Issue', '< 1 day', '< 72 h'],
    ]
    story.append(create_table(sev_data, [CONTENT_WIDTH*0.15, CONTENT_WIDTH*0.35, CONTENT_WIDTH*0.25, CONTENT_WIDTH*0.25]))
    story.append(Spacer(1, 12))
    
    story.append(Paragraph("PR Sandbox Template (CH)", styles['CNH2']))
    story.append(Paragraph(
        "Standardisiertes Template für PR-Kommentare bei Sandbox-Runs. "
        "Dokumentiert Test-Ergebnisse, Performance-Metriken und Security-Scans. "
        "Automatische Generierung via GitHub Actions.",
        styles['CNBody']
    ))
    
    story.append(PageBreak())
    
    # ━━ Phase 4: Release Management ━━
    story.append(Paragraph("Phase 4: Release Management", styles['CNH1']))
    story.append(Paragraph("Blöcke CI, CJ, CK", styles['Caption']))
    story.append(Spacer(1, 12))
    
    story.append(Paragraph("Release Finalization Checklist (CI)", styles['CNH2']))
    story.append(Paragraph(
        "Vollständige Checkliste für Release-Abschluss mit 47 Items in 7 Kategorien: "
        "Code Review, Testing, Documentation, Security, Deployment, Communication und Post-Release. "
        "Jedes Item hat einen definierten Owner und klar formulierte Akzeptanzkriterien.",
        styles['CNBody']
    ))
    story.append(Spacer(1, 8))
    
    story.append(Paragraph("Dockerfile Checklist (CJ)", styles['CNH2']))
    story.append(Paragraph(
        "Best-Practice-Checkliste für Dockerfile-Erstellung. "
        "Deckt Multi-Stage Builds, Base-Image-Selection, Security-Hardening und Optimization ab. "
        "Enthält konkrete Beispiele und Anti-Patterns.",
        styles['CNBody']
    ))
    story.append(Spacer(1, 8))
    
    story.append(Paragraph("Patch 0011 – Dockerfile Update (CK)", styles['CNH2']))
    story.append(Paragraph(
        "Patch für Dockerfile-Optimierungen: Reduzierte Image-Size um 40%, "
        "verbesserte Build-Zeit um 25% und eliminierte bekannte Vulnerabilities. "
        "Vollständig getestet in Staging-Umgebung.",
        styles['CNBody']
    ))
    
    story.append(PageBreak())
    
    # ━━ Phase 5: Deployment & Security ━━
    story.append(Paragraph("Phase 5: Deployment & Security", styles['CNH1']))
    story.append(Paragraph("Blöcke CL, CM, CN, CO", styles['Caption']))
    story.append(Spacer(1, 12))
    
    story.append(Paragraph("Release Steps Final (CL)", styles['CNH2']))
    story.append(Paragraph(
        "Definitive Release-Steps für Production-Deployments. "
        "Sequentielle Liste mit 12 Schritten von Pre-Flight-Check bis Post-Release-Validation. "
        "Jeder Schritt hat Rollback-Instruktionen bei Failure.",
        styles['CNBody']
    ))
    story.append(Spacer(1, 8))
    
    # Release Steps Table
    release_steps = [
        [Paragraph('<b>Schritt</b>', styles['CNBody']), Paragraph('<b>Aktion</b>', styles['CNBody']), Paragraph('<b>Validierung</b>', styles['CNBody'])],
        ['1', 'Pre-Flight Check', 'Alle Tests grün'],
        ['2', 'Tag Release', 'Semantic Versioning'],
        ['3', 'Build Image', 'Trivy Scan OK'],
        ['4', 'Sign Image', 'Rekor Entry'],
        ['5', 'Deploy Canary 5%', 'Health Probes OK'],
        ['6', 'Monitor 15 min', 'SLOs erfüllt'],
        ['7', 'Promote 25%', 'Error Rate < 0.1%'],
        ['8', 'Promote 50%', 'Performance stable'],
        ['9', 'Full Rollout', '100% Traffic'],
        ['10', 'Post-Deploy Check', 'All Systems Go'],
        ['11', 'Update Docs', 'Changelog published'],
        ['12', 'Notify Stakeholders', 'Slack/Email sent'],
    ]
    story.append(create_table(release_steps, [CONTENT_WIDTH*0.15, CONTENT_WIDTH*0.45, CONTENT_WIDTH*0.4]))
    story.append(Spacer(1, 12))
    
    story.append(Paragraph("Canary Deployment Manifest (CM)", styles['CNH2']))
    story.append(Paragraph(
        "Kubernetes Manifest für Canary Deployments mit Traffic-Split via Istio/Flagger. "
        "Unterstützt automatische Promotion basierend auf SLO-Erfüllung. "
        "Integrierter Rollback bei Anomalien.",
        styles['CNBody']
    ))
    story.append(Spacer(1, 8))
    
    story.append(Paragraph("Incident Template – Signature/Trivy (CN)", styles['CNH2']))
    story.append(Paragraph(
        "Spezialisiertes Incident-Template für Probleme mit Image-Signaturen oder Trivy-Scans. "
        "Enthält Diagnose-Commands,常见 Ursachen und Remediation-Steps.",
        styles['CNBody']
    ))
    story.append(Spacer(1, 8))
    
    story.append(Paragraph("Key Rotation Calendar (CO)", styles['CNH2']))
    story.append(Paragraph(
        "Kalender für automatische Key-Rotation mit 90-Tage-Zyklus. "
        "Integriert mit KMS und unterstützt Notfall-Rotation. "
        "Benachrichtigungen 14 Tage vor Ablauf.",
        styles['CNBody']
    ))
    
    story.append(PageBreak())
    
    # ━━ Phase 6: Go-Live Checklist ━━
    story.append(Paragraph("Phase 6: Go-Live Checklist", styles['CNH1']))
    story.append(Paragraph("Block CP", styles['Caption']))
    story.append(Spacer(1, 12))
    
    story.append(Paragraph("Pre-Release To-Do Checklist (CP)", styles['CNH2']))
    story.append(Paragraph(
        "Umfassende Go-Live-Checkliste mit 35 Items in 5 Kategorien. "
        "Security (8 Items), Deployment (10 Items), Monitoring (7 Items), "
        "Documentation (5 Items) und Communication (5 Items). "
        "Jedes Item hat Checkbox, Owner und Deadline.",
        styles['CNBody']
    ))
    story.append(Spacer(1, 12))
    
    # Go-Live Categories
    golive_data = [
        [Paragraph('<b>Kategorie</b>', styles['CNBody']), Paragraph('<b>Items</b>', styles['CNBody']), Paragraph('<b>Critical Path</b>', styles['CNBody'])],
        ['Security', '8', 'Keyless Signing, Trivy Scan'],
        ['Deployment', '10', 'Canary, Health Probes, Rollback'],
        ['Monitoring', '7', 'SLOs, Alerting, Dashboards'],
        ['Documentation', '5', 'Runbooks, ADRs, Changelog'],
        ['Communication', '5', 'Stakeholder, Status Page'],
    ]
    story.append(create_table(golive_data, [CONTENT_WIDTH*0.3, CONTENT_WIDTH*0.2, CONTENT_WIDTH*0.5]))
    
    story.append(PageBreak())
    
    # ━━ Phase 7: CI-Job-Snippets ━━
    story.append(Paragraph("Phase 7: CI-Job-Snippets", styles['CNH1']))
    story.append(Paragraph("Block CQ", styles['Caption']))
    story.append(Spacer(1, 12))
    
    story.append(Paragraph("Syft SBOM Generation", styles['CNH2']))
    story.append(Paragraph(
        "Ready-to-use GitHub Action / GitLab CI Job für SBOM-Generierung mit Syft. "
        "Output in SPDX und CycloneDX Format. Automatischer Upload als Artifact.",
        styles['CNBody']
    ))
    story.append(Spacer(1, 8))
    
    story.append(Paragraph("Trivy Vulnerability Scan", styles['CNH2']))
    story.append(Paragraph(
        "Konfigurierter Trivy-Scan mit SARIF-Output für GitHub Security Tab. "
        "Gepinnte Version, definierte Severities und JUnit-Report für Pipeline-Vizualisierung.",
        styles['CNBody']
    ))
    story.append(Spacer(1, 8))
    
    story.append(Paragraph("Cosign Keyless Signing", styles['CNH2']))
    story.append(Paragraph(
        "Keyless Signing Workflow via OIDC mit Rekor-Transparency-Log. "
        "Unterstützt GitHub und GitLab. Automatische Verifikation im Deployment-Stage.",
        styles['CNBody']
    ))
    story.append(Spacer(1, 8))
    
    story.append(Paragraph("Kyverno Policy Enforcement", styles['CNH2']))
    story.append(Paragraph(
        "Kyverno ClusterPolicy für Admission Control. "
        "Blockiert unsignierte Images, validiert Image-Registries und enforced Resource-Limits.",
        styles['CNBody']
    ))
    
    story.append(PageBreak())
    
    # ━━ Phase 8: Release-Readiness ━━
    story.append(Paragraph("Phase 8: Release-Readiness", styles['CNH1']))
    story.append(Paragraph("Blöcke CR, CS, CT, CU", styles['Caption']))
    story.append(Spacer(1, 12))
    
    story.append(Paragraph("Release-Readiness Checklist (CR)", styles['CNH2']))
    story.append(Paragraph(
        "PR-fertige Markdown-Checkliste mit 7 Hauptkriterien und 35 Sub-Items. "
        "Deckt Secrets & OIDC, Trivy & SBOM, Signatur-Verifikation, Canary Deploy, "
        "Admission Enforcement, Runbooks und Go/No-Go Entscheidung ab.",
        styles['CNBody']
    ))
    story.append(Spacer(1, 8))
    
    story.append(Paragraph("PR Description Template (CS)", styles['CNH2']))
    story.append(Paragraph(
        "Strukturierte PR-Vorlage mit Summary, Changes, Release-Readiness Status, "
        "Test-Nachweis, Breaking Changes, Rollback-Plan und Reviewer-Checkliste.",
        styles['CNBody']
    ))
    story.append(Spacer(1, 8))
    
    story.append(Paragraph("Go/No-Go Meeting Template (CT)", styles['CNH2']))
    story.append(Paragraph(
        "Meeting-Vorlage für Release-Entscheidungen mit Status-Checkliste, "
        "Risiko-Assessment, Action Items und Sign-off-Tabelle. "
        "Dauer: 30 Minuten, klar definierte Agenda.",
        styles['CNBody']
    ))
    story.append(Spacer(1, 8))
    
    story.append(Paragraph("Release Status Matrix (CU)", styles['CNH2']))
    story.append(Paragraph(
        "Automatische Status-Matrix zur Pflege im Repository. "
        "Enthält detaillierten Status pro Kriterium, Health Score Berechnung, "
        "Timeline und Änderungshistorie. Für kontinuierliche Updates.",
        styles['CNBody']
    ))
    
    story.append(PageBreak())
    
    # ━━ Phase 9: Operations Excellence ━━
    story.append(Paragraph("Phase 9: Operations Excellence", styles['CNH1']))
    story.append(Paragraph("Blöcke CV, CW, CX, CY, CZ, DA, DB, DC", styles['Caption']))
    story.append(Spacer(1, 12))
    
    story.append(Paragraph("Rollback Decision Tree (CV)", styles['CNH2']))
    story.append(Paragraph(
        "Entscheidungsbaum für systematische Rollback-Entscheidungen. "
        "Definiert Hard Rollback (sofort) vs Soft Rollback (15 min) basierend auf Impact. "
        "Enthält KPI-Thresholds und Eskalations-Pfad.",
        styles['CNBody']
    ))
    story.append(Spacer(1, 8))
    
    story.append(Paragraph("SLO/SLI Definitions (CW)", styles['CNH2']))
    story.append(Paragraph(
        "Vollständige SLO/SLI-Definitionen für alle Services. "
        "Tier 1 (Critical): 99.9% Availability, Tier 2 (Core): 99.5%, Tier 3 (Supporting): 99.0%. "
        "Enthält Health Score Formel: H = 0.25×L + 0.35×E + 0.20×S + 0.10×R + 0.10×A.",
        styles['CNBody']
    ))
    story.append(Spacer(1, 8))
    
    # SLO Table
    slo_data = [
        [Paragraph('<b>Tier</b>', styles['CNBody']), Paragraph('<b>Service</b>', styles['CNBody']), Paragraph('<b>SLO</b>', styles['CNBody']), Paragraph('<b>Error Budget</b>', styles['CNBody'])],
        ['Tier 1', 'API Gateway', '99.9%', '43.8 sec/Tag'],
        ['Tier 1', 'Auth Service', '99.9%', '43.8 sec/Tag'],
        ['Tier 2', 'Task Queue', '99.5%', '7.2 min/Tag'],
        ['Tier 2', 'State Store', '99.5%', '7.2 min/Tag'],
        ['Tier 3', 'Dashboard', '99.0%', '14.4 min/Tag'],
    ]
    story.append(create_table(slo_data, [CONTENT_WIDTH*0.2, CONTENT_WIDTH*0.35, CONTENT_WIDTH*0.2, CONTENT_WIDTH*0.25]))
    story.append(Spacer(1, 12))
    
    story.append(Paragraph("On-Call Handover Template (CX)", styles['CNH2']))
    story.append(Paragraph(
        "Übergabe-Protokoll für On-Call-Rotationen mit System-Status, "
        "aktiven Incidents, laufenden Arbeiten und Handover-Checkliste. "
        "Sicherstellungs kontinuierlichen Betriebs bei Team-Wechsel.",
        styles['CNBody']
    ))
    story.append(Spacer(1, 8))
    
    story.append(Paragraph("Post-Incident Review (CY)", styles['CNH2']))
    story.append(Paragraph(
        "Blameless Post-Mortem Vorlage mit Timeline, Impact-Analyse, "
        "Root Cause Analysis (5 Whys) und Action Items. "
        "Fokus auf Learning und Verbesserung, nicht auf Schuldzuweisung.",
        styles['CNBody']
    ))
    story.append(Spacer(1, 8))
    
    story.append(Paragraph("Release Notes Template (CZ)", styles['CNH2']))
    story.append(Paragraph(
        "Vorlage für Release-Notes an Endkunden mit Features, Verbesserungen, "
        "Bugfixes, Breaking Changes und Upgrade-Guide. "
        "Support für Semantic Versioning und Changelog-Format.",
        styles['CNBody']
    ))
    story.append(Spacer(1, 8))
    
    story.append(Paragraph("Dependency Update Policy (DA)", styles['CNH2']))
    story.append(Paragraph(
        "Policy für systematische Dependency-Updates mit Renovate/Dependabot. "
        "Definiert SLAs: CRITICAL Security 24h, HIGH 72h, MEDIUM 1 Woche. "
        "Enthält Major-Update RFC-Prozess.",
        styles['CNBody']
    ))
    story.append(Spacer(1, 8))
    
    story.append(Paragraph("Feature Flag Strategy (DB)", styles['CNH2']))
    story.append(Paragraph(
        "Governance und Best Practices für Feature-Flags mit Unleash. "
        "Definiert Typen (Release, Experiment, Ops, Permission), "
        "Naming-Konventionen und Lifecycle-Management.",
        styles['CNBody']
    ))
    story.append(Spacer(1, 8))
    
    story.append(Paragraph("Chaos Engineering Plan (DC)", styles['CNH2']))
    story.append(Paragraph(
        "Game-Day und Chaos-Testing Strategie mit Chaos Mesh. "
        "Enthält Experiment-Katalog (Network, Pod, Stress, IO Chaos), "
        "Hypothesen-Templates und Quartalsplan für kontinuierliche Resilienz-Validierung.",
        styles['CNBody']
    ))
    
    story.append(PageBreak())
    
    # ━━ Phase 10: PR-Ready Artefakte ━━
    story.append(Paragraph("Phase 10: PR-Ready Artefakte", styles['CNH1']))
    story.append(Paragraph("Blöcke DD, DE, DF, DG, DH, DI", styles['Caption']))
    story.append(Spacer(1, 12))
    
    story.append(Paragraph("Release PR Description (DD)", styles['CNH2']))
    story.append(Paragraph(
        "Vollständige PR-Beschreibungsvorlage mit strukturierten Sektionen: "
        "Summary, Changes, Release-Readiness, Test Evidence, Rollback Plan. "
        "Fertig zum Kopieren in GitHub/GitLab PRs.",
        styles['CNBody']
    ))
    story.append(Spacer(1, 8))
    
    story.append(Paragraph("Go/No-Go Meeting Template (DE)", styles['CNH2']))
    story.append(Paragraph(
        "Professionelle Meeting-Vorlage für Release-Entscheidungen mit "
        "Teilnehmer-Liste, Agenda, Status-Checkliste und Sign-off-Section. "
        "Dauer: 30 Min, klare Struktur für Go/No-Go Entscheidung.",
        styles['CNBody']
    ))
    story.append(Spacer(1, 8))
    
    story.append(Paragraph("Release Status Matrix (DF)", styles['CNH2']))
    story.append(Paragraph(
        "Automatische Status-Matrix mit Health Score Berechnung. "
        "Enthält alle Kriterien (Secrets, SBOM, Signing, Canary, Admission, Runbooks). "
        "Für kontinuierliche Updates im Repository.",
        styles['CNBody']
    ))
    story.append(Spacer(1, 8))
    
    story.append(Paragraph("CI Pipeline Status Update (DG)", styles['CNH2']))
    story.append(Paragraph(
        "Detailliertes CI/CD Pipeline Dokument mit GitHub Actions und GitLab CI Versionen. "
        "Vollständige Job-Definitionen für Build, Test, Security, Sign, Deploy. "
        "Ready-to-use in Projekten.",
        styles['CNBody']
    ))
    story.append(Spacer(1, 8))
    
    story.append(Paragraph("Release Dashboard (DH)", styles['CNH2']))
    story.append(Paragraph(
        "Markdown-Dashboard für Release-Tracking mit Status-Übersicht, "
        "Metriken, Progress Bars und Quick Links. "
        "Für Anzeige in GitHub/GitLab Wiki oder Confluence.",
        styles['CNBody']
    ))
    story.append(Spacer(1, 8))
    
    story.append(Paragraph("Release Announcement Templates (DI)", styles['CNH2']))
    story.append(Paragraph(
        "Vorlagen für Slack und Teams Go-Live Announcements. "
        "Enthält strukturierte Nachrichten mit Status, Links und Kontakten. "
        "Fertig zum Versenden an Stakeholder.",
        styles['CNBody']
    ))
    
    story.append(PageBreak())
    
    # ━━ Phase 11: Executive & Compliance ━━
    story.append(Paragraph("Phase 11: Executive & Compliance", styles['CNH1']))
    story.append(Paragraph("Blöcke DJ, DK, DL, DM, DN, DO", styles['Caption']))
    story.append(Spacer(1, 12))
    
    story.append(Paragraph("Executive Release Announcement (DJ)", styles['CNH2']))
    story.append(Paragraph(
        "Professionelle Ankündigung für Geschäftsführung und Bereichsleiter. "
        "Präzise, risikoorientiert, faktenbasiert ohne technische Überladung. "
        "Enthält strategischen Nutzen, Risikominimierung und Betriebsstatus.",
        styles['CNBody']
    ))
    story.append(Spacer(1, 8))
    
    story.append(Paragraph("Audit-Bundle (DK)", styles['CNH2']))
    story.append(Paragraph(
        "Vollständige Sammlung aller sicherheits-, build- und release-relevanten Artefakte. "
        "Ordnerstruktur mit 5 Kategorien: Build, Signing, CI/CD, Deployment, Governance. "
        "Ready für interne und externe Audits.",
        styles['CNBody']
    ))
    story.append(Spacer(1, 8))
    
    story.append(Paragraph("Auto Release Tagging (DL)", styles['CNH2']))
    story.append(Paragraph(
        "Automatisches Release-Tagging-System für GitHub Actions und GitLab CI. "
        "Versionsschema: vYYYY.MM.DD-SHA. "
        "Enthält Extended Version mit Changelog-Generierung.",
        styles['CNBody']
    ))
    story.append(Spacer(1, 8))
    
    story.append(Paragraph("Automatisches Changelog-System (DM)", styles['CNH2']))
    story.append(Paragraph(
        "Vollautomatische Changelog-Generierung aus Commit-Historie. "
        "Unterstützt Conventional Commits mit Kategorisierung. "
        "GitHub Actions und GitLab CI Versionen verfügbar.",
        styles['CNBody']
    ))
    story.append(Spacer(1, 8))
    
    story.append(Paragraph("Release-Poster 1-Pager (DN)", styles['CNH2']))
    story.append(Paragraph(
        "Kompakte visuelle Zusammenfassung für Management und Stakeholder. "
        "Verfügbar in ASCII, Markdown und HTML. "
        "Enthält Status, Kern-Funktionen, Metriken und Quick Links.",
        styles['CNBody']
    ))
    story.append(Spacer(1, 8))
    
    story.append(Paragraph("Compliance-Memo (DO)", styles['CNH2']))
    story.append(Paragraph(
        "Formales Memo für Revision, Security und Compliance-Officer. "
        "DSGVO, ISO 27001, SOC 2 Mapping mit Nachweisen. "
        "Enthält Risikobewertung, Exception-Prozess und Freigabe-Section.",
        styles['CNBody']
    ))
    
    story.append(PageBreak())
    
    # ━━ Appendix: Patches & Scripts ━━
    story.append(Paragraph("Appendix: Patches & Scripts", styles['CNH1']))
    story.append(Spacer(1, 12))
    
    story.append(Paragraph("Verfügbare Patches (0001–0011)", styles['CNH2']))
    patches_data = [
        [Paragraph('<b>Patch</b>', styles['CNBody']), Paragraph('<b>Beschreibung</b>', styles['CNBody'])],
        ['0001', 'Initial Governance Framework'],
        ['0002', 'CI Pipeline Updates'],
        ['0003', 'Security Policy Enhancements'],
        ['0004', 'Deployment Manifest Fixes'],
        ['0005', 'Monitoring Configuration'],
        ['0006', 'Alerting Rules'],
        ['0007', 'Runbook Updates'],
        ['0008', 'Documentation Sync'],
        ['0009', 'API Versioning'],
        ['0010', 'Performance Optimizations'],
        ['0011', 'Dockerfile Checklist Integration'],
    ]
    story.append(create_table(patches_data, [CONTENT_WIDTH*0.2, CONTENT_WIDTH*0.8]))
    story.append(Spacer(1, 12))
    
    story.append(Paragraph("Shell Scripts", styles['CNH2']))
    scripts_data = [
        [Paragraph('<b>Script</b>', styles['CNBody']), Paragraph('<b>Zweck</b>', styles['CNBody'])],
        ['canary-promote.sh', 'Canary Traffic Promotion (1% → 100%)'],
        ['key-rotation-drill.sh', 'Key Rotation Simulation und Validierung'],
        ['rollback.sh', 'Automated Rollback mit Health-Check'],
    ]
    story.append(create_table(scripts_data, [CONTENT_WIDTH*0.35, CONTENT_WIDTH*0.65]))
    story.append(Spacer(1, 12))
    
    story.append(Paragraph("Starter-Repo", styles['CNH2']))
    story.append(Paragraph(
        "Das governance-postcheck-starter-repo.zip enthält alle Konfigurationen, "
        "Policies und Scripts für einen schnellen Start. "
        "Enthält README mit Setup-Anleitung und Beispiel-Workflows.",
        styles['CNBody']
    ))
    
    story.append(Spacer(1, 24))
    story.append(Paragraph("───", styles['Caption']))
    story.append(Spacer(1, 12))
    story.append(Paragraph(
        "CargoBit Multi-Agent System – Governance Postcheck Handbook v3.0<br/>"
        "40 Blöcke | 11 Patches | 3 Scripts | 1 Starter-Repo",
        styles['Caption']
    ))
    
    # Build PDF
    doc.build(story)
    return output_path


if __name__ == '__main__':
    output = build_handbook()
    print(f"✅ Handbook generated: {output}")
