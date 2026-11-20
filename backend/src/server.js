import 'dotenv/config';
import { createApp } from './app.js';
import { prisma } from './lib/prisma.js';
import { getProviderMode } from './services/assistant.js';

const port = Number(process.env.PORT || 3000);
// In production set HOST=127.0.0.1 so the raw Node port is reachable only through nginx.
const host = process.env.HOST || '0.0.0.0';

const server = createApp().listen(port, host, () => {
  console.log(`ShopSmart API listening on ${host}:${port} (NODE_ENV=${process.env.NODE_ENV || 'development'}, assistant provider=${getProviderMode()})`);
});

// Remove expired sessions once an hour so the Session table does not grow forever.
const cleanup = setInterval(() => {
  prisma.session.deleteMany({ where: { expiresAt: { lt: new Date() } } })
    .catch((error) => console.error('[sessions] cleanup failed:', error?.code || error?.message));
}, 60 * 60 * 1000);
cleanup.unref();

async function shutdown(signal) {
  console.log(`${signal} received. Closing ShopSmart API.`);
  server.close(async () => { await prisma.$disconnect(); process.exit(0); });
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('unhandledRejection', (reason) => console.error('[process] unhandled rejection:', reason?.message || reason));
