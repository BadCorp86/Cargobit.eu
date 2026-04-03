---
Task ID: 1-2-3
Agent: Main Agent
Task: Wallet-System + Werbebanner-Add-on erstellen

Work Log:
- Projekt-Status analysiert (bereits 11 Seiten, 9 Sprachen, Fleet/Capacity vorhanden)
- Types erweitert: WalletTransaction, WalletInvoice, PaymentMethod, AdCampaign, AdPosition, AdApplication
- Mock-Daten-Datei erstellt: mock-data-wallet.ts mit 15 Transaktionen, 6 Rechnungen, 3 Zahlungsmethoden, 6 Kampagnen, 6 Positionen, 4 Werbeanträge
- Wallet-Seite erstellt (wallet-page.tsx): Guthaben-Karten, Transaktionsverlauf mit Filter/Suche, Rechnungen, Zahlungsmethoden, Provisionsoverblick, Top-Up/Withdraw Dialoge
- Werbebanner-Seite erstellt (advertising-page.tsx): Kampagnenübersicht, Bannerpositionen, Werbeanfragen, Pricing-Tabelle, Mengenrabatte, Kampagnenerstellungs- und Bewerbungsformular
- App-Shell aktualisiert mit Wallet + Advertising Imports und Routes
- Build erfolgreich: 0 Errors
- GitHub-Push erfolgreich (Commit 9ac41a3)

Stage Summary:
- Neue Dateien: wallet-page.tsx (340 Zeilen), advertising-page.tsx (480 Zeilen), mock-data-wallet.ts, i18n-wallet.ts
- Plattform hat jetzt 11 funktionale Seiten
- Wallet mit Provisionssystem (5-8% Transport, 3-5% Auktion, +2% Express)
- Werbesystem mit 6 Positionen (€199-599/Monat) und Mengenrabatte

---
## Task ID: cargo-features-1
Agent: Feature Agent
Task: AI Price Recommendation, Bid Price Floor, Membership Plans with Commissions

### Work Task
Implement three major features for the CargoBit freight exchange platform:
1. AI Price Recommendation for transport auctions (20% hidden markup, bid floor at 35% below recommended)
2. Bid Price Floor enforcement (minimum bid = recommendedPrice * 0.65)
3. Membership Plans with tiered commissions (Starter/Professional/Enterprise)

### Work Summary

#### Files Modified:
- **`src/types/index.ts`**: Added MembershipTier, BillingCycle, MembershipPlan, AIPriceRecommendation, AuctionBid types; added 'memberships' to NavigationTab union
- **`src/lib/i18n.ts`**: Added 70+ new translation keys to both `de` and `en` objects covering memberships, auctions, AI pricing, billing
- **`src/lib/store.ts`**: Added currentMembership, billingCycle, showMembershipModal state + setters to Zustand store
- **`src/lib/mock-data.ts`**: Added 'memberships' to availableTabs for admin, dispatcher, shipper role configs
- **`src/components/cargo/sidebar-nav.tsx`**: Added CreditCard icon and memberships entry to tabIconMap
- **`src/components/cargo/app-shell.tsx`**: Imported MembershipsPage, added 'memberships' case to renderPage switch
- **`src/components/cargo/shipments/shipments-page.tsx`**: Enhanced CreateShipmentDialog with AI price recommendation (step 2), shipment type selector (direct/auction), auction info panel with bid floor, auction duration selector

#### Files Created:
- **`src/lib/membership-data.ts`**: Complete membership plan definitions (3 tiers with pricing, features, commission tables), AI pricing calculation function (`calculateAIRecommendedPrice`), commission/wallet fee helpers, EUR formatter
- **`src/components/cargo/memberships/memberships-page.tsx`**: Full membership/pricing page with billing toggle (monthly/yearly), 3 pricing cards with animations, feature lists, commission rate displays, CTA buttons, commission structure comparison table
- **`src/app/api/ai-pricing/route.ts`**: POST endpoint accepting distance/weight/priority/vehicleType, returning AIPriceRecommendation

#### Key Business Logic:
- **AI Pricing Formula**: basePrice = (distance × 0.12) + (weight × 0.08), then apply priority multiplier (standard=1.0, express=1.15, overnight=1.35) and vehicle type multiplier. Hidden 20% markup applied to get recommendedPrice. Bid floor = recommendedPrice × 0.65 (35% below).
- **Commission Structure**: Spediteur 8/5/2%, Transportunternehmer 6/4/1.5%, Fahrer wallet fee 3/2/0.5% across tiers. Admin/Support always 0%.
- **Pricing**: Starter €29/€290, Professional €79/€790, Enterprise €199/€1990 (monthly/yearly). 2 months free trial on all plans.

#### Quality:
- ESLint: 0 errors, 0 warnings
- TypeScript compiles cleanly
- Dev server running without issues
- All text goes through i18n system
