# CargoBit Webhook Security Checklist
Version 1.0
Internal Use Only

---

# 1. Purpose

Diese Checklist definiert die Sicherheitsanforderungen für alle Webhook-Endpunkte im CargoBit System. Sie stellt sicher, dass Webhooks sicher und zuverlässig verarbeitet werden.

---

# 2. Transport Security

- [ ] HTTPS only (no HTTP)
- [ ] TLS 1.2+ required
- [ ] Certificate valid
- [ ] No self-signed certificates in production

---

# 3. Signature Validation

- [ ] Signature header parsed correctly
- [ ] HMAC-SHA256 algorithm used
- [ ] Webhook secret from secure storage
- [ ] Signature computed correctly
- [ ] Constant-time comparison used
- [ ] Invalid signature returns 400 (not 500)
- [ ] Signature failures logged (not PII)

---

# 4. Raw Body Handling

- [ ] Raw body preserved for validation
- [ ] No body parsing before validation
- [ ] Content-Type ignored for validation
- [ ] Body encoding preserved

---

# 5. Timestamp Validation

- [ ] Timestamp extracted from signature header
- [ ] Current time compared
- [ ] Tolerance configured (default 5 minutes)
- [ ] Expired events rejected
- [ ] Clock skew considered

---

# 6. Idempotency

- [ ] Event ID extracted
- [ ] Duplicate detection implemented
- [ ] Event ID stored before processing
- [ ] Duplicate events return same response
- [ ] No duplicate side effects

---

# 7. Replay Protection

- [ ] Event ID stored after processing
- [ ] Previously processed events detected
- [ ] Retries within window handled
- [ ] Long-term replay prevention

---

# 8. Event Validation

- [ ] Event type validated
- [ ] Event structure validated
- [ ] Required fields checked
- [ ] Data types validated
- [ ] Unknown event types handled

---

# 9. Error Handling

- [ ] Validation errors return 400
- [ ] Processing errors return 500
- [ ] Errors logged with context
- [ ] No sensitive data in error responses
- [ ] Error response quick (< 1s)

---

# 10. Response

- [ ] 200 OK for successful processing
- [ ] Response sent within timeout
- [ ] No processing after response
- [ ] Response body minimal

---

# 11. Logging

- [ ] Event ID logged
- [ ] Event type logged
- [ ] Processing status logged
- [ ] Errors logged with context
- [ ] No PII in logs
- [ ] No secrets in logs

---

# 12. Monitoring

- [ ] Webhook count metric
- [ ] Success rate metric
- [ ] Latency metric
- [ ] Signature failure alerts
- [ ] Processing failure alerts

---

# 13. Testing

- [ ] Valid signature test
- [ ] Invalid signature test
- [ ] Expired timestamp test
- [ ] Duplicate event test
- [ ] Unknown event type test
- [ ] Large payload test
- [ ] Timeout test

---

# 14. Documentation

- [ ] Endpoint documented
- [ ] Expected events documented
- [ ] Error responses documented
- [ ] Retry behavior documented

---

# 15. Sign-Off

| Reviewer | Role | Date | Signature |
|----------|------|------|-----------|
| | Security | | |
| | Engineering Lead | | |

---

# 16. Summary

Diese Checklist stellt sicher, dass alle Webhooks sicher und zuverlässig verarbeitet werden.

---

# 17. Contact

Security Team
CargoBit Internal
