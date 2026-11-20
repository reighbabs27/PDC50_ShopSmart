import { z } from 'zod';

export const orderSchema = z.object({
  customerName: z.string().trim().min(2).max(80),
  // Optional: for signed-in checkout the server uses the account email instead.
  email: z.string().trim().email().optional(),
  address: z.string().trim().min(10).max(300),
  items: z.array(z.object({
    productId: z.coerce.number().int().positive(),
    quantity: z.coerce.number().int().min(1).max(20)
  })).min(1).max(20).refine(
    (items) => new Set(items.map((item) => item.productId)).size === items.length,
    { message: 'Each product may appear only once in an order.' }
  )
});

export const assistantQuestionSchema = z.object({
  question: z.string().trim().min(3).max(300)
});

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email().max(120),
  // 72 is a sensible upper bound that also blocks very large hashing inputs.
  password: z.string().min(8).max(72)
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(120),
  password: z.string().min(1).max(72)
});

export const orderIdSchema = z.coerce.number().int().positive();
