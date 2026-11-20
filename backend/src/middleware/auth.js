import { prisma } from '../lib/prisma.js';
import { SESSION_COOKIE, hashSessionToken, parseCookies } from '../lib/auth.js';

// Attaches request.customer (or null) from the session cookie. Never throws for a
// missing or expired session; protected routes decide with requireCustomer.
export async function loadCustomer(request, _response, next) {
  request.customer = null;
  request.sessionId = null;
  try {
    const token = parseCookies(request.headers.cookie)[SESSION_COOKIE];
    if (!token) return next();
    const sessionId = hashSessionToken(token);
    const session = await prisma.session.findUnique({ where: { id: sessionId }, include: { customer: true } });
    if (!session) return next();
    if (session.expiresAt <= new Date()) {
      await prisma.session.delete({ where: { id: sessionId } }).catch(() => {});
      return next();
    }
    request.customer = session.customer;
    request.sessionId = sessionId;
    next();
  } catch (error) {
    next(error);
  }
}

export function requireCustomer(request, response, next) {
  if (!request.customer) {
    return response.status(401).json({ error: { code: 'AUTH_REQUIRED', message: 'Sign in to access this resource.' } });
  }
  next();
}

// Refuse to accept passwords over plain HTTP when REQUIRE_HTTPS=true.
// With TRUST_PROXY=true, request.secure reflects nginx's X-Forwarded-Proto header.
export function requireHttpsForCredentials(request, response, next) {
  if (process.env.REQUIRE_HTTPS === 'true' && !request.secure) {
    return response.status(400).json({
      error: { code: 'HTTPS_REQUIRED', message: 'Sign-in is only accepted over HTTPS.' }
    });
  }
  next();
}
