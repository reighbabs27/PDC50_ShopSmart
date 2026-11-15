import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { addProductToCart, calculateCartItemCount, calculateCartTotal, updateCartQuantity } from '../utils/cart.js';

const CartContext = createContext(null);
const STORAGE_KEY = 'shopsmart_cart';

function loadInitialCart() {
  if (typeof window === 'undefined') return [];
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }) {
  const [cart, setCart] = useState(loadInitialCart);
  const [cartMessage, setCartMessage] = useState('');
  const [cartMessageType, setCartMessageType] = useState('info');

  useEffect(() => {
    try {
      if (cart.length === 0) {
        localStorage.removeItem(STORAGE_KEY);
      } else {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
      }
    } catch {
      // Ignore localStorage errors (e.g., storage full or disabled)
    }
  }, [cart]);

  function addToCart(product) {
    setCart((currentCart) => {
      const result = addProductToCart(currentCart, product);
      if (result.error) {
        setCartMessage(result.error);
        setCartMessageType('error');
      } else {
        setCartMessage(`${product.name} was added to your cart.`);
        setCartMessageType('info');
      }
      return result.cart;
    });
  }

  function setQuantity(productId, quantity) {
    setCart((currentCart) => {
      const result = updateCartQuantity(currentCart, productId, quantity);
      if (result.error) {
        setCartMessage(result.error);
        setCartMessageType('error');
      } else {
        setCartMessage('');
        setCartMessageType('info');
      }
      return result.cart;
    });
  }

  function removeFromCart(productId) {
    setCart((currentCart) => currentCart.filter((item) => item.productId !== productId));
    setCartMessage('Item removed from cart.');
    setCartMessageType('info');
  }

  function clearCart() {
    setCart([]);
    setCartMessage('');
    setCartMessageType('info');
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore
    }
  }

  const value = useMemo(() => ({
    cart,
    cartMessage,
    cartMessageType,
    itemCount: calculateCartItemCount(cart),
    total: calculateCartTotal(cart),
    addToCart,
    setQuantity,
    removeFromCart,
    clearCart
  }), [cart, cartMessage, cartMessageType]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used inside CartProvider.');
  return context;
}
