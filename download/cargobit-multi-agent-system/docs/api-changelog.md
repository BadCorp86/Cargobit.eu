# CargoBit API Changelog
Version 1.0
Internal & Partner Use

---

# 1. Purpose

Dieses Dokument führt alle Änderungen an der CargoBit API. Es informiert Partner über neue Features, Änderungen und Abschaffungen.

---

# 2. Version History

## v1.0.0 (2024-01-15)

### Added
- Initial API release
- Payment creation endpoint (POST /v1/payments)
- Payment status endpoint (GET /v1/payments/:id)
- Payment list endpoint (GET /v1/payments)
- Wallet balance endpoint (GET /v1/wallets/:id)
- Wallet adjustment endpoint (POST /v1/wallets/:id/adjust)
- Payout creation endpoint (POST /v1/payouts)
- Payout status endpoint (GET /v1/payouts/:id)
- Webhook endpoint for Stripe events

### Features
- Idempotency key support for POST requests
- Rate limiting (100 requests/minute by default)
- Pagination for list endpoints
- Filtering and sorting support
- Correlation ID tracking

---

# 3. Upcoming Changes

## v1.1.0 (Planned)

### Added
- Batch payment processing
- Enhanced webhook retry logic
- Payment refund endpoint
- Improved error messages

### Changed
- Rate limit increase for Gold partners
- Optimized query performance

---

# 4. Deprecation Notices

Currently no deprecations.

---

# 5. Breaking Changes Policy

Breaking changes will:
- Be announced 90 days in advance
- Include migration guide
- Be versioned (new major version)

---

# 6. Changelog Format

Each entry follows this format:

```markdown
## vX.Y.Z (YYYY-MM-DD)

### Added
- New features

### Changed
- Changes to existing features

### Deprecated
- Features to be removed

### Removed
- Features removed in this version

### Fixed
- Bug fixes

### Security
- Security improvements
```

---

# 7. Notification Channels

| Channel | Use |
|---------|-----|
| Email | All changes |
| API headers | Deprecation notices |
| Status page | Major changes |
| Documentation | Detailed updates |

---

# 8. Summary

Dieses Dokument führt alle Änderungen an der CargoBit API.

---

# 9. Contact

API Team
CargoBit Internal
