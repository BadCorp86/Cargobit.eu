# CargoBit Security Gateway - Fehlercode-Katalog

## Übersicht

Dieses Dokument enthält alle Fehlercodes des Security Gateway mit Beschreibung, HTTP-Status und Recovery-Hinweisen.

---

## 1. Permission-Fehler (HTTP 403)

### PERMISSION_DENIED
| Feld | Wert |
|------|------|
| **HTTP Status** | 403 |
| **Kategorie** | permission |
| **Bedeutung** | Die User-Rolle ist nicht berechtigt, die angeforderte Aktion auszuführen. |
| **Recovery** | Prüfen Sie, ob die Rolle für diese Aktion vorgesehen ist. Konsultieren Sie die Permission Matrix. |

**Beispiel:**
```json
{
  "allowed": false,
  "decision": "permission_denied",
  "errorCode": "PERMISSION_DENIED",
  "message": "Role SHIPPER is not allowed to perform action ASSIGN_DRIVER.",
  "correlationId": "req-123"
}
```

---

### ROLE_NOT_ALLOWED
| Feld | Wert |
|------|------|
| **HTTP Status** | 403 |
| **Kategorie** | permission |
| **Bedeutung** | Die Aktion existiert, aber die Rolle ist explizit ausgeschlossen (z.B. MARKETER für Transport-Aktionen). |
| **Recovery** | Verwenden Sie eine andere Rolle oder kontaktieren Sie den Admin für Rollen-Erweiterung. |

**Beispiel:**
```json
{
  "allowed": false,
  "decision": "permission_denied",
  "errorCode": "ROLE_NOT_ALLOWED",
  "message": "Role MARKETER is explicitly excluded from all transport actions.",
  "correlationId": "req-456"
}
```

---

### INVALID_ROLE
| Feld | Wert |
|------|------|
| **HTTP Status** | 400 |
| **Kategorie** | permission |
| **Bedeutung** | Die angegebene Rolle existiert nicht im System. |
| **Recovery** | Verwenden Sie eine gültige Rolle: ADMIN, SUPPORT, SHIPPER, DISPATCHER, DRIVER, MARKETER. |

**Beispiel:**
```json
{
  "allowed": false,
  "decision": "error",
  "errorCode": "INVALID_ROLE",
  "message": "Unknown role: SUPERVISOR. Valid roles: ADMIN, SUPPORT, SHIPPER, DISPATCHER, DRIVER, MARKETER",
  "correlationId": "req-789"
}
```

---

## 2. Risk-Engine-Fehler (HTTP 403/503)

### HIGH_RISK_BLOCKED
| Feld | Wert |
|------|------|
| **HTTP Status** | 403 |
| **Kategorie** | risk_engine |
| **Bedeutung** | Der Risk Score ist ≥ 61 (RED). Die Aktion wurde blockiert und ein Support-Ticket erstellt. |
| **Recovery** | Der User muss den Support kontaktieren oder die kontextuellen Risikofaktoren ändern (z.B. IBAN verifizieren, KYC abschließen). |

**Beispiel:**
```json
{
  "allowed": false,
  "decision": "blocked",
  "risk": {
    "score": 81,
    "level": "RED",
    "triggeredRules": ["TX_HIGH_AMOUNT", "COMPANY_KYB_MISSING", "USER_NEW_IBAN"]
  },
  "errorCode": "HIGH_RISK_BLOCKED",
  "message": "Action blocked due to high risk. Case forwarded to support.",
  "supportTicketId": "st_1704067200000_ghi789",
  "correlationId": "req-abc"
}
```

---

### RISK_ENGINE_UNAVAILABLE
| Feld | Wert |
|------|------|
| **HTTP Status** | 503 |
| **Kategorie** | risk_engine |
| **Bedeutung** | Der Risk Engine Service ist nicht erreichbar. Das Fallback-Verhalten ist aktiviert. |
| **Recovery** | Wiederholen Sie die Anfrage nach kurzer Wartezeit. Wenn das Problem persists, kontaktieren Sie das Ops-Team. |

**Beispiel:**
```json
{
  "allowed": false,
  "decision": "blocked",
  "errorCode": "RISK_ENGINE_UNAVAILABLE",
  "message": "Risk Engine temporarily unavailable. Please retry.",
  "correlationId": "req-def"
}
```

---

### INVALID_RISK_CONTEXT
| Feld | Wert |
|------|------|
| **HTTP Status** | 400 |
| **Kategorie** | risk_engine |
| **Bedeutung** | Die Kontextdaten für die Risk-Bewertung sind unvollständig oder ungültig. |
| **Recovery** | Ergänzen Sie die fehlenden Kontextfelder (z.B. amount, currency, ibanAgeDays). |

**Beispiel:**
```json
{
  "allowed": false,
  "decision": "error",
  "errorCode": "INVALID_RISK_CONTEXT",
  "message": "Risk evaluation failed: Missing required context field 'amount' for transaction evaluation.",
  "correlationId": "req-ghi"
}
```

---

### RISK_RULE_ERROR
| Feld | Wert |
|------|------|
| **HTTP Status** | 500 |
| **Kategorie** | risk_engine |
| **Bedeutung** | Ein Fehler ist bei der Auswertung einer Risk-Regel aufgetreten. |
| **Recovery** | Kontaktieren Sie das Dev-Team mit der correlationId für Debugging. |

**Beispiel:**
```json
{
  "allowed": false,
  "decision": "error",
  "errorCode": "RISK_RULE_ERROR",
  "message": "Error evaluating rule TX_HIGH_AMOUNT: Division by zero in condition.",
  "correlationId": "req-jkl"
}
```

---

## 3. Request-Fehler (HTTP 400)

### INVALID_REQUEST
| Feld | Wert |
|------|------|
| **HTTP Status** | 400 |
| **Kategorie** | request |
| **Bedeutung** | Pflichtfelder fehlen im Request-Body. |
| **Recovery** | Ergänzen Sie alle required fields: requestId, user.id, user.role, action, entity.type, entity.id. |

**Beispiel:**
```json
{
  "allowed": false,
  "decision": "error",
  "errorCode": "INVALID_REQUEST",
  "message": "Missing required fields: user.id, action",
  "correlationId": "req-mno"
}
```

---

### INVALID_ACTION
| Feld | Wert |
|------|------|
| **HTTP Status** | 400 |
| **Kategorie** | request |
| **Bedeutung** | Die angegebene Aktion existiert nicht im System. |
| **Recovery** | Verwenden Sie eine gültige Aktion: CREATE_TRANSPORT, VIEW_TRANSPORT, ACCEPT_OFFER, etc. |

**Beispiel:**
```json
{
  "allowed": false,
  "decision": "error",
  "errorCode": "INVALID_ACTION",
  "message": "Unknown action: DELETE_USER. Valid actions: CREATE_TRANSPORT, ACCEPT_OFFER, INITIATE_PAYOUT, ...",
  "correlationId": "req-pqr"
}
```

---

### INVALID_ENTITY_TYPE
| Feld | Wert |
|------|------|
| **HTTP Status** | 400 |
| **Kategorie** | request |
| **Bedeutung** | Der angegebene Entity-Typ ist ungültig. |
| **Recovery** | Verwenden Sie einen gültigen Entity-Typ: user, company, transaction, transport, wallet, vehicle. |

**Beispiel:**
```json
{
  "allowed": false,
  "decision": "error",
  "errorCode": "INVALID_ENTITY_TYPE",
  "message": "Invalid entity type: product. Must be one of: user, company, transaction, transport, wallet, vehicle",
  "correlationId": "req-stu"
}
```

---

### MALFORMED_JSON
| Feld | Wert |
|------|------|
| **HTTP Status** | 400 |
| **Kategorie** | request |
| **Bedeutung** | Der Request-Body ist kein gültiges JSON. |
| **Recovery** | Korrigieren Sie die JSON-Syntax und senden Sie erneut. |

**Beispiel:**
```json
{
  "allowed": false,
  "decision": "error",
  "errorCode": "MALFORMED_JSON",
  "message": "Failed to parse JSON body: Unexpected token at position 42",
  "correlationId": "req-vwx"
}
```

---

## 4. Auth-Fehler (HTTP 401)

### UNAUTHORIZED
| Feld | Wert |
|------|------|
| **HTTP Status** | 401 |
| **Kategorie** | auth |
| **Bedeutung** | Der Service-Token fehlt oder ist ungültig. |
| **Recovery** | Fügen Sie einen gültigen JWT Bearer Token im Authorization-Header hinzu. |

**Beispiel:**
```json
{
  "allowed": false,
  "decision": "error",
  "errorCode": "UNAUTHORIZED",
  "message": "Missing or invalid service token",
  "correlationId": "req-yza"
}
```

---

### FORBIDDEN
| Feld | Wert |
|------|------|
| **HTTP Status** | 403 |
| **Kategorie** | auth |
| **Bedeutung** | Der Token ist gültig, aber der Service hat keine Berechtigung für diese Aktion. |
| **Recovery** | Verwenden Sie einen Token mit den erforderlichen Scopes. |

**Beispiel:**
```json
{
  "allowed": false,
  "decision": "error",
  "errorCode": "FORBIDDEN",
  "message": "Service does not have required scope: security:write",
  "correlationId": "req-bcd"
}
```

---

## 5. Rate-Limit-Fehler (HTTP 429)

### RATE_LIMIT_EXCEEDED
| Feld | Wert |
|------|------|
| **HTTP Status** | 429 |
| **Kategorie** | rate_limit |
| **Bedeutung** | Das globale Rate-Limit wurde überschritten (100 req/10s). |
| **Recovery** | Warten Sie die im Retry-After Header angegebene Zeit und reduzieren Sie die Request-Frequenz. |

**Response Headers:**
- `Retry-After`: Sekunden bis zum nächsten erlaubten Request
- `X-RateLimit-Limit`: Maximale Requests
- `X-RateLimit-Remaining`: 0
- `X-RateLimit-Reset`: Unix-Timestamp des Resets

**Beispiel:**
```json
{
  "allowed": false,
  "decision": "error",
  "errorCode": "RATE_LIMIT_EXCEEDED",
  "message": "Rate limit exceeded. Please slow down your requests.",
  "correlationId": "req-efg",
  "details": {
    "limit": 100,
    "windowMs": 10000,
    "retryAfter": 5
  }
}
```

---

### ACTION_RATE_LIMIT_EXCEEDED
| Feld | Wert |
|------|------|
| **HTTP Status** | 429 |
| **Kategorie** | rate_limit |
| **Bedeutung** | Das aktionsspezifische Rate-Limit wurde überschritten (z.B. 20 req/10s für INITIATE_PAYOUT). |
| **Recovery** | Warten Sie und reduzieren Sie die Frequenz für sensible Aktionen. |

**Beispiel:**
```json
{
  "allowed": false,
  "decision": "error",
  "errorCode": "ACTION_RATE_LIMIT_EXCEEDED",
  "message": "Rate limit for action INITIATE_PAYOUT exceeded. Maximum 20 requests per 10 seconds.",
  "correlationId": "req-hij",
  "details": {
    "action": "INITIATE_PAYOUT",
    "limit": 20,
    "windowMs": 10000,
    "retryAfter": 8
  }
}
```

---

## 6. System-Fehler (HTTP 500)

### INTERNAL_ERROR
| Feld | Wert |
|------|------|
| **HTTP Status** | 500 |
| **Kategorie** | system |
| **Bedeutung** | Ein unerwarteter interner Fehler ist aufgetreten. |
| **Recovery** | Kontaktieren Sie das Dev-Team mit der correlationId. Versuchen Sie es ggf. erneut. |

**Beispiel:**
```json
{
  "allowed": false,
  "decision": "error",
  "errorCode": "INTERNAL_ERROR",
  "message": "Internal server error. Please contact support.",
  "correlationId": "req-klm"
}
```

---

## Zusammenfassung

| Kategorie | HTTP Status | Codes |
|-----------|-------------|-------|
| Permission | 400, 403 | `PERMISSION_DENIED`, `ROLE_NOT_ALLOWED`, `INVALID_ROLE` |
| Risk Engine | 400, 403, 500, 503 | `HIGH_RISK_BLOCKED`, `RISK_ENGINE_UNAVAILABLE`, `INVALID_RISK_CONTEXT`, `RISK_RULE_ERROR` |
| Request | 400 | `INVALID_REQUEST`, `INVALID_ACTION`, `INVALID_ENTITY_TYPE`, `MALFORMED_JSON` |
| Auth | 401, 403 | `UNAUTHORIZED`, `FORBIDDEN` |
| Rate Limit | 429 | `RATE_LIMIT_EXCEEDED`, `ACTION_RATE_LIMIT_EXCEEDED` |
| System | 500 | `INTERNAL_ERROR` |

---

## Best Practices

1. **Immer correlationId loggen** - Für Debugging und Support-Tickets
2. **Retry-After Header respektieren** - Vermeidet weitere Rate-Limit-Verstöße
3. **Permission Matrix cachen** - Reduziert API-Calls
4. **Error Messages nicht parsen** - Nutzen Sie `errorCode` für Programmlogik
5. **Bei HIGH_RISK_BLOCKED** - User mit supportTicketId an Support verweisen
