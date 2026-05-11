# CargoBit API Pagination Standard
Version 1.0
Internal & Partner Use

---

# 1. Purpose

Dieses Dokument definiert den Standard für die Paginierung in der CargoBit API. Es stellt sicher, dass alle Endpunkte ein konsistentes Paginierungsverhalten aufweisen.

---

# 2. Pagination Methods

| Method | Use Case | Performance |
|--------|----------|-------------|
| Offset-based | Simple navigation | Good for small datasets |
| Cursor-based | Large datasets | Consistent performance |

---

# 3. Offset-Based Pagination

## 3.1 Request Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| limit | integer | 20 | Items per page (max 100) |
| offset | integer | 0 | Starting position |

## 3.2 Example Request

```http
GET /v1/payments?limit=50&offset=100 HTTP/1.1
Host: api.cargobit.example.com
Authorization: Bearer sk_live_abc123...
```

## 3.3 Response Format

```json
{
  "data": [
    { "paymentId": "pay_001", ... },
    { "paymentId": "pay_002", ... }
  ],
  "pagination": {
    "total": 500,
    "limit": 50,
    "offset": 100,
    "hasMore": true
  }
}
```

---

# 4. Cursor-Based Pagination

## 4.1 Request Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| limit | integer | 20 | Items per page (max 100) |
| cursor | string | null | Position marker |

## 4.2 Example Request

```http
GET /v1/payments?limit=50 HTTP/1.1

GET /v1/payments?limit=50&cursor=cGF5XzEwMA== HTTP/1.1
```

## 4.3 Response Format

```json
{
  "data": [
    { "paymentId": "pay_101", ... },
    { "paymentId": "pay_102", ... }
  ],
  "pagination": {
    "hasMore": true,
    "nextCursor": "cGF5XzE1MA==",
    "prevCursor": "cGF5XzEwMA=="
  }
}
```

---

# 5. Pagination Limits

## 5.1 Maximum Limits

| Endpoint | Default | Maximum |
|----------|---------|---------|
| /payments | 20 | 100 |
| /wallets | 20 | 100 |
| /payouts | 20 | 100 |
| /ledger | 50 | 200 |

## 5.2 Limit Handling

- Exceeding maximum → Returns maximum
- Negative limit → Returns 400 error
- Zero limit → Returns empty data

---

# 6. Sorting with Pagination

## 6.1 Default Sort

| Endpoint | Default Sort |
|----------|--------------|
| /payments | createdAt DESC |
| /wallets | createdAt DESC |
| /payouts | createdAt DESC |
| /ledger | createdAt ASC |

## 6.2 Custom Sort with Pagination

```http
GET /v1/payments?limit=50&sort=amount:desc HTTP/1.1
```

---

# 7. Filtering with Pagination

```http
GET /v1/payments?limit=50&status=succeeded HTTP/1.1
```

Filters are applied before pagination, so `total` reflects filtered count.

---

# 8. Best Practices

## 8.1 For Partners

| Practice | Description |
|----------|-------------|
| Use cursor for large datasets | Consistent performance |
| Respect hasMore | Stop when false |
| Handle empty pages | Check data.length |
| Use appropriate limit | Balance speed vs. load |

## 8.2 Pagination Implementation

```typescript
async function getPayments(params: PaginationParams) {
  const { limit = 20, offset = 0 } = params;
  
  const [data, total] = await Promise.all([
    db.payment.findMany({
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' }
    }),
    db.payment.count()
  ]);
  
  return {
    data,
    pagination: {
      total,
      limit,
      offset,
      hasMore: offset + limit < total
    }
  };
}
```

---

# 9. Error Handling

## 9.1 Invalid Parameters

```json
{
  "error": {
    "type": "ValidationError",
    "code": "ERR_PAGINATION_INVALID",
    "message": "Invalid pagination parameters",
    "details": {
      "limit": "Must be between 1 and 100"
    }
  }
}
```

---

# 10. Summary

Dieses Dokument definiert den Standard für die Paginierung in der CargoBit API.

---

# 11. Contact

API Team
CargoBit Internal
