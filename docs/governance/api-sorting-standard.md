# CargoBit API Sorting Standard
Version 1.0
Internal & Partner Use

---

# 1. Purpose

Dieses Dokument definiert den Standard für das Sortieren in der CargoBit API. Es stellt sicher, dass alle Endpunkte konsistente Sortieroptionen bieten.

---

# 2. Sort Syntax

## 2.1 Basic Sort

```
?sort=field:direction
```

| Direction | Description |
|-----------|-------------|
| asc | Ascending (A-Z, 0-9, oldest first) |
| desc | Descending (Z-A, 9-0, newest first) |

## 2.2 Example

```http
GET /v1/payments?sort=createdAt:desc HTTP/1.1
```

---

# 3. Default Sort Order

| Endpoint | Default Sort |
|----------|--------------|
| /payments | createdAt:desc |
| /wallets | createdAt:desc |
| /payouts | createdAt:desc |
| /ledger | createdAt:asc |
| /audit-logs | createdAt:desc |

---

# 4. Sortable Fields

## 4.1 /payments

| Field | Sortable | Index |
|-------|----------|-------|
| createdAt | Yes | Yes |
| updatedAt | Yes | Yes |
| amount | Yes | Yes |
| status | Yes | No |
| currency | Yes | No |
| reference | Yes | No |

## 4.2 /wallets

| Field | Sortable | Index |
|-------|----------|-------|
| createdAt | Yes | Yes |
| updatedAt | Yes | Yes |
| balance | Yes | Yes |
| status | Yes | No |

## 4.3 /payouts

| Field | Sortable | Index |
|-------|----------|-------|
| createdAt | Yes | Yes |
| amount | Yes | Yes |
| status | Yes | No |

---

# 5. Multi-Field Sorting

## 5.1 Syntax

```
?sort=field1:direction,field2:direction
```

## 5.2 Example

```http
GET /v1/payments?sort=status:asc,createdAt:desc HTTP/1.1
```

This sorts by status ascending, then by createdAt descending within each status.

---

# 6. Sorting with Pagination

Sorting is applied before pagination:

```http
GET /v1/payments?sort=amount:desc&limit=10&offset=0 HTTP/1.1
```

Returns top 10 payments by amount.

---

# 7. Sorting with Filtering

Sorting is applied after filtering:

```http
GET /v1/payments?status=succeeded&sort=amount:desc HTTP/1.1
```

Returns succeeded payments sorted by amount.

---

# 8. Implementation

```typescript
function buildOrderBy(sortParam: string | undefined) {
  if (!sortParam) {
    return { createdAt: 'desc' as const }; // Default
  }
  
  const sortFields = sortParam.split(',');
  
  return sortFields.reduce((acc, field) => {
    const [fieldName, direction = 'asc'] = field.split(':');
    acc[fieldName] = direction as 'asc' | 'desc';
    return acc;
  }, {} as Record<string, 'asc' | 'desc'>);
}

// Usage
const orderBy = buildOrderBy('amount:desc,createdAt:asc');

const payments = await db.payment.findMany({
  where: filters,
  orderBy,
  take: limit,
  skip: offset
});
```

---

# 9. Error Handling

## 9.1 Invalid Sort Field

```json
{
  "error": {
    "type": "ValidationError",
    "code": "ERR_SORT_INVALID",
    "message": "Invalid sort field: invalidField",
    "details": {
      "allowedFields": ["createdAt", "amount", "status"]
    }
  }
}
```

## 9.2 Invalid Sort Direction

```json
{
  "error": {
    "type": "ValidationError",
    "code": "ERR_SORT_INVALID",
    "message": "Invalid sort direction: invalid",
    "details": {
      "allowedDirections": ["asc", "desc"]
    }
  }
}
```

---

# 10. Performance Considerations

## 10.1 Indexed Fields

- Sorting by indexed fields is efficient
- Non-indexed fields may be slower for large datasets

## 10.2 Complex Sorts

- Multi-field sorts may be slower
- Consider adding indexes for common sort patterns

---

# 11. Best Practices

## 11.1 For Partners

| Practice | Description |
|----------|-------------|
| Use default when possible | Optimized for common cases |
| Sort by indexed fields | Better performance |
| Combine with pagination | Limit result size |
| Be consistent | Use same sort for related queries |

---

# 12. Summary

Dieses Dokument definiert den Standard für das Sortieren in der CargoBit API.

---

# 13. Contact

API Team
CargoBit Internal
