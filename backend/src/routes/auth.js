import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { prisma } from '../lib/prisma.js';
import {
  SESSION_TTL_SECONDS,
  buildSessionCookie,
  clearSessionCookie,
  cookieSettingsFromEnv,
  createSessionToken,
  getDummyHash,
  hashPassword,
  hashSessionToken,
  publicCustomer,
  verifyPassword
} from '../lib/auth.js';
import { requireHttpsForCredentials } from '../middleware/auth.js';
import { loginSchema, registerSchema } from '../validators/schemas.js';

const router = Router();

const credentialLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: (_request, response) => response.status(429).json({
    error: { code: 'RATE_LIMITED', message: 'Too many sign-in attempts. Wait a few minutes and try again.' }
  })
});

async function startSession(response, customerId) {
  const token = createSessionToken();
  await prisma.session.create({
    data: { id: hashSessionToken(token), customerId, expiresAt: new Date(Date.now() + SESSION_TTL_SECONDS * 1000) }
  });
  response.setHeader('Set-Cookie', buildSessionCookie(token, cookieSettingsFromEnv()));
}

router.get('/me', (request, response) => {
  response.json({ customer: publicCustomer(request.customer) });
});

router.post('/register', requireHttpsForCredentials, credentialLimiter, async (request, response, next) => {
  try {
    const parsed = registerSchema.safeParse(request.body);
    if (!parsed.success) {
      return response.status(422).json({
        error: { code: 'INVALID_REGISTRATION', message: 'Enter a name, a valid email and a password of 8 to 72 characters.' }
      });
    }
    const { name, email, password } = parsed.data;
    const existing = await prisma.customer.findUnique({ where: { email } });
    if (existing) {
      return response.status(409).json({ error: { code: 'EMAIL_TAKEN', message: 'An account with this email already exists.' } });
    }
    const customer = await prisma.customer.create({ data: { name, email, passwordHash: await hashPassword(password) } });
    await startSession(response, customer.id);
    response.status(201).json({ customer: publicCustomer(customer) });
  } catch (error) {
    if (error?.code === 'P2002') {
      return response.status(409).json({ error: { code: 'EMAIL_TAKEN', message: 'An account with this email already exists.' } });
    }
    next(error);
  }
});

router.post('/login', requireHttpsForCredentials, credentialLimiter, async (request, response, next) => {
  try {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      return response.status(422).json({ error: { code: 'INVALID_LOGIN', message: 'Enter your email and password.' } });
    }
    const customer = await prisma.customer.findUnique({ where: { email: parsed.data.email } });
    const valid = await verifyPassword(parsed.data.password, customer?.passwordHash ?? await getDummyHash());
    if (!customer || !valid) {
      return response.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Email or password is incorrect.' } });
    }
    await startSession(response, customer.id);
    response.json({ customer: publicCustomer(customer) });
  } catch (error) {
    next(error);
  }
});

router.post('/logout', async (request, response, next) => {
  try {
    if (request.sessionId) {
      await prisma.session.deleteMany({ where: { id: request.sessionId } });
    }
    response.setHeader('Set-Cookie', clearSessionCookie(cookieSettingsFromEnv()));
    response.status(204).end();
  } catch (error) {
    next(error);
  }
});

export default router;
