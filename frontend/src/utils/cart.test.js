import { describe, expect, it } from 'vitest';
import { addProductToCart, calculateCartItemCount, calculateCartTotal, calculateItemSubtotal, updateCartQuantity } from './cart.js';

describe('cart utilities', () => {
  it('calculates the cart total with whole and decimal values', () => {
    expect(calculateCartTotal([
      { price: 100, quantity: 2 },
      { price: 50.5, quantity: 2 }
    ])).toBe(301);
  });

  it('calculates individual item subtotal correctly', () => {
    expect(calculateItemSubtotal({ price: 1850, quantity: 2 })).toBe(3700);
    expect(calculateItemSubtotal({ price: 650.5, quantity: 3 })).toBe(1951.5);
  });

  it('adds a new product', () => {
    const result = addProductToCart([], { id: 1, name: 'Mouse', price: 500, stock: 2 });
    expect(result.error).toBe('');
    expect(result.cart[0].quantity).toBe(1);
  });

  it('increments quantity when existing product is added', () => {
    const initial = [{ productId: 1, name: 'Mouse', price: 500, stock: 3, quantity: 1 }];
    const result = addProductToCart(initial, { id: 1, name: 'Mouse', price: 500, stock: 3 });
    expect(result.error).toBe('');
    expect(result.cart[0].quantity).toBe(2);
  });

  it('prevents adding to cart when current quantity already equals available stock', () => {
    const initial = [{ productId: 1, name: 'Mouse', price: 500, stock: 1, quantity: 1 }];
    const result = addProductToCart(initial, { id: 1, name: 'Mouse', price: 500, stock: 1 });
    expect(result.error).toBe('Only 1 unit(s) of Mouse are available.');
    expect(result.cart[0].quantity).toBe(1);
  });

  it('prevents a quantity above stock', () => {
    const cart = [{ productId: 1, name: 'Mouse', price: 500, stock: 1, quantity: 1 }];
    expect(updateCartQuantity(cart, 1, 2).error).toContain('Only 1');
  });

  it('refuses a quantity below one and leaves the cart unchanged', () => {
    const cart = [{ productId: 1, name: 'Mouse', price: 500, stock: 3, quantity: 1 }];
    const result = updateCartQuantity(cart, 1, 0);
    expect(result.error).toContain('greater than zero');
    expect(result.cart).toBe(cart);
  });

  it('counts all cart units and handles an empty cart', () => {
    expect(calculateCartItemCount([{ quantity: 2 }, { quantity: 3 }])).toBe(5);
    expect(calculateCartItemCount([])).toBe(0);
  });
});
