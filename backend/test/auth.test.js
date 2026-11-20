import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SESSION_COOKIE,
  buildSessionCookie,
  canReadOrder,
  clearSessionCookie,
  cookieSettingsFromEnv,
  createSessionToken,
  hashPassword,
  hashSessionToken,
  parseCookies,
  publicCustomer,
  verifyPassword
} from '../src/lib/auth.js';
import { isAllowedOrigin, allowedOrigins } from '../src/middleware/security.js';

test('passwords are hashed with a salt and verified', async () => {
  const first = await hashPassword('correct horse battery');
  const second = await hashPassword('correct horse battery');
  assert.notEqual(first, second, 'each hash uses a fresh salt');
  assert.ok(!first.includes('correct horse'), 'plain password never stored');
  assert.equal(await verifyPassword('correct horse battery', first), true);
  assert.equal(await verifyPassword('wrong password', first), false);
  assert.equal(await verifyPassword('anything', 'not-a-valid-hash'), false);
});

test('session tokens are random and only their hash is stored', () => {
  const token = createSessionToken();
  assert.notEqual(token, createSessionToken());
  const stored = hashSessionToken(token);
  assert.match(stored, /^[a-f0-9]{64}$/);
  assert.notEqual(stored, token);
});

test('order ownership: owner allowed, other customer and guest denied', () => {
  const order = { id: 7, customerId: 1 };
  assert.equal(canReadOrder(order, { id: 1 }), true);
  assert.equal(canReadOrder(order, { id: 2 }), false);
  assert.equal(canReadOrder(order, null), false);
  assert.equal(canReadOrder(null, { id: 1 }), false);
});

test('legacy orders with no owner are readable by nobody', () => {
  assert.equal(canReadOrder({ id: 3, customerId: null }, { id: 1 }), false);
});

test('cookie header parsing', () => {
  const cookies = parseCookies(`theme=dark; ${SESSION_COOKIE}=abc%20123; broken; =x`);
  assert.equal(cookies[SESSION_COOKIE], 'abc 123');
  assert.equal(cookies.theme, 'dark');
  assert.deepEqual(parseCookies(undefined), {});
});

test('session cookie is HttpOnly and Secure in production', () => {
  const settings = cookieSettingsFromEnv({ NODE_ENV: 'production' });
  assert.deepEqual(settings, { secure: true, sameSite: 'lax' });
  const cookie = buildSessionCookie('token', settings);
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /Secure/);
  assert.match(cookie, /SameSite=Lax/);
  assert.match(clearSessionCookie(settings), /Max-Age=0/);
});

test('SameSite=None is downgraded when the cookie is not Secure', () => {
  assert.equal(cookieSettingsFromEnv({ COOKIE_SAMESITE: 'none', COOKIE_SECURE: 'false' }).sameSite, 'lax');
  assert.equal(cookieSettingsFromEnv({ COOKIE_SAMESITE: 'none', COOKIE_SECURE: 'true' }).sameSite, 'none');
});

test('public customer view never includes the password hash', () => {
  const view = publicCustomer({ id: 1, name: 'Test Customer', email: 'test@example.com', passwordHash: 'scrypt$...' });
  assert.deepEqual(view, { id: 1, name: 'Test Customer', email: 'test@example.com' });
});

test('origin allow-list accepts the configured frontend only', () => {
  const origins = allowedOrigins({ FRONTEND_URL: 'https://shop.example.com/, http://localhost:5173' });
  assert.deepEqual(origins, ['https://shop.example.com', 'http://localhost:5173']);
  assert.equal(isAllowedOrigin('https://shop.example.com', origins), true);
  assert.equal(isAllowedOrigin('https://evil.example.net', origins), false);
  assert.equal(isAllowedOrigin(undefined, origins), true);
});
