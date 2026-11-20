// DESTRUCTIVE development seed: deletes ALL orders, sessions, customers and products,
// then inserts the starter catalog. Never use it to "fix" a deployed database.
// For a hosted database use `npm run db:seed:catalog` (non-destructive) instead.
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { STARTER_PRODUCTS } from './catalog.js';

if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DESTRUCTIVE_SEED !== 'true') {
  console.error('Refusing to run the destructive seed with NODE_ENV=production.');
  console.error('It would delete every order and customer. Use `npm run db:seed:catalog` instead.');
  process.exit(1);
}

const prisma = new PrismaClient();

async function main() {
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.session.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.product.deleteMany();
  await prisma.product.createMany({ data: STARTER_PRODUCTS });
  console.log(`Seeded ${STARTER_PRODUCTS.length} ShopSmart products (all previous data removed).`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; })
  .finally(async () => prisma.$disconnect());
