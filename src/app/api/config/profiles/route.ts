/**
 * CargoBit Config API - Profiles Endpoint
 * ========================================
 * 
 * GET: Fetch scoring profiles
 * Returns available profiles with weights
 */

import { NextResponse } from 'next/server';

const PROFILES = [
  {
    id: 'revenue_focused',
    name: 'Revenue-Fokus',
    description: 'Optimiert auf Umsatzrendite - Standard-Profil für wirtschaftlich orientierte Zuordnungen',
    isDefault: true,
    weights: {
      revenue: 0.35,
      capacityUtilization: 0.20,
      priority: 0.10,
      risk: 0.10,
      serviceLevel: 0.15,
      co2: 0.10,
    },
    useCase: 'Standard-Betrieb mit Fokus auf Wirtschaftlichkeit',
    recommendedFor: ['Allgemeine Touren', 'Neukunden-Gewinnung'],
  },
  {
    id: 'premium_customers',
    name: 'Premium-Kunden',
    description: 'Priorisiert Premium-Kunden und hohe Service-Level für Kundenbindung',
    isDefault: false,
    weights: {
      revenue: 0.25,
      capacityUtilization: 0.15,
      priority: 0.15,
      risk: 0.10,
      serviceLevel: 0.25,
      co2: 0.10,
    },
    useCase: 'Premium- und Vertragskunden',
    recommendedFor: ['SLA-kritische Aufträge', 'Langzeitkunden', 'Key Accounts'],
  },
  {
    id: 'sustainability',
    name: 'Nachhaltigkeit',
    description: 'Maximiert CO₂-Effizienz und reduziert Leerkilometer',
    isDefault: false,
    weights: {
      revenue: 0.25,
      capacityUtilization: 0.15,
      priority: 0.10,
      risk: 0.10,
      serviceLevel: 0.10,
      co2: 0.30,
    },
    useCase: 'Nachhaltigkeits-Initiativen und CO₂-Reduktion',
    recommendedFor: ['Grüne Logistik', 'Umweltzertifizierte Touren', 'CO₂-Reporting'],
  },
  {
    id: 'risk_averse',
    name: 'Risikominimierung',
    description: 'Minimiert Risiken durch strenge Bonitäts- und Historie-Prüfung',
    isDefault: false,
    weights: {
      revenue: 0.25,
      capacityUtilization: 0.15,
      priority: 0.10,
      risk: 0.25,
      serviceLevel: 0.15,
      co2: 0.10,
    },
    useCase: 'Risiko-sensitive Zuordnungen',
    recommendedFor: ['Hochwertige Güter', 'Neukunden-First-Orders', 'Internationale Transporte'],
  },
];

export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      profiles: PROFILES,
      defaultProfile: PROFILES.find(p => p.isDefault)?.id || 'revenue_focused',
      count: PROFILES.length,
    });
  } catch (error) {
    console.error('Error fetching profiles:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch profiles' },
      { status: 500 }
    );
  }
}
