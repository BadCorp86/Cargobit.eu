import type { WalletTransaction, WalletInvoice, PaymentMethod, AdCampaign, AdPosition, AdApplication } from '@/types';

// ==========================================
// WALLET DATA
// ==========================================

export const walletTransactions: WalletTransaction[] = [
  { id: 'WTX-001', type: 'transport_fee', amount: -1285.50, currency: 'EUR', status: 'completed', reference: 'CB-DE-2024-001245', description: 'Transport München → Berlin (Express)', shipmentId: 'SHP-001', createdAt: '2024-12-15T09:00:00Z', balanceAfter: 24714.50 },
  { id: 'WTX-002', type: 'transport_fee', amount: -2890.00, currency: 'EUR', status: 'completed', reference: 'CB-DE-2024-001246', description: 'Transport München → Hamburg (Standard)', shipmentId: 'SHP-002', createdAt: '2024-12-10T08:30:00Z', balanceAfter: 26000.00 },
  { id: 'WTX-003', type: 'commission', amount: 144.28, currency: 'EUR', status: 'completed', reference: 'CB-DE-2024-001245', description: 'Provision 5% – BMW AG Express', shipmentId: 'SHP-001', createdAt: '2024-12-15T09:05:00Z', balanceAfter: 24858.78 },
  { id: 'WTX-004', type: 'auction_fee', amount: 86.70, currency: 'EUR', status: 'completed', reference: 'AUC-2024-0891', description: 'Auktionsgebühr 3% – SAP Transport', createdAt: '2024-12-14T14:00:00Z', balanceAfter: 24714.50 },
  { id: 'WTX-005', type: 'express_surcharge', amount: 43.00, currency: 'EUR', status: 'completed', reference: 'CB-DE-2024-001252', description: 'Expresszuschlag 2% – Telekom', shipmentId: 'SHP-008', createdAt: '2024-12-16T10:00:00Z', balanceAfter: 24628.50 },
  { id: 'WTX-006', type: 'deposit', amount: 5000.00, currency: 'EUR', status: 'completed', reference: 'DEP-2024-1245', description: 'Kontoguthaben – SEPA-Einzahlung', createdAt: '2024-12-01T10:00:00Z', balanceAfter: 28890.00 },
  { id: 'WTX-007', type: 'refund', amount: 257.10, currency: 'EUR', status: 'completed', reference: 'CB-DE-2024-001251', description: 'Erstattung – Stornierte Sendung Bosch', shipmentId: 'SHP-007', createdAt: '2024-12-13T16:00:00Z', balanceAfter: 28632.90 },
  { id: 'WTX-008', type: 'transport_fee', amount: -1580.00, currency: 'EUR', status: 'completed', reference: 'CB-DE-2024-001248', description: 'Transport Herzogenaurach → Wien (Overnight)', shipmentId: 'SHP-004', createdAt: '2024-12-14T07:00:00Z', balanceAfter: 27052.90 },
  { id: 'WTX-009', type: 'commission', amount: 79.00, currency: 'EUR', status: 'completed', reference: 'CB-DE-2024-001248', description: 'Provision 5% – Adidas Overnight', shipmentId: 'SHP-004', createdAt: '2024-12-14T07:05:00Z', balanceAfter: 27131.90 },
  { id: 'WTX-010', type: 'withdrawal', amount: -3000.00, currency: 'EUR', status: 'completed', reference: 'WDW-2024-0456', description: 'Auszahlung – Geschäftskonto', createdAt: '2024-12-05T11:00:00Z', balanceAfter: 23890.00 },
  { id: 'WTX-011', type: 'transport_fee', amount: -2150.00, currency: 'EUR', status: 'pending', reference: 'CB-DE-2024-001249', description: 'Transport Walldorf → Dublin (Express)', shipmentId: 'SHP-005', createdAt: '2024-12-19T08:00:00Z', balanceAfter: 22478.50 },
  { id: 'WTX-012', type: 'commission', amount: 172.00, currency: 'EUR', status: 'pending', reference: 'CB-DE-2024-001249', description: 'Provision 8% – SAP Express (inkl. Expresszuschlag)', shipmentId: 'SHP-005', createdAt: '2024-12-19T08:05:00Z', balanceAfter: 22306.50 },
  { id: 'WTX-013', type: 'deposit', amount: 10000.00, currency: 'EUR', status: 'completed', reference: 'DEP-2024-1246', description: 'Kontoguthaben – Überweisung', createdAt: '2024-11-28T09:00:00Z', balanceAfter: 26890.00 },
  { id: 'WTX-014', type: 'transport_fee', amount: -1540.00, currency: 'EUR', status: 'completed', reference: 'CB-DE-2024-001253', description: 'Transport Frankfurt → Leipzig (Overnight)', shipmentId: 'SHP-009', createdAt: '2024-12-05T06:00:00Z', balanceAfter: 25350.00 },
  { id: 'WTX-015', type: 'transport_fee', amount: -720.00, currency: 'EUR', status: 'completed', reference: 'CB-DE-2024-001252', description: 'Transport Bonn → Berlin (Express)', shipmentId: 'SHP-008', createdAt: '2024-12-16T07:30:00Z', balanceAfter: 24671.50 },
];

export const walletInvoices: WalletInvoice[] = [
  { id: 'INV-001', invoiceNumber: 'RE-2024-00891', amount: 1285.50, status: 'paid', createdAt: '2024-12-15T09:10:00Z', dueDate: '2025-01-15', customerName: 'BMW AG', shipmentIds: ['SHP-001'] },
  { id: 'INV-002', invoiceNumber: 'RE-2024-00887', amount: 2890.00, status: 'paid', createdAt: '2024-12-10T08:35:00Z', dueDate: '2025-01-10', customerName: 'Siemens AG', shipmentIds: ['SHP-002'] },
  { id: 'INV-003', invoiceNumber: 'RE-2024-00895', amount: 1580.00, status: 'paid', createdAt: '2024-12-14T07:10:00Z', dueDate: '2025-01-14', customerName: 'Adidas AG', shipmentIds: ['SHP-004'] },
  { id: 'INV-004', invoiceNumber: 'RE-2024-00902', amount: 2150.00, status: 'pending', createdAt: '2024-12-19T08:10:00Z', dueDate: '2025-01-19', customerName: 'SAP SE', shipmentIds: ['SHP-005'] },
  { id: 'INV-005', invoiceNumber: 'RE-2024-00889', amount: 1540.00, status: 'paid', createdAt: '2024-12-05T06:10:00Z', dueDate: '2025-01-05', customerName: 'Lufthansa Cargo', shipmentIds: ['SHP-009'] },
  { id: 'INV-006', invoiceNumber: 'RE-2024-00878', amount: 890.00, status: 'overdue', createdAt: '2024-11-20T10:00:00Z', dueDate: '2024-12-20', customerName: 'Autohaus Hamburg Nord', shipmentIds: ['SHP-006'] },
];

export const paymentMethods: PaymentMethod[] = [
  { id: 'PM-001', type: 'bank_transfer', label: 'Geschäftskonto', details: 'DE89 3704 0044 0532 0130 00 – CargoBit GmbH', isDefault: true },
  { id: 'PM-002', type: 'sepa', label: 'SEPA-Lastschrift', details: 'DE89 3704 0044 0532 0130 00', isDefault: false },
  { id: 'PM-003', type: 'credit_card', label: 'Visa Business ****4521', details: 'Ablauf: 08/2027', isDefault: false },
];

// ==========================================
// ADVERTISING DATA
// ==========================================

export const adCampaigns: AdCampaign[] = [
  { id: 'ADC-001', name: 'MAN Truck & Bus – Neue TGX Serie', advertiser: 'MAN Truck & Bus SE', status: 'active', position: 'Header-Banner', bannerUrl: 'https://picsum.photos/seed/man-truck/728/90', targetUrl: 'https://man.de/tgx', impressions: 245000, clicks: 3675, budget: 499, budgetUsed: 412.50, startDate: '2024-11-01', endDate: '2025-04-30', ctr: 1.5, createdAt: '2024-10-28T14:00:00Z' },
  { id: 'ADC-002', name: 'Shell Fleet Solutions – Kraftstoff sparen', advertiser: 'Shell Deutschland', status: 'active', position: 'Sidebar-Banner', bannerUrl: 'https://picsum.photos/seed/shell-fleet/300/250', targetUrl: 'https://shell.de/fleet', impressions: 182000, clicks: 2548, budget: 299, budgetUsed: 249.17, startDate: '2024-12-01', endDate: '2025-05-31', ctr: 1.4, createdAt: '2024-11-25T10:00:00Z' },
  { id: 'ADC-003', name: 'Michelin Truck Reifen – Winteraktion', advertiser: 'Michelin Deutschland', status: 'active', position: 'Dashboard-Widget', bannerUrl: 'https://picsum.photos/seed/michelin/600/200', targetUrl: 'https://michelin.de/truck', impressions: 156000, clicks: 2808, budget: 399, budgetUsed: 332.50, startDate: '2024-10-15', endDate: '2025-03-15', ctr: 1.8, createdAt: '2024-10-10T09:00:00Z' },
  { id: 'ADC-004', name: 'TomTom Telematics – Flottenmanagement', advertiser: 'TomTom BV', status: 'paused', position: 'Sidebar-Banner', bannerUrl: 'https://picsum.photos/seed/tomtom/300/250', targetUrl: 'https://tomtom.com/fleet', impressions: 98000, clicks: 1274, budget: 299, budgetUsed: 164.50, startDate: '2024-09-01', endDate: '2025-02-28', ctr: 1.3, createdAt: '2024-08-28T11:00:00Z' },
  { id: 'ADC-005', name: 'Scania Trucks – Elektro-Serie', advertiser: 'Scania Deutschland', status: 'pending_review', position: 'Header-Banner', bannerUrl: 'https://picsum.photos/seed/scania-elec/728/90', targetUrl: 'https://scania.de/electro', impressions: 0, clicks: 0, budget: 599, budgetUsed: 0, startDate: '2025-01-01', endDate: '2025-06-30', ctr: 0, createdAt: '2024-12-14T16:00:00Z' },
  { id: 'ADC-006', name: 'DHL Freight – Express-Lieferungen EU', advertiser: 'DHL Freight GmbH', status: 'completed', position: 'Popup-Interstitial', bannerUrl: 'https://picsum.photos/seed/dhl-freight/800/600', targetUrl: 'https://dhl.de/freight', impressions: 425000, clicks: 8075, budget: 599, budgetUsed: 599.00, startDate: '2024-07-01', endDate: '2024-12-31', ctr: 1.9, createdAt: '2024-06-25T14:00:00Z' },
];

export const adPositions: AdPosition[] = [
  { id: 'POS-001', name: 'Header-Banner', location: 'Oben – Seitenkopf', dimensions: '728 × 90 px', pricePerMonth: 499, available: true, currentAdvertiser: 'MAN Truck & Bus SE' },
  { id: 'POS-002', name: 'Sidebar-Banner', location: 'Rechte Seitenleiste', dimensions: '300 × 250 px', pricePerMonth: 299, available: false, currentAdvertiser: 'Shell Deutschland' },
  { id: 'POS-003', name: 'Dashboard-Widget', location: 'Dashboard – Mitte', dimensions: '600 × 200 px', pricePerMonth: 399, available: false, currentAdvertiser: 'Michelin Deutschland' },
  { id: 'POS-004', name: 'E-Mail-Newsletter', location: 'E-Mail Newsletter', dimensions: '600 × 300 px', pricePerMonth: 199, available: true },
  { id: 'POS-005', name: 'Popup-Interstitial', location: 'Seitenaufruf – Vollbild', dimensions: '800 × 600 px', pricePerMonth: 599, available: true },
  { id: 'POS-006', name: 'Footer-Banner', location: 'Seitenfuß', dimensions: '728 × 90 px', pricePerMonth: 349, available: true },
];

export const adApplications: AdApplication[] = [
  { id: 'APP-001', companyName: 'Continental Reifen GmbH', contactPerson: 'Markus Weber', email: 'm.weber@continental.de', phone: '+49 521 93880', website: 'https://continental.de', description: 'Wir möchten unsere neue Generation Truck-Reifen auf der CargoBit-Plattform bewerben.', targetAudience: ['dispatcher', 'admin'], budgetRange: '€1.000 – €3.000/Monat', preferredPositions: ['Header-Banner', 'Dashboard-Widget'], status: 'approved', submittedAt: '2024-12-10T10:00:00Z' },
  { id: 'APP-002', companyName: 'Volvo Trucks Deutschland', contactPerson: 'Anna Schmidt', email: 'a.schmidt@volvo.de', phone: '+49 211 77880', website: 'https://volvo-trucks.de', description: 'Werbung für neue Volvo FH Electric Flotte auf der Logistikplattform.', targetAudience: ['admin', 'dispatcher'], budgetRange: '€3.000 – €5.000/Monat', preferredPositions: ['Header-Banner', 'Popup-Interstitial'], status: 'approved', submittedAt: '2024-12-08T14:30:00Z' },
  { id: 'APP-003', companyName: 'BP Europa SE', contactPerson: 'Thomas Richter', email: 't.richter@bp.com', phone: '+49 211 37770', website: 'https://bp.de/fleet', description: 'BP Fuel Cards für Fuhrparkbetreiber bewerben.', targetAudience: ['admin', 'dispatcher'], budgetRange: '€500 – €1.500/Monat', preferredPositions: ['Sidebar-Banner', 'E-Mail-Newsletter'], status: 'pending', submittedAt: '2024-12-15T09:00:00Z' },
  { id: 'APP-004', companyName: 'Girteka Logistics', contactPerson: 'Egle Ziliene', email: 'e.ziliene@girteka.eu', phone: '+370 5 260 3800', website: 'https://girteka.eu', description: 'Full-Transport-Services im europäischen Netzwerk bewerben.', targetAudience: ['admin', 'shipper'], budgetRange: '€2.000 – €4.000/Monat', preferredPositions: ['Header-Banner', 'Dashboard-Widget'], status: 'pending', submittedAt: '2024-12-16T11:00:00Z' },
];
