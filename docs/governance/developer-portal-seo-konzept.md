# 🧱 BLOCK W — Developer-Portal SEO-Konzept

## Damit Entwickler CargoBit über Google, GitHub & StackOverflow finden

### Suchmaschinenoptimierung für das CargoBit Developer Portal

Dieses Dokument definiert die SEO-Strategie für das CargoBit Developer Portal, um maximale Sichtbarkeit bei Entwicklern zu gewährleisten.

---

## 1. SEO-Ziele

### 1.1 Primäre SEO-Ziele

| Ziel | Beschreibung | Ziel-Monat |
|------|--------------|------------|
| **Organic Traffic** | 50% der Portal-Besucher über organische Suche | Monat 6 |
| **Keyword Rankings** | Top 3 für primäre Keywords | Monat 12 |
| **Backlinks** | 100+ qualitativ hochwertige Backlinks | Monat 12 |
| **Domain Authority** | DA > 50 | Monat 12 |

### 1.2 Ziel-Keywords

#### High-Intent Keywords (Transaktion)

| Keyword | Suchvolumen | Schwierigkeit | Priorität |
|---------|-------------|---------------|-----------|
| payment webhook integration | 2,400 | Mittel | Hoch |
| stripe webhook signature validation | 1,900 | Niedrig | Hoch |
| idempotency key example | 1,200 | Niedrig | Hoch |
| payment api documentation | 3,100 | Hoch | Mittel |
| webhook retry strategy | 880 | Niedrig | Hoch |

#### Informational Keywords (Awareness)

| Keyword | Suchvolumen | Schwierigkeit | Priorität |
|---------|-------------|---------------|-----------|
| what is webhook signature | 1,600 | Niedrig | Mittel |
| how to implement idempotency | 720 | Niedrig | Mittel |
| deterministic pipeline | 390 | Niedrig | Mittel |
| payment gateway integration guide | 2,200 | Mittel | Hoch |

#### Long-Tail Keywords

| Keyword | Suchvolumen | Schwierigkeit |
|---------|-------------|---------------|
| how to test stripe webhooks locally | 480 | Niedrig |
| payment integration best practices | 320 | Niedrig |
| webhook signature verification node.js | 260 | Niedrig |
| handle duplicate webhook deliveries | 170 | Niedrig |

---

## 2. Technische SEO

### 2.1 Core Web Vitals

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         Core Web Vitals Targets                           │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│   Metrik              Ziel        SEO Impact                              │
│   ─────────────────── ─────────── ────────────────────                   │
│                                                                           │
│   LCP (Largest        < 1.5s      Ranking Factor (High)                  │
│   Contentful Paint)                                                       │
│                                                                           │
│   FID (First Input    < 100ms     Ranking Factor (High)                  │
│   Delay)                                                                  │
│                                                                           │
│   CLS (Cumulative     < 0.1       Ranking Factor (High)                  │
│   Layout Shift)                                                           │
│                                                                           │
│   TTFB (Time to       < 200ms     Ranking Factor (Medium)                │
│   First Byte)                                                             │
│                                                                           │
│   INP (Interaction    < 200ms     Ranking Factor (Medium)                │
│   to Next Paint)                                                          │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Seitenstruktur

**URL-Struktur:**

```
https://cargobit.dev/docs/payments/create-payment
https://cargobit.dev/docs/webhooks/signature-validation
https://cargobit.dev/docs/api-reference/payments
https://cargobit.dev/docs/guides/payment-integration
```

**Meta-Tags:**

```html
<!-- Primary Meta Tags -->
<title>Create Payment | CargoBit API Documentation</title>
<meta name="title" content="Create Payment | CargoBit API Documentation">
<meta name="description" content="Learn how to create payments using the CargoBit Payments API. Includes code examples, parameter documentation, and error handling.">

<!-- Open Graph / Facebook -->
<meta property="og:type" content="website">
<meta property="og:url" content="https://cargobit.dev/docs/payments/create-payment">
<meta property="og:title" content="Create Payment | CargoBit API Documentation">
<meta property="og:description" content="Learn how to create payments using the CargoBit Payments API.">
<meta property="og:image" content="https://cargobit.dev/images/og/create-payment.png">

<!-- Twitter -->
<meta property="twitter:card" content="summary_large_image">
<meta property="twitter:url" content="https://cargobit.dev/docs/payments/create-payment">
<meta property="twitter:title" content="Create Payment | CargoBit API Documentation">
<meta property="twitter:description" content="Learn how to create payments using the CargoBit Payments API.">
<meta property="twitter:image" content="https://cargobit.dev/images/og/create-payment.png">
```

### 2.3 Structured Data (JSON-LD)

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "TechArticle",
  "headline": "Create Payment API Documentation",
  "description": "Complete guide to creating payments with CargoBit API",
  "author": {
    "@type": "Organization",
    "name": "CargoBit"
  },
  "publisher": {
    "@type": "Organization",
    "name": "CargoBit",
    "logo": {
      "@type": "ImageObject",
      "url": "https://cargobit.dev/logo.png"
    }
  },
  "datePublished": "2024-01-15",
  "dateModified": "2024-01-20",
  "mainEntityOfPage": {
    "@type": "WebPage",
    "@id": "https://cargobit.dev/docs/payments/create-payment"
  }
}
</script>

<!-- FAQ Schema -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "How do I create a payment with CargoBit?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Use the POST /v1/payments endpoint with amount, currency, and customer parameters."
      }
    },
    {
      "@type": "Question",
      "name": "What currencies does CargoBit support?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "CargoBit supports EUR, USD, GBP, and 50+ additional currencies."
      }
    }
  ]
}
</script>

<!-- HowTo Schema -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "HowTo",
  "name": "How to Create a Payment with CargoBit API",
  "step": [
    {
      "@type": "HowToStep",
      "name": "Get API Key",
      "text": "Generate an API key from the CargoBit Dashboard"
    },
    {
      "@type": "HowToStep",
      "name": "Create Request",
      "text": "Send a POST request to /v1/payments with your payment details"
    },
    {
      "@type": "HowToStep",
      "name": "Handle Response",
      "text": "Process the payment response and handle any errors"
    }
  ]
}
</script>
```

### 2.4 Sitemap

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://cargobit.dev/docs</loc>
    <lastmod>2024-01-20</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://cargobit.dev/docs/payments/create-payment</loc>
    <lastmod>2024-01-20</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://cargobit.dev/docs/webhooks/signature-validation</loc>
    <lastmod>2024-01-18</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>
</urlset>
```

---

## 3. Content-SEO-Strategie

### 3.1 Keyword-Optimierte Dokumentation

**On-Page Optimierung:**

| Element | Optimierung |
|---------|-------------|
| **Title Tag** | [Primary Keyword] \| CargoBit API Documentation |
| **H1** | Enthält Primary Keyword |
| **Meta Description** | 150-160 Zeichen, enthält Keyword |
| **First Paragraph** | Enthält Keyword innerhalb der ersten 100 Wörter |
| **H2/H3** | Enthält Variationen und verwandte Keywords |
| **Code Examples** | Enthält Keyword in Kommentaren |

**Beispiel-Optimierung:**

```markdown
# Create Payment | CargoBit Payments API

Learn how to create payments using the CargoBit Payments API. 
This guide covers the create payment endpoint with examples in 
JavaScript, Python, and curl.

## Quick Start

Create your first payment with just a few lines of code:

```javascript
// Create a payment with the CargoBit Payments API
const payment = await cargobit.payments.create({
  amount: 1000,
  currency: 'eur'
});
```

## Payment Creation Parameters

| Parameter | Description |
|-----------|-------------|
| `amount` | Payment amount in cents |
| `currency` | Three-letter currency code |
```

### 3.2 Content-Cluster

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         Content Cluster Strategy                          │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│   Cluster 1: Payments                                                    │
│   ──────────────────                                                     │
│   Pillar: /docs/payments (Payment API Overview)                         │
│   ├── /docs/payments/create-payment                                     │
│   ├── /docs/payments/list-payments                                      │
│   ├── /docs/payments/retrieve-payment                                   │
│   ├── /docs/payments/refund-payment                                     │
│   └── /docs/payments/payment-errors                                     │
│                                                                           │
│   Cluster 2: Webhooks                                                    │
│   ──────────────────                                                     │
│   Pillar: /docs/webhooks (Webhook Integration Guide)                    │
│   ├── /docs/webhooks/signature-validation                               │
│   ├── /docs/webhooks/retry-strategy                                     │
│   ├── /docs/webhooks/debugging                                          │
│   ├── /docs/webhooks/event-types                                        │
│   └── /docs/webhooks/best-practices                                     │
│                                                                           │
│   Cluster 3: Security                                                    │
│   ──────────────────                                                     │
│   Pillar: /docs/security (API Security Guide)                           │
│   ├── /docs/security/authentication                                     │
│   ├── /docs/security/api-keys                                           │
│   ├── /docs/security/idempotency                                        │
│   └── /docs/security/rate-limiting                                      │
│                                                                           │
│   Cluster 4: Integration                                                 │
│   ──────────────────                                                     │
│   Pillar: /docs/integration (Integration Guide)                         │
│   ├── /docs/integration/quick-start                                     │
│   ├── /docs/integration/sandbox                                         │
│   ├── /docs/integration/production                                      │
│   └── /docs/integration/troubleshooting                                 │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

### 3.3 Interne Verlinkung

**Verlinkungs-Regeln:**

| Regel | Beschreibung |
|-------|--------------|
| **Jede Seite** | Mindestens 3-5 interne Links |
| **Pillar Pages** | Links zu allen Cluster-Seiten |
| **Cluster Pages** | Link zurück zur Pillar Page |
| **Related Content** | "Verwandte Themen"-Sektion am Ende jeder Seite |
| **Contextual Links** | Links im Fließtext zu verwandten Themen |

**Beispiel:**

```markdown
## Related Topics

- [Webhook Signature Validation](/docs/webhooks/signature-validation) — 
  Learn how to verify webhook signatures
- [Payment Errors](/docs/payments/payment-errors) — 
  Common payment errors and solutions
- [API Authentication](/docs/security/authentication) — 
  How to authenticate API requests
```

---

## 4. Off-Page SEO

### 4.1 Backlink-Strategie

**Ziel-Quellen:**

| Quelle | Strategie | Priorität |
|--------|-----------|-----------|
| **GitHub** | README-Links, Awesome-Listen | Hoch |
| **StackOverflow** | Antworten mit Links zur Doku | Hoch |
| **Dev.to / Medium** | Technical Blog Posts | Mittel |
| **Reddit** | r/programming, r/webdev | Niedrig |
| **Partner-Dokus** | Co-Marketing, Integration-Guides | Hoch |

**GitHub README Template:**

```markdown
## CargoBit Integration

[Your App] integrates with CargoBit for payment processing.

### Documentation

- [Payment API](https://cargobit.dev/docs/payments)
- [Webhook Integration](https://cargobit.dev/docs/webhooks)
- [API Reference](https://cargobit.dev/docs/api-reference)
```

### 4.2 Developer Communities

```
┌──────────────────────────────────────────────────────────────────────────┐
│                      Developer Community Strategy                         │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│   StackOverflow:                                                         │
│   ──────────────                                                         │
│   • Tags: cargobit, cargobit-api, cargobit-webhook                      │
│   • 50+ Antworten mit Links zur Doku pro Monat                          │
│   • Eigene Tag-Seite erstellen                                          │
│                                                                           │
│   GitHub:                                                                │
│   ────────                                                               │
│   • cargo-bit/integration-samples Repository                            │
│   • Awesome-CargoBit Liste                                               │
│   • GitHub Discussions aktivieren                                        │
│                                                                           │
│   Dev.to:                                                                │
│   ────────                                                               │
│   • Monatliche Technical Posts                                           │
│   • Series: "Building with CargoBit"                                    │
│   • Cross-post von Blog-Artikeln                                        │
│                                                                           │
│   Discord/Slack:                                                         │
│   ──────────────                                                         │
│   • Offizieller Community Server                                        │
│   • Support-Kanal mit Bot, der zur Doku linkt                           │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 5. SEO-Monitoring

### 5.1 Key Metrics Dashboard

```
┌──────────────────────────────────────────────────────────────────────────┐
│                            SEO Dashboard                                  │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│   Organic Traffic                                                        │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │                                                                  │   │
│   │  50,000 ─┬─────────────────────────────────────────────        │   │
│   │          │                           ╭───────                  │   │
│   │  25,000 ─┤                     ╭─────╯                        │   │
│   │          │               ╭─────╯                              │   │
│   │       0 ─┼─────┬─────┬─────┬─────┬─────┬─────                 │   │
│   │          Jan   Feb   Mar   Apr   May   Jun                    │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                                                           │
│   ─────────────────────────────────────────────────────────────────────── │
│                                                                           │
│   Keyword Rankings                                                       │
│   ┌─────────────────────────────────────────────────────────────────────┐│
│   │ Keyword                          Position    Change    Volume      ││
│   ├─────────────────────────────────────────────────────────────────────┤│
│   │ payment webhook integration         3          ↑2       2,400     ││
│   │ stripe webhook signature            5          ↑1       1,900     ││
│   │ idempotency key example             2          →        1,200     ││
│   │ payment api documentation           8          ↓2       3,100     ││
│   │ webhook retry strategy              4          ↑3         880     ││
│   └─────────────────────────────────────────────────────────────────────┘│
│                                                                           │
│   ─────────────────────────────────────────────────────────────────────── │
│                                                                           │
│   Backlinks                         Domain Authority: 52                 │
│   ┌─────────────────────────────────────────────────────────────────────┐│
│   │ Total Backlinks: 1,234           Referring Domains: 156             ││
│   │                                                                      ││
│   │ New Backlinks (30d): 45          Lost Backlinks (30d): 12          ││
│   └─────────────────────────────────────────────────────────────────────┘│
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

### 5.2 SEO-Checkliste

**Wöchentlich:**
- [ ] Keyword-Rankings prüfen
- [ ] Neue Backlinks analysieren
- [ ] 404-Fehler beheben
- [ ] Core Web Vitals prüfen

**Monatlich:**
- [ ] Content-Gap-Analyse
- [ ] Wettbewerber-Analyse
- [ ] Organic Traffic Report
- [ ] Technical SEO Audit

**Quartalsweise:**
- [ ] Vollständiges SEO-Audit
- [ ] Content-Cluster-Erweiterung
- [ ] Backlink-Strategie anpassen

---

## 6. SEO-Tools

### 6.1 Empfohlene Tools

| Tool | Verwendung | Priorität |
|------|-----------|-----------|
| **Google Search Console** | Indexierung, Performance | Erforderlich |
| **Google Analytics 4** | Traffic, Conversions | Erforderlich |
| **Ahrefs / SEMrush** | Keyword-Recherche, Backlinks | Empfohlen |
| **Screaming Frog** | Technical SEO Audits | Empfohlen |
| **Lighthouse** | Core Web Vitals | Erforderlich |
| **Schema Validator** | Structured Data Testing | Erforderlich |

### 6.2 Integration

```javascript
// Google Analytics 4
<gtag.js>
  gtag('event', 'page_view', {
    page_title: document.title,
    page_location: window.location.href,
    content_group: 'API Documentation'
  });

// Search Console Verification
<meta name="google-site-verification" content="your-verification-code" />
```

---

## 7. International SEO

### 7.1 Hreflang-Tags

```html
<link rel="alternate" hreflang="en" href="https://cargobit.dev/docs/payments" />
<link rel="alternate" hreflang="de" href="https://cargobit.dev/de/docs/payments" />
<link rel="alternate" hreflang="fr" href="https://cargobit.dev/fr/docs/payments" />
<link rel="alternate" hreflang="x-default" href="https://cargobit.dev/docs/payments" />
```

### 7.2 Lokalisierte Keywords

| Sprache | Primary Keyword | Suchvolumen |
|---------|-----------------|-------------|
| English | payment webhook integration | 2,400 |
| German | payment webhook integration | 320 |
| French | intégration webhook paiement | 180 |
| Spanish | integración webhook pagos | 210 |

---

*Dieses SEO-Konzept gewährleistet maximale Sichtbarkeit des CargoBit Developer Portals bei Entwicklern weltweit.*
