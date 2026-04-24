h1. Security Checklist — Reconciliation Exports

- [ ] *Access Control* — Owner: @alice
  - [ ] Export API nur für Admins / autorisierte Service Accounts
  - [ ] RBAC Regeln dokumentiert

- [ ] *Signed URLs* — Owner: @alice
  - [ ] TTL konfiguriert (default 24h)
  - [ ] HTTPS enforced
  - [ ] Revocation procedure documented

- [ ] *Data Minimization / Masking* — Owner: @bob
  - [ ] Default export maskiert PII
  - [ ] PII export requires explicit flag + audit log

- [ ] *Audit Logging* — Owner: @bob
  - [ ] Log userId, jobId, filters, timestamp, IP
  - [ ] Logs immutable for 90 days

- [ ] *Encryption* — Owner: @infra.lead
  - [ ] S3 SSE-KMS or SSE-S3 enabled
  - [ ] TLS enforced for all endpoints

- [ ] *IAM Least Privilege* — Owner: @infra.lead
  - [ ] Worker role limited to s3:PutObject on exports/*
  - [ ] No wildcard permissions beyond scope

- [ ] *Retention & Lifecycle* — Owner: @product.owner
  - [ ] S3 lifecycle rule configured (delete after X days)
  - [ ] Customer configurable TTL documented

- [ ] *Input Validation* — Owner: @backend.lead
  - [ ] Filters parameterized; no SQL injection risk
  - [ ] Max rows/size limits enforced

- [ ] *Monitoring & Alerts* — Owner: @observability.lead
  - [ ] Alerts for unusual export volume per user
  - [ ] Alerts for repeated failures or large file sizes

- [ ] *Incident Playbook* — Owner: @sre.lead
  - [ ] Steps to revoke access, delete artifacts, rotate keys
  - [ ] Contact list for Security/Product

- [ ] *PenTest & Compliance* — Owner: @alice
  - [ ] Export endpoints included in next pentest
  - [ ] Legal signoff for cross-border exports
