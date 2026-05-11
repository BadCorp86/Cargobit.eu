# CargoBit Developer Portal Figma-Design Spezifikation

**Dokument-Typ:** UI-Design-Spezifikation  
**Version:** 1.0.0  
**Status:** Final  
**Letzte Aktualisierung:** 2024-01-15  
**Verantwortlich:** Design Team  

---

## Inhaltsverzeichnis

1. [Design-System-Grundlagen](#1-design-system-grundlagen)
2. [Home Page](#2-home-page)
3. [Getting Started Page](#3-getting-started-page)
4. [API Reference Page](#4-api-reference-page)
5. [API Explorer Tool](#5-api-explorer-tool)
6. [Webhook Simulator](#6-webhook-simulator)
7. [Documentation Page](#7-documentation-page)
8. [Dashboard Page](#8-dashboard-page)
9. [Search Results Page](#9-search-results-page)
10. [Settings Page](#10-settings-page)
11. [Mobile Screens](#11-mobile-screens)
12. [Komponenten-States](#12-komponenten-states)

---

## 1. Design-System-Grundlagen

### 1.1 Frame-Konfiguration

```
Desktop Frame:
- Width: 1440px
- Height: Auto (content-based)
- Layout Grid: 12 columns, 24px gutter
- Margin: 24px left/right

Tablet Frame:
- Width: 768px
- Height: Auto
- Layout Grid: 8 columns, 16px gutter
- Margin: 16px left/right

Mobile Frame:
- Width: 375px
- Height: Auto
- Layout Grid: 4 columns, 16px gutter
- Margin: 16px left/right
```

### 1.2 Color Tokens

```css
/* Primary Colors */
--color-primary-50: #E6F0FF;
--color-primary-100: #CCE0FF;
--color-primary-200: #99C2FF;
--color-primary-300: #66A3FF;
--color-primary-400: #3385FF;
--color-primary-500: #0057FF;  /* Main Primary */
--color-primary-600: #0046CC;
--color-primary-700: #003499;
--color-primary-800: #002366;
--color-primary-900: #001133;

/* Navy Colors */
--color-navy-50: #E8ECF1;
--color-navy-100: #D1D9E3;
--color-navy-200: #A3B3C7;
--color-navy-300: #758DAB;
--color-navy-400: #47678F;
--color-navy-500: #0A1A2F;  /* Main Navy */
--color-navy-600: #081526;
--color-navy-700: #06101C;
--color-navy-800: #040B13;
--color-navy-900: #020509;

/* Teal Colors */
--color-teal-50: #E6FAF7;
--color-teal-100: #CCF5EF;
--color-teal-200: #99EBDF;
--color-teal-300: #66E1CF;
--color-teal-400: #33D7BF;
--color-teal-500: #00C2A8;  /* Main Teal */
--color-teal-600: #009B86;
--color-teal-700: #007465;
--color-teal-800: #004D43;
--color-teal-900: #002622;
```

### 1.3 Typography Tokens

```css
/* Font Families */
--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
--font-mono: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;

/* Font Sizes */
--font-size-xs: 12px;    /* 0.75rem */
--font-size-sm: 14px;    /* 0.875rem */
--font-size-base: 16px;  /* 1rem */
--font-size-lg: 18px;    /* 1.125rem */
--font-size-xl: 20px;    /* 1.25rem */
--font-size-2xl: 24px;   /* 1.5rem */
--font-size-3xl: 32px;   /* 2rem */
--font-size-4xl: 40px;   /* 2.5rem */
--font-size-5xl: 48px;   /* 3rem */

/* Font Weights */
--font-weight-normal: 400;
--font-weight-medium: 500;
--font-weight-semibold: 600;
--font-weight-bold: 700;

/* Line Heights */
--line-height-tight: 1.2;
--line-height-snug: 1.4;
--line-height-normal: 1.6;
--line-height-relaxed: 1.8;
```

### 1.4 Spacing Tokens

```css
--space-0: 0;
--space-1: 4px;    /* 0.25rem */
--space-2: 8px;    /* 0.5rem */
--space-3: 12px;   /* 0.75rem */
--space-4: 16px;   /* 1rem */
--space-5: 20px;   /* 1.25rem */
--space-6: 24px;   /* 1.5rem */
--space-8: 32px;   /* 2rem */
--space-10: 40px;  /* 2.5rem */
--space-12: 48px;  /* 3rem */
--space-16: 64px;  /* 4rem */
--space-20: 80px;  /* 5rem */
--space-24: 96px;  /* 6rem */
```

### 1.5 Border Radius Tokens

```css
--radius-none: 0;
--radius-sm: 4px;
--radius-md: 8px;
--radius-lg: 12px;
--radius-xl: 16px;
--radius-2xl: 24px;
--radius-full: 9999px;
```

---

## 2. Home Page

### 2.1 Frame-Struktur

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ Frame: Home Page Desktop                                                        │
│ Width: 1440px                                                                   │
│ Height: Auto                                                                    │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌───────────────────────────────────────────────────────────────────────────┐ │
│  │ HEADER                                                                    │ │
│  │ Height: 80px                                                              │ │
│  │ Background: #FFFFFF                                                       │ │
│  │ Border Bottom: 1px solid #E5E5EA                                          │ │
│  │                                                                           │ │
│  │ ┌─────────┐                                              ┌─────────────┐│ │
│  │ │ LOGO    │  Nav Items: Getting Started | API | Tools   │   CTA       ││ │
│  │ │ 120x40  │                                              │ Get API Key ││ │
│  │ └─────────┘                                              └─────────────┘│ │
│  └───────────────────────────────────────────────────────────────────────────┘ │
│                                                                                 │
│  ┌───────────────────────────────────────────────────────────────────────────┐ │
│  │ HERO SECTION                                                              │ │
│  │ Height: 600px                                                             │ │
│  │ Background: Linear Gradient (#0A1A2F → #0057FF)                          │ │
│  │                                                                           │ │
│  │ ┌─────────────────────────────┐  ┌─────────────────────────────────────┐ │ │
│  │ │ TEXT CONTENT               │  │ ILLUSTRATION PLACEHOLDER            │ │ │
│  │ │                             │  │                                     │ │ │
│  │ │ H1: "CargoBit Developer    │  │ [Abstract geometric pattern         │ │ │
│  │ │ Portal"                     │  │  representing payment flows]        │ │ │
│  │ │                             │  │                                     │ │ │
│  │ │ H2: "Integrate payments in │  │                                     │ │ │
│  │ │ minutes with enterprise-   │  │                                     │ │ │
│  │ │ grade infrastructure."     │  │                                     │ │ │
│  │ │                             │  │                                     │ │ │
│  │ │ [Get Started] [Explore →]  │  │                                     │ │ │
│  │ └─────────────────────────────┘  └─────────────────────────────────────┘ │ │
│  └───────────────────────────────────────────────────────────────────────────┘ │
│                                                                                 │
│  ┌───────────────────────────────────────────────────────────────────────────┐ │
│  │ QUICK ACCESS SECTION                                                      │ │
│  │ Height: Auto                                                              │ │
│  │ Padding: 80px vertical                                                    │ │
│  │ Background: #FFFFFF                                                       │ │
│  │                                                                           │ │
│  │ Title: "Start Building in Minutes"                                        │ │
│  │ Subtitle: "Everything you need to integrate CargoBit"                     │ │
│  │                                                                           │ │
│  │ ┌───────────────┐  ┌───────────────┐  ┌───────────────┐                  │ │
│  │ │ CARD 1        │  │ CARD 2        │  │ CARD 3        │                  │ │
│  │ │               │  │               │  │               │                  │ │
│  │ │ Icon: 📚      │  │ Icon: 🔗      │  │ Icon: 🔑      │                  │ │
│  │ │               │  │               │  │               │                  │ │
│  │ │ "First API    │  │ "Webhook      │  │ "Sandbox      │                  │ │
│  │ │  Call"        │  │  Setup"       │  │  Keys"        │                  │ │
│  │ │               │  │               │  │               │                  │ │
│  │ │ Description   │  │ Description   │  │ Description   │                  │ │
│  │ │               │  │               │  │               │                  │ │
│  │ │ [Open →]      │  │ [Open →]      │  │ [Generate →]  │                  │ │
│  │ └───────────────┘  └───────────────┘  └───────────────┘                  │ │
│  └───────────────────────────────────────────────────────────────────────────┘ │
│                                                                                 │
│  ┌───────────────────────────────────────────────────────────────────────────┐ │
│  │ FEATURES SECTION                                                          │ │
│  │ Height: Auto                                                              │ │
│  │ Padding: 80px vertical                                                    │ │
│  │ Background: #F4F6F8                                                       │ │
│  │                                                                           │ │
│  │ Title: "Why CargoBit?"                                                    │ │
│  │                                                                           │ │
│  │ Grid: 3 columns, 24px gap                                                 │ │
│  │ Features: Fast, Secure, Reliable, Tools, Docs, Support                    │ │
│  └───────────────────────────────────────────────────────────────────────────┘ │
│                                                                                 │
│  ┌───────────────────────────────────────────────────────────────────────────┐ │
│  │ LATEST UPDATES SECTION                                                    │ │
│  │ Height: Auto                                                              │ │
│  │ Padding: 80px vertical                                                    │ │
│  │ Background: #FFFFFF                                                       │ │
│  │                                                                           │ │
│  │ Title: "Latest Updates"                              [View All →]        │ │
│  │                                                                           │ │
│  │ Update List Items (3):                                                    │ │
│  │ - API v2.1 Released                                                       │ │
│  │ - Webhook Retry Logic Enhanced                                            │ │
│  │ - Ledger Consistency Checker Added                                        │ │
│  └───────────────────────────────────────────────────────────────────────────┘ │
│                                                                                 │
│  ┌───────────────────────────────────────────────────────────────────────────┐ │
│  │ FOOTER                                                                    │ │
│  │ Height: Auto                                                              │ │
│  │ Padding: 48px vertical                                                    │ │
│  │ Background: #0A1A2F                                                       │ │
│  │                                                                           │ │
│  │ Grid: 4 columns (Product, Resources, Company, Legal)                      │ │
│  │ Copyright: "© 2024 CargoBit. All rights reserved."                        │ │
│  └───────────────────────────────────────────────────────────────────────────┘ │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Komponenten-Spezifikation

#### Header Component

```yaml
Component: Header
Frame: Auto Layout, Horizontal
Width: 1440px (fill container)
Height: 80px
Padding: 0 24px
Background: #FFFFFF
Border: 1px bottom #E5E5EA
Position: Sticky, Top: 0

Children:
  - Logo:
      Width: 120px
      Height: 40px
      Content: SVG Logo
      
  - Navigation:
      Layout: Horizontal
      Gap: 32px
      Items:
        - Getting Started
        - API Reference
        - Tools
        - Guides
        - Architecture
        - Security
      
  - Right Actions:
      Layout: Horizontal
      Gap: 16px
      Items:
        - Search Button
        - Login Button
        - Get API Key (Primary Button)
```

#### Hero Section Component

```yaml
Component: HeroSection
Frame: Auto Layout, Horizontal
Width: 1440px
Height: 600px
Padding: 80px 24px
Background: Linear Gradient (180deg, #0A1A2F 0%, #0057FF 100%)

Children:
  - TextContent:
      Width: 600px
      Gap: 24px
      
      H1:
        Font: Inter, 48px, Bold
        Color: #FFFFFF
        Content: "CargoBit Developer Portal"
        
      H2:
        Font: Inter, 24px, Regular
        Color: #E5E5EA
        Content: "Integrate payments in minutes with enterprise-grade infrastructure."
        
      CTA_Buttons:
        Layout: Horizontal
        Gap: 16px
        
        Primary_Button:
          Text: "Get Started"
          Style: Primary
          Icon: Arrow Right
          
        Secondary_Button:
          Text: "Explore APIs"
          Style: Ghost (White)
          
  - Illustration:
      Width: 500px
      Height: 400px
      Content: Abstract geometric pattern
```

#### Quick Access Card Component

```yaml
Component: QuickAccessCard
Frame: Auto Layout, Vertical
Width: 400px (flex)
Padding: 24px
Background: #FFFFFF
Border: 1px #E5E5EA
Radius: 12px
Effect: Hover Shadow

Children:
  - Icon:
      Size: 48px
      Color: #0057FF
      
  - Title:
      Font: Inter, 20px, Semibold
      Color: #1C1C1E
      Margin Top: 16px
      
  - Description:
      Font: Inter, 14px, Regular
      Color: #636366
      Margin Top: 8px
      
  - CTA:
      Layout: Horizontal
      Gap: 8px
      Font: Inter, 14px, Medium
      Color: #0057FF
      Margin Top: 16px
```

---

## 3. Getting Started Page

### 3.1 Frame-Struktur

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ Frame: Getting Started Page                                                     │
│ Width: 1440px                                                                   │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│ HEADER (siehe Home Page)                                                        │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│ PAGE HEADER                                                                     │
│ Height: 200px                                                                   │
│ Background: #F4F6F8                                                             │
│                                                                                 │
│ Breadcrumb: Home > Getting Started                                              │
│ Title: "Getting Started"                                                        │
│ Subtitle: "Learn how to integrate CargoBit into your application"              │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│ PROGRESS STEPPER                                                                │
│ Height: 100px                                                                   │
│ Padding: 24px                                                                   │
│                                                                                 │
│ Step 1 ───── Step 2 ───── Step 3 ───── Step 4                                  │
│ [●]           [○]          [○]          [○]                                    │
│ API Keys      First Call   Webhooks     Go Live                                │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│ MAIN CONTENT                                                                    │
│ Layout: Two Column                                                              │
│                                                                                 │
│ ┌────────────────────────────┐  ┌────────────────────────────────────────────┐ │
│ │ LEFT SIDEBAR (280px)       │  │ CONTENT AREA                                │ │
│ │                            │  │                                             │ │
│ │ - Overview                 │  │ ┌─────────────────────────────────────────┐│ │
│ │ - Quickstart               │  │ │ STEP 1: GET API KEYS                    ││ │
│ │ - Sandbox Setup            │  │ │                                         ││ │
│ │ - API Keys                 │  │ │ Before you can make API requests,       ││ │
│ │ - First API Call           │  │ │ you need to generate API keys.          ││ │
│ │ - First Webhook            │  │ │                                         ││ │
│ │                            │  │ │ ┌─────────────────────────────────────┐ ││ │
│ │                            │  │ │ │ TIP                                 │ ││ │
│ │                            │  │ │ │ Use sandbox keys for testing.       │ ││ │
│ │                            │  │ │ └─────────────────────────────────────┘ ││ │
│ │                            │  │ │                                         ││ │
│ │                            │  │ │ 1. Navigate to Dashboard                ││ │
│ │                            │  │ │ 2. Click "Generate API Key"             ││ │
│ │                            │  │ │ 3. Copy your key                        ││ │
│ │                            │  │ │                                         ││ │
│ │                            │  │ │ ┌─────────────────────────────────────┐ ││ │
│ │                            │  │ │ │ Code Example                        │ ││ │
│ │                            │  │ │ │ [curl] [JS] [Python]                │ ││ │
│ │                            │  │ │ │                                     │ ││ │
│ │                            │  │ │ │ curl -X POST ...                    │ ││ │
│ │                            │  │ │ └─────────────────────────────────────┘ ││ │
│ │                            │  │ │                                         ││ │
│ │                            │  │ │ [← Previous]            [Next →]        ││ │
│ │                            │  │ └─────────────────────────────────────────┘│ │
│ └────────────────────────────┘  └────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Progress Stepper Component

```yaml
Component: ProgressStepper
Frame: Auto Layout, Horizontal
Width: 100%
Height: 100px
Padding: 24px
Background: #FFFFFF
Border: 1px bottom #E5E5EA

Children (4 Steps):
  - Step:
      Layout: Vertical
      Align: Center
      
      Circle:
        Size: 32px
        Border: 2px #0057FF
        Background: #0057FF (active) or #FFFFFF (inactive)
        Content: Number or Checkmark
        
      Connector:
        Width: 100px
        Height: 2px
        Background: #0057FF (completed) or #E5E5EA (pending)
        
      Label:
        Font: Inter, 14px, Medium
        Color: #1C1C1E (active) or #636366 (inactive)

States:
  - Active:
      Circle: Filled #0057FF
      Label: Bold, Primary Color
      
  - Completed:
      Circle: Filled #00C2A8, Icon: Checkmark
      Connector: Filled #00C2A8
      
  - Pending:
      Circle: Border only #E5E5EA
      Label: Grey
```

---

## 4. API Reference Page

### 4.1 Frame-Struktur

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ Frame: API Reference Page                                                       │
│ Width: 1440px                                                                   │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│ HEADER (siehe Home Page)                                                        │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│ THREE COLUMN LAYOUT                                                             │
│                                                                                 │
│ ┌─────────────┬────────────────────────────────────────────┬───────────────────┐│
│ │ LEFT        │ MAIN CONTENT                              │ RIGHT SIDEBAR     ││
│ │ SIDEBAR     │                                            │ (240px)           ││
│ │ (280px)     │                                            │                   ││
│ │             │  ┌────────────────────────────────────────┐│                   ││
│ │ API         │  │ ENDPOINT HEADER                        ││  ON THIS PAGE     ││
│ │ Reference   │  │ ──────────────────                     ││  ────────────     ││
│ │ ──────────  │  │                                        ││                   ││
│ │             │  │ ┌──────────┐                           ││  ○ Overview       ││
│ │ ▼ Payments  │  │ │ POST     │  /payments                ││  ○ Request        ││
│ │   ● POST /p │  │ └──────────┘                           ││  ○ Parameters     ││
│ │   ○ GET /p  │  │                                        ││  ○ Response       ││
│ │   ○ Errors  │  │ Create a new payment.                  ││  ○ Errors         ││
│ │             │  │                                        ││                   ││
│ │ ▶ Wallets   │  │ Security: API Key | Rate: 100/min     ││  TRY IT           ││
│ │             │  │                                        ││  ──────           ││
│ │ ▶ Webhooks  │  └────────────────────────────────────────┘│                   ││
│ │             │                                            │  Environment:     ││
│ │ ▶ Errors    │  ┌────────────────────────────────────────┐│  [●] Sandbox      ││
│ │             │  │ REQUEST BODY                           ││  [ ] Production   ││
│ │ ▶ Common    │  │ ────────────                           ││                   ││
│ │             │  │                                        ││  API Key:         ││
│ │             │  │ ┌────────────────────────────────────┐││  ••••••••abc      ││
│ │             │  │ │ Parameter │ Type    │ Required    │││                   ││
│ │             │  │ ├───────────┼─────────┼─────────────┤││  ┌──────────────┐ ││
│ │             │  │ │ amount    │ number  │ Yes         │││  │ Send Request │ ││
│ │             │  │ │ currency  │ string  │ Yes         │││  └──────────────┘ ││
│ │             │  │ └────────────────────────────────────┘││                   ││
│ │             │  └────────────────────────────────────────┘│                   ││
│ │             │                                            │                   ││
│ │             │  ┌────────────────────────────────────────┐│                   ││
│ │             │  │ CODE EXAMPLES                          ││                   ││
│ │             │  │ ──────────────                         ││                   ││
│ │             │  │                                        ││                   ││
│ │             │  │ [cURL] [JavaScript] [Python] [Go]     ││                   ││
│ │             │  │                                        ││                   ││
│ │             │  │ ┌────────────────────────────────────┐││                   ││
│ │             │  │ │ curl -X POST \                     │││                   ││
│ │             │  │ │   -H "Authorization: Bearer ..."   │││                   ││
│ │             │  │ │   -d '{"amount": 1000}'            │││                   ││
│ │             │  │ │                         [Copy]     │││                   ││
│ │             │  │ └────────────────────────────────────┘││                   ││
│ │             │  └────────────────────────────────────────┘│                   ││
│ │             │                                            │                   ││
│ │             │  ┌────────────────────────────────────────┐│                   ││
│ │             │  │ RESPONSE                               ││                   ││
│ │             │  │ ────────                               ││                   ││
│ │             │  │                                        ││                   ││
│ │             │  │ Status: 201 Created                    ││                   ││
│ │             │  │                                        ││                   ││
│ │             │  │ {                                      ││                   ││
│ │             │  │   "id": "pay_abc123",                  ││                   ││
│ │             │  │   "status": "pending"                  ││                   ││
│ │             │  │ }                                      ││                   ││
│ │             │  └────────────────────────────────────────┘│                   ││
│ └─────────────┴────────────────────────────────────────────┴───────────────────┘│
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Endpoint Header Component

```yaml
Component: EndpointHeader
Frame: Auto Layout, Vertical
Padding: 24px
Gap: 16px

Children:
  - MethodBadge:
      Layout: Horizontal
      Gap: 8px
      
      Method:
        Padding: 4px 8px
        Radius: 4px
        Font: JetBrains Mono, 14px, Medium
        
        Colors:
          POST: Background #00C853, Text #FFFFFF
          GET: Background #2196F3, Text #FFFFFF
          PUT: Background #FF9800, Text #FFFFFF
          DELETE: Background #FF3B30, Text #FFFFFF
        
      URL:
        Font: JetBrains Mono, 16px, Medium
        Color: #1C1C1E
        
  - Description:
      Font: Inter, 16px, Regular
      Color: #3A3A3C
      
  - MetaInfo:
      Layout: Horizontal
      Gap: 16px
      
      Items:
        - Security: API Key required
        - Rate Limit: 100 req/min
        - Idempotency: Supported
```

### 4.3 Parameter Table Component

```yaml
Component: ParameterTable
Frame: Auto Layout, Vertical
Width: 100%

Children:
  - Header:
      Layout: Horizontal
      Background: #F4F6F8
      Padding: 12px 16px
      
      Columns:
        - Name (25%)
        - Type (20%)
        - Required (15%)
        - Description (40%)
        
  - Rows:
      Layout: Horizontal
      Border: 1px bottom #E5E5EA
      Padding: 12px 16px
      
      Hover:
        Background: #FAFAFA

Cell Styles:
  Name:
    Font: JetBrains Mono, 14px, Medium
    Color: #0057FF
    
  Type:
    Font: Inter, 14px, Regular
    Color: #636366
    
  Required:
    Badge:
      Yes: Background #FFEBEE, Color #FF3B30
      No: Background #F4F6F8, Color #636366
```

### 4.4 Code Block Component

```yaml
Component: CodeBlock
Frame: Auto Layout, Vertical
Width: 100%
Border: 1px #E5E5EA
Radius: 8px

Children:
  - Header:
      Layout: Horizontal
      Justify: Space Between
      Padding: 12px 16px
      Background: #F4F6F8
      Border: 1px bottom #E5E5EA
      
      Language:
        Font: Inter, 12px, Medium
        Color: #636366
        
      Actions:
        Layout: Horizontal
        Gap: 8px
        
        - Copy Button
        - View Raw
        
  - Content:
      Padding: 16px
      Background: #1C1C1E
      Font: JetBrains Mono, 14px
      Color: #E5E5EA
      Overflow: Horizontal Scroll

Tabs:
  Layout: Horizontal
  Gap: 0
  Border Bottom: 1px #E5E5EA
  
  Tab:
    Padding: 8px 16px
    Font: Inter, 14px, Medium
    
    States:
      Active:
        Color: #0057FF
        Border Bottom: 2px #0057FF
        
      Inactive:
        Color: #636366
        Border Bottom: 2px transparent
        
      Hover:
        Color: #0057FF
```

---

## 5. API Explorer Tool

### 5.1 Frame-Struktur

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ Frame: API Explorer Tool                                                        │
│ Width: 1440px                                                                   │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│ TOOL TABS                                                                       │
│ Height: 48px                                                                    │
│                                                                                 │
│ [API Explorer]  [Webhook Simulator]  [Schema Viewer]  [Event Replay]           │
│   ══════════                                                                    │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│ REQUEST BUILDER                                                                 │
│ Padding: 24px                                                                   │
│ Background: #FFFFFF                                                             │
│ Border: 1px bottom #E5E5EA                                                      │
│                                                                                 │
│ ┌────────────────────────────────────────────────────────────────────────────┐ │
│ │ REQUEST CONFIG                                                        [▶] │ │
│ │                                                                             │ │
│ │ ┌───────────────┐ ┌─────────────────────────┐ ┌────────────────────────┐   │ │
│ │ │ [POST ▼]      │ │ /payments               │ │ Environment:           │   │ │
│ │ └───────────────┘ └─────────────────────────┘ │ [●] Sandbox [ ] Prod   │   │ │
│ │                                                 └────────────────────────┘   │ │
│ │                                                                             │ │
│ │ HEADERS                                              [Add Header]          │ │
│ │ ────────                                                                    │ │
│ │ ┌────────────────────────────────────────────────────────────────────────┐ │ │
│ │ │ Authorization    Bearer •••••••••••••••••••••••               [×]     │ │ │
│ │ │ Content-Type     application/json                              [×]     │ │ │
│ │ └────────────────────────────────────────────────────────────────────────┘ │ │
│ │                                                                             │ │
│ │ BODY                                                   [JSON] [Form]      │ │
│ │ ────                                                                        │ │
│ │ ┌────────────────────────────────────────────────────────────────────────┐ │ │
│ │ │ {                                                                      │ │ │
│ │ │   "amount": 1000,                                                      │ │ │
│ │ │   "currency": "EUR",                                                   │ │ │
│ │ │   "description": "Test payment"                                        │ │ │
│ │ │ }                                                                      │ │ │
│ │ │                                                                        │ │ │
│ │ └────────────────────────────────────────────────────────────────────────┘ │ │
│ │                                                                             │ │
│ │ [Beautify]  [Clear]                               [Send Request →]         │ │
│ └────────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│ RESPONSE VIEWER                                                                 │
│ Padding: 24px                                                                   │
│ Background: #F4F6F8                                                             │
│                                                                                 │
│ ┌────────────────────────────────────────────────────────────────────────────┐ │
│ │ RESPONSE                                        Time: 45ms  ID: req_abc   │ │
│ │                                                                             │ │
│ │ Status: 201 Created                                                         │ │
│ │                                                                             │ │
│ │ ┌────────────────────────────────────────────────────────────────────────┐ │ │
│ │ │ {                                                                      │ │ │
│ │ │   "id": "pay_abc123def456",                                            │ │ │
│ │ │   "status": "pending",                                                 │ │ │
│ │ │   "amount": 1000,                                                      │ │ │
│ │ │   "currency": "EUR"                                                    │ │ │
│ │ │ }                                                                      │ │ │
│ │ └────────────────────────────────────────────────────────────────────────┘ │ │
│ │                                                                             │ │
│ │ [Copy Response]  [View in Docs]  [Save to History]                         │ │
│ └────────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Request Builder Component

```yaml
Component: RequestBuilder
Frame: Auto Layout, Vertical
Width: 100%
Padding: 24px
Background: #FFFFFF

Sections:
  - RequestConfig:
      Layout: Horizontal
      Gap: 12px
      
      MethodSelect:
        Width: 120px
        Options: GET, POST, PUT, DELETE
        Style: Dropdown with badge colors
        
      URLInput:
        Width: Fill
        Font: JetBrains Mono, 14px
        Border: 1px #E5E5EA
        
      EnvironmentToggle:
        Layout: Horizontal
        Gap: 8px
        Style: Radio buttons
        
  - Headers:
      Layout: Vertical
      Gap: 8px
      
      HeaderRow:
        Layout: Horizontal
        Gap: 12px
        
        Key: Text Input
        Value: Text Input
        Delete: Icon Button
        
  - Body:
      Layout: Vertical
      
      ModeTabs:
        Options: JSON, Form
      
      Editor:
        Height: 200px
        Font: JetBrains Mono, 14px
        Line Numbers: True
        Syntax Highlighting: True
        
  - Actions:
      Layout: Horizontal
      Justify: Space Between
      
      Left:
        - Beautify (Secondary)
        - Clear (Ghost)
        
      Right:
        - Send Request (Primary with Loading state)
```

---

## 6. Webhook Simulator

### 6.1 Frame-Struktur

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ Frame: Webhook Simulator                                                        │
│ Width: 1440px                                                                   │
│ Layout: Two Column                                                              │
└─────────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────┬──────────────────────────────────────────────┐
│ EVENT BUILDER                    │ DELIVERY LOG                                │
│ Width: 600px                     │ Width: 800px                                │
│ Padding: 24px                    │ Padding: 24px                               │
│ Background: #FFFFFF              │ Background: #F4F6F8                         │
│                                  │                                              │
│ EVENT TYPE                       │ DELIVERY HISTORY                            │
│ ┌──────────────────────────────┐ │ ┌────────────────────────────────────────┐ │
│ │ [payment.created ▼]          │ │ │ ✓ Delivered | 200 OK | 125ms           │ │
│ └──────────────────────────────┘ │ │   2024-01-15 10:30:00                  │ │
│                                  │ │   Event: payment.created                │ │
│ TARGET URL                       │ │   URL: https://your-server.com/...      │ │
│ ┌──────────────────────────────┐ │ └────────────────────────────────────────┘ │
│ │ https://your-server.com/...  │ │                                              │
│ └──────────────────────────────┘ │ ┌────────────────────────────────────────┐ │
│                                  │ │ ✓ Delivered | 200 OK | 98ms            │ │
│ SECRET                           │ │   2024-01-15 10:28:00                  │ │
│ ┌──────────────────────────────┐ │ │   Event: webhook.delivered             │ │
│ │ whsec_••••••••••••     [👁]  │ │ └────────────────────────────────────────┘ │
│ └──────────────────────────────┘ │                                              │
│                                  │ ┌────────────────────────────────────────┐ │
│ EVENT PAYLOAD        [Generate]  │ │ ✕ Failed | 500 Error | 234ms          │ │
│ ┌──────────────────────────────┐ │ │   2024-01-15 10:25:00                  │ │
│ │ {                            │ │ │   Event: payment.updated                │ │
│ │   "id": "evt_abc123",        │ │ │   Error: Connection timeout             │ │
│ │   "type": "payment.created", │ │ └────────────────────────────────────────┘ │
│ │   "data": { ... }            │ │                                              │
│ │ }                            │ │                                              │
│ └──────────────────────────────┘ │                                              │
│                                  │                                              │
│ SIGNATURE PREVIEW                │                                              │
│ ┌──────────────────────────────┐ │                                              │
│ │ t=1705315800,v1=abc123...    │ │                                              │
│ └──────────────────────────────┘ │                                              │
│                                  │                                              │
│ [Send Webhook →]                 │                                              │
│                                  │                                              │
└──────────────────────────────────┴──────────────────────────────────────────────┘
```

### 6.2 Delivery Log Entry Component

```yaml
Component: DeliveryLogEntry
Frame: Auto Layout, Vertical
Width: 100%
Padding: 16px
Background: #FFFFFF
Border: 1px #E5E5EA
Radius: 8px

Children:
  - Header:
      Layout: Horizontal
      Justify: Space Between
      
      Status:
        Layout: Horizontal
        Gap: 8px
        
        Icon:
          Success: ✓ (#00C853)
          Error: ✕ (#FF3B30)
          
        Status Text:
          Delivered | 200 OK
          
        Duration:
          125ms
          
      Timestamp:
        Font: Inter, 12px
        Color: #636366
        
  - Details:
      Layout: Vertical
      Gap: 4px
      Margin Top: 8px
      
      Event Type:
        Font: Inter, 14px, Medium
        Color: #1C1C1E
        
      URL:
        Font: JetBrains Mono, 12px
        Color: #636366
        Truncate: True

States:
  - Success:
      Border Left: 4px #00C853
      
  - Error:
      Border Left: 4px #FF3B30
      Show Error Message
```

---

## 7. Documentation Page

### 7.1 Layout-Spezifikation

```yaml
Frame: DocumentationPage
Layout: Three Column
Width: 1440px

Columns:
  Left Sidebar:
    Width: 280px
    Position: Sticky
    Top: 80px
    Height: calc(100vh - 80px)
    Overflow: Vertical Scroll
    
  Main Content:
    Width: Fill (min 600px, max 760px)
    Padding: 24px
    
  Right Sidebar:
    Width: 240px
    Position: Sticky
    Top: 80px
```

### 7.2 Sidebar Navigation Component

```yaml
Component: SidebarNavigation
Frame: Auto Layout, Vertical
Width: 100%
Padding: 16px

Children:
  - Category:
      Layout: Vertical
      Gap: 4px
      
      Header:
        Layout: Horizontal
        Justify: Space Between
        Padding: 8px 12px
        
        Title:
          Font: Inter, 14px, Semibold
          Color: #1C1C1E
          
        Expand Icon:
          Size: 16px
          Color: #636366
          Rotation: 0° (expanded), -90° (collapsed)
          
      Items:
        Layout: Vertical
        Gap: 0
        
        Item:
          Padding: 8px 12px 8px 24px
          Font: Inter, 14px, Regular
          Color: #3A3A3C
          Border Radius: 4px
          
          States:
            Active:
              Background: #E6F0FF
              Color: #0057FF
              Font Weight: Medium
              
            Hover:
              Background: #F4F6F8
```

---

## 8. Dashboard Page

### 8.1 Metrics Cards Component

```yaml
Component: MetricsCard
Frame: Auto Layout, Vertical
Width: Fill
Padding: 20px
Background: #FFFFFF
Border: 1px #E5E5EA
Radius: 12px

Children:
  - Title:
      Font: Inter, 14px, Regular
      Color: #636366
      
  - Value:
      Font: Inter, 32px, Bold
      Color: #1C1C1E
      Margin Top: 8px
      
  - Trend:
      Layout: Horizontal
      Gap: 4px
      Margin Top: 8px
      
      Icon:
        Up: ↑ (#00C853)
        Down: ↓ (#FF3B30)
        
      Text:
        Font: Inter, 14px, Medium
        Color: #00C853 (up) or #FF3B30 (down)
        
  - Period:
      Font: Inter, 12px
      Color: #636366
      Margin Top: 4px
```

---

## 9. Search Results Page

### 9.1 Search Input Component

```yaml
Component: SearchInput
Frame: Auto Layout, Horizontal
Width: 100%
Max Width: 800px
Padding: 16px 24px
Background: #FFFFFF
Border: 2px #E5E5EA
Radius: 12px
Focus Border: 2px #0057FF

Children:
  - Icon:
      Name: Search
      Size: 20px
      Color: #636366
      
  - Input:
      Font: Inter, 16px
      Color: #1C1C1E
      Placeholder: "Search documentation, APIs, tools..."
      Border: None
      Flex: 1
      
  - Clear Button:
      Visible: When text exists
```

### 9.2 Search Result Card Component

```yaml
Component: SearchResultCard
Frame: Auto Layout, Vertical
Width: 100%
Padding: 16px 24px
Background: #FFFFFF
Border: 1px bottom #E5E5EA
Hover: Background #F4F6F8

Children:
  - Category Badge:
      Font: Inter, 12px, Medium
      Color: #0057FF
      Background: #E6F0FF
      Padding: 4px 8px
      Radius: 4px
      
  - Title:
      Font: Inter, 18px, Semibold
      Color: #1C1C1E
      Margin Top: 8px
      
  - Description:
      Font: Inter, 14px, Regular
      Color: #636366
      Margin Top: 4px
      Max Lines: 2
      
  - Highlighted Text:
      Background: #FFF8E1
      Color: #1C1C1E
```

---

## 10. Settings Page

### 10.1 Settings Form Component

```yaml
Component: SettingsForm
Frame: Auto Layout, Vertical
Width: 100%
Max Width: 600px
Gap: 24px

Children:
  - Section:
      Layout: Vertical
      Gap: 16px
      
      Title:
        Font: Inter, 18px, Semibold
        Color: #1C1C1E
        
      Fields:
        Layout: Vertical
        Gap: 16px
        
  - Field:
      Layout: Vertical
      Gap: 4px
      
      Label:
        Font: Inter, 14px, Medium
        Color: #1C1C1E
        
      Input:
        Width: 100%
        Padding: 12px 16px
        Border: 1px #C7C7CC
        Radius: 8px
        
      Helper:
        Font: Inter, 12px
        Color: #636366
        
  - Actions:
      Layout: Horizontal
      Justify: Flex End
      Gap: 12px
      Margin Top: 24px
      
      Cancel:
        Type: Secondary
        
      Save:
        Type: Primary
```

---

## 11. Mobile Screens

### 11.1 Mobile Header

```yaml
Frame: MobileHeader
Width: 375px
Height: 64px
Padding: 0 16px
Background: #FFFFFF
Border: 1px bottom #E5E5EA

Children:
  - Menu Button:
      Position: Left
      Icon: Hamburger (☰)
      Size: 24px
      
  - Logo:
      Position: Center
      Size: 100px
      
  - Actions:
      Position: Right
      Layout: Horizontal
      Gap: 8px
      
      - Search Icon
      - Profile Icon
```

### 11.2 Mobile Navigation Drawer

```yaml
Frame: MobileNavDrawer
Width: 280px
Height: 100vh
Background: #FFFFFF
Position: Fixed
Left: -280px (closed) / 0 (open)
Transition: 250ms ease-out

Overlay:
  Background: rgba(0, 0, 0, 0.5)
  Opacity: 0 (closed) / 1 (open)

Children:
  - Header:
      Height: 64px
      Padding: 0 16px
      Border: 1px bottom #E5E5EA
      
      - Close Button (✕)
      - Logo
      
  - Navigation:
      Padding: 16px
      
      - Category Links (same as desktop sidebar)
```

### 11.3 Mobile Card Stack

```yaml
Frame: MobileCardStack
Width: 375px
Padding: 16px
Gap: 16px

Cards:
  Layout: Vertical
  Width: 100%
  Padding: 16px
  
  Each Card:
    - Icon (top)
    - Title
    - Description
    - CTA Button (full width)
```

---

## 12. Komponenten-States

### 12.1 Button States

```yaml
Button States:
  
  Default:
    Background: #0057FF
    Text: #FFFFFF
    Border: None
    Shadow: None
    
  Hover:
    Background: #0046CC
    Text: #FFFFFF
    Cursor: Pointer
    
  Active:
    Background: #003499
    Transform: scale(0.98)
    
  Focus:
    Outline: 2px #0057FF
    Outline Offset: 2px
    
  Disabled:
    Background: #C7C7CC
    Text: #FFFFFF
    Cursor: not-allowed
    Opacity: 0.6
    
  Loading:
    Background: #0057FF
    Text: Hidden
    Spinner: Visible
    Cursor: wait
```

### 12.2 Input States

```yaml
Input States:

  Default:
    Border: 1px #C7C7CC
    Background: #FFFFFF
    
  Focus:
    Border: 2px #0057FF
    Background: #FFFFFF
    Shadow: 0 0 0 3px rgba(0, 87, 255, 0.1)
    
  Error:
    Border: 2px #FF3B30
    Background: #FFF5F5
    
  Disabled:
    Border: 1px #E5E5EA
    Background: #F4F6F8
    Text: #636366
    Cursor: not-allowed
```

### 12.3 Card States

```yaml
Card States:

  Default:
    Border: 1px #E5E5EA
    Background: #FFFFFF
    Shadow: None
    
  Hover:
    Border: 1px #0057FF
    Shadow: 0 4px 12px rgba(0, 87, 255, 0.1)
    Cursor: pointer
    
  Selected:
    Border: 2px #0057FF
    Background: #E6F0FF
```

### 12.4 Toast States

```yaml
Toast States:

  Success:
    Background: #E8F5E9
    Border Left: 4px #00C853
    Icon: Checkmark
    Text: #1C1C1E
    
  Error:
    Background: #FFEBEE
    Border Left: 4px #FF3B30
    Icon: X
    Text: #1C1C1E
    
  Warning:
    Background: #FFF8E1
    Border Left: 4px #FFB300
    Icon: Warning
    Text: #1C1C1E
    
  Info:
    Background: #E3F2FD
    Border Left: 4px #2196F3
    Icon: Info
    Text: #1C1C1E
```

---

## Anhang

### A. Figma Export-Einstellungen

```
Export Format: PNG, SVG, PDF
Scale: 1x, 2x, 3x (for retina)
Naming Convention: [ComponentName]-[State]-[Size]
```

### B. Design Tokens Export

```json
{
  "colors": {
    "primary": "#0057FF",
    "navy": "#0A1A2F",
    "teal": "#00C2A8"
  },
  "typography": {
    "fontFamily": "Inter",
    "fontSize": {
      "base": "16px",
      "lg": "18px",
      "xl": "20px"
    }
  }
}
```

### C. Accessibility Annotations

- Alle interaktiven Elemente benötigen Focus States
- Mindestens 4.5:1 Kontrastverhältnis
- Touch Targets mindestens 44x44px
- Screenreader Labels für alle Aktionen

---

**Dokument-Ende**

*Diese Figma-Design-Spezifikation dient als vollständige Referenz für die UI-Implementierung.*
