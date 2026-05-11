# CargoBit Data Retention & GDPR Matrix
Version 1.0
Internal Use Only

---

# 1. Purpose

Dieses Dokument definiert Aufbewahrungsfristen und GDPR-Konformität für alle Datenarten im CargoBit System. Es stellt sicher, dass Daten gemäß gesetzlichen Anforderungen und Unternehmensrichtlinien gespeichert und gelöscht werden.

---

# 2. Retention Matrix

| Data Type | Table | Retention | Legal Basis | Notes |
|-----------|-------|-----------|-------------|-------|
| Payments | Payment | 10 Jahre | Legal obligation (§147 AO) | Steuerrecht |
| Ledger Entries | LedgerEntry | 10 Jahre | Legal obligation | Unveränderbar |
| Transactions | Transaction | 10 Jahre | Legal obligation | Finanzrecht |
| Wallets | Wallet | Account lifetime | Contract | Bis Account-Löschung |
| Users | User | Account lifetime | Contract | DSGVO-konform |
| Audit Logs | AuditLog | 180 Tage | Legitimate interest | Hash-chain |
| Stripe Events | StripeEvent | 90 Tage | Legitimate interest | Idempotency |
| Backups | Backup files | 30 Tage | Legitimate interest | Verschlüsselt |
| API Logs | ApiLog | 30 Tage | Legitimate interest | Keine PII |
| Rate Limit Counters | Redis | 1 Stunde | Legitimate interest | Ephemeral |

---

# 3. GDPR Legal Bases

## 3.1 Art. 6 GDPR Bases

| Basis | Usage |
|-------|-------|
| Art. 6(1)(b) | Contract performance |
| Art. 6(1)(c) | Legal obligation |
| Art. 6(1)(f) | Legitimate interest |
| Art. 6(1)(a) | Consent (where applicable) |

## 3.2 Data Controller vs Processor

| Role | Entity |
|------|--------|
| Controller | CargoBit GmbH |
| Processor | Stripe (Payment) |
| Processor | AWS/Cloud Provider (Infrastructure) |

---

# 4. Data Categories

## 4.1 Personal Data

| Category | Data | Retention | Notes |
|----------|------|-----------|-------|
| User identification | email, name | Account lifetime | Minimiert |
| Authentication | password hash | Account lifetime | Gehasht |
| Financial | Transactions, payments | 10 Jahre | Legal requirement |

## 4.2 Non-Personal Data

| Category | Data | Retention |
|----------|------|-----------|
| System logs | Error logs, metrics | 30 Tage |
| Audit logs | System events | 180 Tage |
| Performance data | Metrics | 30 Tage |

---

# 5. GDPR Controls

## 5.1 Data Minimization

- Nur notwendige Daten speichern
- Keine PII in Logs
- Keine PII in Backups (wo möglich)
- Wallet-Daten ohne personenbezogene Infos

## 5.2 Purpose Limitation

- Daten nur für definierte Zwecke verwenden
- Keine Weitergabe an Dritte ohne Einwilligung
- Keine Zwecktrennung ohne Einwilligung

## 5.3 Storage Limitation

- Automatische Löschung nach Ablauf
- Regelmäßige Review-Zyklen
- Dokumentierte Ausnahmen

---

# 6. Data Subject Rights

## 6.1 Right to Access (Art. 15)

- Export aller personenbezogenen Daten
- Format: JSON/CSV
- Frist: 30 Tage

## 6.2 Right to Rectification (Art. 16)

- Korrektur fehlerhafter Daten
- Nicht anwendbar auf Ledger (immutable)

## 6.3 Right to Erasure (Art. 17)

- Löschung bei Account-Schließung
- Ausnahme: Finanzdaten (10 Jahre)
- Anonymisierung wo möglich

## 6.4 Right to Portability (Art. 20)

- Export im maschinenlesbaren Format
- Übertragung an Dritte möglich

---

# 7. Retention Enforcement

## 7.1 Automated Processes

| Process | Frequency | Action |
|---------|-----------|--------|
| Audit log cleanup | Daily | Delete > 180 days |
| StripeEvent cleanup | Daily | Delete > 90 days |
| Backup rotation | Daily | Delete > 30 days |
| API log cleanup | Daily | Delete > 30 days |

## 7.2 Manual Reviews

| Review | Frequency | Responsible |
|--------|-----------|-------------|
| Retention policy | Quarterly | Compliance Officer |
| Legal requirements | Annually | Legal Team |
| Exception handling | As needed | DPO |

---

# 8. Cross-Border Transfers

| Destination | Mechanism | Status |
|-------------|-----------|--------|
| EU | N/A | No transfer |
| USA (Stripe) | SCCs | Approved |
| Third countries | Case-by-case | Requires DPO approval |

---

# 9. Documentation Requirements

| Document | Location | Update Frequency |
|----------|----------|------------------|
| Record of Processing | DPO office | Quarterly |
| Data mapping | docs/data-mapping.md | Monthly |
| Retention policy | This document | Quarterly |
| DPA templates | legal/dpa-template.pdf | Annually |

---

# 10. Summary

Diese Matrix stellt sicher, dass alle Daten gemäß GDPR und gesetzlichen Anforderungen gespeichert und gelöscht werden.

---

# 11. Contact

Compliance Officer
CargoBit Internal
