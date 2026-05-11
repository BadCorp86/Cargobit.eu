# 🧱 BLOCK V — Developer-Portal Content-Writing-Handbuch

## Wie man Dokumentation schreibt, die Entwickler lieben

### Das offizielle Content-Writing-Handbuch für das CargoBit Developer Portal

Dieses Handbuch definiert **Ton, Struktur, Stil und Qualität** für alle Inhalte im Portal und gewährleistet konsistente, entwicklerfreundliche Dokumentation.

---

## 1. Schreibprinzipien

### 1.1 Die fünf Kernprinzipien

| Prinzip | Beschreibung | Beispiel |
|---------|--------------|----------|
| **Klarheit vor Vollständigkeit** | Lieber kurz und verständlich als lang und verwirrend | "Erstellt eine Zahlung" statt "Ermöglicht die Initiierung eines Zahlungsprozesses" |
| **Code-First** | Jeder Erklärung folgt ein Code-Beispiel | Erklärung → Request → Response |
| **Predictable Structure** | Konsistente Struktur auf jeder Seite | Was → Warum → Wie → Beispiele → Troubleshooting |
| **Keine Marketing-Sprache** | Neutral, technisch, präzise | Keine Superlative, Buzzwords, Versprechen |
| **Developer-Friendly Tone** | Direkt, respektvoll, ohne unnötige Floskeln | "Sie" oder "du" konsistent verwenden |

### 1.2 Klarheit vor Vollständigkeit

**Das Prinzip:**

Entwickler kommen zur Dokumentation mit einem konkreten Ziel. Sie wollen schnell zur Lösung finden. Jeder zusätzliche Satz erhöht die kognitive Belastung.

**Umsetzung:**

```
┌──────────────────────────────────────────────────────────────────────────┐
│                           Writing Guidelines                              │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│   ✓ Kurze Sätze (maximal 20 Wörter)                                      │
│   ✓ Ein Gedanke pro Satz                                                 │
│   ✓ Aktive Sprache                                                       │
│   ✓ Konkrete Beispiele statt abstrakter Erklärungen                      │
│   ✓ Keine unnötigen Füllwörter                                           │
│                                                                           │
│   ✗ Schachtelsätze                                                       │
│   ✗ Passivkonstruktionen                                                 │
│   ✗ Floskeln und Füllwörter                                              │
│   ✗ Übermäßige Adjektive                                                 │
│   ✗ Vorwissen voraussetzen                                               │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

**Beispiel — Vorher (Schlecht):**

> "Unsere hochmoderne API ermöglicht es Ihnen, revolutionäre Zahlungsintegrationen zu erstellen, die Ihre Geschäftsanforderungen erfüllen und gleichzeitig eine hervorragende Benutzererfahrung bieten."

**Beispiel — Nachher (Gut):**

> "Die Payments API ermöglicht das Erstellen und Verwalten von Zahlungen."

### 1.3 Code-First

**Das Prinzip:**

Entwickler verstehen Code schneller als Text. Code-Beispiele sind die primäre Dokumentation, Text ist die Ergänzung.

**Umsetzung:**

Jede Erklärung muss von einem Code-Beispiel begleitet werden:

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          Code-First Pattern                               │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│   1. Kurze Erklärung (1-2 Sätze)                                        │
│   2. Code-Beispiel (Request)                                             │
│   3. Code-Beispiel (Response)                                            │
│   4. Parameter-Tabelle (falls nötig)                                    │
│   5. Hinweise/Edge Cases (falls nötig)                                  │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

**Beispiel:**

```markdown
## Create Payment

Erstellt eine neue Zahlung für einen Kunden.

### Request

```javascript
const payment = await cargobit.payments.create({
  amount: 1000,
  currency: 'eur',
  customer: 'cus_abc123',
  description: 'Order #12345'
});
```

### Response

```json
{
  "id": "pay_xyz789",
  "object": "payment",
  "amount": 1000,
  "currency": "eur",
  "status": "succeeded",
  "customer": "cus_abc123"
}
```

### Parameters

| Parameter | Typ | Erforderlich | Beschreibung |
|-----------|-----|--------------|--------------|
| amount | integer | Ja | Betrag in Cent |
| currency | string | Ja | Währung (eur, usd, gbp) |
| customer | string | Nein | Kunden-ID |
```

### 1.4 Predictable Structure

**Das Prinzip:**

Jede Seite folgt der gleichen Struktur. Entwickler wissen immer, wo sie finden, was sie suchen.

**Standard-Struktur:**

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          Page Structure Template                          │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│   # [API/Feature Name]                                                   │
│                                                                           │
│   ## Overview                                                            │
│   1-2 Sätze: Was ist das?                                                │
│                                                                           │
│   ## Quick Start                                                         │
│   Minimales Beispiel für den schnellen Einstieg                          │
│                                                                           │
│   ## Details                                                             │
│   Vollständige Dokumentation mit allen Parametern                        │
│                                                                           │
│   ## Examples                                                            │
│   Praktische Beispiele für gängige Use Cases                             │
│                                                                           │
│   ## Errors & Troubleshooting                                            │
│   Häufige Fehler und Lösungen                                            │
│                                                                           │
│   ## Best Practices                                                      │
│   Empfehlungen für optimale Nutzung                                      │
│                                                                           │
│   ## Related                                                             │
│   Links zu verwandten Themen                                             │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

### 1.5 Keine Marketing-Sprache

**Das Prinzip:**

Dokumentation ist kein Marketing-Material. Entwickler wollen Fakten, keine Verkaufsgespräche.

**Verbotene Elemente:**

| Verboten | Beispiel | Stattdessen |
|----------|----------|-------------|
| Superlative | "Die beste API der Welt" | "API mit 99.99% Verfügbarkeit" |
| Buzzwords | "Revolutionär", "Game-Changer" | Technische Fakten |
| Versprechen | "Sie werden schnellere Integrationen erleben" | "Durchschnittliche Integrationszeit: 2 Stunden" |
| Vergleiche | "Besser als die Konkurrenz" | Feature-Beschreibung |
| Emotionale Sprache | "Erleben Sie die Magie" | Faktische Beschreibung |

### 1.6 Developer-Friendly Tone

**Das Prinzip:**

Der Ton ist respektvoll, direkt und technisch. Entwickler werden als professionelle Partner behandelt.

**Tone Guidelines:**

```
┌──────────────────────────────────────────────────────────────────────────┐
│                              Tone Guidelines                              │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│   Direkt:                                                                │
│   ✓ "Verwenden Sie diesen Endpoint, um Zahlungen zu erstellen."         │
│   ✗ "Sie können, wenn Sie möchten, diesen Endpoint verwenden..."        │
│                                                                           │
│   Präzise:                                                               │
│   ✓ "Die Rate-Limit beträgt 100 Requests pro Minute."                   │
│   ✗ "Es gibt ein Rate-Limit, das Sie beachten sollten."                 │
│                                                                           │
│   Neutral:                                                               │
│   ✓ "Der Request schlug fehl wegen ungültiger Authentifizierung."       │
│   ✗ "Sie haben einen Fehler gemacht bei der Authentifizierung."         │
│                                                                           │
│   Technisch:                                                             │
│   ✓ "Die API verwendet HMAC-SHA256 für die Signatur."                   │
│   ✗ "Die API ist sehr sicher durch modernste Verschlüsselung."         │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Strukturregeln

### 2.1 Headings

**Hierarchie:**

| Level | Verwendung | Beispiel |
|-------|------------|----------|
| **H1** | Seiten-Titel (nur 1x pro Seite) | `# Payments API` |
| **H2** | Hauptabschnitte | `## Create Payment` |
| **H3** | Unterabschnitte | `### Request Parameters` |
| **H4** | Details | `#### Required Parameters` |

**Regeln:**

- Keine Heading-Levels überspringen (H1 → H2 → H3, nicht H1 → H3)
- Headings müssen deskriptiv sein
- Headings sollten scanbar sein

### 2.2 Code Blocks

**Anforderungen:**

Jeder Code-Block muss:

1. **Sprachkennzeichnung** haben
2. **Copy-Button** haben
3. **Syntax-Highlighting** haben
4. **Realistische Werte** verwenden

**Beispiel:**

````markdown
```javascript
const payment = await cargobit.payments.create({
  amount: 1000,        // 10.00 EUR
  currency: 'eur',
  customer: 'cus_abc123'
});
```
````

**Code-Block-Formatierung:**

```javascript
// ✅ Gut: Realistische Werte
const payment = await cargobit.payments.create({
  amount: 1999,
  currency: 'eur',
  customer: 'cus_real_customer_id'
});

// ✗ Schlecht: Platzhalter ohne Bedeutung
const payment = await cargobit.payments.create({
  amount: 123,
  currency: 'foo',
  customer: 'bar'
});
```

### 2.3 Tables

**Verwendung:**

| Anwendungsfall | Beispiel |
|----------------|----------|
| **Parameter-Dokumentation** | API-Parameter mit Typ, Erforderlich, Beschreibung |
| **Fehlercodes** | Code, Bedeutung, Lösung |
| **Vergleiche** | Feature-Vergleiche, Plan-Unterschiede |
| **Status-Codes** | HTTP-Status, Bedeutung |

**Format:**

| Parameter | Typ | Erforderlich | Beschreibung |
|-----------|-----|--------------|--------------|
| `amount` | integer | Ja | Betrag in der kleinsten Währungseinheit (z.B. Cent für EUR) |
| `currency` | string | Ja | Dreistelliger Währungscode (ISO 4217) |
| `customer` | string | Nein | ID des Kunden |

### 2.4 Listen

**Geordnete Listen (für Schritte):**

1. Erstellen Sie einen API-Key
2. Konfigurieren Sie den Webhook-Endpoint
3. Testen Sie die Integration

**Ungeordnete Listen (für Optionen/Features):**

- Echtzeit-Transaktionsverarbeitung
- Automatische Retry-Logik
- Umfassende Webhook-Unterstützung

### 2.5 Callouts/Admonitions

**Verfügbare Typen:**

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          Callout Types                                    │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│   ℹ️ Info: Zusätzliche Informationen, die hilfreich sind                 │
│                                                                           │
│   ⚠️ Warning: Wichtige Hinweise vor möglichen Problemen                  │
│                                                                           │
│   🔒 Security: Sicherheitsrelevante Informationen                        │
│                                                                           │
│   💡 Tip: Best Practices und Optimierungen                               │
│                                                                           │
│   🚫 Deprecated: Veraltete Features, die nicht mehr verwendet werden     │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

**Beispiel:**

```markdown
> ⚠️ **Warning**: Webhook-Secrets sollten niemals im Code gespeichert werden. 
> Verwenden Sie Umgebungsvariablen.
```

---

## 3. Beispiele — Gut vs. Schlecht

### 3.1 API-Beschreibung

**❌ Schlecht:**

> "Unsere bahnbrechende Payments API revolutioniert die Art und Weise, wie Sie Zahlungen verarbeiten. Mit unschlagbarer Geschwindigkeit und Zuverlässigkeit ermöglicht sie Ihnen, Ihren Kunden ein erstklassiges Zahlungserlebnis zu bieten."

**✅ Gut:**

> "Die Payments API ermöglicht das Erstellen, Abrufen und Verwalten von Zahlungen. Alle Endpoints unterstützen Idempotency für sichere Retries."

### 3.2 Parameter-Dokumentation

**❌ Schlecht:**

| Parameter | Beschreibung |
|-----------|--------------|
| amount | Der Betrag |
| currency | Die Währung |

**✅ Gut:**

| Parameter | Typ | Erforderlich | Beschreibung |
|-----------|-----|--------------|--------------|
| `amount` | integer | Ja | Betrag in Cent (z.B. 1000 für 10.00 EUR) |
| `currency` | string | Ja | ISO 4217 Währungscode (eur, usd, gbp) |

### 3.3 Fehlerbehebung

**❌ Schlecht:**

> "Wenn ein Fehler auftritt, überprüfen Sie Ihre Eingaben und versuchen Sie es erneut."

**✅ Gut:**

```markdown
## Common Errors

### 401 Unauthorized

**Ursache:** Der API-Key ist ungültig oder abgelaufen.

**Lösung:**
1. Überprüfen Sie, ob der API-Key korrekt ist
2. Stellen Sie sicher, dass der Key nicht widerrufen wurde
3. Generieren Sie bei Bedarf einen neuen Key

### 429 Too Many Requests

**Ursache:** Rate-Limit überschritten.

**Lösung:**
1. Reduzieren Sie die Request-Frequenz
2. Implementieren Sie Exponential Backoff
3. Kontaktieren Sie Support für höhere Limits
```

---

## 4. Glossar-Regeln

### 4.1 Glossar-Pflicht

Jeder Fachbegriff muss im Glossar definiert sein:

| Begriff | Definition |
|---------|------------|
| **Idempotency Key** | Ein eindeutiger Identifier, der sicherstellt, dass wiederholte Requests das gleiche Ergebnis liefern |
| **Webhook** | Eine HTTP-Callback-Funktion, die Events von CargoBit an Ihren Server sendet |
| **HMAC** | Hash-based Message Authentication Code zur Signatur-Verifizierung |

### 4.2 Abkürzungen

Jede Abkürzung muss beim ersten Vorkommen erklärt werden:

```markdown
Die API verwendet HMAC (Hash-based Message Authentication Code) für die 
Signatur-Validierung.
```

### 4.3 Konsistente Terminologie

| Verwenden | Nicht verwenden |
|-----------|-----------------|
| API-Key | API key, api-key, Schlüssel |
| Webhook-Endpoint | Webhook URL, Callback URL |
| Zahlung | Payment, Transaktion (außer bei spezifischer Bedeutung) |

---

## 5. Content-Review-Prozess

### 5.1 Review-Checkliste

```
┌──────────────────────────────────────────────────────────────────────────┐
│                       Content Review Checklist                            │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│   Struktur:                                                              │
│   [ ] Folgt der Standard-Struktur                                        │
│   [ ] Headings sind hierarchisch korrekt                                 │
│   [ ] Navigation ist logisch                                             │
│                                                                           │
│   Inhalt:                                                                │
│   [ ] Alle Informationen sind korrekt                                    │
│   [ ] Code-Beispiele sind lauffähig                                      │
│   [ ] Links funktionieren                                                │
│   [ ] Parameter sind vollständig dokumentiert                            │
│                                                                           │
│   Stil:                                                                  │
│   [ ] Keine Marketing-Sprache                                            │
│   [ ] Kurze, klare Sätze                                                 │
│   [ ] Konsistente Terminologie                                           │
│   [ ] Developer-Friendly Tone                                            │
│                                                                           │
│   Technisch:                                                             │
│   [ ] Code-Beispiele haben Syntax-Highlighting                           │
│   [ ] Copy-Buttons funktionieren                                         │
│   [ ] Tabellen sind korrekt formatiert                                   │
│                                                                           │
│   Accessibility:                                                         │
│   [ ] Alt-Texte für Bilder                                               │
│   [ ] Ausreichender Kontrast                                             │
│   [ ] Screenreader-kompatible Tabellen                                   │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Review-Rollen

| Rolle | Verantwortung |
|-------|---------------|
| **Technical Writer** | Struktur, Stil, Konsistenz |
| **Engineer** | Technische Korrektheit, Code-Beispiele |
| **Product Manager** | Vollständigkeit, Business-Kontext |
| **UX Writer** | Tone, Accessibility |

---

## 6. Content-Metriken

### 6.1 Qualitätsmetriken

| Metrik | Ziel | Messung |
|--------|------|---------|
| **Flesch Reading Ease** | > 60 | Automatisch |
| **Satzlänge** | < 20 Wörter | Automatisch |
| **Absatzlänge** | < 5 Sätze | Manuell |
| **Code-Beispiele pro Seite** | > 2 | Automatisch |
| **Veraltete Inhalte** | 0 | Review |

### 6.2 Engagement-Metriken

| Metrik | Ziel |
|--------|------|
| **Time on Page** | > 2 Minuten |
| **Bounce Rate** | < 40% |
| **Scroll Depth** | > 75% |
| **Copy Button Clicks** | > 10% der Besucher |

---

## 7. Templates

### 7.1 API-Endpoint-Template

```markdown
# [Endpoint Name]

[1-2 Sätze: Was macht dieser Endpoint?]

## Quick Start

```javascript
// Minimal Beispiel
const result = await cargobit.[resource].[method]({
  // minimale Parameter
});
```

## Request

### HTTP Request

`[METHOD] /v1/[resource]/[id]`

### Parameters

| Parameter | Typ | Erforderlich | Beschreibung |
|-----------|-----|--------------|--------------|
| `param1` | type | Ja/Nein | Beschreibung |

## Response

```json
{
  "id": "example_id",
  "object": "resource_name"
}
```

## Errors

| Code | Bedeutung | Lösung |
|------|-----------|--------|
| 400 | Beschreibung | Lösung |

## Examples

### [Use Case 1]

```javascript
// Beispiel
```

## Best Practices

- Tipp 1
- Tipp 2

## Related

- [Verwandte API 1](/docs/api/related1)
- [Verwandte API 2](/docs/api/related2)
```

### 7.2 Guide-Template

```markdown
# [Guide Title]

[1-2 Sätze: Was wird in diesem Guide behandelt?]

## Prerequisites

- Voraussetzung 1
- Voraussetzung 2

## Step 1: [Title]

[Erklärung]

```javascript
// Code
```

## Step 2: [Title]

[Erklärung]

## Testing

[Wie man testet, dass alles funktioniert]

## Troubleshooting

### [Problem 1]

**Ursache:** [Erklärung]

**Lösung:** [Schritte]

## Next Steps

- [Nächster Schritt 1]
- [Nächster Schritt 2]
```

---

## 8. Voice & Tone Examples

### 8.1 Erfolgsmeldungen

```
✅ "Die Zahlung wurde erfolgreich erstellt."
✅ "Ihr API-Key wurde generiert. Kopieren Sie ihn jetzt."
✅ "Webhook-Test erfolgreich. Ihr Endpoint empfängt Events."
```

### 8.2 Fehlermeldungen

```
✅ "Der Request konnte nicht verarbeitet werden. Überprüfen Sie die Parameter."
✅ "Authentifizierung fehlgeschlagen. Der API-Key ist ungültig."
✅ "Rate-Limit erreicht. Warten Sie 60 Sekunden vor dem nächsten Request."

❌ "Oops! Etwas ist schiefgelaufen. Bitte versuchen Sie es später erneut."
❌ "Ungültige Eingabe. Bitte korrigieren Sie Ihre Daten."
```

### 8.3 Erklärungen

```
✅ "Idempotency-Keys verhindern doppelte Verarbeitung bei Netzwerkfehlern."
✅ "Webhooks senden Events an Ihren Server, wenn bestimmte Aktionen auftreten."
✅ "Der API-Key authentifiziert jeden Request und sollte geheim gehalten werden."
```

---

*Dieses Content-Writing-Handbuch gewährleistet konsistente, entwicklerfreundliche Dokumentation für das CargoBit Developer Portal.*
