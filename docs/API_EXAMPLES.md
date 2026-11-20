# ShopSmart API examples

Start the application with `npm run dev`, then send these requests through Bruno or another authorized API client.

## Health check

```http
GET http://localhost:3000/api/health
```

## Product list

```http
GET http://localhost:3000/api/products
```

## One product

```http
GET http://localhost:3000/api/products/1
```

## Create a simulated order

```http
POST http://localhost:3000/api/orders
Content-Type: application/json

{
  "customerName": "Ana Reyes",
  "email": "ana@example.com",
  "address": "Angeles City, Pampanga",
  "items": [
    { "productId": 1, "quantity": 1 },
    { "productId": 2, "quantity": 1 }
  ]
}
```

The server ignores prices from the browser and reads authoritative prices from PostgreSQL.

## Ask the starter assistant

```http
POST http://localhost:3000/api/assistant/questions
Content-Type: application/json

{
  "question": "Which keyboard is below ₱2,000?"
}
```

## v1.1.0: accounts and private orders

The session is an HttpOnly cookie, so use a cookie jar with curl (`-c`/`-b`). Fictional data only.

```bash
API=http://localhost:3000/api
# Register (or /auth/login with email + password)
curl -s -c jar.txt -H "Content-Type: application/json" \
  -d '{"name":"Juan Test","email":"juan.test@example.com","password":"demo-pass-123"}' $API/auth/register
# Who am I?
curl -s -b jar.txt $API/auth/me
# Place a simulated order (sign-in required; email comes from the account)
curl -s -b jar.txt -H "Content-Type: application/json" \
  -d '{"customerName":"Juan Test","address":"123 Test Street, Demo City","items":[{"productId":1,"quantity":1}]}' $API/orders
# My orders / one order (401 for guests, 404 if the order belongs to someone else)
curl -s -b jar.txt $API/orders
curl -s -b jar.txt $API/orders/1
# Sign out
curl -s -b jar.txt -c jar.txt -X POST -H "Content-Type: application/json" -d '{}' $API/auth/logout
```

`GET /api/health` → `{"status":"ok","database":"ok","assistantProvider":"mock","version":"1.1.0","commit":"…"}` (503 with `"database":"unreachable"` if PostgreSQL cannot be reached).
