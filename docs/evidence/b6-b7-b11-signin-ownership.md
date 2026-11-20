# B6, B7, B11 — sign-in, private order, cookie flags (20 November 2026, ~15:30 UTC)

Run from AWS CloudShell with `curl` against the hosted API (https://shopsmart-13-210-209-254.sslip.io/api), the same requests the browser sends. Two fictional customers with `@example.com` addresses; passwords were random per run, never printed and not stored. The session token value is masked.

```
== B6 register fictional customer A (maria.santos.2207924897@example.com)
HTTP 201
== B11 Set-Cookie (token value masked)
set-cookie: shopsmart_session=<masked>; Path=/; HttpOnly; SameSite=Lax; Max-Age=28800; Secure
== B6 place simulated order as A
HTTP 201
order id 3 total 1850
== B6 owner opens /api/orders/3
HTTP 200
== sign out A
HTTP 204
== B7 register second fictional customer B (juan.delacruz.2207924897@example.com)
HTTP 201
== B7 B requests A's order /api/orders/3
{"error":{"code":"ORDER_NOT_FOUND","message":"No order with this number exists for your account."}}
HTTP 404
== B7 B's order list
{"orders":[]}
```

Result: B6 ✅ (order saved and readable by its owner), B7 ✅ (a second customer gets 404 with the expected message and an empty list), B11 ✅ (`HttpOnly; Secure; SameSite=Lax`, 8-hour lifetime).
