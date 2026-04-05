import { z } from 'zod';

// Address schema
export const addressSchema = z.object({
  street: z.string().min(1, 'Straße ist erforderlich'),
  city: z.string().min(1, 'Stadt ist erforderlich'),
  postalCode: z.string().regex(/^\d{4,10}$/, 'Ungültige Postleitzahl'),
  country: z.string().default('DE'),
});

// Contact schema
export const contactSchema = z.object({
  name: z.string().min(1, 'Name ist erforderlich'),
  phone: z.string().regex(/^[\d\s\-+()]+$/, 'Ungültige Telefonnummer').optional(),
  email: z.string().email('Ungültige E-Mail-Adresse').optional(),
});

// Shipment creation schema
export const createShipmentSchema = z.object({
  // Sender info
  senderId: z.string().cuid('Ungültige Sender-ID'),
  senderName: z.string().min(1, 'Absender-Name ist erforderlich').max(200),
  senderAddress: z.string().min(1, 'Absender-Adresse ist erforderlich').max(500),
  senderContact: z.string().max(100).optional(),

  // Receiver info
  receiverName: z.string().min(1, 'Empfänger-Name ist erforderlich').max(200),
  receiverAddress: z.string().min(1, 'Empfänger-Adresse ist erforderlich').max(500),
  receiverContact: z.string().max(100).optional(),

  // Carrier info (optional at creation)
  carrierId: z.string().cuid().optional(),
  carrierName: z.string().max(200).optional(),
  driverId: z.string().cuid().optional(),
  driverName: z.string().max(200).optional(),
  vehicleId: z.string().cuid().optional(),
  vehiclePlate: z.string().max(20).optional(),

  // Route
  pickupPlace: z.string().min(1, 'Abholort ist erforderlich').max(200),
  pickupDate: z.string().refine((val) => {
    const date = new Date(val);
    return !isNaN(date.getTime()) && date >= new Date(Date.now() - 86400000);
  }, 'Ungültiges Abholdatum'),
  pickupTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Ungültige Abholzeit').optional(),
  deliveryPlace: z.string().min(1, 'Lieferort ist erforderlich').max(200),
  deliveryDate: z.string().optional().refine((val) => {
    if (!val) return true;
    const date = new Date(val);
    return !isNaN(date.getTime());
  }, 'Ungültiges Lieferdatum'),
  deliveryTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Ungültige Lieferzeit').optional(),

  // Goods
  goodsDescription: z.string().min(1, 'Warenbeschreibung ist erforderlich').max(1000),
  weight: z.number().positive('Gewicht muss positiv sein').max(50000, 'Max. 50.000 kg'),
  volume: z.number().positive('Volumen muss positiv sein').max(200, 'Max. 200 m³').optional(),
  packages: z.number().int('Pakete müssen ganzzahlig sein').positive('Mindestens 1 Paket').max(1000).default(1),
  specialInstructions: z.string().max(2000).optional(),

  // Pricing
  price: z.number().nonnegative('Preis darf nicht negativ sein').max(1000000, 'Max. 1.000.000 EUR').default(0),
  currency: z.enum(['EUR', 'USD', 'GBP', 'CHF']).default('EUR'),

  // Type
  shipmentType: z.enum(['direct', 'auction']).default('direct'),
});

// Shipment update schema
export const updateShipmentSchema = z.object({
  id: z.string().cuid('Ungültige Shipment-ID'),
  action: z.enum([
    'assignCarrier',
    'assignDriver',
    'startTransport',
    'updateLocation',
    'confirmDelivery',
    'cancel'
  ]).optional(),
  senderName: z.string().min(1).max(200).optional(),
  senderAddress: z.string().min(1).max(500).optional(),
  senderContact: z.string().max(100).optional(),
  receiverName: z.string().min(1).max(200).optional(),
  receiverAddress: z.string().min(1).max(500).optional(),
  receiverContact: z.string().max(100).optional(),
  pickupPlace: z.string().min(1).max(200).optional(),
  deliveryPlace: z.string().min(1).max(200).optional(),
  goodsDescription: z.string().min(1).max(1000).optional(),
  weight: z.number().positive().max(50000).optional(),
  volume: z.number().positive().max(200).optional(),
  packages: z.number().int().positive().max(1000).optional(),
  specialInstructions: z.string().max(2000).optional(),
  price: z.number().nonnegative().max(1000000).optional(),
  carrierId: z.string().cuid().optional(),
  carrierName: z.string().max(200).optional(),
  driverId: z.string().cuid().optional(),
  driverName: z.string().max(200).optional(),
  vehicleId: z.string().cuid().optional(),
  vehiclePlate: z.string().max(20).optional(),
  pickupDate: z.string().optional(),
  deliveryDate: z.string().optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  signature: z.string().optional(),
  gpsLat: z.number().min(-90).max(90).optional(),
  gpsLng: z.number().min(-180).max(180).optional(),
  photo: z.string().optional(),
});

// Shipment query schema
export const shipmentQuerySchema = z.object({
  id: z.string().cuid().optional(),
  userId: z.string().cuid().optional(),
  status: z.enum(['pending', 'assigned', 'in_transit', 'delivered', 'cancelled']).optional(),
  role: z.enum(['ADMIN', 'DISPATCHER', 'DRIVER', 'SHIPPER', 'SUPPORT']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

// Type exports
export type CreateShipmentInput = z.infer<typeof createShipmentSchema>;
export type UpdateShipmentInput = z.infer<typeof updateShipmentSchema>;
export type ShipmentQueryInput = z.infer<typeof shipmentQuerySchema>;
