#!/usr/bin/env node
// Hosted verification for the ShopSmart AWS deployment guide.
// Runs the customer-journey checks against the ACTUAL deployed addresses and writes a
// markdown evidence file with URLs, status codes and the running code version.
//
//   npm run smoke -- https://shopsmart-13-250-10-20.sslip.io
//   npm run smoke -- https://main.d1234.amplifyapp.com --api https://api.example.com/api
//   options: --skip-ports  (skip the "internal ports are closed" probe)
//
// Uses only fictional data: it registers two throw-away customers with random
// @example.com addresses and places one simulated order of quantity 1.
// Passwords are generated per run and are never printed or written to the report.
import crypto from 'node:crypto';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';

const args = process.argv.slice(2);
const positional = args.filter((arg, index) => !arg.startsWith('--') && args[index - 1] !== '--api');
const BASE = (positional[0] || '').replace(/\/+$/, '');
const apiFlag = args.indexOf('--api');
const API = (apiFlag >= 0 ? args[apiFlag + 1] : `${BASE}/api`).replace(/\/+$/, '');
const SKIP_PORTS = args.includes('--skip-ports');

if (!/^https?:\/\//.test(BASE)) {
  console.error('Usage: npm run smoke -- <https://frontend-url> [--api <https://api-url/api>] [--skip-ports]');
  process.exit(2);
}

const results = [];
let context = {};

function record(area, check, expected, ok, observed, url = '') {
  results.push({ area, check, expected, ok, observed: String(observed).slice(0, 220), url });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${area} — ${check}: ${observed}`);
}

function client() {
  let cookie = '';
  return {
    get cookie() { return cookie; },
    async call(method, url, body, extra = {}) {
      const response = await fetch(url, {
        method,
        redirect: extra.redirect || 'follow',
        signal: AbortSignal.timeout(extra.timeoutMs || 20000),
        headers: { ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}) },
        body: body !== undefined ? JSON.stringify(body) : undefined
      });
      const setCookies = typeof response.headers.getSetCookie === 'function' ? response.headers.getSetCookie() : [];
      for (const header of setCookies) {
        const pair = header.split(';')[0];
        if (pair.startsWith('shopsmart_session=')) cookie = pair.endsWith('=') ? '' : pair;
      }
      const text = await response.text();
      let json = null;
      try { json = JSON.parse(text); } catch { /* not JSON */ }
      return { status: response.status, headers: response.headers, text, json, setCookies };
    }
  };
}

async function safe(area, check, expected, fn) {
  try {
    await fn();
  } catch (error) {
    record(area, check, expected, false, `error: ${error.name}: ${error.message}`);
  }
}

function portIsClosed(host, port) {
  return new Promise((resolve) => {
    const socket = net.connect({ host, port, timeout: 4000 });
    socket.on('connect', () => { socket.destroy(); resolve(false); });
    socket.on('timeout', () => { socket.destroy(); resolve(true); });
    socket.on('error', () => resolve(true));
  });
}

const guest = client();
const owner = client();
const other = client();
const stamp = Date.now().toString(36);
const password = () => crypto.randomBytes(18).toString('base64url');

console.log(`ShopSmart smoke test\n  frontend: ${BASE}\n  api:      ${API}\n`);

// 1. Frontend and direct route
await safe('Frontend', 'Home page loads', '200 + React root', async () => {
  const res = await guest.call('GET', `${BASE}/`);
  record('Frontend', 'Home page loads', '200 + React root', res.status === 200 && res.text.includes('id="root"'), `HTTP ${res.status}`, `${BASE}/`);
  context.indexHtml = res.text;
});
for (const route of ['/assistant', '/account', '/orders/1']) {
  await safe('Frontend', `Direct visit ${route}`, '200 index.html (SPA rewrite)', async () => {
    const res = await guest.call('GET', `${BASE}${route}`);
    record('Frontend', `Direct visit ${route}`, '200 index.html (SPA rewrite)', res.status === 200 && res.text.includes('id="root"'), `HTTP ${res.status}`, `${BASE}${route}`);
  });
}

// 2. HTTPS and network path
await safe('HTTPS', 'Frontend and API use HTTPS', 'https:// for both', async () => {
  const ok = BASE.startsWith('https://') && API.startsWith('https://');
  record('HTTPS', 'Frontend and API use HTTPS', 'https:// for both', ok, ok ? 'both HTTPS' : 'plain HTTP in use (mixed content / password risk)');
});
if (BASE.startsWith('https://')) {
  await safe('HTTPS', 'HTTP redirects to HTTPS', '301/308 to https://', async () => {
    const httpUrl = BASE.replace('https://', 'http://') + '/';
    const res = await guest.call('GET', httpUrl, undefined, { redirect: 'manual', timeoutMs: 8000 });
    const location = res.headers.get('location') || '';
    record('HTTPS', 'HTTP redirects to HTTPS', '301/308 to https://', [301, 302, 307, 308].includes(res.status) && location.startsWith('https://'), `HTTP ${res.status} → ${location || 'no Location'}`, httpUrl);
  });
}
if (!SKIP_PORTS) {
  const apiHost = new URL(API).hostname;
  for (const port of [3000, 5432]) {
    await safe('Network', `Port ${port} closed to the internet`, 'connection refused or timed out', async () => {
      const closed = await portIsClosed(apiHost, port);
      record('Network', `Port ${port} closed to the internet`, 'connection refused or timed out', closed, closed ? 'not reachable (good)' : 'REACHABLE — tighten the security group', `${apiHost}:${port}`);
    });
  }
}

// 3. API health
await safe('API', '/api/health', '200 status ok, database ok', async () => {
  const res = await guest.call('GET', `${API}/health`);
  const body = res.json || {};
  context.version = body.version; context.commit = body.commit; context.provider = body.assistantProvider;
  record('API', '/api/health', '200 status ok, database ok', res.status === 200 && body.status === 'ok' && body.database === 'ok',
    `HTTP ${res.status} status=${body.status} database=${body.database} version=${body.version} commit=${body.commit} provider=${body.assistantProvider}`, `${API}/health`);
});

// 4. Catalog
await safe('Catalog', 'Products load from PostgreSQL', '200 with ≥1 product', async () => {
  const res = await guest.call('GET', `${API}/products`);
  context.products = res.json?.products || [];
  record('Catalog', 'Products load from PostgreSQL', '200 with ≥1 product', res.status === 200 && context.products.length > 0, `HTTP ${res.status}, ${context.products.length} products`, `${API}/products`);
});
await safe('Catalog', 'Search filters results', '200, every result matches', async () => {
  const res = await guest.call('GET', `${API}/products?search=keyboard`);
  const list = res.json?.products || [];
  const ok = res.status === 200 && list.every((p) => `${p.name} ${p.description}`.toLowerCase().includes('keyboard'));
  record('Catalog', 'Search filters results', '200, every result matches', ok, `HTTP ${res.status}, ${list.length} result(s)`, `${API}/products?search=keyboard`);
});

// 5. Account and order ownership
await safe('Account', 'Guest is refused private orders', '401 AUTH_REQUIRED', async () => {
  const res = await guest.call('GET', `${API}/orders`);
  record('Account', 'Guest is refused private orders', '401 AUTH_REQUIRED', res.status === 401, `HTTP ${res.status} ${res.json?.error?.code || ''}`, `${API}/orders`);
});
await safe('Account', 'Guest cannot place an order', '401 AUTH_REQUIRED', async () => {
  const product = context.products?.[0];
  const res = await guest.call('POST', `${API}/orders`, { customerName: 'Smoke Guest', address: '123 Test Street, Demo City', items: [{ productId: product?.id || 1, quantity: 1 }] });
  record('Account', 'Guest cannot place an order', '401 AUTH_REQUIRED', res.status === 401, `HTTP ${res.status} ${res.json?.error?.code || ''}`, `${API}/orders`);
});
for (const [label, who] of [['A (owner)', owner], ['B (other)', other]]) {
  await safe('Account', `Register fictional customer ${label}`, '201 + HttpOnly session cookie', async () => {
    const email = `smoke-${label[0].toLowerCase()}-${stamp}@example.com`;
    const res = await who.call('POST', `${API}/auth/register`, { name: `Smoke Customer ${label[0]}`, email, password: password() });
    const cookie = res.setCookies.find((c) => c.startsWith('shopsmart_session=')) || '';
    const flags = ['HttpOnly', API.startsWith('https://') ? 'Secure' : null, 'SameSite'].filter(Boolean);
    const ok = res.status === 201 && flags.every((flag) => cookie.includes(flag));
    record('Account', `Register fictional customer ${label}`, '201 + HttpOnly session cookie', ok, `HTTP ${res.status}, cookie flags: ${flags.filter((f) => cookie.includes(f)).join(', ') || 'none'}`, `${API}/auth/register`);
  });
}

// 6. Simulated checkout
const inStock = (context.products || []).filter((p) => p.stock > 0);
await safe('Checkout', 'Excess quantity refused', '409 INSUFFICIENT_STOCK (or 422 above max 20)', async () => {
  const product = inStock.find((p) => p.stock < 20) || inStock[0];
  const quantity = Math.min(product.stock + 1, 21);
  const res = await owner.call('POST', `${API}/orders`, { customerName: 'Smoke Customer A', address: '123 Test Street, Demo City', items: [{ productId: product.id, quantity }] });
  record('Checkout', 'Excess quantity refused', '409 INSUFFICIENT_STOCK (or 422 above max 20)', [409, 422].includes(res.status), `qty ${quantity} of stock ${product.stock}: HTTP ${res.status} ${res.json?.error?.code || ''}`, `${API}/orders`);
});
await safe('Checkout', 'Invalid order refused', '422 INVALID_ORDER', async () => {
  const res = await owner.call('POST', `${API}/orders`, { customerName: 'X', address: 'short', items: [] });
  record('Checkout', 'Invalid order refused', '422 INVALID_ORDER', res.status === 422, `HTTP ${res.status} ${res.json?.error?.code || ''}`, `${API}/orders`);
});
await safe('Checkout', 'Valid fictional order saved', '201 with order id', async () => {
  const product = inStock[0];
  const res = await owner.call('POST', `${API}/orders`, { customerName: 'Smoke Customer A', address: '123 Test Street, Demo City', items: [{ productId: product.id, quantity: 1 }] });
  context.orderId = res.json?.id;
  const totalOk = res.json && Number(res.json.total) === Number(product.price);
  record('Checkout', 'Valid fictional order saved', '201 with order id', res.status === 201 && Boolean(context.orderId) && totalOk, `HTTP ${res.status}, order #${context.orderId}, total ₱${res.json?.total}`, `${API}/orders`);
});

// 7. Server authorization on the private record
await safe('Ownership', 'Owner reads own order', '200', async () => {
  const res = await owner.call('GET', `${API}/orders/${context.orderId}`);
  record('Ownership', 'Owner reads own order', '200', res.status === 200 && res.json?.id === context.orderId, `HTTP ${res.status}`, `${API}/orders/${context.orderId}`);
});
await safe('Ownership', 'Another customer is denied (direct API request)', '404 ORDER_NOT_FOUND', async () => {
  const res = await other.call('GET', `${API}/orders/${context.orderId}`);
  record('Ownership', 'Another customer is denied (direct API request)', '404 ORDER_NOT_FOUND', res.status === 404, `HTTP ${res.status} ${res.json?.error?.code || ''}`, `${API}/orders/${context.orderId}`);
});
await safe('Ownership', "Another customer's list excludes the order", '200 without that id', async () => {
  const res = await other.call('GET', `${API}/orders`);
  const ids = (res.json?.orders || []).map((o) => o.id);
  record('Ownership', "Another customer's list excludes the order", '200 without that id', res.status === 200 && !ids.includes(context.orderId), `HTTP ${res.status}, ${ids.length} order(s)`, `${API}/orders`);
});
await safe('Ownership', 'Guest is refused the order', '401', async () => {
  const res = await guest.call('GET', `${API}/orders/${context.orderId}`);
  record('Ownership', 'Guest is refused the order', '401', res.status === 401, `HTTP ${res.status}`, `${API}/orders/${context.orderId}`);
});

// 8. Assistant
await safe('Assistant', 'Supported question is grounded', 'products and prices match catalog', async () => {
  const res = await guest.call('POST', `${API}/assistant/questions`, { question: 'Which keyboard is below ₱2,000?' });
  const catalog = new Map((context.products || []).map((p) => [p.id, p]));
  const recs = res.json?.recommendedProducts || [];
  const grounded = recs.length > 0 && recs.every((r) => catalog.has(r.id) && Number(catalog.get(r.id).price) === Number(r.price));
  record('Assistant', 'Supported question is grounded', 'products and prices match catalog', res.status === 200 && grounded,
    `HTTP ${res.status}, ${recs.map((r) => `#${r.id} ₱${r.price}`).join(', ') || 'none'}; provider=${res.json?.provider?.mode}/${res.json?.provider?.status}`, `${API}/assistant/questions`);
  context.assistantLabel = res.json?.provider?.label;
});
await safe('Assistant', 'No match is clear', '200 with 0 products', async () => {
  const res = await guest.call('POST', `${API}/assistant/questions`, { question: 'Do you have any refrigerators?' });
  record('Assistant', 'No match is clear', '200 with 0 products', res.status === 200 && (res.json?.recommendedProducts || []).length === 0, `HTTP ${res.status}: ${res.json?.answer}`, `${API}/assistant/questions`);
});
await safe('Assistant', 'Invalid input refused', '422 INVALID_QUESTION', async () => {
  const res = await guest.call('POST', `${API}/assistant/questions`, { question: 'hi' });
  record('Assistant', 'Invalid input refused', '422 INVALID_QUESTION', res.status === 422, `HTTP ${res.status} ${res.json?.error?.code || ''}`, `${API}/assistant/questions`);
});

// 9. Secrets in browser files
await safe('Secrets', 'No secret in browser bundle', 'no DB URL / keys in JS', async () => {
  const scripts = [...(context.indexHtml || '').matchAll(/src="([^"]+\.js)"/g)].map((m) => new URL(m[1], `${BASE}/`).href);
  const patterns = [/postgres(?:ql)?:\/\//i, /DATABASE_URL/, /GEMINI_API_KEY/, /AIza[0-9A-Za-z_-]{20,}/, /sk-[A-Za-z0-9]{20,}/, /PRIVATE KEY/];
  const hits = [];
  for (const url of scripts) {
    const res = await guest.call('GET', url);
    for (const pattern of patterns) if (pattern.test(res.text)) hits.push(`${pattern} in ${url}`);
  }
  record('Secrets', 'No secret in browser bundle', 'no DB URL / keys in JS', scripts.length > 0 && hits.length === 0, scripts.length ? (hits.join('; ') || `${scripts.length} bundle(s) clean`) : 'no bundle found');
});

// 10. Sign-out
await safe('Account', 'Sign-out ends the session', '204, then /auth/me returns null', async () => {
  const res = await owner.call('POST', `${API}/auth/logout`, {});
  const me = await owner.call('GET', `${API}/auth/me`);
  record('Account', 'Sign-out ends the session', '204, then /auth/me returns null', res.status === 204 && me.json?.customer === null, `logout HTTP ${res.status}, me=${JSON.stringify(me.json?.customer)}`, `${API}/auth/logout`);
});

// Report
const passed = results.filter((r) => r.ok).length;
const now = new Date();
const lines = [
  `# ShopSmart hosted smoke test — ${now.toISOString()}`,
  '',
  `- Frontend URL: ${BASE}`,
  `- API URL: ${API}`,
  `- Code version: ${context.version || 'unknown'} (commit ${context.commit || 'unknown'})`,
  `- Assistant provider: ${context.provider || 'unknown'}${context.assistantLabel ? ` — "${context.assistantLabel}"` : ''}`,
  `- Result: **${passed}/${results.length} checks passed**`,
  '',
  '| # | Area | Check | Expected | Observed | Result | URL |',
  '|---|---|---|---|---|---|---|',
  ...results.map((r, i) => `| ${i + 1} | ${r.area} | ${r.check} | ${r.expected} | ${r.observed.replaceAll('|', '\\|')} | ${r.ok ? 'PASS' : '**FAIL**'} | ${r.url} |`),
  '',
  'Test data: two throw-away customers with random @example.com addresses and one simulated order of quantity 1. Passwords were generated per run and not recorded.',
  ''
];
const dir = path.join(process.cwd(), 'docs', 'evidence');
fs.mkdirSync(dir, { recursive: true });
const file = path.join(dir, `smoke-${now.toISOString().replace(/[:.]/g, '-')}.md`);
fs.writeFileSync(file, lines.join('\n'));
console.log(`\n${passed}/${results.length} passed. Evidence written to ${path.relative(process.cwd(), file)}`);
process.exit(passed === results.length ? 0 : 1);
