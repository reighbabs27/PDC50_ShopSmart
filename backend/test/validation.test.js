import test from 'node:test';
import assert from 'node:assert/strict';
import { assistantQuestionSchema, loginSchema, orderSchema, registerSchema } from '../src/validators/schemas.js';

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

test('signed-in checkout may omit email (server uses the account email)', () => {
  assert.equal(orderSchema.safeParse({
    customerName: 'Ana Reyes',
    address: 'Angeles City, Pampanga',
    items: [{ productId: 1, quantity: 1 }]
  }).success, true);
});

test('excess quantity fails order validation', () => {
  assert.equal(orderSchema.safeParse({
    customerName: 'Ana Reyes',
    address: 'Angeles City, Pampanga',
    items: [{ productId: 1, quantity: 21 }]
  }).success, false);
});

test('registration normalizes email and requires an 8+ character password', () => {
  const ok = registerSchema.safeParse({ name: 'Test Customer', email: '  Test@Example.COM ', password: 'longenough' });
  assert.equal(ok.success, true);
  if (ok.success) assert.equal(ok.data.email, 'test@example.com');
  assert.equal(registerSchema.safeParse({ name: 'Test Customer', email: 'test@example.com', password: 'short' }).success, false);
});

test('login requires a valid email', () => {
  assert.equal(loginSchema.safeParse({ email: 'not-an-email', password: 'x' }).success, false);
});
