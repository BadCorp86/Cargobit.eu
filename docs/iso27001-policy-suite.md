# ISO 27001 Policy Suite

**CargoBit Transport Platform**  
**Information Security Management System (ISMS)**  
**Dokument-ID:** POL-SUITE-2025-001  
**Klassifikation:** Intern – Alle Mitarbeiter  
**Datum:** 15. Januar 2025

---

## Policy-Übersicht

| Nr. | Policy | Owner | Review-Zyklus |
|-----|--------|-------|---------------|
| 1 | Information Security Policy | CISO | Jährlich |
| 2 | Access Control Policy | Security Team | Jährlich |
| 3 | Cryptography Policy | Security Team | Jährlich |
| 4 | Logging & Monitoring Policy | Security Team | Jährlich |
| 5 | Incident Response Policy | Security Team | Jährlich |
| 6 | Change Management Policy | DevOps Team | Jährlich |
| 7 | Supplier Security Policy | Procurement | Jährlich |
| 8 | Backup & Recovery Policy | Platform Team | Jährlich |
| 9 | Physical Security Policy | Facilities | Jährlich |
| 10 | Asset Management Policy | IT Team | Jährlich |
| 11 | Vulnerability Management Policy | Security Team | Jährlich |
| 12 | Secure Development Policy | Engineering | Jährlich |

---

## Policy 1: Information Security Policy

### 1. Zweck

Diese Policy etabliert den Rahmen für alle Informationssicherheitsaktivitäten bei CargoBit und definiert die Grundsätze zum Schutz unserer Informationswerte.

### 2. Geltungsbereich

Diese Policy gilt für:
- Alle Mitarbeiter, Auftragnehmer und Dritte
- Alle Informationssysteme, Daten und Prozesse
- Alle Standorte und Remote-Arbeitsplätze

### 3. Sicherheitsziele

| Ziel | Beschreibung |
|------|--------------|
| **Vertraulichkeit** | Schutz vor unbefugter Offenlegung |
| **Integrität** | Schutz vor unbefugter Modifikation |
| **Verfügbarkeit** | Sicherstellung der Systemverfügbarkeit |

### 4. Grundsätze

| Prinzip | Umsetzung |
|---------|-----------|
| Least Privilege | Zugriff nur nach Bedarf |
| Defense in Depth | Mehrschichtige Sicherheitskontrollen |
| Need-to-Know | Zugriff auf notwendige Informationen beschränkt |
| Accountability | Alle Aktionen nachvollziehbar |

### 5. Rollen & Verantwortlichkeiten

| Rolle | Verantwortung |
|-------|---------------|
| **CEO** | Oberste Verantwortung, Ressourcenbereitstellung |
| **CISO** | Policy-Entwicklung, Risiko-Management, Audit-Koordination |
| **Security Team** | Technische Controls, Incident Response, Monitoring |
| **Engineering** | Secure Development, Vulnerability Remediation |
| **Alle Mitarbeiter** | Einhaltung der Policies, Meldung von Vorfällen |

### 6. Risiko-Management

- Risikobewertung mindestens jährlich
- Risikoregister wird kontinuierlich gepflegt
- Risiken werden priorisiert und mitigiert
- Restrisiken werden dokumentiert

### 7. Compliance

- Einhaltung aller anwendbaren Gesetze und Vorschriften
- ISO 27001 Zertifizierung wird angestrebt
- Regelmäßige interne und externe Audits

### 8. Review

Diese Policy wird jährlich oder bei wesentlichen Änderungen überprüft.

| Version | Datum | Änderung | Genehmigt von |
|---------|-------|----------|---------------|
| 1.0 | 2025-01-15 | Erstellung | CISO |

---

## Policy 2: Access Control Policy

### 1. Zweck

Diese Policy definiert die Grundsätze und Verfahren für die Steuerung von Zugriffen auf Informationssysteme und Daten.

### 2. Geltungsbereich

Gilt für alle Benutzer, Systeme und Daten innerhalb der CargoBit-Plattform.

### 3. Zugriffsprinzipien

| Prinzip | Beschreibung |
|---------|--------------|
| **Least Privilege** | Minimale notwendige Berechtigungen |
| **Need-to-Know** | Zugriff nur auf benötigte Informationen |
| **Separation of Duties** | Kritische Funktionen erfordern mehrere Personen |

### 4. Authentifizierung

| Anforderung | Standard |
|-------------|----------|
| Passwort-Mindestlänge | 12 Zeichen |
| Passwort-Komplexität | Groß-/Kleinbuchstaben, Zahlen, Sonderzeichen |
| MFA | Pflichtig für alle Benutzer |
| MFA für Admin | Pflichtig für alle privilegierten Zugänge |
| Session-Timeout | 30 Minuten Inaktivität |

### 5. Autorisierung

| Mechanismus | Anwendung |
|-------------|-----------|
| **RBAC** | Rollenbasierte Zugriffssteuerung für alle Systeme |
| **ABAC** | Attributbasierte Steuerung für sensible Daten |
| **Service Accounts** | Minimale Berechtigungen, automatische Rotation |

### 6. Joiner/Mover/Leaver-Prozess

| Prozess | SLA |
|---------|-----|
| **Joiner** | Zugang vor erstem Arbeitstag eingerichtet |
| **Mover** | Anpassung innerhalb 24 Stunden |
| **Leaver** | Zugangssperrung am letzten Arbeitstag |

### 7. Access Reviews

| Typ | Häufigkeit | Verantwortlich |
|-----|------------|----------------|
| Benutzerzugriffe | Quartalsweise | Manager + IT |
| Privilegierte Zugänge | Monatlich | Security Team |
| Service Accounts | Quartalsweise | IT Team |

### 8. Durchsetzung

- Verstöße gegen diese Policy werden disziplinarisch geahndet
- Unbefugte Zugriffe sind sofort zu melden

---

## Policy 3: Cryptography Policy

### 1. Zweck

Diese Policy definiert die Anforderungen an den Einsatz kryptografischer Verfahren zum Schutz von Informationen.

### 2. Geltungsbereich

Gilt für alle Daten in Transit und at Rest innerhalb der CargoBit-Plattform.

### 3. Verschlüsselung in Transit

| Anforderung | Standard |
|-------------|----------|
| Mindestversion | TLS 1.2 |
| Empfohlen | TLS 1.3 |
| Intern | mTLS zwischen allen Services |
| Zertifikate | 90 Tage Gültigkeit, automatische Rotation |

### 4. Verschlüsselung at Rest

| Datentyp | Algorithmus |
|----------|-------------|
| Datenbanken | AES-256 |
| Object Storage | AES-256 mit KMS |
| Backups | AES-256 |
| Secrets | Vault Transit Encryption |

### 5. Key Management

| Aspekt | Anforderung |
|--------|-------------|
| Storage | HashiCorp Vault oder AWS KMS |
| Zugriff | RBAC-kontrolliert, auditiert |
| Rotation | Mindestens alle 12 Monate |
| Zerstörung | Kryptografisch sicher dokumentiert |

### 6. Zugelassene Algorithmen

| Typ | Zugelassen |
|-----|------------|
| Symmetrisch | AES-256-GCM |
| Asymmetrisch | RSA-4096, ECDSA P-384 |
| Hashing | SHA-384, SHA-512 |
| Key Derivation | PBKDF2, Argon2 |

### 7. Verbotene Algorithmen

- MD5 (nur für Checksummen)
- SHA-1
- DES, 3DES
- RC4
- Blowfish

---

## Policy 4: Logging & Monitoring Policy

### 1. Zweck

Diese Policy definiert die Anforderungen an Protokollierung und Überwachung zur Sicherstellung der Nachvollziehbarkeit und Erkennung von Sicherheitsvorfällen.

### 2. Geltungsbereich

Gilt für alle Systeme, Anwendungen und Netzwerkkomponenten.

### 3. Zu protokollierende Ereignisse

| Kategorie | Ereignisse |
|-----------|------------|
| Authentifizierung | Login/Logout, MFA, Token-Verwendung |
| Autorisierung | Berechtigungsänderungen, Access Reviews |
| Datenzugriff | CRUD-Operationen auf sensible Daten |
| Konfiguration | Alle Änderungen an Systemen |
| Sicherheit | Alerts, Incidents, Anomalien |

### 4. Log-Inhalte

Jeder Log-Eintrag muss enthalten:
- Zeitstempel (UTC, ISO 8601)
- Benutzer- oder Service-Identität
- Quell-IP und Standort
- Aktion und Ressource
- Ergebnis (Erfolg/Misserfolg)
- Correlation ID

### 5. Log-Schutz

| Anforderung | Umsetzung |
|-------------|-----------|
| Integrität | WORM-Storage, kryptografische Hashes |
| Zugriff | Beschränkt auf autorisiertes Personal |
| Verschlüsselung | TLS in Transit, AES-256 at Rest |

### 6. Retention

| Log-Typ | Aufbewahrung |
|---------|--------------|
| Audit Logs | 7 Jahre |
| Application Logs | 90 Tage |
| Security Logs | 24 Monate |
| Performance Logs | 30 Tage |

### 7. Monitoring

- 24/7 Überwachung kritischer Systeme
- Automatisierte Alerts für kritische Ereignisse
- SIEM-Integration für Korrelation

---

## Policy 5: Incident Response Policy

### 1. Zweck

Diese Policy definiert den Prozess zur Erkennung, Reaktion und Wiederherstellung bei Sicherheitsvorfällen.

### 2. Geltungsbereich

Gilt für alle Sicherheitsvorfälle, die CargoBit-Systeme oder Daten betreffen.

### 3. Severity-Klassifikation

| SEV | Definition | Reaktionszeit |
|-----|------------|---------------|
| **SEV1** | Kritisch - Komplettausfall, Datenleck | 15 Minuten |
| **SEV2** | Hoch - Teilweiser Ausfall, Sicherheitsverletzung | 30 Minuten |
| **SEV3** | Mittel - Signifikantes Ereignis | 2 Stunden |
| **SEV4** | Niedrig - Geringe Auswirkung | 24 Stunden |

### 4. Rollen

| Rolle | Verantwortung |
|-------|---------------|
| **Incident Commander** | Gesamtkoordination, Entscheidungen |
| **Technical Lead** | Technische Untersuchung |
| **Communications Lead** | Stakeholder-Kommunikation |

### 5. Response-Phasen

| Phase | Aktivitäten |
|-------|-------------|
| **Detection** | Identifikation, Triage, Klassifikation |
| **Containment** | Isolierung, Beweissicherung |
| **Eradication** | Bedrohung entfernen, Lücken schließen |
| **Recovery** | Systeme wiederherstellen, validieren |
| **Post-Incident** | Lessons Learned, Verbesserungen |

### 6. Kommunikation

| Zeitpunkt | Aktion |
|-----------|--------|
| Bei Incident-Start | Team benachrichtigen |
| Alle 15 Minuten | Status-Update (SEV1/SEV2) |
| Nach Containment | Stakeholder informieren |
| Nach Abschluss | Post-Incident Report |

### 7. Dokumentation

- Jeder Incident erhält ein Ticket
- Timeline wird fortlaufend dokumentiert
- Post-Incident Review innerhalb 5 Tagen

---

## Policy 6: Change Management Policy

### 1. Zweck

Diese Policy stellt sicher, dass alle Änderungen kontrolliert, dokumentiert und rückverfolgbar erfolgen.

### 2. Geltungsbereich

Gilt für alle Änderungen an Produktionssystemen, Konfigurationen und Sicherheitskontrollen.

### 3. Änderungskategorien

| Kategorie | Beschreibung | Genehmigung |
|-----------|--------------|-------------|
| **Standard** | Vorab genehmigt, geringes Risiko | Automatisch |
| **Normal** | Erfordert Review | CAB |
| **Emergency** | Kritisch, dringend | 2 autorisierte Personen |

### 4. 4-Eyes-Prinzip

- Alle Änderungen an Sicherheitskonfigurationen erfordern 4-Eyes-Prinzip
- Code-Changes erfordern Peer-Review
- Infrastructure-Changes erfordern DevOps-Approval

### 5. Versionierung

- Alle Konfigurationen in Git versioniert
- Meaningful Commit Messages
- Branch Protection für Production

### 6. Prozess

```
1. Änderungsantrag erstellen
2. Risiko-Bewertung durchführen
3. Review einholen
4. Genehmigung einholen
5. Implementierung planen
6. Durchführen mit Monitoring
7. Verifizieren
8. Dokumentieren
```

### 7. Notfall-Änderungen

- Dokumentation innerhalb 24 Stunden nachholen
- Post-Implementation-Review erforderlich

---

## Policy 7: Supplier Security Policy

### 1. Zweck

Diese Policy definiert die Sicherheitsanforderungen an externe Dienstleister und Lieferanten.

### 2. Geltungsbereich

Gilt für alle externen Anbieter mit Zugriff auf Systeme oder Daten.

### 3. Klassifizierung

| Stufe | Beschreibung | Anforderungen |
|-------|--------------|---------------|
| **Kritisch** | Zugang zu sensiblen Daten/Systemen | ISO 27001/SOC2, jährliches Assessment |
| **Wichtig** | Zugang zu internen Systemen | Security-Fragebogen, biennales Assessment |
| **Standard** | Kein Zugang zu sensiblen Daten | Grundlegende Prüfung |

### 4. Vor Vertragsabschluss

- Security-Assessment durchführen
- Zertifikate prüfen (ISO 27001, SOC 2)
- Referenzen einholen
- Risikobewertung dokumentieren

### 5. Vertragliche Anforderungen

| Anforderung | Standard |
|-------------|----------|
| Vertraulichkeit | NDA vor Datenaustausch |
| Incident-Meldung | Innerhalb 24 Stunden |
| Audit-Recht | In Verträgen verankert |
| Daten-Rückgabe | Bei Vertragsende |

### 6. Laufende Überwachung

- Jährliche Re-Evaluierung für kritische Anbieter
- Kontinuierliche Überwachung bei Cloud-Anbietern
- Sofortige Bewertung bei Sicherheitsvorfällen

---

## Policy 8: Backup & Recovery Policy

### 1. Zweck

Diese Policy stellt sicher, dass Daten regelmäßig gesichert und im Bedarfsfall wiederhergestellt werden können.

### 2. Geltungsbereich

Gilt für alle produktiven Daten und Systemkonfigurationen.

### 3. Backup-Anforderungen

| System | Frequenz | Typ |
|--------|----------|-----|
| Datenbanken | Täglich | Inkrementell |
| Datenbanken | Wöchentlich | Vollständig |
| Konfigurationen | Täglich | Vollständig |
| Secrets | Echtzeit | Replikation |

### 4. RTO/RPO-Ziele

| Priorität | RTO | RPO |
|-----------|-----|-----|
| Kritisch | 4 Stunden | 1 Stunde |
| Hoch | 8 Stunden | 4 Stunden |
| Mittel | 24 Stunden | 24 Stunden |
| Niedrig | 72 Stunden | 48 Stunden |

### 5. Storage

- Verschlüsselung: AES-256
- Standort: Getrennt von Produktionsumgebung
- Zugriff: Beschränkt auf autorisiertes Personal

### 6. Testing

| Test | Häufigkeit | Umfang |
|------|------------|--------|
| Integritätsprüfung | Täglich | Automatisch |
| Restore-Test | Wöchentlich | Stichprobe |
| Vollständiger Restore | Monatlich | Ein System |
| Disaster Recovery | Jährlich | Gesamtsystem |

### 7. Retention

| Backup-Typ | Aufbewahrung |
|------------|--------------|
| Täglich | 30 Tage |
| Wöchentlich | 12 Wochen |
| Monatlich | 12 Monate |

---

## Policy 9: Physical Security Policy

### 1. Zweck

Diese Policy definiert die Anforderungen an den physischen Schutz von Einrichtungen und IT-Assets.

### 2. Geltungsbereich

Gilt für alle physischen Standorte von CargoBit.

### 3. Zutrittskontrolle

| Bereich | Zugriff | Protokollierung |
|---------|---------|-----------------|
| Büro | Alle Mitarbeiter | Badge-Log |
| Serverraum | Autorisiertes Personal | Badge + PIN |
| Besucher | Escort erforderlich | Besucher-Log |

### 4. Besucher-Protokoll

- Anmeldung an der Reception
- Besucher-Ausweis sichtbar tragen
- Ständige Begleitung durch Mitarbeiter
- Ausweis-Rückgabe bei Verlassen

### 5. Serverräume

- Zugang nur mit ausdrücklicher Genehmigung
- Zwei-Personen-Regel bei physischem Zugang
- Alle Zugriffe protokollieren
- Umgebungskontrolle (Temperatur, Feuchtigkeit)

### 6. Asset-Schutz

- Laptops verschlossen aufbewahren
- Bildschirme sperren bei Verlassen
- Sensible Dokumente in Schränken

### 7. Cloud-Infrastruktur

- Physische Sicherheit durch Cloud-Provider
- Zertifizierungen prüfen (ISO 27001, SOC 2)

---

## Policy 10: Asset Management Policy

### 1. Zweck

Diese Policy definiert die Verwaltung aller Informations-Assets über deren gesamten Lebenszyklus.

### 2. Geltungsbereich

Gilt für alle Hardware-, Software- und Daten-Assets.

### 3. Asset-Inventar

| Attribut | Pflicht |
|----------|---------|
| Eindeutige ID | Ja |
| Typ | Ja |
| Owner | Ja |
| Klassifizierung | Ja |
| Standort | Ja |
| Status | Ja |

### 4. Klassifizierung

| Stufe | Beschreibung | Beispiele |
|-------|--------------|-----------|
| **Public** | Öffentlich verfügbar | Marketing-Material |
| **Internal** | Intern | Interne Docs |
| **Confidential** | Vertraulich | Kundendaten |
| **Restricted** | Hochgradig vertraulich | Secrets, Keys |

### 5. Ownership

Jedes Asset hat einen benannten Owner, der verantwortlich ist für:
- Klassifizierung
- Zugriffskontrolle
- Lebenszyklus-Management

### 6. Lebenszyklus

| Phase | Aktivitäten |
|-------|-------------|
| Anschaffung | Genehmigung, Dokumentation |
| Nutzung | Regelmäßige Überprüfung |
| Entsorgung | Sichere Löschung, Dokumentation |

### 7. Hardware-Entsorgung

- Daten sicher löschen (DoD-Standard)
- Zertifikat der Datenlöschung
- Entsorgung durch zertifizierten Anbieter

---

## Policy 11: Vulnerability Management Policy

### 1. Zweck

Diese Policy definiert den Umgang mit Sicherheitslücken in Systemen und Anwendungen.

### 2. Geltungsbereich

Gilt für alle Systeme, Anwendungen und Komponenten.

### 3. Scan-Zeitplan

| Typ | Häufigkeit | Tool |
|-----|------------|------|
| Infrastructure | Wöchentlich | Qualys |
| Container | Bei jedem Build | Trivy |
| Dependencies | Bei jedem Commit | Snyk |
| Web Applications | Monatlich | OWASP ZAP |

### 4. Priorisierung (CVSS)

| Severity | CVSS | SLA |
|----------|------|-----|
| Kritisch | 9.0-10.0 | 7 Tage |
| Hoch | 7.0-8.9 | 30 Tage |
| Mittel | 4.0-6.9 | 90 Tage |
| Niedrig | 0.1-3.9 | 180 Tage |

### 5. Remediation-Prozess

```
1. Vulnerability identifizieren
2. Risikobewertung durchführen
3. Priorisierung festlegen
4. Fix entwickeln/testen
5. In Produktion ausrollen
6. Verifizieren
7. Dokumentieren
```

### 6. Zero-Day-Prozess

- Sofortige Bewertung bei Bekanntwerden
- Workaround evaluieren
- Notfall-Patch-Prozess aktivieren
- Kommunikation an Stakeholder

### 7. Ausnahmen

- Dokumentierte Begründung
- Kompensierende Controls
- Review-Datum (max. 90 Tage)

---

## Policy 12: Secure Development Policy

### 1. Zweck

Diese Policy definiert Sicherheitsanforderungen im gesamten Software-Entwicklungslebenszyklus.

### 2. Geltungsbereich

Gilt für alle Software-Entwicklungsaktivitäten.

### 3. Secure SDLC

| Phase | Sicherheitsaktivität |
|-------|---------------------|
| Design | Threat Modeling |
| Entwicklung | Secure Coding, Code Review |
| Test | SAST, DAST, Dependency Scan |
| Deployment | Security Gates |
| Betrieb | Monitoring, Patching |

### 4. Threat Modeling

- Für neue Features und größere Änderungen
- Dokumentierte Bedrohungen und Gegenmaßnahmen
- Review durch Security Team

### 5. Code Review

- Alle Änderungen erfordern Peer-Review
- Security-fokussierte Reviews für sensible Bereiche
- Verwendung von Checklisten

### 6. Security Testing

| Typ | Tool | Zeitpunkt |
|-----|------|-----------|
| SAST | Semgrep | Bei jedem Commit |
| DAST | OWASP ZAP | Vor Release |
| Dependency | Snyk | Bei jedem Commit |
| Secrets | GitLeaks | Pre-Commit |
| Container | Trivy | Bei jedem Build |

### 7. Secure Coding

**Verpflichtend:**
- Input-Validation an allen Eingaben
- Parametrisierte Queries (kein String-Concat)
- Output-Encoding
- Keine Secrets im Code
- Sichere Session-Handhabung

**Verboten:**
- Hardcodierte Credentials
- Unvalidierte User-Input
- Unsichere Deserialisierung
- Debug-Informationen in Produktion

### 8. Dependency Management

- Nur genehmigte Paketquellen
- Regelmäßige Updates
- Lock-Files verpflichtend
- SBOM für alle Services

---

## Genehmigung

| Rolle | Name | Unterschrift | Datum |
|-------|------|--------------|-------|
| CISO | | | |
| CTO | | | |
| CEO | | | |

---

## Dokument-Information

| Attribut | Wert |
|-----------|------|
| Owner | CISO |
| Reviewer | Security Team, Legal |
| Version | 1.0 |
| Status | Aktiv |
| Nächster Review | 2026-01-15 |
