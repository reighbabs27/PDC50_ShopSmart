import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAssistantResponse,
  buildFallbackResponse,
  parseBudget,
  rankProducts,
  verifyAndBuildResponse
} from '../src/services/assistant.js';

const products = [
  { id: 1, name: 'Keyboard', category: 'Accessories', description: 'Mechanical keyboard with tactile feedback', price: 1800, stock: 2, active: true },
  { id: 2, name: 'Mouse', category: 'Accessories', description: 'Wireless mouse with silent clicks', price: 600, stock: 3, active: true },
  { id: 3, name: 'Webcam', category: 'Video', description: '1080p full HD webcam', price: 1450, stock: 5, active: true },
  { id: 4, name: 'Out of Stock Monitor', category: 'Video', description: 'Ultra-wide monitor', price: 5000, stock: 0, active: true },
  { id: 5, name: 'Inactive Lamp', category: 'Study', description: 'Desk lamp', price: 400, stock: 5, active: false }
];

test('parseBudget extracts a peso budget', () => {
  assert.equal(parseBudget('below ₱2,000'), 2000);
  assert.equal(parseBudget('mouse below 700'), 700);
  assert.equal(parseBudget('keyboard under 1500'), 1500);
});

test('rankProducts respects the budget', () => {
  assert.deepEqual(rankProducts(products, 'mouse below 700').map((p) => p.id), [2]);
});

test('assistant response contains traceable sources', () => {
  assert.equal(buildAssistantResponse(products, 'keyboard').sources[0].id, 1);
});

test('rankProducts excludes inactive and out-of-stock products', () => {
  const ranked = rankProducts(products, 'monitor');
  assert.ok(!ranked.some((p) => p.id === 4)); // stock 0 excluded

  const lampRanked = rankProducts(products, 'lamp');
  assert.ok(!lampRanked.some((p) => p.id === 5)); // inactive excluded
});

test('honest no-match response when catalog has no suitable product', async () => {
  const res = await buildAssistantResponse(products, 'Do you have any refrigerators?');
  assert.equal(res.recommendedProducts.length, 0);
  assert.equal(res.sources.length, 0);
  assert.match(res.answer, /could not find/i);
});

test('guardrails reject hallucinated IDs from model draft', () => {
  const candidates = [products[0]];
  const hallucinatedDraft = {
    answer: 'Here is a super cheap keyboard for ₱500',
    recommendedProductIds: [9999] // not in candidates
  };
  const verified = verifyAndBuildResponse(hallucinatedDraft, candidates);
  // Replaced with verified catalog fallback
  assert.equal(verified.recommendedProducts[0].id, 1);
  assert.equal(verified.sources[0].id, 1);
  assert.ok(!verified.sources.some((s) => s.id === 9999));
});

test('provider failure cleanly falls back to rule-based catalog response', async () => {
  const res = await buildAssistantResponse(products, 'Which keyboard is below ₱2,000?', {
    simulateFailure: true
  });
  assert.equal(res.recommendedProducts[0].id, 1);
  assert.equal(res.recommendedProducts[0].price, 1800);
  assert.equal(res.sources[0].id, 1);
  assert.match(res.answer, /Keyboard/i);
  assert.match(res.answer, /1,800/);
});

test('buildFallbackResponse produces grounded answer with actual prices', () => {
  const fallback = buildFallbackResponse([products[0]]);
  assert.equal(fallback.recommendedProducts.length, 1);
  assert.equal(fallback.sources[0].id, 1);
  assert.match(fallback.answer, /Keyboard/);
  assert.match(fallback.answer, /1,800/);
});
