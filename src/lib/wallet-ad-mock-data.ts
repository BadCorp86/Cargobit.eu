// ==========================================
// WALLET DATA
// ==========================================

export interface WalletTransaction {
  id: string;
  type: 'transport_fee' | 'commission' | 'auction_fee' | 'express_surcharge' | 'refund' | 'deposit' | 'withdrawal';
  amount: number;
  currency: string;
  status: 'completed' | 'pending' | 'failed';
  reference: string;
  description: string;
  shipmentId?: string;
  createdAt: string;
  balanceAfter: number;
}

export interface WalletInvoice {
  id: string;
  invoiceNumber: string;
  amount: number;
  status: 'paid' | 'pending' | 'overdue';
  createdAt: string;
  dueDate: string;
  customerName: string;
  shipmentIds: string[];
}

export interface PaymentMethod {
  id: string;
  type: 'bank_transfer' | 'credit_card' | 'sepa';
  label: string;
  details: string;
  isDefault: boolean;
}

export const walletTransactions: WalletTransaction[] = [
  { id: 'WTX-001', type: 'transport_fee', amount: -1285.50, currency: 'EUR', status: 'completed', reference: 'TXN-2024-12150', description: 'Transportgebühr München → Berlin (Express)', shipmentId: 'CB-DE-2024-001245', createdAt: '2024-12-15T09:30:00Z', balanceAfter: 24518.50 },
  { id: 'WTX-002', type: 'commission', amount: 102.84, currency: 'EUR', status: 'completed', reference: 'TXN-2024-12151', description: 'Provision 8% - BMW AG Transport', shipmentId: 'CB-DE-2024-001245', createdAt: '2024-12-15T09:31:00Z', balanceAfter: 24621.34 },
  { id: 'WTX-003', type: 'deposit', amount: 5000.00, currency: 'EUR', status: 'completed', reference: 'TXN-2024-12140', description: 'Guthabeneinzahlung - Überweisung', createdAt: '2024-12-14T14:00:00Z', balanceAfter: 25804.00 },
  { id: 'WTX-004', type: 'transport_fee', amount: -2890.00, currency: 'EUR', status: 'completed', reference: 'TXN-2024-12130', description: 'Transportgebühr München → Hamburg (Standard)', shipmentId: 'CB-DE-2024-001246', createdAt: '2024-12-13T16:45:00Z', balanceAfter: 20804.00 },
  { id: 'WTX-005', type: 'commission', amount: 144.50, currency: 'EUR', status: 'completed', reference: 'TXN-2024-12131', description: 'Provision 5% - Siemens AG Transport', shipmentId: 'CB-DE-2024-001246', createdAt: '2024-12-13T16:46:00Z', balanceAfter: 20948.50 },
  { id: 'WTX-006', type: 'express_surcharge', amount: -31.60, currency: 'EUR', status: 'completed', reference: 'TXN-2024-12132', description: 'Express-Zuschlag +2% - CB-DE-2024-001246', shipmentId: 'CB-DE-2024-001246', createdAt: '2024-12-13T16:47:00Z', balanceAfter: 20916.90 },
  { id: 'WTX-007', type: 'refund', amount: 645.00, currency: 'EUR', status: 'completed', reference: 'TXN-2024-12120', description: 'Rückerstattung - Stornierte Sendung Bosch', shipmentId: 'CB-DE-2024-001251', createdAt: '2024-12-12T11:20:00Z', balanceAfter: 20947.90 },
  { id: 'WTX-008', type: 'auction_fee', amount: -86.70, currency: 'EUR', status: 'completed', reference: 'TXN-2024-12110', description: 'Auktionsgebühr 3% - Kapazitätsauktion', createdAt: '2024-12-11T08:00:00Z', balanceAfter: 20302.90 },
  { id: 'WTX-009', type: 'withdrawal', amount: -3000.00, currency: 'EUR', status: 'completed', reference: 'TXN-2024-12100', description: 'Auszahlung auf Geschäftskonto', createdAt: '2024-12-10T10:15:00Z', balanceAfter: 23389.60 },
  { id: 'WTX-010', type: 'transport_fee', amount: -1580.00, currency: 'EUR', status: 'completed', reference: 'TXN-2024-12090', description: 'Transportgebühr Herzogenaurach → Wien (Overnight)', shipmentId: 'CB-DE-2024-001248', createdAt: '2024-12-09T07:30:00Z', balanceAfter: 26389.60 },
  { id: 'WTX-011', type: 'commission', amount: 126.40, currency: 'EUR', status: 'completed', reference: 'TXN-2024-12091', description: 'Provision 8% - Adidas AG Transport', shipmentId: 'CB-DE-2024-001248', createdAt: '2024-12-09T07:31:00Z', balanceAfter: 26516.00 },
  { id: 'WTX-012', type: 'transport_fee', amount: -456.75, currency: 'EUR', status: 'pending', reference: 'TXN-2024-12160', description: 'Transportgebühr Ludwigshafen → Monheim (Standard)', shipmentId: 'CB-DE-2024-001247', createdAt: '2024-12-16T08:00:00Z', balanceAfter: 24518.50 },
  { id: 'WTX-013', type: 'deposit', amount: 10000.00, currency: 'EUR', status: 'completed', reference: 'TXN-2024-12050', description: 'Guthabeneinzahlung - SEPA', createdAt: '2024-12-05T13:00:00Z', balanceAfter: 27645.60 },
  { id: 'WTX-014', type: 'transport_fee', amount: -890.00, currency: 'EUR', status: 'completed', reference: 'TXN-2024-12040', description: 'Transportgebühr Wolfsburg → Hamburg (Standard)', shipmentId: 'CB-DE-2024-001250', createdAt: '2024-12-04T15:30:00Z', balanceAfter: 17645.60 },
  { id: 'WTX-015', type: 'commission', amount: 53.40, currency: 'EUR', status: 'completed', reference: 'TXN-2024-12041', description: 'Provision 6% - VW AG Transport', shipmentId: 'CB-DE-2024-001250', createdAt: '2024-12-04T15:31:00Z', balanceAfter: 17699.00 },
  { id: 'WTX-016', type: 'express_surcharge', amount: -21.50, currency: 'EUR', status: 'failed', reference: 'TXN-2024-12042', description: 'Express-Zuschlag +2% - Zahlung fehlgeschlagen', shipmentId: 'CB-DE-2024-001250', createdAt: '2024-12-04T15:32:00Z', balanceAfter: 17699.00 },
  { id: 'WTX-017', type: 'refund', amount: 215.00, currency: 'EUR', status: 'pending', reference: 'TXN-2024-12170', description: 'Teilrückerstattung - Beschädigte Sendung', shipmentId: 'CB-DE-2024-001246', createdAt: '2024-12-16T14:00:00Z', balanceAfter: 24518.50 },
];

export const walletInvoices: WalletInvoice[] = [
  { id: 'INV-001', invoiceNumber: 'RE-2024-00891', amount: 1285.50, status: 'paid', createdAt: '2024-12-15', dueDate: '2024-12-30', customerName: 'BMW AG', shipmentIds: ['CB-DE-2024-001245'] },
  { id: 'INV-002', invoiceNumber: 'RE-2024-00892', amount: 2890.00, status: 'paid', createdAt: '2024-12-13', dueDate: '2024-12-28', customerName: 'Siemens AG', shipmentIds: ['CB-DE-2024-001246'] },
  { id: 'INV-003', invoiceNumber: 'RE-2024-00893', amount: 456.75, status: 'pending', createdAt: '2024-12-16', dueDate: '2025-01-15', customerName: 'BASF SE', shipmentIds: ['CB-DE-2024-001247'] },
  { id: 'INV-004', invoiceNumber: 'RE-2024-00894', amount: 1580.00, status: 'paid', createdAt: '2024-12-09', dueDate: '2024-12-24', customerName: 'Adidas AG', shipmentIds: ['CB-DE-2024-001248'] },
  { id: 'INV-005', invoiceNumber: 'RE-2024-00895', amount: 2150.00, status: 'overdue', createdAt: '2024-11-25', dueDate: '2024-12-10', customerName: 'SAP SE', shipmentIds: ['CB-DE-2024-001249'] },
  { id: 'INV-006', invoiceNumber: 'RE-2024-00896', amount: 890.00, status: 'pending', createdAt: '2024-12-04', dueDate: '2025-01-04', customerName: 'Volkswagen AG', shipmentIds: ['CB-DE-2024-001250'] },
  { id: 'INV-007', invoiceNumber: 'RE-2024-00897', amount: 1650.00, status: 'paid', createdAt: '2024-12-07', dueDate: '2024-12-22', customerName: 'E.ON SE', shipmentIds: ['CB-DE-2024-001256'] },
];

export const paymentMethods: PaymentMethod[] = [
  { id: 'PM-001', type: 'bank_transfer', label: 'Geschäftskonto Deutsche Bank', details: 'DE89 3704 0044 0532 0130 00', isDefault: true },
  { id: 'PM-002', type: 'credit_card', label: 'Visa Business **** 4532', details: 'Gültig bis 08/2027', isDefault: false },
  { id: 'PM-003', type: 'sepa', label: 'SEPA-Lastschrift Commerzbank', details: 'DE44 5001 0517 5407 3249 31', isDefault: false },
];

export const commissionData = [
  { name: 'Transport', value: 4520, color: '#F97316' },
  { name: 'Auktion', value: 1280, color: '#EAB308' },
  { name: 'Express', value: 890, color: '#3B82F6' },
];

export const monthlyCommissionData = [
  { month: 'Jul', amount: 620 },
  { month: 'Aug', amount: 580 },
  { month: 'Sep', amount: 710 },
  { month: 'Okt', amount: 830 },
  { month: 'Nov', amount: 960 },
  { month: 'Dez', amount: 1150 },
];

// ==========================================
// ADVERTISING DATA
// ==========================================

export interface AdCampaign {
  id: string;
  name: string;
  advertiser: string;
  status: 'active' | 'pending_review' | 'paused' | 'completed' | 'rejected';
  position: string;
  bannerUrl: string;
  targetUrl: string;
  impressions: number;
  clicks: number;
  budget: number;
  budgetUsed: number;
  startDate: string;
  endDate: string;
  ctr: number;
  createdAt: string;
}

export interface AdPosition {
  id: string;
  name: string;
  location: string;
  dimensions: string;
  pricePerMonth: number;
  available: boolean;
  currentAdvertiser?: string;
}

export interface AdApplication {
  id: string;
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  website: string;
  description: string;
  targetAudience: string[];
  budgetRange: string;
  preferredPositions: string[];
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
}

export const adCampaigns: AdCampaign[] = [
  { id: 'CAM-001', name: 'Winter Sale 2024', advertiser: 'CargoBit Internal', status: 'active', position: 'Header Banner', bannerUrl: '/banners/winter-sale.jpg', targetUrl: '/promotions/winter', impressions: 245000, clicks: 3675, budget: 499, budgetUsed: 412.50, startDate: '2024-12-01', endDate: '2024-12-31', ctr: 1.5, createdAt: '2024-11-25T10:00:00Z' },
  { id: 'CAM-002', name: 'DHL Express Partnership', advertiser: 'DHL Express', status: 'active', position: 'Sidebar Banner', bannerUrl: '/banners/dhl-partner.jpg', targetUrl: '/partners/dhl', impressions: 189000, clicks: 2268, budget: 299, budgetUsed: 249.17, startDate: '2024-11-15', endDate: '2025-02-15', ctr: 1.2, createdAt: '2024-11-10T14:30:00Z' },
  { id: 'CAM-003', name: 'Neue Routen - Skandinavien', advertiser: 'CargoBit Internal', status: 'active', position: 'Dashboard Widget', bannerUrl: '/banners/scandinavia.jpg', targetUrl: '/routes/scandinavia', impressions: 156000, clicks: 2808, budget: 399, budgetUsed: 332.50, startDate: '2024-12-05', endDate: '2025-01-05', ctr: 1.8, createdAt: '2024-12-01T09:00:00Z' },
  { id: 'CAM-004', name: 'MAN Truck Service', advertiser: 'MAN Truck & Bus', status: 'paused', position: 'Sidebar Banner', bannerUrl: '/banners/man-service.jpg', targetUrl: 'https://mantruck.de', impressions: 98000, clicks: 882, budget: 299, budgetUsed: 199.00, startDate: '2024-10-01', endDate: '2025-03-31', ctr: 0.9, createdAt: '2024-09-25T16:00:00Z' },
  { id: 'CAM-005', name: 'Newsletter Ad - Januar', advertiser: 'Michelin Tires', status: 'pending_review', position: 'Email Newsletter', bannerUrl: '/banners/michelin.jpg', targetUrl: 'https://michelin.de', impressions: 0, clicks: 0, budget: 199, budgetUsed: 0, startDate: '2025-01-01', endDate: '2025-01-31', ctr: 0, createdAt: '2024-12-16T11:00:00Z' },
  { id: 'CAM-006', name: 'Black Friday Recap', advertiser: 'CargoBit Internal', status: 'completed', position: 'Popup Interstitial', bannerUrl: '/banners/bf-recap.jpg', targetUrl: '/promotions/black-friday', impressions: 420000, clicks: 12600, budget: 599, budgetUsed: 599, startDate: '2024-11-25', endDate: '2024-11-30', ctr: 3.0, createdAt: '2024-11-20T08:00:00Z' },
  { id: 'CAM-007', name: 'Scania Trucks Promotion', advertiser: 'Scania Deutschland', status: 'rejected', position: 'Header Banner', bannerUrl: '/banners/scania.jpg', targetUrl: 'https://scania.de', impressions: 0, clicks: 0, budget: 499, budgetUsed: 0, startDate: '2024-12-20', endDate: '2025-03-20', ctr: 0, createdAt: '2024-12-14T13:00:00Z' },
];

export const adPositions: AdPosition[] = [
  { id: 'POS-001', name: 'Header Banner', location: 'Top of all pages', dimensions: '728x90px', pricePerMonth: 499, available: false, currentAdvertiser: 'CargoBit Internal' },
  { id: 'POS-002', name: 'Sidebar Banner', location: 'Right sidebar', dimensions: '300x250px', pricePerMonth: 299, available: false, currentAdvertiser: 'DHL Express' },
  { id: 'POS-003', name: 'Dashboard Widget', location: 'Dashboard main area', dimensions: '600x200px', pricePerMonth: 399, available: false, currentAdvertiser: 'CargoBit Internal' },
  { id: 'POS-004', name: 'Email Newsletter', location: 'Weekly newsletter', dimensions: '600x300px', pricePerMonth: 199, available: true },
  { id: 'POS-005', name: 'Popup Interstitial', location: 'Between page transitions', dimensions: '800x600px', pricePerMonth: 599, available: true },
];

export const adApplications: AdApplication[] = [
  { id: 'APP-001', companyName: 'MAN Truck & Bus SE', contactPerson: 'Thomas Richter', email: 't.richter@man.de', phone: '+49 89 1589-0', website: 'https://man.de', description: 'Wir möchten unsere neuen LKW-Modelle auf Ihrer Plattform bewerben.', targetAudience: ['dispatcher', 'driver', 'admin'], budgetRange: '€5.000 - €10.000', preferredPositions: ['Header Banner', 'Sidebar Banner'], status: 'approved', submittedAt: '2024-09-20T10:00:00Z' },
  { id: 'APP-002', companyName: 'Scania Deutschland', contactPerson: 'Lisa Braun', email: 'l.braun@scania.de', phone: '+49 40 36148-0', website: 'https://scania.de', description: 'Banner für unsere neue Scania R-Serie.', targetAudience: ['dispatcher', 'admin'], budgetRange: '€3.000 - €7.000', preferredPositions: ['Header Banner', 'Dashboard Widget'], status: 'rejected', submittedAt: '2024-12-14T13:00:00Z' },
  { id: 'APP-003', companyName: 'Michelin Reifenwerke', contactPerson: 'Markus Scholz', email: 'm.scholz@michelin.de', phone: '+49 711 9495-0', website: 'https://michelin.de', description: 'Winterreifen-Kampagne für Fuhrparkbetreiber.', targetAudience: ['admin', 'dispatcher', 'driver'], budgetRange: '€2.000 - €5.000', preferredPositions: ['Email Newsletter', 'Sidebar Banner'], status: 'pending', submittedAt: '2024-12-16T11:00:00Z' },
  { id: 'APP-004', companyName: 'Shell Fleet Solutions', contactPerson: 'Anna Bergmann', email: 'a.bergmann@shell.de', phone: '+49 211 3849-0', website: 'https://shell.de/fleet', description: 'Treibstoffkarte für Fuhrparks bewerben.', targetAudience: ['admin', 'finance', 'dispatcher'], budgetRange: '€8.000 - €15.000', preferredPositions: ['Header Banner', 'Popup Interstitial'], status: 'pending', submittedAt: '2024-12-17T09:30:00Z' },
];

export const campaignStatsData = [
  { date: '01.12', impressions: 12000, clicks: 180 },
  { date: '03.12', impressions: 14500, clicks: 232 },
  { date: '05.12', impressions: 13200, clicks: 211 },
  { date: '07.12', impressions: 16800, clicks: 286 },
  { date: '09.12', impressions: 15400, clicks: 246 },
  { date: '11.12', impressions: 18900, clicks: 341 },
  { date: '13.12', impressions: 17200, clicks: 275 },
  { date: '15.12', impressions: 21000, clicks: 378 },
];
