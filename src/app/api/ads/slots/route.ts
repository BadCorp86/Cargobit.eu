import { NextResponse } from 'next/server';

/**
 * GET /api/ads/slots
 * 
 * Get all available ad slots
 * 
 * Response:
 * - slots: array - List of available ad slots
 */
export async function GET() {
  const slots = [
    {
      slot: 'homepage-hero',
      name: 'Homepage Hero Banner',
      size: '970x250',
      description: 'Großes Banner über dem Fold auf der Startseite',
      position: 'top',
      formats: ['image', 'html5'],
      maxFileSize: 500, // KB
      eCPM: 12.50,
      fillRate: 95,
      dailyImpressions: 15000,
    },
    {
      slot: 'marketplace-sidebar',
      name: 'Marketplace Sidebar',
      size: '300x600',
      description: 'Half-Page Ad in der Marketplace-Sidebar',
      position: 'sidebar',
      formats: ['image', 'html5'],
      maxFileSize: 300,
      eCPM: 8.20,
      fillRate: 88,
      dailyImpressions: 8500,
    },
    {
      slot: 'order-detail-sidebar',
      name: 'Order Detail Sidebar',
      size: '300x250',
      description: 'Medium Rectangle auf Auftragsdetailseiten',
      position: 'sidebar',
      formats: ['image', 'html5'],
      maxFileSize: 200,
      eCPM: 10.00,
      fillRate: 92,
      dailyImpressions: 5200,
    },
    {
      slot: 'dashboard-sidebar',
      name: 'Dashboard Sidebar',
      size: '300x250',
      description: 'Medium Rectangle im User-Dashboard',
      position: 'sidebar',
      formats: ['image', 'html5'],
      maxFileSize: 200,
      eCPM: 7.50,
      fillRate: 78,
      dailyImpressions: 3200,
    },
  ];

  return NextResponse.json({
    slots,
    total: slots.length,
  });
}
