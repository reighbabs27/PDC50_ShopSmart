import crypto from 'node:crypto';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import productsRouter from './routes/products.js';
import ordersRouter from './routes/orders.js';
import assistantRouter from './routes/assistant.js';
import authRouter from './routes/auth.js';
import healthRouter from './routes/health.js';
import { loadCustomer } from './middleware/auth.js';
import { allowedOrigins, createRequestGuard } from './middleware/security.js';

export function createApp() {
  const app = express();
  const origins = allowedOrigins();

  app.disable('x-powered-by');
  // Behind nginx (or another single proxy), trust its X-Forwarded-* headers so
  // request.secure and rate-limit client IPs are correct.
  if (process.env.TRUST_PROXY === 'true') app.set('trust proxy', 1);

  app.use(helmet());
  app.use(cors({
    origin: (origin, callback) => callback(null, !origin || origins.includes(origin)),
    credentials: true,
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
  }));
  app.use(express.json({ limit: '100kb' }));
  app.use((request, response, next) => { request.id = crypto.randomUUID(); response.setHeader('X-Request-ID', request.id); next(); });
  // Logs method, path, status and timing only: no bodies, cookies or headers, so no secrets.
  morgan.token('id', (request) => request.id);
  app.use(morgan(':date[iso] :id :method :url :status :response-time ms'));

  app.use('/api', createRequestGuard(origins));
  app.use('/api', loadCustomer);

  app.use('/api/health', healthRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/products', productsRouter);
  app.use('/api/orders', ordersRouter);
  app.use('/api/assistant', assistantRouter);
  app.use((_request, response) => response.status(404).json({ error: { code: 'ROUTE_NOT_FOUND', message: 'API route could not be found.' } }));
  app.use((error, request, response, _next) => {
    if (error?.type === 'entity.parse.failed') {
      return response.status(400).json({ error: { code: 'INVALID_JSON', message: 'Request body is not valid JSON.', traceId: request.id } });
    }
    if (error?.type === 'entity.too.large') {
      return response.status(413).json({ error: { code: 'PAYLOAD_TOO_LARGE', message: 'Request body is too large.', traceId: request.id } });
    }
    // Log the error name/code/message and stack, never request bodies (which may hold passwords).
    console.error(`[${request.id}] ${error?.name || 'Error'} ${error?.code || ''}: ${error?.message || ''}`);
    if (error?.stack && process.env.NODE_ENV !== 'production') console.error(error.stack);
    response.status(error.status || 500).json({ error: { code: error.code || 'INTERNAL_ERROR', message: error.status ? error.message : 'The server could not complete the request.', traceId: request.id } });
  });
  return app;
}
