// NON-DESTRUCTIVE catalog seed, safe for a deployed database.
// Inserts only starter products whose name is not already in the catalog.
// It never deletes or changes orders, customers, prices or stock.
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { STARTER_PRODUCTS } from './catalog.js';

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.product.findMany({ select: { name: true } });
  const names = new Set(existing.map((product) => product.name));
  const missing = STARTER_PRODUCTS.filter((product) => !names.has(product.name));
  if (missing.length > 0) await prisma.product.createMany({ data: missing });
  console.log(`Catalog check: ${existing.length} product(s) already present, ${missing.length} added. No orders or customers were changed.`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; })
  .finally(async () => prisma.$disconnect());
