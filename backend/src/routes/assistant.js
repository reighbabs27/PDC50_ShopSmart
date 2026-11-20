import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { prisma } from '../lib/prisma.js';
import { buildAssistantResponse } from '../services/assistant.js';
import { assistantQuestionSchema } from '../validators/schemas.js';

const router = Router();

const assistantLimiter = rateLimit({
  windowMs: 60_000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: (_request, response) => response.status(429).json({
    error: { code: 'RATE_LIMITED', message: 'Too many assistant questions in one minute. Please wait and try again.' }
  })
});

router.post('/questions', assistantLimiter, async (request, response, next) => {
  try {
    const parsed = assistantQuestionSchema.safeParse(request.body);
    if (!parsed.success) {
      return response.status(422).json({
        error: { code: 'INVALID_QUESTION', message: 'Question must contain between 3 and 300 characters.' }
      });
    }
    // Read current prices and stock at question time so the answer reflects live records.
    const products = await prisma.product.findMany({ where: { active: true }, orderBy: { price: 'asc' } });
    const result = await buildAssistantResponse(products, parsed.data.question);
    response.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
