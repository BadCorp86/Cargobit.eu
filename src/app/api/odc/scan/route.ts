import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';
import { db } from '@/lib/db';

interface ScanRequest {
  image: string;
  documentType: 'frachtbrief' | 'fuehrerschein' | 'company' | 'driver_docs';
  userId?: string;
}

interface ScanResult {
  confidence: number;
  data: Record<string, string>;
  warnings: string[];
  documentId?: string;
}

const documentPrompts: Record<string, string> = {
  frachtbrief: `Analysiere dieses Frachtbrief-/Lieferschein-Dokument und extrahiere folgende Informationen als JSON:
{
  "senderName": "Name des Absenders",
  "senderAddress": "Vollständige Absenderadresse",
  "receiverName": "Name des Empfängers", 
  "receiverAddress": "Vollständige Empfängeradresse",
  "shipmentWeight": "Gewicht mit Einheit (z.B. 500 kg)",
  "shipmentDimensions": "Abmessungen (LxBxH)",
  "shipmentType": "Art der Sendung (Palette, Stückgut, etc.)",
  "pickupDate": "Abholdatum (YYYY-MM-DD)",
  "deliveryDate": "Lieferdatum (YYYY-MM-DD)",
  "specialInstructions": "Besondere Hinweise/Anweisungen"
}
Antworte nur mit dem JSON-Objekt.`,

  fuehrerschein: `Analysiere diesen Führerschein und extrahiere folgende Informationen als JSON:
{
  "licenseNumber": "Führerscheinnummer",
  "licenseClass": "Führerscheinklassen (z.B. C, CE, C1)",
  "licenseExpiry": "Ablaufdatum (YYYY-MM-DD)",
  "driverName": "Vollständiger Name des Inhabers",
  "driverBirthDate": "Geburtsdatum (YYYY-MM-DD)",
  "driverAddress": "Adresse des Inhabers",
  "issuingCountry": "Ausstellungsland (Code z.B. DE, PL)"
}
Antworte nur mit dem JSON-Objekt. Prüfe auch, ob der Führerschein noch gültig ist.`,

  company: `Analysiere dieses Unternehmensdokument (Handelsregisterauszug, Gewerbeanmeldung) und extrahiere folgende Informationen als JSON:
{
  "companyName": "Vollständiger Firmenname",
  "companyAddress": "Vollständige Firmenadresse",
  "registrationNumber": "Handelsregister- oder Gewerbenummer",
  "taxId": "Steuernummer",
  "vatNumber": "Umsatzsteuer-Identifikationsnummer"
}
Antworte nur mit dem JSON-Objekt.`,

  driver_docs: `Analysiere diese Fahrerdokumente (Fahrerkarte, ADR-Bescheinigung) und extrahiere folgende Informationen als JSON:
{
  "driverId": "Fahrer-ID oder Personalnummer",
  "driverLicenseNumber": "Führerscheinnummer",
  "adrCertificate": "ADR-Bescheinigungsnummer und Klasse",
  "driverCardExpiry": "Ablaufdatum der Fahrerkarte (YYYY-MM-DD)"
}
Antworte nur mit dem JSON-Objekt.`
};

export async function POST(request: NextRequest) {
  try {
    const body: ScanRequest = await request.json();
    const { image, documentType, userId } = body;

    if (!image || !documentType) {
      return NextResponse.json(
        { error: 'Missing required fields: image, documentType' },
        { status: 400 }
      );
    }

    // Initialize ZAI for VLM
    const zai = await ZAI.create();

    // Use VLM for document analysis
    const prompt = documentPrompts[documentType] || documentPrompts.frachtbrief;

    const response = await zai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'Du bist ein präziser Dokumentenanalyst. Du extrahierst strukturierte Daten aus Dokumenten und gibst sie als gültiges JSON zurück. Du antwortest ausschließlich mit dem angeforderten JSON-Objekt ohne zusätzliche Erklärungen.'
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: image } }
          ]
        }
      ],
      temperature: 0.1,
      max_tokens: 1000,
    });

    const content = response.choices[0]?.message?.content || '';
    
    // Parse JSON from response
    let extractedData: Record<string, string> = {};
    let warnings: string[] = [];
    
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extractedData = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      warnings.push('Einige Daten konnten nicht korrekt erkannt werden. Bitte überprüfen Sie die Ergebnisse.');
    }

    // Validate expiry dates for certain document types
    if (documentType === 'fuehrerschein' && extractedData.licenseExpiry) {
      const expiryDate = new Date(extractedData.licenseExpiry);
      const today = new Date();
      if (expiryDate < today) {
        warnings.push(`ACHTUNG: Der Führerschein ist seit dem ${expiryDate.toLocaleDateString('de-DE')} abgelaufen!`);
      } else if (expiryDate < new Date(today.setMonth(today.getMonth() + 3))) {
        warnings.push(`WARNUNG: Der Führerschein läuft am ${expiryDate.toLocaleDateString('de-DE')} ab.`);
      }
    }

    // Calculate confidence based on extracted fields
    const expectedFields = getExpectedFields(documentType);
    const foundFields = expectedFields.filter(field => extractedData[field] && extractedData[field].length > 0);
    const confidence = foundFields.length / expectedFields.length;

    if (confidence < 0.5) {
      warnings.push('Niedrige Erkennungsquote. Bitte überprüfen Sie das Dokument und versuchen Sie es erneut.');
    }

    // Save document to database if userId is provided
    let documentId: string | undefined;
    if (userId) {
      try {
        const document = await db.document.create({
          data: {
            userId,
            documentType,
            fileName: `scan_${documentType}_${Date.now()}`,
            fileUrl: image.substring(0, 1000), // Store truncated reference
            extractedData: JSON.stringify(extractedData),
            confidence,
            warnings: JSON.stringify(warnings),
            status: 'processed',
          }
        });
        documentId = document.id;
      } catch (dbError) {
        console.error('Failed to save document:', dbError);
        // Continue without saving - don't fail the scan
      }
    }

    const result: ScanResult = {
      confidence,
      data: extractedData,
      warnings,
      documentId,
    };

    return NextResponse.json(result);

  } catch (error) {
    console.error('ODC scan error:', error);
    return NextResponse.json(
      { 
        error: 'Document scanning failed',
        confidence: 0,
        data: {},
        warnings: ['Ein technischer Fehler ist aufgetreten. Bitte versuchen Sie es erneut.']
      },
      { status: 500 }
    );
  }
}

function getExpectedFields(documentType: string): string[] {
  switch (documentType) {
    case 'frachtbrief':
      return ['senderName', 'senderAddress', 'receiverName', 'receiverAddress', 'shipmentWeight'];
    case 'fuehrerschein':
      return ['licenseNumber', 'licenseClass', 'licenseExpiry', 'driverName', 'driverBirthDate'];
    case 'company':
      return ['companyName', 'companyAddress', 'registrationNumber', 'taxId'];
    case 'driver_docs':
      return ['driverId', 'driverLicenseNumber', 'driverCardExpiry'];
    default:
      return [];
  }
}
