import test from 'node:test';
import assert from 'node:assert/strict';
import { assistantQuestionSchema, orderSchema } from '../src/validators/schemas.js';

test('a valid classroom order passes validation', () => {
  const result = orderSchema.safeParse({
    customerName: 'Ana Reyes',
    email: 'ana@example.com',
    address: 'Angeles City, Pampanga',
    items: [{ productId: 1, quantity: 2 }]
  });
  assert.equal(result.success, true);
});

test('email with leading or trailing whitespace is trimmed and accepted', () => {
  const result = orderSchema.safeParse({
    customerName: 'Ana Reyes',
    email: '   ana.reyes@example.com   ',
    address: 'Angeles City, Pampanga',
    items: [{ productId: 1, quantity: 1 }]
  });
  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.data.email, 'ana.reyes@example.com');
  }
});

test('duplicate products fail order validation', () => {
  const result = orderSchema.safeParse({
    customerName: 'Ana Reyes',
    email: 'ana@example.com',
    address: 'Angeles City, Pampanga',
    items: [{ productId: 1, quantity: 1 }, { productId: 1, quantity: 1 }]
  });
  assert.equal(result.success, false);
});

test('an oversized assistant question fails validation', () => {
  assert.equal(assistantQuestionSchema.safeParse({ question: 'x'.repeat(301) }).success, false);
});

test('whitespace-only customer name fails validation', () => {
  assert.equal(orderSchema.safeParse({
    customerName: '     ',
    email: 'ana@example.com',
    address: 'Angeles City, Pampanga',
    items: [{ productId: 1, quantity: 1 }]
  }).success, false);
});
