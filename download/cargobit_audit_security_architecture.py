#!/usr/bin/env python3
"""
CargoBit Platform - Audit & Security Architecture
Platform-Erweiterungen: Audit-Logs, Anti-Fraud, Rate-Limiting, Data-Retention
"""

import sys
import os
sys.path.insert(0, '/home/z/my-project/skills/pdf/scripts')

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.lib.units import inch, cm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, KeepTogether, ListFlowable, ListItem
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily

# ━━ Color Palette ━━
ACCENT       = colors.HexColor('#4d2ea9')
TEXT_PRIMARY  = colors.HexColor('#1d1f20')
TEXT_MUTED    = colors.HexColor('#858c91')
BG_SURFACE   = colors.HexColor('#d3d9df')
BG_PAGE      = colors.HexColor('#eceef0')

TABLE_HEADER_COLOR = ACCENT
TABLE_HEADER_TEXT  = colors.white
TABLE_ROW_EVEN     = colors.white
TABLE_ROW_ODD      = BG_SURFACE

# Font Registration
pdfmetrics.registerFont(TTFont('Times New Roman', '/usr/share/fonts/truetype/english/Times-New-Roman.ttf'))
pdfmetrics.registerFont(TTFont('SimHei', '/usr/share/fonts/truetype/chinese/SimHei.ttf'))
pdfmetrics.registerFont(TTFont('Microsoft YaHei', '/usr/share/fonts/truetype/chinese/msyh.ttf'))
registerFontFamily('Times New Roman', normal='Times New Roman', bold='Times New Roman')
registerFontFamily('SimHei', normal='SimHei', bold='SimHei')

# Page dimensions
PAGE_WIDTH, PAGE_HEIGHT = A4
LEFT_MARGIN = 1.0 * inch
RIGHT_MARGIN = 1.0 * inch
TOP_MARGIN = 0.75 * inch
BOTTOM_MARGIN = 0.75 * inch
AVAILABLE_WIDTH = PAGE_WIDTH - LEFT_MARGIN - RIGHT_MARGIN

def create_styles():
    styles = getSampleStyleSheet()
    
    styles.add(ParagraphStyle(
        name='DocTitle',
        fontName='SimHei',
        fontSize=24,
        leading=32,
        alignment=TA_CENTER,
        textColor=ACCENT,
        spaceAfter=12
    ))
    
    styles.add(ParagraphStyle(
        name='DocSubtitle',
        fontName='SimHei',
        fontSize=14,
        leading=20,
        alignment=TA_CENTER,
        textColor=TEXT_MUTED,
        spaceAfter=24
    ))
    
    styles.add(ParagraphStyle(
        name='H1',
        fontName='Microsoft YaHei',
        fontSize=16,
        leading=24,
        textColor=ACCENT,
        spaceBefore=18,
        spaceAfter=12,
        wordWrap='CJK'
    ))
    
    styles.add(ParagraphStyle(
        name='H2',
        fontName='Microsoft YaHei',
        fontSize=13,
        leading=20,
        textColor=TEXT_PRIMARY,
        spaceBefore=14,
        spaceAfter=8,
        wordWrap='CJK'
    ))
    
    styles.add(ParagraphStyle(
        name='H3',
        fontName='Microsoft YaHei',
        fontSize=11,
        leading=18,
        textColor=TEXT_PRIMARY,
        spaceBefore=10,
        spaceAfter=6,
        wordWrap='CJK'
    ))
    
    styles.add(ParagraphStyle(
        name='Body',
        fontName='SimHei',
        fontSize=10.5,
        leading=18,
        alignment=TA_LEFT,
        textColor=TEXT_PRIMARY,
        spaceBefore=0,
        spaceAfter=8,
        wordWrap='CJK'
    ))
    
    styles.add(ParagraphStyle(
        name='CodeBlock',
        fontName='Times New Roman',
        fontSize=9,
        leading=14,
        textColor=TEXT_PRIMARY,
        backColor=BG_SURFACE,
        leftIndent=12,
        rightIndent=12,
        spaceBefore=6,
        spaceAfter=6
    ))
    
    styles.add(ParagraphStyle(
        name='TableHeader',
        fontName='Microsoft YaHei',
        fontSize=10,
        leading=14,
        alignment=TA_CENTER,
        textColor=TABLE_HEADER_TEXT
    ))
    
    styles.add(ParagraphStyle(
        name='TableCell',
        fontName='SimHei',
        fontSize=9.5,
        leading=14,
        alignment=TA_LEFT,
        textColor=TEXT_PRIMARY,
        wordWrap='CJK'
    ))
    
    styles.add(ParagraphStyle(
        name='TableCellCenter',
        fontName='SimHei',
        fontSize=9.5,
        leading=14,
        alignment=TA_CENTER,
        textColor=TEXT_PRIMARY,
        wordWrap='CJK'
    ))
    
    return styles

def create_table(data, col_ratios=None, header_rows=1):
    """Create a styled table with consistent formatting.
    
    Args:
        data: Table data (list of lists)
        col_ratios: List of column width ratios (will sum to 1.0). If None, equal widths.
        header_rows: Number of header rows
    """
    if col_ratios is None:
        col_ratios = [1.0 / len(data[0])] * len(data[0])
    
    # Convert ratios to absolute widths
    col_widths = [r * AVAILABLE_WIDTH for r in col_ratios]
    
    table = Table(data, colWidths=col_widths, hAlign='CENTER')
    
    style_commands = [
        ('BACKGROUND', (0, 0), (-1, header_rows - 1), TABLE_HEADER_COLOR),
        ('TEXTCOLOR', (0, 0), (-1, header_rows - 1), TABLE_HEADER_TEXT),
        ('GRID', (0, 0), (-1, -1), 0.5, TEXT_MUTED),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]
    
    for i in range(header_rows, len(data)):
        if (i - header_rows) % 2 == 1:
            style_commands.append(('BACKGROUND', (0, i), (-1, i), TABLE_ROW_ODD))
        else:
            style_commands.append(('BACKGROUND', (0, i), (-1, i), TABLE_ROW_EVEN))
    
    table.setStyle(TableStyle(style_commands))
    return table

def build_document():
    output_path = '/home/z/my-project/download/CargoBit_Audit_Security_Architecture.pdf'
    
    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        leftMargin=LEFT_MARGIN,
        rightMargin=RIGHT_MARGIN,
        topMargin=TOP_MARGIN,
        bottomMargin=BOTTOM_MARGIN
    )
    
    styles = create_styles()
    story = []
    
    # ═══════════════════════════════════════════════════════════════════
    # TITLE PAGE
    # ═══════════════════════════════════════════════════════════════════
    
    story.append(Spacer(1, 60))
    story.append(Paragraph('CargoBit Transport Platform', styles['DocTitle']))
    story.append(Paragraph('Audit & Security Architecture', styles['DocTitle']))
    story.append(Spacer(1, 20))
    story.append(Paragraph('Platform-Erweiterungen für Produktionsbetrieb', styles['DocSubtitle']))
    story.append(Paragraph('Version 1.0 | April 2026', styles['DocSubtitle']))
    
    story.append(Spacer(1, 40))
    
    # Executive Summary
    story.append(Paragraph('<b>Executive Summary</b>', styles['H1']))
    story.append(Paragraph(
        'Dieses Dokument definiert die produktionskritischen Architektur-Erweiterungen für die CargoBit '
        'Transport-Plattform. Die vier Kernbereiche – Audit-Logging, Anti-Fraud-Checks, Rate-Limiting und '
        'Data-Retention – bilden das Fundament für eine sichere, compliant und betriebsstabile Microservice-Landschaft. '
        'Jede Komponente ist so konzipiert, dass sie nahtlos in die bestehende Event-getriebene Architektur '
        'integriert wird, ohne die Performance der Kern-Workflows zu beeinträchtigen.',
        styles['Body']
    ))
    
    story.append(Paragraph(
        'Die Implementierung folgt dem Prinzip "Security by Design" – Schutzmaßnahmen sind von Anfang an '
        'in jeden Service integriert, nicht als nachträgliche Add-ons. Alle Audit-Records werden in einem '
        'zentralen, append-only Store archiviert und sind über correlationId mit den ursprünglichen '
        'Business-Events verknüpft. Rate-Limits werden bereits auf API-Gateway-Ebene durchgesetzt, '
        'bevor Requests die Service-Grenzen erreichen.',
        styles['Body']
    ))
    
    # Quick Reference Table
    story.append(Spacer(1, 12))
    story.append(Paragraph('<b>Quick Reference</b>', styles['H2']))
    
    quick_ref_data = [
        [Paragraph('<b>Komponente</b>', styles['TableHeader']),
         Paragraph('<b>Scope</b>', styles['TableHeader']),
         Paragraph('<b>Verantwortlicher Service</b>', styles['TableHeader']),
         Paragraph('<b>Retention</b>', styles['TableHeader'])],
        [Paragraph('Audit-Logs', styles['TableCell']),
         Paragraph('Alle geschäftskritischen Events', styles['TableCell']),
         Paragraph('Jeder Service (dezentral)', styles['TableCell']),
         Paragraph('7–10 Jahre', styles['TableCellCenter'])],
        [Paragraph('Anti-Fraud Checks', styles['TableCell']),
         Paragraph('Pricing, Bidding, Matching', styles['TableCell']),
         Paragraph('Pricing, Bidding, Matching, Risk', styles['TableCell']),
         Paragraph('2–5 Jahre', styles['TableCellCenter'])],
        [Paragraph('Rate-Limiting', styles['TableCell']),
         Paragraph('Public API Endpoints', styles['TableCell']),
         Paragraph('API Gateway + Redis', styles['TableCell']),
         Paragraph('Echtzeit (Token Bucket)', styles['TableCellCenter'])],
        [Paragraph('Data Retention', styles['TableCell']),
         Paragraph('Alle Service-DBs', styles['TableCell']),
         Paragraph('Pro Service konfiguriert', styles['TableCell']),
         Paragraph('2–10 Jahre (je nach Daten)', styles['TableCellCenter'])],
    ]
    
    story.append(create_table(quick_ref_data, [AVAILABLE_WIDTH * 0.22, 0.30, 0.28, 0.20]))
    
    story.append(PageBreak())
    
    # ═══════════════════════════════════════════════════════════════════
    # SECTION 1: AUDIT-LOG ARCHITEKTUR
    # ═══════════════════════════════════════════════════════════════════
    
    story.append(Paragraph('1. Audit-Log Architektur', styles['H1']))
    
    story.append(Paragraph('<b>1.1 Zielsetzung</b>', styles['H2']))
    story.append(Paragraph(
        'Jede geschäftskritische Entscheidung muss vollständig nachvollziehbar sein. Audit-Logs dienen '
        'nicht nur der Compliance (DSGVO, GoBD, steuerliche Aufbewahrungspflichten), sondern auch der '
        'Betriebsanalyse, Debugging und Betrugserkennung. Ein zentraler Audit-Store gewährleistet, dass '
        'Records nicht manipuliert oder gelöscht werden können (WORM – Write Once, Read Many).',
        styles['Body']
    ))
    
    story.append(Paragraph(
        'Die Audit-Architektur folgt dem Prinzip der Dezentralität bei der Erfassung und Zentralität '
        'bei der Speicherung. Jeder Service schreibt seine Audit-Records asynchron in den zentralen '
        'Store, ohne dass der Business-Flow blockiert wird. Die correlationId ermöglicht es, alle '
        'Audit-Records einer Transaktion über Service-Grenzen hinweg zu verfolgen.',
        styles['Body']
    ))
    
    story.append(Paragraph('<b>1.2 Audit-Punkte pro Service</b>', styles['H2']))
    
    # Order Service
    story.append(Paragraph('<b>Order-Service</b>', styles['H3']))
    story.append(Paragraph(
        'Der Order-Service ist der Entry-Point für alle Transportaufträge. Jede Zustandsänderung '
        'wird auditiert, um die vollständige Auftrags-Historie nachvollziehbar zu machen.',
        styles['Body']
    ))
    
    order_audit_data = [
        [Paragraph('<b>Event</b>', styles['TableHeader']),
         Paragraph('<b>Audit-Content</b>', styles['TableHeader']),
         Paragraph('<b>Trigger</b>', styles['TableHeader'])],
        [Paragraph('order.created', styles['TableCell']),
         Paragraph('Vollständiger Order-Payload, Shipper-ID, Initial-Status', styles['TableCell']),
         Paragraph('POST /orders', styles['TableCell'])],
        [Paragraph('order.updated', styles['TableCell']),
         Paragraph('payloadBefore, payloadAfter, geänderte Felder, Actor-ID', styles['TableCell']),
         Paragraph('PATCH /orders/{id}', styles['TableCell'])],
        [Paragraph('order.cancelled', styles['TableCell']),
         Paragraph('Storno-Grund, Actor-ID, Timestamp, Refund-Status', styles['TableCell']),
         Paragraph('DELETE /orders/{id}', styles['TableCell'])],
    ]
    story.append(create_table(order_audit_data, [AVAILABLE_WIDTH * 0.25, 0.45, 0.30]))
    
    # Pricing Service
    story.append(Spacer(1, 12))
    story.append(Paragraph('<b>Pricing-Service</b>', styles['H3']))
    story.append(Paragraph(
        'Der Pricing-Service berechnet Preise und validiert Gebote. Da Preis-Manipulation ein '
        'hohes Betrugspotenzial birgt, werden alle Preisberechnungen und Validierungen detailliert '
        'protokolliert – inklusive der verwendeten Konfigurations-Version.',
        styles['Body']
    ))
    
    pricing_audit_data = [
        [Paragraph('<b>Event</b>', styles['TableHeader']),
         Paragraph('<b>Audit-Content</b>', styles['TableHeader']),
         Paragraph('<b>Trigger</b>', styles['TableHeader'])],
        [Paragraph('pricing.calculated', styles['TableCell']),
         Paragraph('order_id, base_price, cost_breakdown, config_version, fuel_price_snapshot', styles['TableCell']),
         Paragraph('POST /pricing/calculate', styles['TableCell'])],
        [Paragraph('bid.validated', styles['TableCell']),
         Paragraph('bid_id, carrier_id, input_price, validated_price, validation_result, reason', styles['TableCell']),
         Paragraph('POST /pricing/{id}/bid/validate', styles['TableCell'])],
        [Paragraph('pricing.config.updated', styles['TableCell']),
         Paragraph('config_before, config_after, actor_id, change_reason', styles['TableCell']),
         Paragraph('Admin: PUT /pricing/config', styles['TableCell'])],
    ]
    story.append(create_table(pricing_audit_data, [AVAILABLE_WIDTH * 0.25, 0.45, 0.30]))
    
    # Matching Service
    story.append(Spacer(1, 12))
    story.append(Paragraph('<b>Matching-Service</b>', styles['H3']))
    story.append(Paragraph(
        'Der Matching-Service trifft die geschäftskritische Entscheidung, welcher Carrier einen '
        'Auftrag erhält. Die vollständige Score-Berechnung und die Gewichtungsfaktoren werden '
        'für jedes Matching archiviert.',
        styles['Body']
    ))
    
    matching_audit_data = [
        [Paragraph('<b>Event</b>', styles['TableHeader']),
         Paragraph('<b>Audit-Content</b>', styles['TableHeader']),
         Paragraph('<b>Trigger</b>', styles['TableHeader'])],
        [Paragraph('matching.completed', styles['TableCell']),
         Paragraph('order_id, winner_carrier_id, all_scores, weights, explanation, threshold_check', styles['TableCell']),
         Paragraph('matching.completed Event', styles['TableCell'])],
        [Paragraph('matching.override', styles['TableCell']),
         Paragraph('order_id, original_winner, override_winner, admin_id, reason', styles['TableCell']),
         Paragraph('Admin: POST /matching/{id}/override', styles['TableCell'])],
    ]
    story.append(create_table(matching_audit_data, [AVAILABLE_WIDTH * 0.25, 0.45, 0.30]))
    
    # Execution Service
    story.append(Spacer(1, 12))
    story.append(Paragraph('<b>Execution-Service</b>', styles['H3']))
    story.append(Paragraph(
        'Der Execution-Service verwaltet den physischen Transportprozess. Status-Transitions und '
        'POD-Uploads sind rechtsrelevant und müssen lückenlos dokumentiert sein.',
        styles['Body']
    ))
    
    execution_audit_data = [
        [Paragraph('<b>Event</b>', styles['TableHeader']),
         Paragraph('<b>Audit-Content</b>', styles['TableHeader']),
         Paragraph('<b>Trigger</b>', styles['TableHeader'])],
        [Paragraph('execution.status.changed', styles['TableCell']),
         Paragraph('execution_id, old_status, new_status, location, actor_id, timestamp', styles['TableCell']),
         Paragraph('POST /executions/{id}/status', styles['TableCell'])],
        [Paragraph('execution.pod.uploaded', styles['TableCell']),
         Paragraph('execution_id, pod_document_id, upload_actor, verification_status', styles['TableCell']),
         Paragraph('POST /executions/{id}/pod', styles['TableCell'])],
        [Paragraph('execution.dispute.opened', styles['TableCell']),
         Paragraph('execution_id, dispute_reason, opened_by, evidence_ids', styles['TableCell']),
         Paragraph('POST /executions/{id}/dispute', styles['TableCell'])],
    ]
    story.append(create_table(execution_audit_data, [AVAILABLE_WIDTH * 0.25, 0.45, 0.30]))
    
    # Bidding Service
    story.append(Spacer(1, 12))
    story.append(Paragraph('<b>Bidding-Service</b>', styles['H3']))
    story.append(Paragraph(
        'Der Bidding-Service verwaltet alle Gebote eines Carriers für offene Aufträge. '
        'Gebotshistorie ist wichtig für Marktanalyse und Betrugserkennung.',
        styles['Body']
    ))
    
    bidding_audit_data = [
        [Paragraph('<b>Event</b>', styles['TableHeader']),
         Paragraph('<b>Audit-Content</b>', styles['TableHeader']),
         Paragraph('<b>Trigger</b>', styles['TableHeader'])],
        [Paragraph('bid.submitted', styles['TableCell']),
         Paragraph('bid_id, order_id, carrier_id, price, proposed_pickup_time, created_at', styles['TableCell']),
         Paragraph('POST /bids', styles['TableCell'])],
        [Paragraph('bid.updated', styles['TableCell']),
         Paragraph('bid_id, old_price, new_price, update_reason', styles['TableCell']),
         Paragraph('PATCH /bids/{id}', styles['TableCell'])],
        [Paragraph('bid.cancelled', styles['TableCell']),
         Paragraph('bid_id, carrier_id, cancellation_reason', styles['TableCell']),
         Paragraph('DELETE /bids/{id}', styles['TableCell'])],
    ]
    story.append(create_table(bidding_audit_data, [AVAILABLE_WIDTH * 0.25, 0.45, 0.30]))
    
    story.append(PageBreak())
    
    # Audit Record Schema
    story.append(Paragraph('<b>1.3 Audit-Record Schema (Generisch)</b>', styles['H2']))
    story.append(Paragraph(
        'Das folgende JSON-Schema definiert die Struktur jedes Audit-Records. Die Felder sind '
        'so gewählt, dass sie sowohl für Compliance-Anforderungen als auch für operative Analysen '
        'ausreichend Information tragen, ohne sensible Daten unnötig zu exponieren.',
        styles['Body']
    ))
    
    schema_text = '''{
  "id": "audit_01HXYZ123456789",
  "timestamp": "2026-04-17T20:00:00.000Z",
  "actorType": "user | system | service",
  "actorId": "ship_1 | car_2 | svc_pricing",
  "service": "pricing-service",
  "action": "BID_VALIDATED",
  "entityType": "bid",
  "entityId": "bid_999",
  "payloadBefore": null,
  "payloadAfter": {
    "valid": true,
    "priceScore": 0.72,
    "validationResult": "APPROVED"
  },
  "correlationId": "trace_abc123",
  "metadata": {
    "ipAddress": "192.168.1.100",
    "userAgent": "CargoBit-Carrier-App/2.1",
    "sessionId": "sess_xyz"
  }
}'''
    
    story.append(Paragraph(f'<font face="Times New Roman" size="9">{schema_text}</font>', styles['CodeBlock']))
    
    story.append(Spacer(1, 12))
    story.append(Paragraph('<b>Schema-Felder erklärt:</b>', styles['H3']))
    
    schema_fields_data = [
        [Paragraph('<b>Feld</b>', styles['TableHeader']),
         Paragraph('<b>Typ</b>', styles['TableHeader']),
         Paragraph('<b>Beschreibung</b>', styles['TableHeader'])],
        [Paragraph('id', styles['TableCell']),
         Paragraph('string (ULID)', styles['TableCellCenter']),
         Paragraph('Eindeutige Audit-Record-ID, lexikographisch sortierbar', styles['TableCell'])],
        [Paragraph('timestamp', styles['TableCell']),
         Paragraph('ISO 8601', styles['TableCellCenter']),
         Paragraph('UTC-Timestamp der Aktion', styles['TableCell'])],
        [Paragraph('actorType', styles['TableCell']),
         Paragraph('enum', styles['TableCellCenter']),
         Paragraph('user (Endbenutzer), system (automatisch), service (inter-service)', styles['TableCell'])],
        [Paragraph('actorId', styles['TableCell']),
         Paragraph('string', styles['TableCellCenter']),
         Paragraph('ID des Akteurs (User-ID, Carrier-ID, Service-Name)', styles['TableCell'])],
        [Paragraph('service', styles['TableCell']),
         Paragraph('string', styles['TableCellCenter']),
         Paragraph('Name des ausführenden Services', styles['TableCell'])],
        [Paragraph('action', styles['TableCell']),
         Paragraph('string', styles['TableCellCenter']),
         Paragraph('Name der durchgeführten Aktion (SCREAMING_SNAKE_CASE)', styles['TableCell'])],
        [Paragraph('entityType', styles['TableCell']),
         Paragraph('string', styles['TableCellCenter']),
         Paragraph('Typ der betroffenen Entität (order, bid, execution, etc.)', styles['TableCell'])],
        [Paragraph('entityId', styles['TableCell']),
         Paragraph('string', styles['TableCellCenter']),
         Paragraph('ID der betroffenen Entität', styles['TableCell'])],
        [Paragraph('payloadBefore', styles['TableCell']),
         Paragraph('object|null', styles['TableCellCenter']),
         Paragraph('Zustand vor der Änderung (bei Updates)', styles['TableCell'])],
        [Paragraph('payloadAfter', styles['TableCell']),
         Paragraph('object|null', styles['TableCellCenter']),
         Paragraph('Zustand nach der Änderung', styles['TableCell'])],
        [Paragraph('correlationId', styles['TableCell']),
         Paragraph('string', styles['TableCellCenter']),
         Paragraph('Trace-ID für Cross-Service-Korrelation', styles['TableCell'])],
    ]
    story.append(create_table(schema_fields_data, [AVAILABLE_WIDTH * 0.18, 0.18, 0.64]))
    
    story.append(Spacer(1, 12))
    story.append(Paragraph('<b>1.4 Audit-Store Architektur</b>', styles['H2']))
    story.append(Paragraph(
        'Der zentrale Audit-Store wird als separater Service mit eigener Datenbank betrieben. '
        'Er empfängt Audit-Records asynchron über den Event-Bus und schreibt sie in eine append-only, '
        'WORM-fähige Datenbank (z.B. Amazon S3 Object Lock, Azure Immutable Storage, oder eine '
        'spezialisierte Audit-DB wie AuditDB).',
        styles['Body']
    ))
    
    story.append(Paragraph(
        '<b>Wichtige Design-Entscheidungen:</b>',
        styles['Body']
    ))
    
    decisions_text = '''
• Append-Only: Records können nur hinzugefügt, niemals geändert oder gelöscht werden
• WORM-Fähigkeit: Write-Once-Read-Many Schutz gegen Manipulation
• Zeitindex: Automatischer Index auf timestamp für effiziente Zeitbereichs-Abfragen
• CorrelationIndex: Index auf correlationId für Cross-Service-Tracing
• EntityIndex: Index auf (entityType, entityId) für Entitäts-Historie
• Separation of Concerns: Audit-DB ist getrennt von operativen DBs
• Async Write: Services blockieren nicht auf Audit-Writes (Event-Bus)
• Retention: 7–10 Jahre je nach Compliance-Anforderungen
'''
    story.append(Paragraph(f'<font face="SimHei" size="10">{decisions_text}</font>', styles['Body']))
    
    story.append(PageBreak())
    
    # ═══════════════════════════════════════════════════════════════════
    # SECTION 2: ANTI-FRAUD CHECKS
    # ═══════════════════════════════════════════════════════════════════
    
    story.append(Paragraph('2. Anti-Fraud-Checks in Pricing & Matching', styles['H1']))
    
    story.append(Paragraph('<b>2.1 Zielsetzung</b>', styles['H2']))
    story.append(Paragraph(
        'Betrugsprävention ist in einer B2B-Transportplattform kritisch. Die Hauptbedrohungen sind '
        'Preismanipulation (Dumping), Collusion (Absprachen zwischen Carriern), und ungewöhnliches '
        'Bietverhalten. Anti-Fraud-Checks werden auf drei Ebenen durchgeführt: Pricing-Service '
        '(Preis-Validierung), Bidding-Service (Gebots-Muster), und Matching-Service (Ergebnis-Analyse).',
        styles['Body']
    ))
    
    story.append(Paragraph('<b>2.2 Pricing-Service: Bid-Validation</b>', styles['H2']))
    story.append(Paragraph(
        'Jedes Gebot wird validiert bevor es in den Matching-Prozess eingeht. Die Validierung prüft '
        'gegen definierte Preisgrenzen und Marktbedingungen.',
        styles['Body']
    ))
    
    pricing_checks_data = [
        [Paragraph('<b>Check</b>', styles['TableHeader']),
         Paragraph('<b>Logik</b>', styles['TableHeader']),
         Paragraph('<b>Reaction</b>', styles['TableHeader'])],
        [Paragraph('Mindestpreis (faktorbasiert)', styles['TableCell']),
         Paragraph('bid_price >= base_cost × min_factor (z.B. 0.85)', styles['TableCell']),
         Paragraph('REJECT + AUDIT', styles['TableCell'])],
        [Paragraph('Hard-Floor (absolut)', styles['TableCell']),
         Paragraph('bid_price >= absolute_minimum (z.B. 20 EUR)', styles['TableCell']),
         Paragraph('REJECT + AUDIT', styles['TableCell'])],
        [Paragraph('Maximaler Discount', styles['TableCell']),
         Paragraph('discount <= max_discount_pct (z.B. 35%)', styles['TableCell']),
         Paragraph('REJECT + FLAG', styles['TableCell'])],
        [Paragraph('Marktpreis-Abweichung', styles['TableCell']),
         Paragraph('|bid_price - market_avg| / market_avg <= threshold', styles['TableCell']),
         Paragraph('FLAG für manuellen Review', styles['TableCell'])],
        [Paragraph('Kapazitäts-Plausibilität', styles['TableCell']),
         Paragraph('Carrier hat verfügbare Kapazität zum angebotenen Preis', styles['TableCell']),
         Paragraph('WARN + ACCEPT (weich)', styles['TableCell'])],
    ]
    story.append(create_table(pricing_checks_data, [AVAILABLE_WIDTH * 0.28, 0.42, 0.30]))
    
    story.append(Spacer(1, 12))
    story.append(Paragraph('<b>2.3 Bidding-Service: Rate-Limits & Pattern Detection</b>', styles['H2']))
    story.append(Paragraph(
        'Der Bidding-Service überwacht das Gebotsverhalten pro Carrier und pro Order. Auffällige '
        'Muster werden automatisch erkannt und können zu temporären Sperren oder manuellen Reviews führen.',
        styles['Body']
    ))
    
    bidding_checks_data = [
        [Paragraph('<b>Check</b>', styles['TableHeader']),
         Paragraph('<b>Logik</b>', styles['TableHeader']),
         Paragraph('<b>Reaction</b>', styles['TableHeader'])],
        [Paragraph('Rate-Limit pro Carrier/Order', styles['TableCell']),
         Paragraph('max X Bids pro Stunde pro Order (z.B. 10)', styles['TableCell']),
         Paragraph('429 TOO_MANY_REQUESTS', styles['TableCell'])],
        [Paragraph('Bid-Flood Detection', styles['TableCell']),
         Paragraph('>100 Bids in 1 Minute global → Anomalie', styles['TableCell']),
         Paragraph('TEMP_BAN + ALERT', styles['TableCell'])],
        [Paragraph('Preis-Timing-Anomalie', styles['TableCell']),
         Paragraph('Gebote immer kurz vor Deadline → mögliches Sniping', styles['TableCell']),
         Paragraph('FLAG + LOG', styles['TableCell'])],
        [Paragraph('Identische Gebote', styles['TableCell']),
         Paragraph('Mehrere Carrier bieten exakt gleichen Preis', styles['TableCell']),
         Paragraph('FLAG für Collusion-Check', styles['TableCell'])],
    ]
    story.append(create_table(bidding_checks_data, [AVAILABLE_WIDTH * 0.28, 0.42, 0.30]))
    
    story.append(Spacer(1, 12))
    story.append(Paragraph('<b>2.4 Matching-Service: Collusion Detection</b>', styles['H2']))
    story.append(Paragraph(
        'Der Matching-Service analysiert Matching-Ergebnisse auf Muster, die auf Absprachen hindeuten. '
        'Diese Checks laufen asynchron nach dem Matching und flaggen verdächtige Konstellationen.',
        styles['Body']
    ))
    
    matching_checks_data = [
        [Paragraph('<b>Pattern</b>', styles['TableHeader']),
         Paragraph('<b>Indikatoren</b>', styles['TableHeader']),
         Paragraph('<b>Action</b>', styles['TableHeader'])],
        [Paragraph('Immer gleiche Carrier-Gruppe', styles['TableCell']),
         Paragraph('Top 3 Carrier gewinnen >80% in einer Region', styles['TableCell']),
         Paragraph('FLAG + Risk-Service Alert', styles['TableCell'])],
        [Paragraph('Bids extrem nah beieinander', styles['TableCell']),
         Paragraph('Spread zwischen Top 3 Bids < 2%', styles['TableCell']),
         Paragraph('FLAG für Preis-Absprache', styles['TableCell'])],
        [Paragraph('Bids knapp über Minimum', styles['TableCell']),
         Paragraph('Gewinnendes Gebot immer <5% über Floor', styles['TableCell']),
         Paragraph('FLAG für Preis-Manipulation', styles['TableCell'])],
        [Paragraph('Rotation Pattern', styles['TableCell']),
         Paragraph('Carrier A, B, C wechseln sich systematisch ab', styles['TableCell']),
         Paragraph('FLAG für Markt-Aufteilung', styles['TableCell'])],
    ]
    story.append(create_table(matching_checks_data, [AVAILABLE_WIDTH * 0.28, 0.42, 0.30]))
    
    story.append(Spacer(1, 12))
    story.append(Paragraph('<b>2.5 Risk-Service: Carrier Fraud Score</b>', styles['H2']))
    story.append(Paragraph(
        'Der Risk-Service berechnet einen kontinuierlichen Fraud-Score für jeden Carrier basierend '
        'auf historischem Verhalten. Der Score beeinflusst das Matching-Gewichtung und kann bei '
        'kritischen Werten zu automatischen Sperren führen.',
        styles['Body']
    ))
    
    fraud_score_data = [
        [Paragraph('<b>Faktor</b>', styles['TableHeader']),
         Paragraph('<b>Gewichtung</b>', styles['TableHeader']),
         Paragraph('<b>Datenquelle</b>', styles['TableHeader'])],
        [Paragraph('Storno-Rate', styles['TableCell']),
         Paragraph('25%', styles['TableCellCenter']),
         Paragraph('execution.status.changed Events', styles['TableCell'])],
        [Paragraph('Dispute-Häufigkeit', styles['TableCell']),
         Paragraph('20%', styles['TableCellCenter']),
         Paragraph('execution.dispute.opened Events', styles['TableCell'])],
        [Paragraph('No-Show-Inzidenz', styles['TableCell']),
         Paragraph('20%', styles['TableCellCenter']),
         Paragraph('execution.status.changed (PICKED_UP fehlt)', styles['TableCell'])],
        [Paragraph('Preis-Anomalie-Historie', styles['TableCell']),
         Paragraph('15%', styles['TableCellCenter']),
         Paragraph('bid.validated Audit-Records', styles['TableCell'])],
        [Paragraph('Collusion-Flags', styles['TableCell']),
         Paragraph('20%', styles['TableCellCenter']),
         Paragraph('matching.fraud_detected Events', styles['TableCell'])],
    ]
    story.append(create_table(fraud_score_data, [AVAILABLE_WIDTH * 0.30, 0.20, 0.50]))
    
    story.append(Paragraph(
        '<b>Fraud-Score Thresholds:</b>',
        styles['Body']
    ))
    
    thresholds_text = '''
• Score < 0.3: Normal – keine Einschränkungen
• Score 0.3–0.6: Elevated – Matching-Penalty (-20% Score), manuelles Monitoring
• Score 0.6–0.8: High – Matching-Penalty (-50% Score), Alert an Risk-Team
• Score > 0.8: Critical – Automatische Sperre, manuelles Review erforderlich
'''
    story.append(Paragraph(f'<font face="SimHei" size="10">{thresholds_text}</font>', styles['Body']))
    
    story.append(PageBreak())
    
    # ═══════════════════════════════════════════════════════════════════
    # SECTION 3: RATE-LIMITING
    # ═══════════════════════════════════════════════════════════════════
    
    story.append(Paragraph('3. Rate-Limiting Strategie', styles['H1']))
    
    story.append(Paragraph('<b>3.1 Zielsetzung</b>', styles['H2']))
    story.append(Paragraph(
        'Rate-Limiting schützt die Plattform vor Überlastung, Missbrauch und DoS-Angriffen. Es wird '
        'auf zwei Ebenen implementiert: API-Gateway (globale Limits) und Service-Level (granulare '
        'Limits pro Business-Logik). Die Limits sind so gewählt, dass legitime Nutzer nicht '
        'beeinträchtigt werden, während abusive Muster effektiv blockiert werden.',
        styles['Body']
    ))
    
    story.append(Paragraph('<b>3.2 API-Gateway Rate-Limits</b>', styles['H2']))
    story.append(Paragraph(
        'Das API-Gateway (Kong, APIM, oder NGINX) setzt die ersten Rate-Limits durch, bevor Requests '
        'die internen Services erreichen. Implementierung erfolgt typischerweise via Redis-basiertem '
        'Token-Bucket oder Leaky-Bucket Algorithmus.',
        styles['Body']
    ))
    
    gateway_limits_data = [
        [Paragraph('<b>Endpoint</b>', styles['TableHeader']),
         Paragraph('<b>Limit</b>', styles['TableHeader']),
         Paragraph('<b>Scope</b>', styles['TableHeader']),
         Paragraph('<b>Begründung</b>', styles['TableHeader'])],
        [Paragraph('POST /orders', styles['TableCell']),
         Paragraph('60/min', styles['TableCellCenter']),
         Paragraph('pro Shipper', styles['TableCell']),
         Paragraph('Verhindert Mass-Order-Spam', styles['TableCell'])],
        [Paragraph('POST /bids', styles['TableCell']),
         Paragraph('120/min', styles['TableCellCenter']),
         Paragraph('pro Carrier', styles['TableCell']),
         Paragraph('Verhindert Bid-Flooding', styles['TableCell'])],
        [Paragraph('POST /pricing/{id}/bid/validate', styles['TableCell']),
         Paragraph('300/min', styles['TableCellCenter']),
         Paragraph('pro Carrier', styles['TableCell']),
         Paragraph('Live-Feedback für UI erlaubt höhere Rate', styles['TableCell'])],
        [Paragraph('POST /executions/{id}/status', styles['TableCell']),
         Paragraph('60/min', styles['TableCellCenter']),
         Paragraph('pro Carrier', styles['TableCell']),
         Paragraph('Status-Updates sind frequenzbegrenzt', styles['TableCell'])],
        [Paragraph('POST /executions/{id}/pod', styles['TableCell']),
         Paragraph('10/min', styles['TableCellCenter']),
         Paragraph('pro Carrier', styles['TableCell']),
         Paragraph('POD-Uploads sind schwergewichtig', styles['TableCell'])],
        [Paragraph('GET /orders (List)', styles['TableCell']),
         Paragraph('200/min', styles['TableCellCenter']),
         Paragraph('pro User', styles['TableCell']),
         Paragraph('Listen-Abfragen sind häufig', styles['TableCell'])],
        [Paragraph('Global API', styles['TableCell']),
         Paragraph('10,000/min', styles['TableCellCenter']),
         Paragraph('pro IP', styles['TableCell']),
         Paragraph('DoS-Schutz auf IP-Ebene', styles['TableCell'])],
    ]
    story.append(create_table(gateway_limits_data, [AVAILABLE_WIDTH * 0.28, 0.14, 0.18, 0.40]))
    
    story.append(Spacer(1, 12))
    story.append(Paragraph('<b>3.3 Implementierung: Token-Bucket Algorithmus</b>', styles['H2']))
    story.append(Paragraph(
        'Der Token-Bucket Algorithmus erlaubt Burst-Traffic bis zu einem definierten Maximum, '
        'während die durchschnittliche Rate langfristig begrenzt wird. Redis speichert den '
        'Bucket-Status mit atomaren Operationen.',
        styles['Body']
    ))
    
    token_bucket_pseudocode = '''// Redis-basierter Token-Bucket
function checkRateLimit(key: string, maxTokens: int, refillRate: int): boolean {
  const now = Date.now()
  const bucket = redis.hgetall(key)
  
  if (!bucket) {
    // Neuer Bucket
    redis.hmset(key, {tokens: maxTokens - 1, lastRefill: now})
    redis.expire(key, 3600) // 1h TTL
    return true
  }
  
  // Tokens nachfüllen
  const elapsed = now - parseInt(bucket.lastRefill)
  const refillTokens = Math.floor(elapsed / 1000 * refillRate)
  const currentTokens = Math.min(maxTokens, parseInt(bucket.tokens) + refillTokens)
  
  if (currentTokens < 1) {
    return false // Rate-Limit exceeded
  }
  
  redis.hmset(key, {tokens: currentTokens - 1, lastRefill: now})
  return true
}'''
    
    story.append(Paragraph(f'<font face="Times New Roman" size="9">{token_bucket_pseudocode}</font>', styles['CodeBlock']))
    
    story.append(Spacer(1, 12))
    story.append(Paragraph('<b>3.4 Rate-Limit Response Headers</b>', styles['H2']))
    story.append(Paragraph(
        'Jede API-Antwort enthält Header, die den aktuellen Rate-Limit-Status kommunizieren. '
        'Dies ermöglicht Clients, sich gracefully zu verhalten und Backoff-Strategien zu implementieren.',
        styles['Body']
    ))
    
    headers_data = [
        [Paragraph('<b>Header</b>', styles['TableHeader']),
         Paragraph('<b>Beispiel</b>', styles['TableHeader']),
         Paragraph('<b>Beschreibung</b>', styles['TableHeader'])],
        [Paragraph('X-RateLimit-Limit', styles['TableCell']),
         Paragraph('120', styles['TableCellCenter']),
         Paragraph('Maximum Requests pro Zeitfenster', styles['TableCell'])],
        [Paragraph('X-RateLimit-Remaining', styles['TableCell']),
         Paragraph('87', styles['TableCellCenter']),
         Paragraph('Verbleibende Requests im aktuellen Fenster', styles['TableCell'])],
        [Paragraph('X-RateLimit-Reset', styles['TableCell']),
         Paragraph('1713387600', styles['TableCellCenter']),
         Paragraph('Unix-Timestamp wann Limit zurückgesetzt wird', styles['TableCell'])],
        [Paragraph('Retry-After (bei 429)', styles['TableCell']),
         Paragraph('23', styles['TableCellCenter']),
         Paragraph('Sekunden bis zum nächsten erlaubten Request', styles['TableCell'])],
    ]
    story.append(create_table(headers_data, [AVAILABLE_WIDTH * 0.28, 0.22, 0.50]))
    
    story.append(Spacer(1, 12))
    story.append(Paragraph('<b>3.5 429 Response Format</b>', styles['H2']))
    
    response_429 = '''{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Please retry after 23 seconds.",
    "details": {
      "limit": 120,
      "window": "60s",
      "retryAfter": 23
    }
  }
}'''
    
    story.append(Paragraph(f'<font face="Times New Roman" size="9">{response_429}</font>', styles['CodeBlock']))
    
    story.append(PageBreak())
    
    # ═══════════════════════════════════════════════════════════════════
    # SECTION 4: DATA RETENTION
    # ═══════════════════════════════════════════════════════════════════
    
    story.append(Paragraph('4. Data-Retention Policies', styles['H1']))
    
    story.append(Paragraph('<b>4.1 Prinzipien</b>', styles['H2']))
    story.append(Paragraph(
        'Data-Retention folgt dem Prinzip "So viel wie nötig, so wenig wie möglich – aber audit-fähig". '
        'Jeder Service definiert seine Retention-Policies basierend auf rechtlichen Anforderungen '
        '(Steuer, Compliance), betrieblichen Notwendigkeiten und Datenschutz (DSGVO). Operative Daten '
        'werden nach Ablauf der Retention automatisch archiviert oder gelöscht.',
        styles['Body']
    ))
    
    story.append(Paragraph(
        '<b>Wichtige Grundsätze:</b>',
        styles['Body']
    ))
    
    principles_text = '''
• Rechtliche Mindestaufbewahrung wird immer eingehalten
• DSGVO-Rechte (Löschung auf Antrag) sind implementiert, mit Ausnahme für Audit-Daten
• Archivierung erfolgt auf Cold Storage (S3 Glacier, Azure Archive)
• Purge-Jobs laufen täglich und löschen/archivieren abgelaufene Daten
• Audit-Logs haben immer die längste Retention (7–10 Jahre)
• POD-Dokumente werden separat mit langer Retention verwaltet
'''
    story.append(Paragraph(f'<font face="SimHei" size="10">{principles_text}</font>', styles['Body']))
    
    story.append(Paragraph('<b>4.2 Retention pro Service und Datentyp</b>', styles['H2']))
    
    retention_data = [
        [Paragraph('<b>Service</b>', styles['TableHeader']),
         Paragraph('<b>Datentyp</b>', styles['TableHeader']),
         Paragraph('<b>Retention</b>', styles['TableHeader']),
         Paragraph('<b>Begründung</b>', styles['TableHeader'])],
        # Order Service
        [Paragraph('Order-Service', styles['TableCell']),
         Paragraph('orders', styles['TableCell']),
         Paragraph('7–10 Jahre', styles['TableCellCenter']),
         Paragraph('Steuerlich/vertraglich erforderlich (§147 AO)', styles['TableCell'])],
        # Pricing Service
        [Paragraph('Pricing-Service', styles['TableCell']),
         Paragraph('order_pricing', styles['TableCell']),
         Paragraph('5–7 Jahre', styles['TableCellCenter']),
         Paragraph('Preisnachvollziehbarkeit bei Disputes', styles['TableCell'])],
        [Paragraph('Pricing-Service', styles['TableCell']),
         Paragraph('pricing_config', styles['TableCell']),
         Paragraph('Dauerhaft', styles['TableCellCenter']),
         Paragraph('Vollständige Konfigurationshistorie', styles['TableCell'])],
        [Paragraph('Pricing-Service', styles['TableCell']),
         Paragraph('fuel_prices, toll_costs', styles['TableCell']),
         Paragraph('5 Jahre', styles['TableCellCenter']),
         Paragraph('Rekonstruktion von Preiskalkulationen', styles['TableCell'])],
        # Bidding Service
        [Paragraph('Bidding-Service', styles['TableCell']),
         Paragraph('bids', styles['TableCell']),
         Paragraph('3–5 Jahre', styles['TableCellCenter']),
         Paragraph('Marktanalysen, Dispute-Handling', styles['TableCell'])],
        # Matching Service
        [Paragraph('Matching-Service', styles['TableCell']),
         Paragraph('matching_results', styles['TableCell']),
         Paragraph('2–3 Jahre', styles['TableCellCenter']),
         Paragraph('Audit, Debug, Optimierung', styles['TableCell'])],
        # Execution Service
        [Paragraph('Execution-Service', styles['TableCell']),
         Paragraph('executions', styles['TableCell']),
         Paragraph('7–10 Jahre', styles['TableCellCenter']),
         Paragraph('Transportnachweis, rechtlich relevant', styles['TableCell'])],
        [Paragraph('Execution-Service', styles['TableCell']),
         Paragraph('execution_events', styles['TableCell']),
         Paragraph('7–10 Jahre', styles['TableCellCenter']),
         Paragraph('Status-Historie für Nachweise', styles['TableCell'])],
        [Paragraph('Execution-Service', styles['TableCell']),
         Paragraph('pod_documents', styles['TableCell']),
         Paragraph('3–10 Jahre', styles['TableCellCenter']),
         Paragraph('Abhängig von Recht & Verträgen', styles['TableCell'])],
        # Audit
        [Paragraph('Audit-Service', styles['TableCell']),
         Paragraph('audit_logs', styles['TableCell']),
         Paragraph('7–10 Jahre', styles['TableCellCenter']),
         Paragraph('Compliance, Betrugsermittlung', styles['TableCell'])],
        # Carrier Service
        [Paragraph('Carrier-Service', styles['TableCell']),
         Paragraph('carrier_stats', styles['TableCell']),
         Paragraph('5 Jahre', styles['TableCellCenter']),
         Paragraph('Score-Berechnung, Historie', styles['TableCell'])],
        [Paragraph('Carrier-Service', styles['TableCell']),
         Paragraph('carrier_capacity', styles['TableCell']),
         Paragraph('2 Jahre', styles['TableCellCenter']),
         Paragraph('Kapazitätsplanung, Analyse', styles['TableCell'])],
        # Risk Service
        [Paragraph('Risk-Service', styles['TableCell']),
         Paragraph('risk_scores', styles['TableCell']),
         Paragraph('5 Jahre', styles['TableCellCenter']),
         Paragraph('Fraud-Analyse, Audit', styles['TableCell'])],
    ]
    story.append(create_table(retention_data, [AVAILABLE_WIDTH * 0.18, 0.22, 0.14, 0.46]))
    
    story.append(Spacer(1, 12))
    story.append(Paragraph('<b>4.3 Archivierungs-Pipeline</b>', styles['H2']))
    story.append(Paragraph(
        'Daten werden nicht sofort gelöscht, sondern durchlaufen eine Archivierungs-Pipeline. '
        'Dies ermöglicht Wiederherstellung bei Bedarf und reduziert Storage-Kosten durch '
        'Cold-Storage-Migration.',
        styles['Body']
    ))
    
    archive_pipeline = '''
┌─────────────────────────────────────────────────────────────────────────┐
│                        ARCHIVIERUNGS-PIPELINE                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Hot Storage        →    Warm Storage    →    Cold Storage    → Delete │
│  (PostgreSQL)            (S3 Standard)        (S3 Glacier)              │
│                                                                         │
│  • Aktive Daten          • 1–3 Jahre           • 3–7 Jahre              │
│  • Vollzugriff           • Seltener Zugriff    • Audit-only             │
│  • Keine Kosten          • Niedrige Kosten     • Minimale Kosten        │
│                                                                         │
│  Übergänge:                                                             │
│  Hot → Warm:   Nach 1 Jahr (automatisch via Job)                       │
│  Warm → Cold:  Nach 3 Jahren (automatisch via Job)                     │
│  Cold → Delete: Nach Retention-Ende (manuell freigegeben)              │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
'''
    story.append(Paragraph(f'<font face="Times New Roman" size="9">{archive_pipeline}</font>', styles['CodeBlock']))
    
    story.append(Spacer(1, 12))
    story.append(Paragraph('<b>4.4 Purge-Job Konfiguration</b>', styles['H2']))
    
    purge_job_data = [
        [Paragraph('<b>Job</b>', styles['TableHeader']),
         Paragraph('<b>Schedule</b>', styles['TableHeader']),
         Paragraph('<b>Aktion</b>', styles['TableHeader'])],
        [Paragraph('order_archive_job', styles['TableCell']),
         Paragraph('Täglich 02:00 UTC', styles['TableCellCenter']),
         Paragraph('Orders > 1 Jahr → Warm Storage', styles['TableCell'])],
        [Paragraph('execution_archive_job', styles['TableCell']),
         Paragraph('Täglich 03:00 UTC', styles['TableCellCenter']),
         Paragraph('Executions > 1 Jahr → Warm Storage', styles['TableCell'])],
        [Paragraph('pod_archive_job', styles['TableCell']),
         Paragraph('Täglich 04:00 UTC', styles['TableCellCenter']),
         Paragraph('POD-Dokumente > 1 Jahr → Cold Storage', styles['TableCell'])],
        [Paragraph('bid_cleanup_job', styles['TableCell']),
         Paragraph('Täglich 05:00 UTC', styles['TableCellCenter']),
         Paragraph('Bids > 5 Jahre → Cold Storage', styles['TableCell'])],
        [Paragraph('audit_archive_job', styles['TableCell']),
         Paragraph('Wöchentlich So 02:00', styles['TableCellCenter']),
         Paragraph('Audit-Logs > 3 Jahre → Cold Storage', styles['TableCell'])],
    ]
    story.append(create_table(purge_job_data, [AVAILABLE_WIDTH * 0.28, 0.24, 0.48]))
    
    story.append(PageBreak())
    
    # ═══════════════════════════════════════════════════════════════════
    # SECTION 5: INTEGRATION OVERVIEW
    # ═══════════════════════════════════════════════════════════════════
    
    story.append(Paragraph('5. Service-übergreifende Integration', styles['H1']))
    
    story.append(Paragraph('<b>5.1 Event-Flow mit Audit & Fraud</b>', styles['H2']))
    story.append(Paragraph(
        'Die folgende Darstellung zeigt, wie Audit-Logging und Fraud-Checks in den bestehenden '
        'Event-Flow integriert werden. Jedes geschäftsrelevante Event wird parallel auditiert, '
        'und Fraud-Checks laufen als asynchrone Analysen.',
        styles['Body']
    ))
    
    event_flow = '''
┌──────────────────────────────────────────────────────────────────────────────┐
│                    EVENT-DRIVEN ARCHITECTURE WITH AUDIT                      │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Shipper                Order-Service              Audit-Service             │
│    │                         │                          │                    │
│    │──POST /orders──────────→│                          │                    │
│    │                         │──order.created──────────→│                    │
│    │                         │   (async via EventBus)   │──Write Audit       │
│    │                         │                          │   Record           │
│    │←──────order_id──────────│                          │                    │
│    │                         │                          │                    │
│    │                         │                          │                    │
│  Pricing-Service           Matching-Service          Fraud-Check            │
│    │                         │                          │                    │
│    │←──order.created─────────│                          │                    │
│    │──pricing.calculated────→│                          │                    │
│    │   (with cost_breakdown) │──matching.completed─────→│                    │
│    │                         │   (with all scores)      │──Analyze Pattern   │
│    │                         │                          │──Update Fraud      │
│    │                         │                          │   Score if needed  │
│    │                         │                          │                    │
└──────────────────────────────────────────────────────────────────────────────┘

Topics mit Audit-Pflicht:
• order.created, order.updated, order.cancelled
• pricing.calculated, bid.validated
• bid.submitted, bid.updated, bid.cancelled
• matching.completed, matching.override
• execution.status.changed, execution.pod.uploaded

Topics für Fraud-Analyse:
• bid.submitted → Rate-Limit Check
• matching.completed → Collusion Pattern
• execution.status.changed → No-Show Detection
'''
    story.append(Paragraph(f'<font face="Times New Roman" size="9">{event_flow}</font>', styles['CodeBlock']))
    
    story.append(Spacer(1, 12))
    story.append(Paragraph('<b>5.2 Service-Responsibilities Matrix</b>', styles['H2']))
    
    responsibility_data = [
        [Paragraph('<b>Service</b>', styles['TableHeader']),
         Paragraph('<b>Audit</b>', styles['TableHeader']),
         Paragraph('<b>Fraud Check</b>', styles['TableHeader']),
         Paragraph('<b>Rate Limit</b>', styles['TableHeader']),
         Paragraph('<b>Retention</b>', styles['TableHeader'])],
        [Paragraph('Order-Service', styles['TableCell']),
         Paragraph('✓ Events', styles['TableCellCenter']),
         Paragraph('—', styles['TableCellCenter']),
         Paragraph('API Gateway', styles['TableCellCenter']),
         Paragraph('7–10 Jahre', styles['TableCellCenter'])],
        [Paragraph('Pricing-Service', styles['TableCell']),
         Paragraph('✓ Calculations', styles['TableCellCenter']),
         Paragraph('✓ Price Checks', styles['TableCellCenter']),
         Paragraph('API Gateway', styles['TableCellCenter']),
         Paragraph('5–7 Jahre', styles['TableCellCenter'])],
        [Paragraph('Bidding-Service', styles['TableCell']),
         Paragraph('✓ Bids', styles['TableCellCenter']),
         Paragraph('✓ Pattern', styles['TableCellCenter']),
         Paragraph('✓ Service-Level', styles['TableCellCenter']),
         Paragraph('3–5 Jahre', styles['TableCellCenter'])],
        [Paragraph('Matching-Service', styles['TableCell']),
         Paragraph('✓ Scores', styles['TableCellCenter']),
         Paragraph('✓ Collusion', styles['TableCellCenter']),
         Paragraph('—', styles['TableCellCenter']),
         Paragraph('2–3 Jahre', styles['TableCellCenter'])],
        [Paragraph('Execution-Service', styles['TableCell']),
         Paragraph('✓ Status, POD', styles['TableCellCenter']),
         Paragraph('✓ No-Show', styles['TableCellCenter']),
         Paragraph('API Gateway', styles['TableCellCenter']),
         Paragraph('7–10 Jahre', styles['TableCellCenter'])],
        [Paragraph('Risk-Service', styles['TableCell']),
         Paragraph('✓ Scores', styles['TableCellCenter']),
         Paragraph('✓ Aggregation', styles['TableCellCenter']),
         Paragraph('—', styles['TableCellCenter']),
         Paragraph('5 Jahre', styles['TableCellCenter'])],
        [Paragraph('Audit-Service', styles['TableCell']),
         Paragraph('Central Store', styles['TableCellCenter']),
         Paragraph('—', styles['TableCellCenter']),
         Paragraph('—', styles['TableCellCenter']),
         Paragraph('7–10 Jahre', styles['TableCellCenter'])],
    ]
    story.append(create_table(responsibility_data, [AVAILABLE_WIDTH * 0.18, 0.18, 0.18, 0.20, 0.18]))
    
    story.append(Spacer(1, 18))
    story.append(Paragraph('<b>5.3 Implementierungs-Prioritäten</b>', styles['H2']))
    
    priority_data = [
        [Paragraph('<b>Priorität</b>', styles['TableHeader']),
         Paragraph('<b>Komponente</b>', styles['TableHeader']),
         Paragraph('<b>Aufwand</b>', styles['TableHeader']),
         Paragraph('<b>Risiko bei Verzögerung</b>', styles['TableHeader'])],
        [Paragraph('P0 (Sofort)', styles['TableCell']),
         Paragraph('Audit-Service + Event-Bus Integration', styles['TableCell']),
         Paragraph('2 Wochen', styles['TableCellCenter']),
         Paragraph('Keine Compliance, keine Nachvollziehbarkeit', styles['TableCell'])],
        [Paragraph('P0 (Sofort)', styles['TableCell']),
         Paragraph('API Gateway Rate-Limiting', styles['TableCell']),
         Paragraph('1 Woche', styles['TableCellCenter']),
         Paragraph('DoS-Anfälligkeit, keine Schutzmaßnahmen', styles['TableCell'])],
        [Paragraph('P1 (Q2)', styles['TableCell']),
         Paragraph('Pricing Anti-Fraud Checks', styles['TableCell']),
         Paragraph('1 Woche', styles['TableCellCenter']),
         Paragraph('Preismanipulation möglich', styles['TableCell'])],
        [Paragraph('P1 (Q2)', styles['TableCell']),
         Paragraph('Data Retention Jobs', styles['TableCell']),
         Paragraph('1 Woche', styles['TableCellCenter']),
         Paragraph('Storage-Kosten, DSGVO-Verstoß', styles['TableCell'])],
        [Paragraph('P2 (Q3)', styles['TableCell']),
         Paragraph('Matching Collusion Detection', styles['TableCell']),
         Paragraph('2 Wochen', styles['TableCellCenter']),
         Paragraph('Betrug schwerer erkennbar', styles['TableCell'])],
        [Paragraph('P2 (Q3)', styles['TableCell']),
         Paragraph('Risk-Service Fraud Score', styles['TableCell']),
         Paragraph('2 Wochen', styles['TableCellCenter']),
         Paragraph('Keine automatische Risiko-Bewertung', styles['TableCell'])],
    ]
    story.append(create_table(priority_data, [AVAILABLE_WIDTH * 0.14, 0.36, 0.14, 0.36]))
    
    story.append(Spacer(1, 24))
    story.append(Paragraph(
        '<b>Dokument-Hinweis:</b> Dieses Architektur-Dokument ist die Basis für die Implementierung '
        'der Produktions-Erweiterungen. Alle Spezifikationen sollten vor der Implementierung mit dem '
        'Legal- und Compliance-Team abgestimmt werden, um regionale Anforderungen (DSGVO, GoBD, etc.) '
        'vollständig zu berücksichtigen.',
        styles['Body']
    ))
    
    # Build PDF
    doc.build(story)
    print(f"PDF created: {output_path}")
    return output_path

if __name__ == '__main__':
    build_document()
