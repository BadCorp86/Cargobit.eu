const pptxgen = require('pptxgenjs');
const fs = require('fs');
const path = require('path');

// Ocean Theme Colors
const PRIMARY_90 = '122040';
const PRIMARY_80 = '1B2A4A';
const PRIMARY_60 = '3D5A80';
const PRIMARY_40 = '6B8AB0';
const PRIMARY_10 = 'DFE8F2';
const PRIMARY_5 = 'F0F4F8';
const ACCENT = '2A9D8F';
const WHITE = 'FFFFFF';

async function main() {
    const pptx = new pptxgen();
    pptx.layout = 'LAYOUT_16x9';
    pptx.author = 'CargoBit';
    pptx.title = 'Hybrid Security Layer - Executive Presentation';
    pptx.subject = 'Enterprise Security Architecture';
    
    // Slide 1: Cover
    let slide = pptx.addSlide();
    slide.background = { color: PRIMARY_90 };
    slide.addShape('rect', { x: 0, y: 0, w: '100%', h: 0.05, fill: { color: ACCENT } });
    slide.addText('Enterprise Security Architecture', { x: 0.8, y: 1.5, w: 8, h: 0.4, fontSize: 12, color: ACCENT, fontFace: 'Arial' });
    slide.addText('Hybrid Security Layer\nfor Risk, Fraud Prevention\n& Compliance', { x: 0.8, y: 2.0, w: 8, h: 1.5, fontSize: 40, bold: true, color: WHITE, fontFace: 'Arial', lineSpacing: 46 });
    slide.addShape('rect', { x: 0.8, y: 3.7, w: 0.6, h: 0.04, fill: { color: ACCENT } });
    slide.addText('Executive Presentation\nStrategic Security Initiative', { x: 0.8, y: 3.9, w: 8, h: 0.6, fontSize: 18, color: 'AAAAAA', fontFace: 'Arial', lineSpacing: 24 });
    slide.addText('CargoBit Platform · April 2026', { x: 0.8, y: 4.8, w: 8, h: 0.3, fontSize: 13, color: '888888', fontFace: 'Arial' });
    
    // Slide 2: The Problem
    slide = pptx.addSlide();
    slide.background = { color: WHITE };
    slide.addShape('rect', { x: 0, y: 0, w: '100%', h: 0.8, fill: { color: PRIMARY_90 } });
    slide.addText('The Problem', { x: 0.6, y: 0.2, w: 9, h: 0.5, fontSize: 22, bold: true, color: WHITE, fontFace: 'Arial' });
    
    const problems = [
        { icon: '!', title: 'Fragmentierte\nSicherheitslogik', desc: 'Domain-Services mit inkonsistenten Regeln' },
        { icon: '⚡', title: 'Steigende\nFraud-Risiken', desc: 'Komplexere und schnellere Angriffe' },
        { icon: '📋', title: 'Compliance-\nDruck', desc: 'ISO, SOC2, GDPR Anforderungen' },
        { icon: '?', title: 'Fehlende\nAuditierbarkeit', desc: 'Nicht nachvollziehbare Entscheidungen' }
    ];
    
    problems.forEach((p, i) => {
        const x = 0.4 + i * 2.4;
        slide.addShape('roundRect', { x: x, y: 1.2, w: 2.2, h: 3.5, fill: { color: PRIMARY_10 }, line: { color: PRIMARY_10 } });
        slide.addShape('ellipse', { x: x + 0.75, y: 1.5, w: 0.6, h: 0.6, fill: { color: ACCENT } });
        slide.addText(p.icon, { x: x + 0.75, y: 1.55, w: 0.6, h: 0.5, fontSize: 20, color: WHITE, align: 'center', fontFace: 'Arial' });
        slide.addText(p.title, { x: x + 0.1, y: 2.3, w: 2, h: 0.7, fontSize: 13, bold: true, color: PRIMARY_80, align: 'center', fontFace: 'Arial' });
        slide.addText(p.desc, { x: x + 0.1, y: 3.1, w: 2, h: 1, fontSize: 10, color: PRIMARY_60, align: 'center', fontFace: 'Arial' });
    });
    
    // Slide 3: The Vision
    slide = pptx.addSlide();
    slide.background = { color: PRIMARY_90 };
    slide.addShape('rect', { x: 0, y: 0, w: '100%', h: 0.05, fill: { color: ACCENT } });
    slide.addText('Ein zentraler Security Layer\nfür alle sicherheitsrelevanten Entscheidungen', { x: 0.5, y: 1.5, w: 9, h: 1.2, fontSize: 26, color: WHITE, align: 'center', fontFace: 'Arial', lineSpacing: 36 });
    
    const features = ['Einheitliche Policies', 'Konsistente Entscheidungen', 'Vollständige Nachvollziehbarkeit'];
    features.forEach((f, i) => {
        const x = 1.5 + i * 2.8;
        slide.addShape('roundRect', { x: x, y: 3.2, w: 2.4, h: 0.7, fill: { color: '1A2A3A' }, line: { color: '2A3A4A', pt: 1 } });
        slide.addText(f, { x: x, y: 3.35, w: 2.4, h: 0.4, fontSize: 12, color: 'AAAAAA', align: 'center', fontFace: 'Arial' });
    });
    
    // Slide 4: Architecture Overview
    slide = pptx.addSlide();
    slide.background = { color: WHITE };
    slide.addShape('rect', { x: 0, y: 0, w: '100%', h: 0.8, fill: { color: PRIMARY_90 } });
    slide.addText('Architecture Overview', { x: 0.6, y: 0.2, w: 9, h: 0.5, fontSize: 22, bold: true, color: WHITE, fontFace: 'Arial' });
    
    const components = [
        { icon: 'G', name: 'Security\nGateway', desc: 'Decision Layer' },
        { icon: 'R', name: 'Risk\nEngine', desc: 'Real-Time Scoring' },
        { icon: 'M', name: 'Mitigation\nService', desc: 'Adaptive Controls' },
        { icon: 'A', name: 'Audit\nService', desc: 'Immutable Ledger' },
        { icon: 'N', name: 'Notification\nService', desc: 'Alerts & Escalations' }
    ];
    
    components.forEach((c, i) => {
        const x = 0.3 + i * 1.9;
        slide.addShape('roundRect', { x: x, y: 1.3, w: 1.7, h: 3.2, fill: { color: WHITE }, shadow: { type: 'outer', blur: 6, offset: 2, angle: 45, opacity: 0.15 } });
        slide.addShape('ellipse', { x: x + 0.55, y: 1.6, w: 0.55, h: 0.55, fill: { color: ACCENT } });
        slide.addText(c.icon, { x: x + 0.55, y: 1.65, w: 0.55, h: 0.45, fontSize: 16, color: WHITE, align: 'center', fontFace: 'Arial' });
        slide.addText(c.name, { x: x + 0.05, y: 2.4, w: 1.6, h: 0.8, fontSize: 11, bold: true, color: PRIMARY_80, align: 'center', fontFace: 'Arial' });
        slide.addText(c.desc, { x: x + 0.05, y: 3.3, w: 1.6, h: 0.4, fontSize: 9, color: PRIMARY_60, align: 'center', fontFace: 'Arial' });
    });
    
    // Slide 5: Key Capabilities
    slide = pptx.addSlide();
    slide.background = { color: WHITE };
    slide.addShape('rect', { x: 0, y: 0, w: '100%', h: 0.8, fill: { color: PRIMARY_90 } });
    slide.addText('Key Capabilities', { x: 0.6, y: 0.2, w: 9, h: 0.5, fontSize: 22, bold: true, color: WHITE, fontFace: 'Arial' });
    
    const capabilities = [
        '1  Echtzeit-Risikobewertung mit P95 < 80ms',
        '2  Adaptive Mitigations (Delay, 2FA, GPS-Check)',
        '3  Immutable Audit-Trail mit Hash-Chain',
        '4  Zero-Trust Service-Auth (mTLS + JWT)',
        '5  Operational Monitoring (Grafana, Alertmanager)'
    ];
    
    capabilities.forEach((cap, i) => {
        const y = 1.3 + i * 0.7;
        slide.addShape('roundRect', { x: 0.6, y: y, w: 8.8, h: 0.55, fill: { color: PRIMARY_10 } });
        slide.addText(cap, { x: 0.8, y: y + 0.1, w: 8.4, h: 0.35, fontSize: 14, color: PRIMARY_80, fontFace: 'Arial' });
    });
    
    // Slide 6: Business Impact
    slide = pptx.addSlide();
    slide.background = { color: PRIMARY_5 };
    slide.addShape('rect', { x: 0, y: 0, w: '100%', h: 0.8, fill: { color: PRIMARY_90 } });
    slide.addText('Business Impact', { x: 0.6, y: 0.2, w: 9, h: 0.5, fontSize: 22, bold: true, color: WHITE, fontFace: 'Arial' });
    
    const impacts = [
        { value: '-60%', label: 'Fraud-Kosten\nreduziert' },
        { value: 'ISO', label: 'Compliance-\nReady' },
        { value: '-80%', label: 'Manuelle\nReviews' },
        { value: '+95%', label: 'Kunden-\nVertrauen' }
    ];
    
    impacts.forEach((imp, i) => {
        const x = 0.5 + i * 2.35;
        slide.addShape('roundRect', { x: x, y: 1.5, w: 2.1, h: 3, fill: { color: WHITE }, shadow: { type: 'outer', blur: 8, offset: 3, angle: 45, opacity: 0.12 } });
        slide.addText(imp.value, { x: x, y: 1.9, w: 2.1, h: 0.7, fontSize: 32, bold: true, color: ACCENT, align: 'center', fontFace: 'Arial' });
        slide.addText(imp.label, { x: x, y: 2.8, w: 2.1, h: 0.8, fontSize: 11, color: PRIMARY_40, align: 'center', fontFace: 'Arial' });
    });
    
    // Slide 7: Strategic Advantage
    slide = pptx.addSlide();
    slide.background = { color: PRIMARY_90 };
    slide.addShape('rect', { x: 0, y: 0, w: '100%', h: 0.05, fill: { color: ACCENT } });
    
    const advantages = [
        'Skalierbare, modulare Sicherheitsarchitektur',
        'Zukunftssicher für neue Produkte & Märkte',
        'Strategischer Wettbewerbsvorteil, kein reines IT-Projekt'
    ];
    
    advantages.forEach((adv, i) => {
        const y = 1.5 + i * 0.9;
        slide.addShape('roundRect', { x: 0.6, y: y, w: 0.5, h: 0.5, fill: { color: ACCENT } });
        slide.addText('→', { x: 0.6, y: y + 0.05, w: 0.5, h: 0.4, fontSize: 18, color: WHITE, align: 'center', fontFace: 'Arial' });
        slide.addText(adv, { x: 1.3, y: y + 0.05, w: 8, h: 0.4, fontSize: 18, color: WHITE, fontFace: 'Arial' });
    });
    
    slide.addText('CargoBit Security Platform', { x: 0.6, y: 4.6, w: 5, h: 0.3, fontSize: 14, bold: true, color: ACCENT, fontFace: 'Arial' });
    
    // Save
    const outputPath = '/home/z/my-project/download/CargoBit_Security_Executive_Presentation.pptx';
    await pptx.writeFile({ fileName: outputPath });
    console.log(`\n✅ Presentation created: ${outputPath}`);
    console.log(`   Size: ${fs.statSync(outputPath).size / 1024} KB`);
}

main().catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
});
