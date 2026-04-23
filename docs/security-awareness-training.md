# Security-Awareness-Training für Engineering

**CargoBit Transport Platform**  
**90-Minuten Training für Entwickler-Teams**  
**Dokument-ID:** TRAIN-SEC-2025-001  
**Klassifikation:** Intern – Engineering Teams  
**Datum:** 15. Januar 2025

---

## Training-Übersicht

| Attribut | Wert |
|----------|------|
| Dauer | 90 Minuten |
| Zielgruppe | Engineering Teams |
| Format | Interaktiv + Hands-On |
| Materialien | Slides, Cheatsheet, Exercise |

### Agenda

| Modul | Thema | Dauer |
|-------|-------|-------|
| 1 | Secure Mindset | 10 min |
| 2 | AuthN & AuthZ | 15 min |
| 3 | Secrets & Config | 10 min |
| 4 | API Security | 15 min |
| 5 | Secure Coding | 15 min |
| 6 | Infrastructure Security | 10 min |
| 7 | Incident Response | 10 min |
| 8 | Hands-On Exercise | 5 min |
| 9 | Abschluss | 5 min |

---

## Modul 1 — Secure Mindset (10 min)

### Warum Security Engineering wichtig ist

**Statistiken:**
- Durchschnittliche Kosten eines Data Breach: 4.45 Mio. USD
- 83% der Unternehmen hatten mehr als einen Breach
- Time to Detect: Durchschnittlich 207 Tage

### Beispiele realer Incidents

| Incident | Ursache | Auswirkung |
|----------|---------|------------|
| Equifax 2017 | Ungepatchter Server | 147 Mio. Datensätze |
| SolarWinds 2020 | Supply Chain Attack | 18.000+ Organisationen |
| Log4j 2021 | Vulnerable Dependency | Millionen Systeme |

### Das "Assume Breach" Prinzip

```
┌─────────────────────────────────────────────────────────────────────┐
│                     ASSUME BREACH MINDSET                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ❌ Falsch:        "Wir sind sicher, nichts kann passieren"        │
│                                                                     │
│  ✅ Richtig:       "Wir gehen davon aus, dass ein Angreifer        │
│                    bereits im Netz ist – wie erschweren wir        │
│                    ihm das Leben?"                                 │
│                                                                     │
│  Konsequenzen:                                                      │
│  • Defense in Depth (mehrere Schichten)                            │
│  • Zero Trust (niemandem vertrauen)                                │
│  • Least Privilege (minimale Rechte)                               │
│  • Detection & Response (früh erkennen)                            │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Verantwortung jedes Engineers

| Du bist verantwortlich für: |
|----------------------------|
| Sicheren Code zu schreiben |
| Vulnerabilities zu fixen |
| Security-Issues zu melden |
| Security-Reviews einzufordern |
| Fragen zu stellen bei Unsicherheit |

---

## Modul 2 — AuthN & AuthZ (15 min)

### JWT Basics

```json
// JWT Struktur
{
  "header": {
    "alg": "RS256",
    "typ": "JWT"
  },
  "payload": {
    "sub": "user-123",
    "roles": ["shipper"],
    "tenant_id": "tenant-456",
    "exp": 1705312800
  },
  "signature": "..."
}
```

**Wichtige Claims:**

| Claim | Bedeutung | Wichtig |
|-------|-----------|---------|
| `sub` | User ID | Nie vertrauen ohne Validierung |
| `exp` | Expiration | Immer prüfen |
| `iss` | Issuer | Muss unserem Auth-Service entsprechen |
| `aud` | Audience | Muss unserem Service entsprechen |

### RBAC vs. ABAC

```
RBAC (Role-Based Access Control)
────────────────────────────────
User → Role → Permissions

Beispiel:
  User "Max" hat Rolle "shipper"
  Rolle "shipper" hat Permission "create_order"

ABAC (Attribute-Based Access Control)
────────────────────────────────────
User + Resource + Environment → Decision

Beispiel:
  User "Max" darf Order lesen, WENN:
  - User.tenant_id == Order.tenant_id
  - User.role in ["shipper", "carrier"]
```

### Common Pitfalls

#### 1. Token-Weitergabe

```go
// ❌ FALSCH: Token an Dritte weitergeben
func callExternalAPI(token string) {
    req.Header.Set("Authorization", "Bearer " + token)
    // Token wird an externen Service gesendet!
}

// ✅ RICHTIG: Neuen Token für externen Service verwenden
func callExternalAPI() {
    serviceToken := getServiceToken("external-service")
    req.Header.Set("Authorization", "Bearer " + serviceToken)
}
```

#### 2. Fehlende Audience-Checks

```go
// ❌ FALSCH: Keine Audience-Prüfung
func validateToken(token string) {
    claims := parseToken(token)
    return claims != nil
}

// ✅ RICHTIG: Audience validieren
func validateToken(token string) error {
    claims := parseToken(token)
    if claims.Audience != "pricing-service" {
        return errors.New("invalid audience")
    }
    return nil
}
```

#### 3. Over-privileged Roles

```yaml
# ❌ FALSCH: Zu viele Rechte
role: "admin"
permissions: ["*"]

# ✅ RICHTIG: Minimale Rechte
role: "order-reader"
permissions: ["order:read"]
```

---

## Modul 3 — Secrets & Config (10 min)

### Keine Secrets im Code

```python
# ❌ FALSCH: Hardcoded Secrets
DB_PASSWORD = "super_secret_password_123"
API_KEY = "sk-live-abc123..."

# ✅ RICHTIG: Environment Variables oder Vault
import os
db_password = os.environ.get("DB_PASSWORD")
api_key = vault.read_secret("api/keys/external")
```

### Wo Secrets hingehören

| Ort | Verwendungsfall |
|-----|-----------------|
| HashiCorp Vault | Produktions-Secrets |
| AWS Secrets Manager | Cloud-native Services |
| Environment Variables | Lokale Entwicklung |
| Kubernetes Secrets | Container (via Vault Injector) |

### Rotations-Strategien

```
┌─────────────────────────────────────────────────────────────────────┐
│                    SECRET ROTATION LIFECYCLE                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. Neues Secret generieren                                        │
│     └── Automatisch via Vault                                      │
│                                                                     │
│  2. Altes und neues Secret parallel gültig                         │
│     └── Overlap-Period von 24h                                     │
│                                                                     │
│  3. Services auf neues Secret updaten                              │
│     └── Rolling Deployment                                         │
│                                                                     │
│  4. Altes Secret deaktivieren                                      │
│     └── Nach erfolgreichem Update                                  │
│                                                                     │
│  Rotation-Intervalle:                                               │
│  • Database Passwords: 90 Tage                                     │
│  • API Keys: Quartalsweise                                         │
│  • TLS Certificates: 90 Tage                                       │
│  • Service Tokens: 24 Stunden                                      │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Config-Versioning

- Alle Konfigurationen in Git
- Meaningful Commit Messages
- Schema-Validation vor Apply
- 4-Eyes Approval für kritische Configs

---

## Modul 4 — API Security (15 min)

### Input-Validation

```go
// ❌ FALSCH: Keine Validierung
func createOrder(order Order) error {
    return db.Save(order)
}

// ✅ RICHTIG: Vollständige Validierung
func createOrder(order Order) error {
    if err := validate.Struct(order); err != nil {
        return ValidationError(err)
    }
    if !isValidUUID(order.ShipperID) {
        return InvalidShipperID()
    }
    if order.Weight <= 0 || order.Weight > 100000 {
        return InvalidWeight()
    }
    return db.Save(order)
}
```

**Validierungs-Regeln:**

| Feld | Regel | Grund |
|------|-------|-------|
| IDs | UUID Format, nicht leer | SQL Injection Prevention |
| Strings | Max Length, Sanitize | XSS Prevention |
| Numbers | Range Check | Business Logic |
| Dates | Format, Range | Logik-Fehler Prevention |

### Rate-Limits

```yaml
# API Gateway Rate Limits
endpoints:
  /api/v1/orders:
    authenticated: 100/min
    unauthenticated: 10/min
    
  /api/v1/auth/login:
    per_ip: 10/min
    per_user: 5/min
    
  /api/v1/pricing:
    per_tenant: 1000/hour
```

### Error-Handling

```go
// ❌ FALSCH: Stack Trace exponieren
func handleError(err error) {
    c.JSON(500, map[string]interface{}{
        "error": err.Error(),
        "stack": debug.Stack(),
    })
}

// ✅ RICHTIG: Generische Fehler, Details in Logs
func handleError(err error) {
    log.Error().Err(err).Msg("internal error")
    c.JSON(500, map[string]interface{}{
        "error": "INTERNAL_ERROR",
        "message": "An internal error occurred",
        "request_id": c.GetString("request_id"),
    })
}
```

### Idempotenz

```go
// Idempotente API-Calls mit Idempotency-Key
func createOrder(c *gin.Context) {
    idempotencyKey := c.GetHeader("Idempotency-Key")
    
    // Check if already processed
    existing, _ := cache.Get("idempotent:" + idempotencyKey)
    if existing != nil {
        c.JSON(200, existing)
        return
    }
    
    // Process order
    order := processOrder()
    
    // Cache result
    cache.Set("idempotent:"+idempotencyKey, order, 24*time.Hour)
    
    c.JSON(201, order)
}
```

### Logging ohne PII

```go
// ❌ FALSCH: PII in Logs
log.Info().
    Str("email", user.Email).
    Str("password", request.Password).
    Msg("user login")

// ✅ RICHTIG: Keine sensiblen Daten
log.Info().
    Str("user_id", user.ID).
    Str("email_hash", hashEmail(user.Email)).
    Bool("success", true).
    Msg("user login")
```

---

## Modul 5 — Secure Coding (15 min)

### OWASP Top 10 (Developer-Version)

| # | Risiko | Prevention |
|---|--------|------------|
| 1 | Broken Access Control | Immer Server-Side prüfen |
| 2 | Cryptographic Failures | TLS, AES-256, Key Management |
| 3 | Injection | Parametrisierte Queries |
| 4 | Insecure Design | Threat Modeling |
| 5 | Security Misconfiguration | Hardening, Defaults |
| 6 | Vulnerable Components | Dependency Scanning |
| 7 | Auth Failures | MFA, Session Management |
| 8 | Software & Data Integrity | Signed Commits, SBOM |
| 9 | Logging Failures | Audit Logs, Monitoring |
| 10 | SSRF | Input Validation, Allowlists |

### SQL Injection

```go
// ❌ FALSCH: String Concatenation
func getUser(id string) *User {
    query := "SELECT * FROM users WHERE id = " + id
    // Angriff: id = "1 OR 1=1; DROP TABLE users;--"
}

// ✅ RICHTIG: Parametrisierte Queries
func getUser(id string) *User {
    query := "SELECT * FROM users WHERE id = ?"
    row := db.QueryRow(query, id)
}
```

### SSRF (Server-Side Request Forgery)

```go
// ❌ FALSCH: User-Input direkt für Requests
func fetchURL(url string) ([]byte, error) {
    resp, err := http.Get(url) // Angriff: url = "http://localhost:8080/admin"
}

// ✅ RICHTIG: URL Validierung und Allowlist
func fetchURL(url string) ([]byte, error) {
    parsed, err := url.Parse(url)
    if err != nil {
        return nil, err
    }
    
    // Allowlist prüfen
    if !isAllowedHost(parsed.Host) {
        return nil, errors.New("host not allowed")
    }
    
    // Keine internen IPs
    if isPrivateIP(parsed.Host) {
        return nil, errors.New("private IPs not allowed")
    }
    
    return http.Get(url)
}
```

### Broken Access Control

```go
// ❌ FALSCH: Nur prüfen ob User authentifiziert ist
func getOrder(c *gin.Context) {
    orderID := c.Param("id")
    order := db.GetOrder(orderID) // Jeder kann jede Order lesen!
    c.JSON(200, order)
}

// ✅ RICHTIG: Tenant/User-Isolation prüfen
func getOrder(c *gin.Context) {
    orderID := c.Param("id")
    userID := c.GetString("user_id")
    tenantID := c.GetString("tenant_id")
    
    order := db.GetOrder(orderID)
    
    // Authorization Check
    if order.TenantID != tenantID {
        c.JSON(403, gin.H{"error": "FORBIDDEN"})
        return
    }
    
    c.JSON(200, order)
}
```

### Dependency Risks

```yaml
# package.json - Dependency Risiken

# ❌ FALSCH: Ungepinnte Dependencies
"dependencies": {
  "lodash": "*",
  "express": "^4.0.0"
}

# ✅ RICHTIG: Gepinnte, geprüfte Versionen
"dependencies": {
  "lodash": "4.17.21",  # Nach Security-Audit
  "express": "4.18.2"   # Keine bekannten Vulnerabilities
}

# + Regelmäßige npm audit / Snyk scans
```

---

## Modul 6 — Infrastructure Security (10 min)

### mTLS

```
┌─────────────────────────────────────────────────────────────────────┐
│                          mTLS OVERVIEW                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Client Service                    Server Service                  │
│  ┌─────────────┐                  ┌─────────────┐                  │
│  │             │                  │             │                  │
│  │  Client Cert│─────────────────▶│ Verify Cert │                  │
│  │             │                  │             │                  │
│  │  Verify Cert│◀─────────────────│ Server Cert │                  │
│  │             │                  │             │                  │
│  └─────────────┘                  └─────────────┘                  │
│                                                                     │
│  Beide Seiten authentifizieren sich gegenseitig!                   │
│                                                                     │
│  Benefits:                                                          │
│  • Kein MITM möglich                                               │
│  • Service Identity verifiziert                                    │
│  • Encryption in Transit garantiert                                │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### NetworkPolicies

```yaml
# Default: Alles blockieren, nur Erlaubtes zulassen
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
spec:
  podSelector: {}  # Alle Pods
  policyTypes:
    - Ingress
    - Egress
# Keine Rules = Alles verboten

---
# Explizit erlauben
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: pricing-service-allow
spec:
  podSelector:
    matchLabels:
      app: pricing-service
  policyTypes:
    - Ingress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: api-gateway
      ports:
        - port: 8080
```

### Pod Security

```yaml
# Pod Security Standards - Restricted Profile
apiVersion: v1
kind: Pod
metadata:
  name: secure-pod
spec:
  securityContext:
    runAsNonRoot: true          # Keine Root-Rechte
    runAsUser: 1000
    fsGroup: 1000
    seccompProfile:
      type: RuntimeDefault
    
  containers:
    - name: app
      image: app:latest
      securityContext:
        allowPrivilegeEscalation: false
        readOnlyRootFilesystem: true    # Read-only
        capabilities:
          drop:
            - ALL                       # Keine Capabilities
      resources:
        limits:
          memory: "512Mi"
          cpu: "500m"
```

### Least Privilege in Kubernetes

| Resource | Least Privilege Ansatz |
|----------|------------------------|
| ServiceAccounts | Dedizierte SA pro Service |
| RBAC | Nur notwendige Permissions |
| Secrets | Via Vault Injector |
| ConfigMaps | Read-only Mounts |

---

## Modul 7 — Incident Response (10 min)

### Wie erkenne ich einen Incident?

**Indikatoren:**

| Kategorie | Anzeichen |
|-----------|-----------|
| Auth | Ungewöhnlich viele Login-Versuche |
| Access | Zugriff von ungewöhnlichen IPs/Zeiten |
| Data | Unerwartete Datenmengen, Exfiltration |
| System | Performance-Einbrüche, unbekannte Prozesse |
| Logs | Fehlende Logs, Manipulationsversuche |

### Wie melde ich ihn?

```
┌─────────────────────────────────────────────────────────────────────┐
│                    INCIDENT REPORTING                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. Sofort: Slack Channel #security-incidents                      │
│     @security-team mit Details                                     │
│                                                                     │
│  2. Info bereitstellen:                                             │
│     • Was ist passiert?                                            │
│     • Welche Systeme sind betroffen?                               │
│     • Wann wurde es entdeckt?                                      │
│     • Wer hat es entdeckt?                                         │
│                                                                     │
│  3. Bei SEV1/SEV2:                                                  │
│     • PagerDuty Alert auslösen                                     │
│     • Telefonisch nachfassen                                       │
│                                                                     │
│  4. Ticket erstellen                                                │
│     • Template verwenden                                           │
│     • Alle Informationen dokumentieren                             │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Was mache ich NICHT?

| ❌ Nicht tun | Grund |
|-------------|-------|
| Alleine investigieren | Beweise können verloren gehen |
| Systeme rebooten | Forensische Daten verloren |
| Angreifer provozieren | Eskalationsgefahr |
| Logs löschen | Beweisvernichtung |
| Öffentlich posten | OpSec, Legal |

### Beispiel-Szenarien

**Szenario 1: Verdächtige API-Aktivität**
```
Du siehst in Logs: 1000 Requests/min von einer IP auf /api/v1/auth/login

1. Status prüfen: Ist das ein legitimer Load-Test?
2. Wenn nein: Security Team informieren
3. IP in WAF blockieren (nach Rücksprache)
4. Logs sichern
```

**Szenario 2: Credentials im Git-Repo**
```
Du findest: AWS Secret Key in einem Commit

1. NICHT: Repo löschen oder Commit force-pushen
2. Secret sofort rotieren (AWS Console)
3. Security Team informieren
4. Git history cleanup mit Security Team koordinieren
```

---

## Modul 8 — Hands-On Exercise (5 min)

### Finde die 5 Security-Bugs

```go
// BUGGY CODE - Finde die 5 Security-Probleme!

package main

import (
    "database/sql"
    "fmt"
    "net/http"
)

var db *sql.DB

// Bug 1: ?
var API_KEY = "sk-live-abc123secretkey"

type User struct {
    ID       string
    Email    string
    Password string
    Role     string
}

func loginHandler(w http.ResponseWriter, r *http.Request) {
    email := r.FormValue("email")
    password := r.FormValue("password")
    
    // Bug 2: ?
    query := fmt.Sprintf("SELECT * FROM users WHERE email = '%s' AND password = '%s'", 
        email, password)
    
    var user User
    db.QueryRow(query).Scan(&user.ID, &user.Email, &user.Password, &user.Role)
    
    // Bug 3: ?
    http.SetCookie(w, &http.Cookie{
        Name:  "user_id",
        Value: user.ID,
    })
    
    // Bug 4: ?
    fmt.Fprintf(w, "Welcome %s! Your role: %s, Password: %s", 
        user.Email, user.Role, user.Password)
}

func adminHandler(w http.ResponseWriter, r *http.Request) {
    // Bug 5: ?
    cookie, _ := r.Cookie("user_id")
    if cookie.Value != "" {
        fmt.Fprintf(w, "Admin Panel - Access Granted")
    }
}

func main() {
    http.HandleFunc("/login", loginHandler)
    http.HandleFunc("/admin", adminHandler)
    http.ListenAndServe(":8080", nil)
}
```

### Lösungen

<details>
<summary>Klicke hier für die Lösungen</summary>

**Bug 1: Hardcoded Secret**
```go
// ❌ FALSCH
var API_KEY = "sk-live-abc123secretkey"

// ✅ RICHTIG
var API_KEY = os.Getenv("API_KEY")
// Oder besser: Vault
```

**Bug 2: SQL Injection**
```go
// ❌ FALSCH
query := fmt.Sprintf("SELECT * FROM users WHERE email = '%s'", email)

// ✅ RICHTIG
query := "SELECT * FROM users WHERE email = ?"
db.QueryRow(query, email)
```

**Bug 3: Insecure Cookie**
```go
// ❌ FALSCH
http.SetCookie(w, &http.Cookie{
    Name:  "user_id",
    Value: user.ID,
})

// ✅ RICHTIG
http.SetCookie(w, &http.Cookie{
    Name:     "session_id",
    Value:    generateSecureToken(),
    HttpOnly: true,
    Secure:   true,
    SameSite: http.SameSiteStrictMode,
})
```

**Bug 4: Information Disclosure**
```go
// ❌ FALSCH
fmt.Fprintf(w, "Password: %s", user.Password)

// ✅ RICHTIG
// Niemals Passwörter oder sensible Daten in Responses ausgeben
fmt.Fprintf(w, "Welcome %s!", user.Email)
```

**Bug 5: Broken Access Control**
```go
// ❌ FALSCH
cookie, _ := r.Cookie("user_id")
if cookie.Value != "" {
    // Access granted
}

// ✅ RICHTIG
session := validateSession(cookie.Value)
if session != nil && session.Role == "admin" {
    // Access granted
}
```

</details>

---

## Modul 9 — Abschluss (5 min)

### Q&A

Offene Fragen aus dem Team?

### Security Cheatsheet

```
┌─────────────────────────────────────────────────────────────────────┐
│                    ENGINEER'S SECURITY CHEATSHEET                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  AUTHENTICATION                                                     │
│  ✓ JWT validieren (signature, expiration, audience)                │
│  ✓ MFA für sensible Operationen                                    │
│  ✓ Session-Timeout konfigurieren                                   │
│                                                                     │
│  AUTHORIZATION                                                      │
│  ✓ Server-Side Checks NIEMALS nur Client-Side                      │
│  ✓ Tenant/User-Isolation prüfen                                    │
│  ✓ Least Privilege für Service Accounts                            │
│                                                                     │
│  DATA PROTECTION                                                    │
│  ✓ Input Validation an ALLEN Eingaben                              │
│  ✓ Parametrisierte Queries (kein String-Concat)                    │
│  ✓ Keine PII in Logs                                               │
│                                                                     │
│  SECRETS                                                            │
│  ✓ Nie im Code hardcoden                                           │
│  ✓ Vault/Environment Variables                                     │
│  ✓ Regelmäßige Rotation                                            │
│                                                                     │
│  INFRASTRUCTURE                                                     │
│  ✓ mTLS zwischen Services                                          │
│  ✓ NetworkPolicies konfigurieren                                   │
│  ✓ Read-only Filesystem, No Root                                   │
│                                                                     │
│  INCIDENT RESPONSE                                                  │
│  ✓ Sofort #security-incidents informieren                          │
│  ✓ Logs sichern, nicht löschen                                     │
│  ✓ Nicht alleine investigieren                                     │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Wichtige Kontakte

| Kontakt | Slack | Email |
|---------|-------|-------|
| Security Team | #security-team | security@cargobit.com |
| Incident Hotline | #security-incidents | +49-XXX-XXX-XXXX |
| Security On-Call | @security-oncall | PagerDuty |

### Reminder

```
╔═════════════════════════════════════════════════════════════════════╗
║                                                                     ║
║           SECURITY IST EIN TEAM-SPORT                              ║
║                                                                     ║
║  • Jeder ist verantwortlich                                        ║
║  • Fragen ist besser als Schweigen                                ║
║  • Melden ist kein Zeichen von Schwäche                           ║
║  • Wir lernen aus Fehlern                                          ║
║                                                                     ║
║  Danke für eure Aufmerksamkeit!                                    ║
║                                                                     ║
╚═════════════════════════════════════════════════════════════════════╝
```

---

## Dokument-Information

| Attribut | Wert |
|-----------|------|
| Owner | Security Team |
| Reviewer | Engineering Leads |
| Version | 1.0 |
| Häufigkeit | Quartalsweise |
| Nächster Termin | April 2025 |
