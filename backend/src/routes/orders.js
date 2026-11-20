import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { canReadOrder } from '../lib/auth.js';
import { requireCustomer } from '../middleware/auth.js';
import { orderIdSchema, orderSchema } from '../validators/schemas.js';

const router = Router();

function serializeOrder(order) {
  return {
    id: order.id,
    customerName: order.customerName,
    email: order.email,
    address: order.address,
    status: order.status,
    total: Number(order.total),
    createdAt: order.createdAt,
    items: (order.items || []).map((item) => ({
      id: item.id,
      productId: item.productId,
      productName: item.product?.name,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice)
    }))
  };
}

// Every order belongs to the signed-in customer who placed it.
router.post('/', requireCustomer, async (request, response, next) => {
  try {
    const parsed = orderSchema.safeParse(request.body);
    if (!parsed.success) return response.status(422).json({ error: { code: 'INVALID_ORDER', message: 'Check the customer and cart information.', details: parsed.error.flatten() } });

    const productIds = [...new Set(parsed.data.items.map((item) => item.productId))];
    const products = await prisma.product.findMany({ where: { id: { in: productIds }, active: true } });
    if (products.length !== productIds.length) return response.status(422).json({ error: { code: 'PRODUCT_UNAVAILABLE', message: 'One or more products are unavailable.' } });

    const productMap = new Map(products.map((product) => [product.id, product]));
    const normalizedItems = parsed.data.items.map((item) => ({ ...item, product: productMap.get(item.productId) }));
    const unavailable = normalizedItems.find((item) => item.quantity > item.product.stock);
    if (unavailable) return response.status(409).json({ error: { code: 'INSUFFICIENT_STOCK', message: `Only ${unavailable.product.stock} unit(s) of ${unavailable.product.name} are available.` } });

    const total = normalizedItems.reduce((sum, item) => sum.plus(new Prisma.Decimal(item.product.price).times(item.quantity)), new Prisma.Decimal(0));
    const order = await prisma.$transaction(async (transaction) => {
      for (const item of normalizedItems) {
        const updated = await transaction.product.updateMany({
          where: { id: item.productId, stock: { gte: item.quantity } },
          data: { stock: { decrement: item.quantity } }
        });
        if (updated.count !== 1) throw Object.assign(new Error('Stock changed while placing the order.'), { status: 409, code: 'STOCK_CHANGED' });
      }
      return transaction.order.create({
        data: {
          customerId: request.customer.id,
          customerName: parsed.data.customerName,
          email: request.customer.email,
          address: parsed.data.address,
          total,
          items: { create: normalizedItems.map((item) => ({ productId: item.productId, quantity: item.quantity, unitPrice: item.product.price })) }
        },
        include: { items: { include: { product: true } } }
      });
    });
    response.status(201).json(serializeOrder(order));
  } catch (error) { next(error); }
});

// The signed-in customer's own orders only.
router.get('/', requireCustomer, async (request, response, next) => {
  try {
    const orders = await prisma.order.findMany({
      where: { customerId: request.customer.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { items: { include: { product: true } } }
    });
    response.json({ orders: orders.map(serializeOrder) });
  } catch (error) { next(error); }
});

// Ownership is checked on the server. Another customer's order returns 404 rather
// than 403, so the API does not reveal which order numbers exist.
router.get('/:id', requireCustomer, async (request, response, next) => {
  try {
    const parsedId = orderIdSchema.safeParse(request.params.id);
    if (!parsedId.success) return response.status(400).json({ error: { code: 'INVALID_ORDER_ID', message: 'Order ID must be a positive integer.' } });
    const order = await prisma.order.findUnique({ where: { id: parsedId.data }, include: { items: { include: { product: true } } } });
    if (!canReadOrder(order, request.customer)) {
      return response.status(404).json({ error: { code: 'ORDER_NOT_FOUND', message: 'No order with this number exists for your account.' } });
    }
    response.json(serializeOrder(order));
  } catch (error) { next(error); }
});

export default router;
