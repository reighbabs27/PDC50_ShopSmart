import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { getProviderMode } from '../services/assistant.js';

const router = Router();
const startedAt = Date.now();

function releaseInfo() {
  return {
    version: process.env.APP_VERSION || '1.1.0',
    commit: process.env.GIT_COMMIT || 'unknown'
  };
}

// Liveness: the Node process answers. Says nothing about the database.
router.get('/live', (_request, response) => {
  response.json({ status: 'ok', ...releaseInfo() });
});

// Readiness: also proves the API can reach PostgreSQL and that migrations have run
// (the query touches the Customer table added by the latest migration).
router.get('/', async (_request, response) => {
  const body = {
    status: 'ok',
    database: 'ok',
    assistantProvider: getProviderMode(),
    uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
    ...releaseInfo()
  };
  try {
    await prisma.$queryRaw`SELECT 1`;
    await prisma.customer.findFirst({ select: { id: true } });
  } catch (error) {
    console.error('[health] database check failed:', error?.code || error?.name || 'unknown error');
    return response.status(503).json({ ...body, status: 'degraded', database: 'unreachable' });
  }
  response.json(body);
});

export default router;
