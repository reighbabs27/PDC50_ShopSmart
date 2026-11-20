# Server-side checks — 20 November 2026 (15:15–15:17 UTC)

Run on `shopsmart-demo` (i-034dd01c285ae5170, ap-southeast-2) over SSH from AWS CloudShell using a one-time EC2 Instance Connect key. Port 22 was opened to the CloudShell address for this run only, then the rule was revoked; the security group returned to 80/443 public and 22 from the EC2 Instance Connect prefix list. No secret values are shown below.

```
== USERDATA
USERDATA_EXIT=0
== C5 migrations
2 migrations found in prisma/migrations
Database schema is up to date!
== Services enabled at boot
enabled enabled enabled            (shopsmart-api nginx postgresql)
== Listening sockets
0.0.0.0:22 0.0.0.0:443 0.0.0.0:80 127.0.0.1:3000 127.0.0.1:5432 127.0.0.53%lo:53 127.0.0.54:53 [::]:22 [::]:443 [::]:80
== C1 restart
{"status":"ok","database":"ok","assistantProvider":"mock","uptimeSeconds":6,"version":"1.1.0","commit":"7331c33"}
order1 guest=401
orders in DB: 1
== C3 trace
{"error":{"code":"AUTH_REQUIRED","message":"Sign in to access this resource."}}
2026-11-20T15:15:55.117Z 21321f9f-6902-42c1-abab-66a7119710b6 GET /api/orders/1 401 0.748 ms
2026-11-20T15:15:55.453Z d5538b88-100d-4ced-8aa9-5c0de6c50486 POST /api/orders 401 0.608 ms
== C4 secret matches in logs (expect 0)
0
== B10 timeout rehearsal (MOCK_PROVIDER_BEHAVIOR=timeout, then removed)
{"answer":"Based on the current ShopSmart catalog, consider: Compact Mechanical Keyboard (₱1,850). ...",
 "recommendedProducts":[{"id":2,"name":"Compact Mechanical Keyboard","price":1850,"category":"Accessories"}],
 "provider":{"mode":"mock","label":"Simulated provider (mock adapter) — no live AI call is made","live":false,
   "status":"fallback","reason":"timeout",
   "notice":"The AI provider did not answer in time; the verified catalog answer is shown instead."}}
after revert:
{"status":"ok","database":"ok","assistantProvider":"mock","uptimeSeconds":6,"version":"1.1.0","commit":"7331c33"}
== Backup (shopsmart-backup)
shopsmart-20261120T151130Z.dump
shopsmart-20261120T151607Z.dump
```

What the sockets show: only 22, 80 and 443 listen on all interfaces. Express (3000) and PostgreSQL (5432) listen on 127.0.0.1 only, and the security group does not open them (smoke rows 7–8 confirm both are unreachable from the internet).

## C2 reboot

```
aws ec2 reboot-instances  → 15:16:26 UTC
/api/health ok again       → 15:16:51 UTC (uptimeSeconds 1)
smoke Run 2                → 27/27 passed (docs/evidence/smoke-2026-11-20T15-17-00-726Z.md)
```

## D1 / D2 repository checks (full clone of v1.1.0)

- D1 `git ls-files | grep -E "(^|/)\.env$"` → no output.
- D2 credentialed `postgresql://` URLs in history are documentation placeholders only: `shopsmart_dev`@localhost (README, `backend/.env.example`), `strong_password`@fictional host `ep-db.us-east-1.aws.neon.tech` (`SUBMISSION_QUALITY_DEPLOYMENT_CHALLENGE.md`), and `${DB_PASSWORD}` / `<generated-password>` templates. No real credential.

## npm run check (v1.1.0, AWS CloudShell, Node 20)

Lint clean · backend `node --test`: 39 tests, 39 pass, 0 fail · frontend Vitest: 8 passed · Vite build OK.
