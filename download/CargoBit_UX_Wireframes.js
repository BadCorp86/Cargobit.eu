const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, 
        AlignmentType, HeadingLevel, BorderStyle, WidthType, ShadingType,
        Header, Footer, PageNumber, PageBreak } = require("docx");
const fs = require("fs");

// Tech palette (DM-1 Deep Cyan)
const P = {
  primary: "162235",
  body: "1A2B40",
  secondary: "6878A0",
  accent: "37DCF2",
  surface: "F4F8FC",
  titleColor: "FFFFFF",
  subtitleColor: "B0B8C0",
  metaColor: "90989F"
};

const c = (hex) => hex.replace("#", "");

// Helper: wireframe box table
function wireframeBox(title, rows) {
  const NB = { style: BorderStyle.SINGLE, size: 8, color: "D0D0D0" };
  const borders = { top: NB, bottom: NB, left: NB, right: NB, insideHorizontal: NB, insideVertical: NB };
  
  const tableRows = [
    new TableRow({
      children: [
        new TableCell({
          width: { size: 100, type: WidthType.PERCENTAGE },
          shading: { type: ShadingType.CLEAR, fill: "E8E8E8" },
          borders,
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: title, bold: true, size: 22, color: c(P.primary) })]
          })]
        })
      ]
    })
  ];
  
  for (const row of rows) {
    if (row.trim() === "") continue;
    tableRows.push(new TableRow({
      children: [
        new TableCell({
          width: { size: 100, type: WidthType.PERCENTAGE },
          shading: { type: ShadingType.CLEAR, fill: "FFFFFF" },
          borders,
          margins: { top: 60, bottom: 60, left: 120, right: 120 },
          children: [new Paragraph({
            children: [new TextRun({ text: row, size: 20, font: { ascii: "Consolas", eastAsia: "Microsoft YaHei" } })]
          })]
        })
      ]
    }));
  }
  
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: tableRows
  });
}

// Helper: section wireframe table with multiple zones
function sectionWireframe(title, zones) {
  const NB = { style: BorderStyle.SINGLE, size: 8, color: "D0D0D0" };
  const borders = { top: NB, bottom: NB, left: NB, right: NB, insideHorizontal: NB, insideVertical: NB };
  
  const tableRows = [
    new TableRow({
      children: [
        new TableCell({
          width: { size: 100, type: WidthType.PERCENTAGE },
          shading: { type: ShadingType.CLEAR, fill: "E0E8F0" },
          borders,
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: title, bold: true, size: 22, color: c(P.primary) })]
          })]
        })
      ]
    })
  ];
  
  for (const zone of zones) {
    tableRows.push(new TableRow({
      children: [
        new TableCell({
          width: { size: 100, type: WidthType.PERCENTAGE },
          shading: { type: ShadingType.CLEAR, fill: zone.bg || "FFFFFF" },
          borders,
          margins: { top: 60, bottom: 60, left: 120, right: 120 },
          children: [
            zone.label ? new Paragraph({
              spacing: { after: 80 },
              children: [new TextRun({ text: zone.label, bold: true, size: 20, color: "666666" })]
            }) : undefined,
            ...zone.lines.filter(line => line.trim() !== "").map(line => new Paragraph({
              children: [new TextRun({ text: line, size: 20, font: { ascii: "Consolas", eastAsia: "Microsoft YaHei" } })]
            }))
          ].filter(Boolean)
        })
      ]
    }));
  }
  
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: tableRows
  });
}

// Build document
const doc = new Document({
  styles: {
    default: {
      document: {
        run: { font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" }, size: 22, color: c(P.body) },
        paragraph: { spacing: { line: 312 } }
      }
    },
    heading1: {
      run: { font: { ascii: "Calibri", eastAsia: "SimHei" }, size: 32, bold: true, color: c(P.primary) }
    },
    heading2: {
      run: { font: { ascii: "Calibri", eastAsia: "SimHei" }, size: 28, bold: true, color: c(P.primary) }
    },
    heading3: {
      run: { font: { ascii: "Calibri", eastAsia: "SimHei" }, size: 24, bold: true, color: c(P.secondary) }
    }
  },
  sections: [
    // Cover section
    {
      properties: {
        page: { margin: { top: 0, bottom: 0, left: 0, right: 0 } }
      },
      children: [
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
          rows: [
            new TableRow({
              height: { value: 16838, rule: "exact" },
              children: [
                new TableCell({
                  width: { size: 100, type: WidthType.PERCENTAGE },
                  shading: { type: ShadingType.CLEAR, fill: c(P.primary) },
                  verticalAlign: "top",
                  children: [
                    new Paragraph({ spacing: { before: 3000 }, children: [new TextRun({ text: " ", size: 1 })] }),
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      spacing: { after: 200 },
                      children: [new TextRun({ text: "CargoBit", size: 72, bold: true, color: c(P.accent) })]
                    }),
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      spacing: { after: 600 },
                      children: [new TextRun({ text: "UX-Wireframes", size: 52, bold: true, color: c(P.titleColor) })]
                    }),
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      spacing: { after: 200 },
                      children: [new TextRun({ text: "Sichere Transportplattform mit integriertem Risk-Scoring & Versicherung", size: 24, color: c(P.subtitleColor) })]
                    }),
                    new Paragraph({ spacing: { before: 4000 }, children: [new TextRun({ text: " ", size: 1 })] }),
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      children: [new TextRun({ text: "Version 1.0 | April 2026", size: 20, color: c(P.metaColor) })]
                    }),
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      children: [new TextRun({ text: "Bereit für UI-Team, Figma & Frontend-Entwicklung", size: 20, color: c(P.metaColor) })]
                    })
                  ]
                })
              ]
            })
          ]
        })
      ]
    },
    // Body section
    {
      properties: {
        page: { margin: { top: 1440, bottom: 1440, left: 1701, right: 1417 } }
      },
      headers: {
        default: new Header({
          children: [new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [new TextRun({ text: "CargoBit UX-Wireframes", size: 18, color: c(P.secondary) })]
          })]
        })
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ children: [PageNumber.CURRENT], size: 18 })]
          })]
        })
      },
      children: [
        // Introduction
        new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 200, after: 200 }, children: [new TextRun({ text: "1. Einführung" })] }),
        new Paragraph({
          spacing: { after: 200 },
          children: [new TextRun({ text: "Dieses Dokument enthält textbasierte UX-Wireframes für die CargoBit-Plattform. Die Wireframes sind funktional, logisch und modular aufgebaut. Sie können 1:1 an UI-Teams, Figma-Designer oder Frontend-Entwickler weitergegeben werden. Alle Wireframes sind mobil- und desktop-ready und perfekt auf den Security-Layer der Plattform abgestimmt.", size: 22 })]
        }),
        
        // Coverage table
        new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 300, after: 150 }, children: [new TextRun({ text: "1.1 Abgedeckte Bereiche" })] }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: {
            top: { style: BorderStyle.SINGLE, size: 4, color: c(P.accent) },
            bottom: { style: BorderStyle.SINGLE, size: 4, color: c(P.accent) },
            insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "D0D0D0" },
            insideVertical: { style: BorderStyle.NONE },
            left: { style: BorderStyle.NONE },
            right: { style: BorderStyle.NONE }
          },
          rows: [
            new TableRow({
              children: [
                new TableCell({ width: { size: 15, type: WidthType.PERCENTAGE }, shading: { type: ShadingType.CLEAR, fill: c(P.accent) }, margins: { top: 60, bottom: 60, left: 80, right: 80 }, children: [new Paragraph({ children: [new TextRun({ text: "Nr.", bold: true, size: 20, color: c(P.primary) })] })] }),
                new TableCell({ width: { size: 35, type: WidthType.PERCENTAGE }, shading: { type: ShadingType.CLEAR, fill: c(P.accent) }, margins: { top: 60, bottom: 60, left: 80, right: 80 }, children: [new Paragraph({ children: [new TextRun({ text: "Bereich", bold: true, size: 20, color: c(P.primary) })] })] }),
                new TableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, shading: { type: ShadingType.CLEAR, fill: c(P.accent) }, margins: { top: 60, bottom: 60, left: 80, right: 80 }, children: [new Paragraph({ children: [new TextRun({ text: "Beschreibung", bold: true, size: 20, color: c(P.primary) })] })] })
              ]
            }),
            ...[ 
              ["1", "Home", "Landing Page mit Hero, Trust-Sektion, How-it-Works, Banner-Ad"],
              ["2", "Marketplace", "Auftragsliste mit Filtern, Risk-Level, Versicherung"],
              ["3", "Auftragsdetails", "Detailansicht mit Risk-Section, Insurance-Box, CTAs"],
              ["4", "Versicherungs-Flow", "4-Schritt Versicherungsabschluss"],
              ["5", "Partner & Add-Ons", "Banner-Ads, Versicherungs-Partner, Premium Listings"],
              ["6", "Dashboard", "KPIs, Aufträge, Versicherungen, Ads Performance"],
              ["7", "Login/Registrierung", "Authentifizierung mit Rollenwahl"]
            ].map((row, i) => new TableRow({
              children: [
                new TableCell({ width: { size: 15, type: WidthType.PERCENTAGE }, shading: { type: ShadingType.CLEAR, fill: i % 2 === 0 ? "FFFFFF" : c(P.surface) }, margins: { top: 60, bottom: 60, left: 80, right: 80 }, children: [new Paragraph({ children: [new TextRun({ text: row[0], size: 20 })] })] }),
                new TableCell({ width: { size: 35, type: WidthType.PERCENTAGE }, shading: { type: ShadingType.CLEAR, fill: i % 2 === 0 ? "FFFFFF" : c(P.surface) }, margins: { top: 60, bottom: 60, left: 80, right: 80 }, children: [new Paragraph({ children: [new TextRun({ text: row[1], bold: true, size: 20 })] })] }),
                new TableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, shading: { type: ShadingType.CLEAR, fill: i % 2 === 0 ? "FFFFFF" : c(P.surface) }, margins: { top: 60, bottom: 60, left: 80, right: 80 }, children: [new Paragraph({ children: [new TextRun({ text: row[2], size: 20 })] })] })
              ]
            }))
          ]
        }),
        
        new Paragraph({ spacing: { before: 400 }, children: [new TextRun({ text: " ", size: 1 })] }),
        
        // Wireframe 1: Home
        new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 200, after: 200 }, children: [new TextRun({ text: "2. UX-Wireframe: Home" })] }),
        new Paragraph({
          spacing: { after: 200 },
          children: [new TextRun({ text: "Die Home-Seite ist der erste Berührungspunkt für Nutzer. Sie präsentiert die Kernwerte der Plattform (Sicherheit, Transparenz, Versicherungsschutz) und bietet klare Handlungsaufforderungen.", size: 22 })]
        }),
        
        sectionWireframe("HEADER", [
          { label: "Navigation", lines: ["LOGO  |  Marketplace  |  Versicherungen  |  Login"], bg: "F5F5F5" }
        ]),
        new Paragraph({ spacing: { before: 150 }, children: [new TextRun({ text: " ", size: 1 })] }),
        
        sectionWireframe("HERO SECTION", [
          { label: "Main Message", lines: ["Headline: \"Die sichere Transportplattform\"", "Subline: \"Mit integriertem Risk-Scoring & Versicherung\"", "", "CTA Buttons:", "[Aufträge finden]    [Auftrag einstellen]"], bg: "E8F4FC" }
        ]),
        new Paragraph({ spacing: { before: 150 }, children: [new TextRun({ text: " ", size: 1 })] }),
        
        sectionWireframe("TRUST SECTION", [
          { label: "Trust Icons (3-Spalten)", lines: ["Icon 1: Risk-Engine (Green/Yellow/Red)", "Icon 2: Audit-Trail", "Icon 3: Versicherungsschutz"], bg: "F0F0F0" }
        ]),
        new Paragraph({ spacing: { before: 150 }, children: [new TextRun({ text: " ", size: 1 })] }),
        
        sectionWireframe("HOW IT WORKS", [
          { label: "4-Step Process", lines: ["Step 1: Auftrag einstellen", "Step 2: Carrier finden", "Step 3: Versicherung abschließen", "Step 4: Sicher abwickeln"], bg: "FFFFFF" }
        ]),
        new Paragraph({ spacing: { before: 150 }, children: [new TextRun({ text: " ", size: 1 })] }),
        
        sectionWireframe("BANNER AD SLOT", [
          { label: "Advertisement", lines: ["[970x250 Banner - Ad-Service Integration]"], bg: "FFF8E0" }
        ]),
        new Paragraph({ spacing: { before: 150 }, children: [new TextRun({ text: " ", size: 1 })] }),
        
        sectionWireframe("FOOTER", [
          { label: "Links", lines: ["Kontakt  |  Partner  |  Datenschutz  |  AGB"], bg: "F5F5F5" }
        ]),
        
        // Wireframe 2: Marketplace
        new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 }, children: [new TextRun({ text: "3. UX-Wireframe: Marketplace / Auftragsliste" })] }),
        new Paragraph({
          spacing: { after: 200 },
          children: [new TextRun({ text: "Der Marketplace ist das Herzstück der Plattform. Hier finden Carrier passende Aufträge und Shipper finden zuverlässige Transportdienstleister. Die Filter ermöglichen eine gezielte Suche nach Region, Preis, Risk-Level und Verfügbarkeit von Versicherungen.", size: 22 })]
        }),
        
        sectionWireframe("FILTER SIDEBAR", [
          { label: "Filter Options", lines: ["Region: [Dropdown]", "Preis: [Von - Bis]", "Datum: [Date Picker]", "Risk-Level: [Green] [Yellow] [Red]", "Versicherung verfügbar: [Checkbox]", "", "[Filter anwenden]  [Zurücksetzen]"], bg: "F8F8F8" }
        ]),
        new Paragraph({ spacing: { before: 150 }, children: [new TextRun({ text: " ", size: 1 })] }),
        
        sectionWireframe("LIST VIEW", [
          { label: "Auftrag #1234", lines: ["Route: Berlin → Köln", "Preis: 450 €", "Risk-Level: GREEN", "Versicherung: ab 12 €", "CTA: [Details ansehen]"], bg: "E8FFE8" },
          { label: "Auftrag #1235", lines: ["Route: Hamburg → München", "Preis: 780 €", "Risk-Level: YELLOW", "Versicherung: ab 18 €", "CTA: [Details ansehen]"], bg: "FFF8E0" },
          { label: "Auftrag #1236", lines: ["Route: Frankfurt → Stuttgart", "Preis: 320 €", "Risk-Level: RED", "Versicherung: ab 25 €", "CTA: [Details ansehen]"], bg: "FFE8E8" }
        ]),
        new Paragraph({ spacing: { before: 150 }, children: [new TextRun({ text: " ", size: 1 })] }),
        
        sectionWireframe("INLINE AD SLOT", [
          { label: "Sponsored Listing", lines: ["[Premium Carrier - Hervorgehobenes Angebot]", "Sponsored"], bg: "FFF8E0" }
        ]),
        
        // Wireframe 3: Auftragsdetails
        new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 }, children: [new TextRun({ text: "4. UX-Wireframe: Auftragsdetails" })] }),
        new Paragraph({
          spacing: { after: 200 },
          children: [new TextRun({ text: "Die Auftragsdetailseite zeigt alle relevanten Informationen zu einem Transportauftrag. Das Risk-Level wird transparent dargestellt, und Nutzer können direkt eine Versicherung abschließen.", size: 22 })]
        }),
        
        sectionWireframe("AUFTRAGSINFORMATIONEN", [
          { label: "Auftrag #1234", lines: ["Route: Berlin → Köln", "Datum: 12.05.2026", "Gewicht: 1.2 t", "Preis: 450 €"], bg: "F0F4F8" }
        ]),
        new Paragraph({ spacing: { before: 150 }, children: [new TextRun({ text: " ", size: 1 })] }),
        
        sectionWireframe("RISK SECTION", [
          { label: "Risk-Level: GREEN", lines: ["Details:", "- IBAN verified", "- Company verified", "- Geo match", "", "Risk Score: 95/100"], bg: "E8FFE8" }
        ]),
        new Paragraph({ spacing: { before: 150 }, children: [new TextRun({ text: " ", size: 1 })] }),
        
        sectionWireframe("INSURANCE BOX", [
          { label: "Frachtversicherung hinzufügen", lines: ["Prämie: ab 12 €", "Deckung: 50.000 €", "", "CTA: [Versicherung abschließen]"], bg: "E0F0FF" }
        ]),
        new Paragraph({ spacing: { before: 150 }, children: [new TextRun({ text: " ", size: 1 })] }),
        
        sectionWireframe("BANNER AD SLOT", [
          { label: "Advertisement", lines: ["[728x90 Banner]"], bg: "FFF8E0" }
        ]),
        new Paragraph({ spacing: { before: 150 }, children: [new TextRun({ text: " ", size: 1 })] }),
        
        sectionWireframe("CTA FOOTER", [
          { label: "Actions", lines: ["[Angebot abgeben]    [Nachricht senden]"], bg: "F5F5F5" }
        ]),
        
        // Wireframe 4: Versicherungs-Flow
        new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 }, children: [new TextRun({ text: "5. UX-Wireframe: Versicherungs-Flow" })] }),
        new Paragraph({
          spacing: { after: 200 },
          children: [new TextRun({ text: "Der Versicherungs-Flow ist ein 4-Schritt-Prozess, der Nutzer intuitiv durch den Abschluss einer Frachtversicherung führt. Jeder Schritt ist klar strukturiert und zeigt den Fortschritt an.", size: 22 })]
        }),
        
        sectionWireframe("HEADER", [
          { label: "Versicherung für Auftrag #1234", lines: ["Progress: [1. Auswahl] → 2. Preis → 3. Abschluss → 4. Bestätigung"], bg: "F0F4F8" }
        ]),
        new Paragraph({ spacing: { before: 150 }, children: [new TextRun({ text: " ", size: 1 })] }),
        
        sectionWireframe("STEP 1: AUSWAHL", [
          { label: "Versicherungsoptionen", lines: ["Deckungssumme: [Dropdown: 25.000 € | 50.000 € | 100.000 €]", "", "Zusatzoptionen:", "[ ] Diebstahl", "[ ] Beschädigung", "[ ] Verzögerung", "", "CTA: [Weiter →]"], bg: "FFFFFF" }
        ]),
        new Paragraph({ spacing: { before: 150 }, children: [new TextRun({ text: " ", size: 1 })] }),
        
        sectionWireframe("STEP 2: PREIS", [
          { label: "Preisübersicht", lines: ["Prämie: 12 €", "Provision für Plattform: 2 €", "Gesamt: 14 €", "", "Versicherer: [Allianz | AXA | HDI]", "", "CTA: [Weiter →]"], bg: "F8F8F8" }
        ]),
        new Paragraph({ spacing: { before: 150 }, children: [new TextRun({ text: " ", size: 1 })] }),
        
        sectionWireframe("STEP 3: ABSCHLUSS", [
          { label: "Kundendaten (Auto-gefüllt)", lines: ["Name: [Auto-filled]", "Adresse: [Auto-filled]", "IBAN: [Auto-filled]", "", "[ ] AGB akzeptieren", "[ ] Datenschutzbestimmungen gelesen", "", "CTA: [Versicherung abschließen]"], bg: "FFFFFF" }
        ]),
        new Paragraph({ spacing: { before: 150 }, children: [new TextRun({ text: " ", size: 1 })] }),
        
        sectionWireframe("STEP 4: BESTÄTIGUNG", [
          { label: "Versicherung aktiv", lines: ["Policy-ID: #INS-2026-001234", "Versicherer: Allianz", "Deckung: 50.000 €", "Prämie: 12 € / Jahr", "", "[Policy PDF Download]", "", "Status: AKTIV"], bg: "E8FFE8" }
        ]),
        
        // Wireframe 5: Partner & Add-Ons
        new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 }, children: [new TextRun({ text: "6. UX-Wireframe: Partner & Add-Ons" })] }),
        new Paragraph({
          spacing: { after: 200 },
          children: [new TextRun({ text: "Die Partner-Seite bietet verschiedene Monetarisierungsoptionen: Banner-Werbung, Versicherungs-Partnerschaften und Premium-Listings für Carrier.", size: 22 })]
        }),
        
        sectionWireframe("SECTION: BANNER ADS", [
          { label: "Werben auf CargoBit", lines: ["\"Werben Sie auf unserer Plattform\"", "Reach: 50.000+ aktive Nutzer", "", "CTA: [Jetzt buchen]"], bg: "FFF8E0" }
        ]),
        new Paragraph({ spacing: { before: 150 }, children: [new TextRun({ text: " ", size: 1 })] }),
        
        sectionWireframe("SECTION: VERSICHERUNGS-PARTNER", [
          { label: "Unsere Partner", lines: ["[Allianz]  [AXA]  [HDI]  [Zurich]", "", "Vorteile:", "- Exklusive Konditionen", "- Schnelle Abwicklung", "- 24/7 Support", "", "CTA: [Partner werden]"], bg: "F0F8FF" }
        ]),
        new Paragraph({ spacing: { before: 150 }, children: [new TextRun({ text: " ", size: 1 })] }),
        
        sectionWireframe("SECTION: PREMIUM LISTINGS", [
          { label: "Premium Carrier", lines: ["\"Heben Sie Ihre Angebote hervor\"", "", "Features:", "- Top-Platzierung in Suchergebnissen", "- Verified Badge", "- Prioritäts-Support", "", "Preis: ab 49 € / Monat", "", "CTA: [Upgrade]"], bg: "F8F0FF" }
        ]),
        
        // Wireframe 6: Dashboard
        new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 }, children: [new TextRun({ text: "7. UX-Wireframe: Dashboard" })] }),
        new Paragraph({
          spacing: { after: 200 },
          children: [new TextRun({ text: "Das Dashboard gibt einen Überblick über alle relevanten Kennzahlen: aktive Aufträge, Versicherungen, Einnahmen und Risk-Level-Verteilung.", size: 22 })]
        }),
        
        sectionWireframe("KPI CARDS", [
          { label: "Key Metrics (4-Spalten)", lines: ["Aufträge aktiv: 12    |    Versicherungen: 4    |    Einnahmen: 128 €    |    Ø Risk-Score: 87"], bg: "E8F4FC" }
        ]),
        new Paragraph({ spacing: { before: 150 }, children: [new TextRun({ text: " ", size: 1 })] }),
        
        sectionWireframe("RISK-LEVEL OVERVIEW", [
          { label: "Pie Chart", lines: ["[PIE CHART]", "GREEN: 45% | YELLOW: 35% | RED: 20%"], bg: "FFFFFF" }
        ]),
        new Paragraph({ spacing: { before: 150 }, children: [new TextRun({ text: " ", size: 1 })] }),
        
        sectionWireframe("LIST: AUFTRÄGE", [
          { label: "Aktive Aufträge", lines: ["Auftrag #1234 | Status: Aktiv | Risk: GREEN | Versicherung: Ja | [Details]", "Auftrag #1235 | Status: Pending | Risk: YELLOW | Versicherung: Nein | [Details]", "Auftrag #1236 | Status: Abgeschlossen | Risk: GREEN | Versicherung: Ja | [Details]"], bg: "F8F8F8" }
        ]),
        new Paragraph({ spacing: { before: 150 }, children: [new TextRun({ text: " ", size: 1 })] }),
        
        sectionWireframe("LIST: VERSICHERUNGEN", [
          { label: "Aktive Policen", lines: ["Policy #A123 | Auftrag #1234 | Prämie: 12 € | Provision: 2 €", "Policy #A124 | Auftrag #1236 | Prämie: 18 € | Provision: 3 €"], bg: "FFFFFF" }
        ]),
        new Paragraph({ spacing: { before: 150 }, children: [new TextRun({ text: " ", size: 1 })] }),
        
        sectionWireframe("LIST: ADS PERFORMANCE", [
          { label: "Werbung-Performance", lines: ["Banner #1 | Impressions: 15.234 | Klicks: 342 | CTR: 2.2% | Kosten: 45 €", "Banner #2 | Impressions: 8.567 | Klicks: 156 | CTR: 1.8% | Kosten: 28 €"], bg: "F8F8F8" }
        ]),
        
        // Wireframe 7: Login/Registrierung
        new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 }, children: [new TextRun({ text: "8. UX-Wireframe: Login / Registrierung" })] }),
        new Paragraph({
          spacing: { after: 200 },
          children: [new TextRun({ text: "Die Authentifizierungsseiten ermöglichen Login und Registrierung mit Rollenwahl (Shipper oder Carrier).", size: 22 })]
        }),
        
        sectionWireframe("LOGIN", [
          { label: "Anmelden", lines: ["Email: [________________]", "Passwort: [________________]", "", "[ ] Angemeldet bleiben", "", "CTA: [Login]", "", "Link: Noch kein Konto? [Registrieren]"], bg: "FFFFFF" }
        ]),
        new Paragraph({ spacing: { before: 150 }, children: [new TextRun({ text: " ", size: 1 })] }),
        
        sectionWireframe("REGISTRIERUNG", [
          { label: "Konto erstellen", lines: ["Account-Typ: ( ) Firma  ( ) Privat", "", "Name: [________________]", "Email: [________________]", "Passwort: [________________]", "Passwort bestätigen: [________________]", "", "Rolle: ( ) Shipper  ( ) Carrier", "", "[ ] AGB akzeptieren", "[ ] Datenschutzbestimmungen gelesen", "", "CTA: [Registrieren]"], bg: "F8F8FF" }
        ]),
        
        // Technical Notes
        new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 }, children: [new TextRun({ text: "9. Technische Hinweise" })] }),
        
        new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 }, children: [new TextRun({ text: "9.1 Responsive Design" })] }),
        new Paragraph({
          spacing: { after: 150 },
          children: [new TextRun({ text: "Alle Wireframes sind für Desktop und Mobile optimiert. Die Breakpoints sind bei 768px (Tablet) und 480px (Mobile) definiert. Bei Mobile-Ansicht werden Sidebars zu akkordeonartigen Dropdowns, und Tabellen werden zu vertikalen Listen.", size: 22 })]
        }),
        
        new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 }, children: [new TextRun({ text: "9.2 Security-Integration" })] }),
        new Paragraph({
          spacing: { after: 150 },
          children: [new TextRun({ text: "Die Wireframes sind auf den Security-Layer der Plattform abgestimmt. Risk-Level werden in Echtzeit über die Risk-Engine berechnet. Alle sensiblen Daten sind verschlüsselt (AES-256), und die Authentifizierung verwendet JWT-Tokens mit 2FA-Option.", size: 22 })]
        }),
        
        new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 }, children: [new TextRun({ text: "9.3 Ad-Integration" })] }),
        new Paragraph({
          spacing: { after: 150 },
          children: [new TextRun({ text: "Banner-Ad-Slots sind in folgenden Größen definiert: 970x250 (Hero-Banner), 728x90 (Inline-Banner), 300x250 (Sidebar). Die Ads werden über den Ad-Service dynamisch geladen und können gezielt auf Nutzerprofile ausgerichtet werden.", size: 22 })]
        }),
        
        new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 }, children: [new TextRun({ text: "9.4 Color-Coding" })] }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: {
            top: { style: BorderStyle.SINGLE, size: 4, color: c(P.accent) },
            bottom: { style: BorderStyle.SINGLE, size: 4, color: c(P.accent) },
            insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "D0D0D0" },
            insideVertical: { style: BorderStyle.NONE },
            left: { style: BorderStyle.NONE },
            right: { style: BorderStyle.NONE }
          },
          rows: [
            new TableRow({
              children: [
                new TableCell({ width: { size: 25, type: WidthType.PERCENTAGE }, shading: { type: ShadingType.CLEAR, fill: c(P.accent) }, margins: { top: 60, bottom: 60, left: 80, right: 80 }, children: [new Paragraph({ children: [new TextRun({ text: "Risk-Level", bold: true, size: 20, color: c(P.primary) })] })] }),
                new TableCell({ width: { size: 25, type: WidthType.PERCENTAGE }, shading: { type: ShadingType.CLEAR, fill: c(P.accent) }, margins: { top: 60, bottom: 60, left: 80, right: 80 }, children: [new Paragraph({ children: [new TextRun({ text: "Farbe", bold: true, size: 20, color: c(P.primary) })] })] }),
                new TableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, shading: { type: ShadingType.CLEAR, fill: c(P.accent) }, margins: { top: 60, bottom: 60, left: 80, right: 80 }, children: [new Paragraph({ children: [new TextRun({ text: "Bedeutung", bold: true, size: 20, color: c(P.primary) })] })] })
              ]
            }),
            ...[
              ["GREEN", "#4CAF50", "Niedriges Risiko - Alle Checks bestanden"],
              ["YELLOW", "#FFC107", "Mittleres Risiko - Teilweise verifiziert"],
              ["RED", "#F44336", "Hohes Risiko - Manuelle Prüfung empfohlen"]
            ].map((row, i) => new TableRow({
              children: [
                new TableCell({ width: { size: 25, type: WidthType.PERCENTAGE }, shading: { type: ShadingType.CLEAR, fill: i % 2 === 0 ? "FFFFFF" : c(P.surface) }, margins: { top: 60, bottom: 60, left: 80, right: 80 }, children: [new Paragraph({ children: [new TextRun({ text: row[0], bold: true, size: 20 })] })] }),
                new TableCell({ width: { size: 25, type: WidthType.PERCENTAGE }, shading: { type: ShadingType.CLEAR, fill: i % 2 === 0 ? "FFFFFF" : c(P.surface) }, margins: { top: 60, bottom: 60, left: 80, right: 80 }, children: [new Paragraph({ children: [new TextRun({ text: row[1], size: 20 })] })] }),
                new TableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, shading: { type: ShadingType.CLEAR, fill: i % 2 === 0 ? "FFFFFF" : c(P.surface) }, margins: { top: 60, bottom: 60, left: 80, right: 80 }, children: [new Paragraph({ children: [new TextRun({ text: row[2], size: 20 })] })] })
              ]
            }))
          ]
        }),
        
        new Paragraph({ spacing: { before: 200 }, children: [new TextRun({ text: " ", size: 1 })] })
      ]
    }
  ]
});

// Generate document
Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync("/home/z/my-project/download/CargoBit_UX_Wireframes.docx", buffer);
  console.log("Document generated: /home/z/my-project/download/CargoBit_UX_Wireframes.docx");
});
