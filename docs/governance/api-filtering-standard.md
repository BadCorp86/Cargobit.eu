# CargoBit API Filtering Standard
Version 1.0
Internal & Partner Use

---

# 1. Purpose

Dieses Dokument definiert den Standard für das Filtern in der CargoBit API. Es stellt sicher, dass alle Endpunkte konsistente Filteroptionen bieten.

---

# 2. Filter Syntax

## 2.1 Basic Filters

```
?field=value
```

Example:
```http
GET /v1/payments?status=succeeded HTTP/1.1
```

## 2.2 Multiple Filters

```
?field1=value1&field2=value2
```

Example:
```http
GET /v1/payments?status=succeeded&currency=EUR HTTP/1.1
```

---

# 3. Filter Operators

## 3.1 Comparison Operators

| Operator | Syntax | Example |
|----------|--------|---------|
| Equals | field=value | status=succeeded |
| Not equals | field[ne]=value | status[ne]=failed |
| Greater than | field[gt]=value | amount[gt]=1000 |
| Less than | field[lt]=value | amount[lt]=10000 |
| Greater or equal | field[gte]=value | amount[gte]=1000 |
| Less or equal | field[lte]=value | amount[lte]=10000 |

## 3.2 Date Operators

| Operator | Syntax | Example |
|----------|--------|---------|
| After | createdAfter=ISO8601 | createdAfter=2024-01-01T00:00:00Z |
| Before | createdBefore=ISO8601 | createdBefore=2024-01-31T23:59:59Z |
| On date | createdOn=YYYY-MM-DD | createdOn=2024-01-15 |

## 3.3 List Operators

| Operator | Syntax | Example |
|----------|--------|---------|
| In list | field[in]=a,b,c | status[in]=pending,succeeded |
| Not in list | field[nin]=a,b,c | status[nin]=failed,canceled |

---

# 4. Supported Filters by Endpoint

## 4.1 /payments

| Filter | Type | Operators |
|--------|------|-----------|
| status | string | eq, ne, in, nin |
| currency | string | eq, ne, in, nin |
| amount | integer | eq, ne, gt, lt, gte, lte |
| createdAt | datetime | after, before, on |
| reference | string | eq, ne |
| userId | string | eq, ne |

## 4.2 /wallets

| Filter | Type | Operators |
|--------|------|-----------|
| status | string | eq, ne, in, nin |
| currency | string | eq, ne |
| userId | string | eq, ne |

## 4.3 /payouts

| Filter | Type | Operators |
|--------|------|-----------|
| status | string | eq, ne, in, nin |
| amount | integer | eq, ne, gt, lt, gte, lte |
| createdAt | datetime | after, before, on |
| walletId | string | eq, ne |

---

# 5. Filter Examples

## 5.1 Status Filter

```http
GET /v1/payments?status=succeeded HTTP/1.1
```

## 5.2 Amount Range

```http
GET /v1/payments?amount[gte]=1000&amount[lte]=10000 HTTP/1.1
```

## 5.3 Date Range

```http
GET /v1/payments?createdAfter=2024-01-01T00:00:00Z&createdBefore=2024-01-31T23:59:59Z HTTP/1.1
```

## 5.4 Multiple Statuses

```http
GET /v1/payments?status[in]=pending,succeeded HTTP/1.1
```

## 5.5 Combined Filters

```http
GET /v1/payments?status=succeeded&currency=EUR&amount[gte]=1000&createdAfter=2024-01-01 HTTP/1.1
```

---

# 6. Implementation

```typescript
function buildWhereClause(filters: Record<string, any>) {
  const where: any = {};
  
  for (const [field, value] of Object.entries(filters)) {
    // Handle operators
    if (field.includes('[')) {
      const [fieldName, operator] = field.split(/[\[\]]/).filter(Boolean);
      
      switch (operator) {
        case 'gt':
          where[fieldName] = { ...where[fieldName], gt: value };
          break;
        case 'lt':
          where[fieldName] = { ...where[fieldName], lt: value };
          break;
        case 'gte':
          where[fieldName] = { ...where[fieldName], gte: value };
          break;
        case 'lte':
          where[fieldName] = { ...where[fieldName], lte: value };
          break;
        case 'ne':
          where[fieldName] = { not: value };
          break;
        case 'in':
          where[fieldName] = { in: value.split(',') };
          break;
        case 'nin':
          where[fieldName] = { notIn: value.split(',') };
          break;
      }
    } else {
      // Simple equality
      where[field] = value;
    }
  }
  
  return where;
}
```

---

# 7. Error Handling

## 7.1 Invalid Filter

```json
{
  "error": {
    "type": "ValidationError",
    "code": "ERR_FILTER_INVALID",
    "message": "Invalid filter field: invalidField",
    "details": {
      "allowedFilters": ["status", "currency", "amount"]
    }
  }
}
```

---

# 8. Best Practices

## 8.1 For Partners

| Practice | Description |
|----------|-------------|
| Use available filters | Reduce data transfer |
| Combine with pagination | Handle large result sets |
| Validate client-side | Provide good UX |

## 8.2 Performance

- Filters applied at database level
- Indexed fields filtered efficiently
- Combined with pagination

---

# 9. Summary

Dieses Dokument definiert den Standard für das Filtern in der CargoBit API.

---

# 10. Contact

API Team
CargoBit Internal
