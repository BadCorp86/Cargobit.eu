# Request for Comments (RFC) Template
Version 1.0
Internal Use Only

---

# RFC-{NUMBER}: {TITLE}

## Metadata

| Field | Value |
|-------|-------|
| Status | Draft / In Review / Approved / Rejected |
| Author | Name |
| Reviewers | Names |
| Created | YYYY-MM-DD |
| Target Decision | YYYY-MM-DD |

---

## Summary

A brief summary of the proposal (2-3 sentences).

---

## Motivation

### Problem Statement

What problem are we trying to solve?

- Current situation
- Pain points
- Impact of not solving

### Goals

What are we trying to achieve?

- Goal 1
- Goal 2
- Goal 3

### Non-Goals

What are we explicitly NOT trying to solve?

- Non-goal 1
- Non-goal 2

---

## Proposal

### Overview

High-level description of the proposed solution.

### Technical Design

Detailed technical specification.

```
┌─────────────────────────────────────────────────────────────┐
│                    ARCHITECTURE DIAGRAM                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   [Component diagrams, flow charts, etc.]                    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### API Changes

If applicable, describe API changes.

```typescript
// New endpoint
POST /v1/new-endpoint

// Request
{
  "field": "value"
}

// Response
{
  "result": "value"
}
```

### Database Changes

If applicable, describe database changes.

```sql
-- New table
CREATE TABLE "NewTable" (
  id TEXT PRIMARY KEY,
  field TEXT NOT NULL
);
```

### Security Considerations

How does this affect security?

- New attack vectors
- Mitigation strategies
- Required security reviews

---

## Alternatives

### Alternative 1: {Name}

**Description:** Brief description

**Why not chosen:** Reason

### Alternative 2: {Name}

**Description:** Brief description

**Why not chosen:** Reason

---

## Risks

### Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Risk 1 | High/Medium/Low | High/Medium/Low | How to mitigate |
| Risk 2 | High/Medium/Low | High/Medium/Low | How to mitigate |

### Business Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Risk 1 | High/Medium/Low | High/Medium/Low | How to mitigate |

---

## Impact

### Performance

- Expected performance impact
- Mitigation if negative

### Compatibility

- Breaking changes
- Migration path
- Backward compatibility

### Operations

- New monitoring requirements
- New runbooks needed
- Training requirements

---

## Rollout Plan

### Phase 1: Preparation

- [ ] Task 1
- [ ] Task 2

### Phase 2: Implementation

- [ ] Task 1
- [ ] Task 2

### Phase 3: Validation

- [ ] Task 1
- [ ] Task 2

### Phase 4: Rollout

- [ ] Task 1
- [ ] Task 2

### Rollback Plan

How to roll back if needed?

1. Step 1
2. Step 2

---

## Timeline

| Milestone | Date | Owner |
|-----------|------|-------|
| RFC Approval | YYYY-MM-DD | Name |
| Implementation Start | YYYY-MM-DD | Name |
| Testing Complete | YYYY-MM-DD | Name |
| Production Deploy | YYYY-MM-DD | Name |

---

## Open Questions

1. Question 1
   - Owner: Name
   - Due: Date

2. Question 2
   - Owner: Name
   - Due: Date

---

## Appendix

Additional supporting information, data, or analysis.

---

# Example RFC

---

# RFC-001: Implement Webhook Retry Logic

## Metadata

| Field | Value |
|-------|-------|
| Status | Approved |
| Author | Backend Lead |
| Reviewers | Chief Architect, SRE Lead |
| Created | 2024-01-10 |
| Target Decision | 2024-01-12 |

---

## Summary

Implement exponential backoff retry logic for failed webhook deliveries to improve reliability and reduce manual intervention.

---

## Motivation

### Problem Statement

Currently, when webhook delivery fails (network issues, partner downtime), the event is logged but not retried. This results in:
- Partners missing critical payment events
- Manual reconciliation required
- Increased support burden
- SLA breaches

### Goals

- Automatic retry of failed webhooks
- Configurable retry policy
- Visibility into retry status
- Partner notification on persistent failures

### Non-Goals

- Real-time retry monitoring dashboard (future)
- Partner-configurable retry policies

---

## Proposal

### Overview

Implement a retry queue with exponential backoff for failed webhook deliveries. Events will be retried up to 5 times over 72 hours.

### Technical Design

```
┌─────────────────────────────────────────────────────────────┐
│                    WEBHOOK RETRY FLOW                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   Webhook Received                                           │
│        │                                                     │
│        ▼                                                     │
│   Attempt Delivery ──► Success ──► Done                     │
│        │                                                     │
│        ▼ Failed                                              │
│   Calculate Next Retry (exponential backoff)                 │
│        │                                                     │
│        ▼                                                     │
│   Store in Retry Queue                                       │
│        │                                                     │
│        ▼                                                     │
│   Cron Job processes retries                                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Retry Schedule

| Attempt | Delay |
|---------|-------|
| 1 | 1 minute |
| 2 | 5 minutes |
| 3 | 30 minutes |
| 4 | 2 hours |
| 5 | 24 hours |

### Database Changes

```sql
ALTER TABLE "StripeEvent" ADD COLUMN retryCount INTEGER DEFAULT 0;
ALTER TABLE "StripeEvent" ADD COLUMN nextRetryAt TIMESTAMP;
```

---

## Risks

### Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Queue overflow | Low | High | Rate limit retries |
| Infinite retry | Medium | Medium | Max 5 attempts |

---

## Timeline

| Milestone | Date | Owner |
|-----------|------|-------|
| RFC Approval | 2024-01-12 | Backend Lead |
| Implementation | 2024-01-15 | Backend Team |
| Testing | 2024-01-17 | QA Team |
| Production | 2024-01-18 | DevOps |

---

## Open Questions

1. Should we notify partners after N failures?
   - Owner: Product Owner
   - Due: 2024-01-11
