# CargoBit API Deprecation Policy
Version 1.0
Internal & Partner Use

---

# 1. Purpose

Dieses Dokument definiert die Richtlinie für die Abschaffung (Deprecation) von API-Features. Es stellt sicher, dass Partner genügend Zeit haben, um auf neue Versionen zu migrieren.

---

# 2. Deprecation Principles

| Principle | Description |
|-----------|-------------|
| Predictability | Partners know what to expect |
| Notice period | Adequate time to migrate |
| Communication | Clear, timely notifications |
| Support | Help available during transition |

---

# 3. Deprecation Timeline

## 3.1 Standard Timeline

| Phase | Duration | Actions |
|-------|----------|---------|
| Announcement | Day 0 | Publish deprecation notice |
| Migration period | 90 days | Partners migrate |
| Sunset warning | Day 60 | Final reminder |
| Sunset | Day 90 | Feature disabled |

## 3.2 Expedited Timeline (Security)

| Phase | Duration | Actions |
|-------|----------|---------|
| Announcement | Day 0 | Immediate notice |
| Migration period | 14 days | Partners migrate |
| Sunset | Day 14 | Feature disabled |

---

# 4. Deprecation Notice

## 4.1 Announcement Template

```markdown
# API Deprecation Notice

**Feature:** [Feature name]
**Deprecation Date:** YYYY-MM-DD
**Sunset Date:** YYYY-MM-DD
**Reason:** [Reason for deprecation]

## Migration Guide
[Link to migration guide]

## Replacement
[Description of replacement feature]

## Support
Contact: api-support@cargobit.example.com
```

## 4.2 Notification Channels

| Channel | Timing |
|---------|--------|
| API response headers | From announcement |
| Email to partners | Announcement + reminders |
| Status page | From announcement |
| Documentation | Updated immediately |

## 4.3 Response Headers

```http
HTTP/1.1 200 OK
Deprecation: true
Sunset: Sat, 31 Mar 2024 23:59:59 GMT
Link: </v2/endpoint>; rel="successor-version"
```

---

# 5. Deprecation Process

## 5.1 Decision Criteria

| Criteria | Description |
|----------|-------------|
| Usage | Low usage makes deprecation easier |
| Replacement | New feature available |
| Security | Security issues accelerate timeline |
| Technical debt | Maintenance burden considered |

## 5.2 Approval Process

1. Engineering proposes deprecation
2. Product reviews partner impact
3. Partner team notified
4. Documentation updated
5. Announcement sent

---

# 6. Migration Support

## 6.1 Resources Provided

| Resource | Description |
|----------|-------------|
| Migration guide | Step-by-step instructions |
| Code examples | Sample code for new API |
| FAQ | Common questions answered |
| Support channel | Direct help available |

## 6.2 Partner Communication

| Communication | Timing |
|---------------|--------|
| Initial announcement | Day 0 |
| Reminder 1 | Day 30 |
| Reminder 2 | Day 60 |
| Final warning | Day 80 |

---

# 7. Breaking vs Non-Breaking Changes

## 7.1 Breaking Changes (Require Deprecation)

| Change Type | Example |
|-------------|---------|
| Remove endpoint | DELETE /v1/old-endpoint |
| Remove field | Remove "oldField" from response |
| Change field type | string → number |
| Change URL | /v1/pay → /v1/payments |

## 7.2 Non-Breaking Changes (No Deprecation Needed)

| Change Type | Example |
|-------------|---------|
| Add endpoint | POST /v1/new-endpoint |
| Add field | Add "newField" to response |
| Add optional parameter | Add optional query param |

---

# 8. Versioning

## 8.1 Version Lifecycle

| Stage | Duration | Support |
|-------|----------|---------|
| Current | Active | Full support |
| Deprecated | 90 days | Bug fixes only |
| Sunset | End | No support |

## 8.2 Version Support

| Version | Status | Support |
|---------|--------|---------|
| v1 | Current | Full |
| v0 | Deprecated | Bug fixes only |

---

# 9. Summary

Dieses Dokument definiert die Richtlinie für die Abschaffung von API-Features.

---

# 10. Contact

API Team
CargoBit Internal
