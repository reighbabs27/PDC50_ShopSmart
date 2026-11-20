// Dependency-free helpers for ShopSmart customer sign-in.
// Kept free of Express/Prisma imports so they can be unit-tested directly.
import crypto from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(crypto.scrypt);

export const SESSION_COOKIE = 'shopsmart_session';
export const SESSION_TTL_SECONDS = 60 * 60 * 8; // 8 hours: long enough for a class demo

const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LENGTH = 64;

export async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const derived = await scrypt(password, salt, KEY_LENGTH, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P });
  return ['scrypt', SCRYPT_N, SCRYPT_R, SCRYPT_P, salt.toString('base64url'), derived.toString('base64url')].join('$');
}

export async function verifyPassword(password, stored) {
  if (typeof stored !== 'string') return false;
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const [, n, r, p, saltText, hashText] = parts;
  const expected = Buffer.from(hashText, 'base64url');
  const derived = await scrypt(password, Buffer.from(saltText, 'base64url'), expected.length, {
    N: Number(n), r: Number(r), p: Number(p)
  });
  return derived.length === expected.length && crypto.timingSafeEqual(derived, expected);
}

// A dummy hash so a login for an unknown email takes about as long as a real check.
let dummyHashPromise;
export function getDummyHash() {
  dummyHashPromise ??= hashPassword('not-a-real-password');
  return dummyHashPromise;
}

export function createSessionToken() {
  return crypto.randomBytes(32).toString('base64url');
}

// Only the hash of the token is stored in the database.
export function hashSessionToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function parseCookies(header) {
  const cookies = {};
  if (!header || typeof header !== 'string') return cookies;
  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index < 1) continue;
    const name = part.slice(0, index).trim();
    const raw = part.slice(index + 1).trim();
    if (!name || name in cookies) continue;
    try {
      cookies[name] = decodeURIComponent(raw);
    } catch {
      cookies[name] = raw;
    }
  }
  return cookies;
}

export function cookieSettingsFromEnv(env = process.env) {
  const production = env.NODE_ENV === 'production';
  const secure = env.COOKIE_SECURE ? env.COOKIE_SECURE === 'true' : production;
  const allowed = new Set(['strict', 'lax', 'none']);
  let sameSite = String(env.COOKIE_SAMESITE || 'lax').toLowerCase();
  if (!allowed.has(sameSite)) sameSite = 'lax';
  // Browsers reject SameSite=None cookies that are not Secure.
  if (sameSite === 'none' && !secure) sameSite = 'lax';
  return { secure, sameSite };
}

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function buildSessionCookie(token, { secure, sameSite }, maxAgeSeconds = SESSION_TTL_SECONDS) {
  const parts = [
    `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    `SameSite=${capitalize(sameSite)}`,
    `Max-Age=${maxAgeSeconds}`
  ];
  if (secure) parts.push('Secure');
  return parts.join('; ');
}

export function clearSessionCookie(settings) {
  return buildSessionCookie('', settings, 0);
}

// Authorization rule for private order records: only the owning customer may read.
// Orders with no owner (created before accounts existed) are readable by nobody.
export function canReadOrder(order, customer) {
  if (!order || !customer) return false;
  if (order.customerId === null || order.customerId === undefined) return false;
  return order.customerId === customer.id;
}

export function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

export function publicCustomer(customer) {
  if (!customer) return null;
  return { id: customer.id, name: customer.name, email: customer.email };
}
