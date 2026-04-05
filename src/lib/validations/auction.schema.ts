import { z } from 'zod';

// Auction creation schema
export const createAuctionSchema = z.object({
  // Shipment reference
  shipmentId: z.string().cuid('Ungültige Shipment-ID'),

  // Auction details
  title: z.string()
    .min(5, 'Titel muss mindestens 5 Zeichen haben')
    .max(200, 'Titel darf maximal 200 Zeichen haben'),
  description: z.string()
    .max(2000, 'Beschreibung darf maximal 2000 Zeichen haben')
    .optional(),

  // Pricing
  startingPrice: z.number()
    .positive('Startpreis muss positiv sein')
    .max(1000000, 'Max. 1.000.000 EUR'),
  buyNowPrice: z.number()
    .positive('Sofort-Kaufen-Preis muss positiv sein')
    .max(1000000, 'Max. 1.000.000 EUR')
    .optional(),
  reservePrice: z.number()
    .nonnegative('Mindestpreis darf nicht negativ sein')
    .max(1000000, 'Max. 1.000.000 EUR')
    .optional(),

  // Timing
  startsAt: z.string()
    .refine((val) => {
      const date = new Date(val);
      return !isNaN(date.getTime()) && date >= new Date(Date.now() - 3600000);
    }, 'Ungültiges Startdatum'),
  durationHours: z.number()
    .int('Dauer muss in ganzen Stunden sein')
    .min(1, 'Mindestens 1 Stunde')
    .max(168, 'Maximal 7 Tage (168 Stunden)')
    .default(24),

  // Visibility
  visibility: z.enum(['public', 'invited', 'private']).default('public'),
}).refine((data) => {
  // Buy now price must be higher than starting price
  if (data.buyNowPrice && data.buyNowPrice <= data.startingPrice) {
    return false;
  }
  // Reserve price must be higher than starting price
  if (data.reservePrice && data.reservePrice <= data.startingPrice) {
    return false;
  }
  return true;
}, {
  message: 'Sofort-Kaufen-Preis und Mindestpreis müssen höher als der Startpreis sein',
});

// Auction update schema
export const updateAuctionSchema = z.object({
  id: z.string().cuid('Ungültige Auktions-ID'),
  action: z.enum(['cancel', 'extend', 'update']).optional(),
  title: z.string().min(5).max(200).optional(),
  description: z.string().max(2000).optional(),
  status: z.enum(['pending', 'active', 'ended', 'cancelled', 'awarded']).optional(),
  extendHours: z.number().int().min(1).max(24).optional(),
});

// Auction bid schema
export const createBidSchema = z.object({
  auctionId: z.string().cuid('Ungültige Auktions-ID'),
  amount: z.number()
    .positive('Gebot muss positiv sein')
    .max(1000000, 'Max. 1.000.000 EUR'),
  message: z.string()
    .max(500, 'Nachricht darf maximal 500 Zeichen haben')
    .optional(),
}).refine((data) => {
  // Minimum bid increment (usually 1 EUR or 1% of current bid)
  return data.amount >= 1;
}, {
  message: 'Mindestgebot ist 1 EUR',
});

// Auction query schema
export const auctionQuerySchema = z.object({
  id: z.string().cuid().optional(),
  shipmentId: z.string().cuid().optional(),
  creatorId: z.string().cuid().optional(),
  status: z.enum(['pending', 'active', 'ended', 'cancelled', 'awarded']).optional(),
  visibility: z.enum(['public', 'invited', 'private']).optional(),
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().positive().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sortBy: z.enum(['createdAt', 'endsAt', 'currentHighestBid', 'startingPrice']).default('endsAt'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

// Auction bid query schema
export const bidQuerySchema = z.object({
  auctionId: z.string().cuid(),
  bidderId: z.string().cuid().optional(),
  status: z.enum(['active', 'outbid', 'winning', 'withdrawn']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
});

// Type exports
export type CreateAuctionInput = z.infer<typeof createAuctionSchema>;
export type UpdateAuctionInput = z.infer<typeof updateAuctionSchema>;
export type CreateBidInput = z.infer<typeof createBidSchema>;
export type AuctionQueryInput = z.infer<typeof auctionQuerySchema>;
export type BidQueryInput = z.infer<typeof bidQuerySchema>;
