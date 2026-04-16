# CargoBit Partner Portal - Test Credentials

## 🔐 API-Keys für das Partner-Portal

### Versicherungs-Partner (Allianz Transport)
```
API Key: cb_partner_iFmolezvoio3odlrS-PVF5Ilyv-0Wecdvv6l_qlJa64
```
- **Typ**: INSURANCE
- **Scopes**: insurance:read, insurance:write, billing:read
- **Produkte**: Standard Cargo, Premium Cargo, ADR Coverage

### Werbepartner (Spedition Schmidt)
```
API Key: cb_partner_O4bcIUEOH-aV0AQnS7kCa3IA8djyuG2v82fHkIYFzhY
```
- **Typ**: ADS
- **Scopes**: ads:read, ads:write, billing:read
- **Kampagnen**: Q1 Branding Campaign, ADR Special

## 📍 API-Endpunkte

### Auth
- `POST /api/partner/auth/login` - Partner-Login (Header: x-api-key)

### Dashboard
- `GET /api/partner/dashboard` - Partner Dashboard Daten

### Versicherungs-Partner
- `GET /api/partner/insurance/products` - Produkte auflisten
- `POST /api/partner/insurance/products` - Produkt erstellen
- `GET /api/partner/insurance/products/[id]` - Produkt abrufen
- `PUT /api/partner/insurance/products/[id]` - Produkt aktualisieren
- `DELETE /api/partner/insurance/products/[id]` - Produkt deaktivieren
- `GET /api/partner/insurance/policies` - Policen auflisten

### Werbepartner
- `GET /api/partner/ads/campaigns` - Kampagnen auflisten
- `POST /api/partner/ads/campaigns` - Kampagne erstellen
- `GET /api/partner/ads/campaigns/[id]` - Kampagne abrufen
- `PUT /api/partner/ads/campaigns/[id]` - Kampagne aktualisieren
- `DELETE /api/partner/ads/campaigns/[id]` - Kampagne löschen
- `GET /api/partner/ads/campaigns/[id]/performance` - Performance-Daten

### Abrechnung
- `GET /api/partner/billing` - Rechnungen auflisten

### Onboarding
- `POST /api/partner/onboarding` - Partner registrieren (öffentlich)
- `PUT /api/partner/onboarding` - Admin: Partner genehmigen/ablehnen
- `GET /api/partner/onboarding` - Admin: Ausstehende Partner auflisten

## 🔒 Security Scopes

| Scope | Beschreibung |
|-------|--------------|
| `insurance:read` | Versicherungsprodukte lesen |
| `insurance:write` | Versicherungsprodukte erstellen/bearbeiten |
| `ads:read` | Werbekampagnen lesen |
| `ads:write` | Werbekampagnen erstellen/bearbeiten |
| `billing:read` | Rechnungen einsehen |

## 📊 Test-Daten Übersicht

### Versicherungs-Partner
- 3 aktive Produkte
- 2 Policen
- 2 Rechnungen (1 offen, 1 bezahlt)

### Werbepartner
- 2 Kampagnen (1 aktiv, 1 Draft)
- 1 Rechnung (bezahlt)

---
*Erstellt am 17.04.2026*
