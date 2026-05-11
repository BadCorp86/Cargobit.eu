# CargoBit Partner Troubleshooting Guide
Version 1.0
Internal & Partner Use

---

# 1. Purpose

Dieses Dokument hilft Partnern bei der Diagnose und Lösung häufiger Probleme bei der CargoBit-Integration.

---

# 2. Common Issues

## 2.1 Authentication Errors

### Problem: 401 Unauthorized

**Symptoms:**
- API returns 401
- "Invalid API key" message

**Diagnosis:**
```bash
# Verify API key format
echo $API_KEY | grep -E "^sk_(live|test)_"

# Test API key
curl -H "Authorization: Bearer $API_KEY" \
  https://api.cargobit.example.com/v1/health
```

**Solutions:**
- Verify API key is correct
- Check for whitespace in key
- Ensure key is not expired
- Use correct key for environment

---

## 2.2 Webhook Issues

### Problem: Signature Validation Failed

**Symptoms:**
- 400 response on webhook endpoint
- "Invalid signature" error

**Diagnosis:**
```typescript
// Verify signature calculation
const signedPayload = `${timestamp}.${rawBody}`;
const expectedSignature = crypto
  .createHmac('sha256', webhookSecret)
  .update(signedPayload)
  .digest('hex');
```

**Solutions:**
- Use raw body for validation
- Verify webhook secret is correct
- Check timestamp is recent
- Compare signatures exactly

### Problem: Duplicate Events

**Symptoms:**
- Same event processed twice
- Duplicate records created

**Solutions:**
- Store processed event IDs
- Implement idempotency
- Check for existing records before processing

---

## 2.3 Rate Limiting

### Problem: 429 Too Many Requests

**Symptoms:**
- API returns 429
- "Rate limit exceeded" message

**Diagnosis:**
```bash
# Check rate limit headers
curl -I https://api.cargobit.example.com/v1/payments \
  -H "Authorization: Bearer $API_KEY"
# Look for X-RateLimit-Remaining
```

**Solutions:**
- Read Retry-After header
- Implement exponential backoff
- Reduce request frequency
- Request quota increase if needed

---

## 2.4 Payment Issues

### Problem: Payment Stuck in Pending

**Symptoms:**
- Payment status remains pending
- No webhook received

**Diagnosis:**
```bash
# Check payment status
curl https://api.cargobit.example.com/v1/payments/$PAYMENT_ID \
  -H "Authorization: Bearer $API_KEY"
```

**Solutions:**
- Verify webhook endpoint is accessible
- Check webhook logs
- Verify signature validation
- Contact support if issue persists

### Problem: Invalid Amount

**Symptoms:**
- 400 error on payment creation
- "Invalid amount" message

**Solutions:**
- Amount must be positive integer
- Amount is in cents (100 = €1.00)
- Check for minimum/maximum limits

---

## 2.5 Data Issues

### Problem: Balance Mismatch

**Symptoms:**
- Wallet balance doesn't match expected

**Diagnosis:**
```bash
# Get wallet details
curl https://api.cargobit.example.com/v1/wallets/$WALLET_ID \
  -H "Authorization: Bearer $API_KEY"

# Get ledger entries
curl "https://api.cargobit.example.com/v1/ledgers?walletId=$WALLET_ID" \
  -H "Authorization: Bearer $API_KEY"
```

**Solutions:**
- Reconcile ledger entries
- Check for pending transactions
- Contact support for investigation

---

# 3. Debugging Tools

## 3.1 API Request Logging

```typescript
// Log all API requests
const startTime = Date.now();
const response = await fetch(url, options);
const duration = Date.now() - startTime;

console.log({
  method: options.method,
  url,
  status: response.status,
  duration,
  correlationId: response.headers.get('X-Correlation-ID')
});
```

## 3.2 Webhook Logging

```typescript
// Log webhook details
app.post('/webhooks', (req, res) => {
  console.log({
    timestamp: new Date().toISOString(),
    eventType: req.body.type,
    eventId: req.body.id,
    signature: req.headers['stripe-signature']
  });
  // Process webhook
});
```

---

# 4. Getting Help

## 4.1 Information to Provide

| Information | Description |
|-------------|-------------|
| Correlation ID | From API response headers |
| Error message | Exact error text |
| Request details | URL, method, body |
| Timestamp | When issue occurred |
| Environment | Sandbox or production |

## 4.2 Support Channels

| Channel | Use Case |
|---------|----------|
| Email | Non-urgent issues |
| Partner portal | All issues |
| Emergency hotline | SEV-1 only |

---

# 5. Summary

Dieses Dokument hilft Partnern bei der Diagnose und Lösung häufiger Probleme.

---

# 6. Contact

Partner Support
CargoBit Internal
