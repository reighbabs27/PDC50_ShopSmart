import { useState } from 'react';
import { Link } from 'react-router-dom';
import StatusMessage from '../components/StatusMessage.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { api } from '../services/api.js';
import { calculateItemSubtotal } from '../utils/cart.js';

export default function CheckoutPage() {
  const { cart, total, clearCart } = useCart();
  const { customer, checking } = useAuth();
  const [form, setForm] = useState({ customerName: '', address: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [order, setOrder] = useState(null);

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function submitOrder(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const created = await api.createOrder({
        customerName: form.customerName || customer.name,
        address: form.address,
        items: cart.map((item) => ({ productId: item.productId, quantity: item.quantity }))
      });
      setOrder(created);
      clearCart();
    } catch (caught) {
      setError(caught.status === 401 ? 'Your session has ended. Please sign in again.' : caught.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (order) return (
    <section className="success-card">
      <p className="eyebrow">ORDER RECEIVED</p>
      <h1>Thank you, {order.customerName}!</h1>
      <p>Your simulated order number is <strong>#{order.id}</strong>.</p>
      <p>Total: <strong>₱{Number(order.total).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</strong></p>
      <Link className="button" to={`/orders/${order.id}`}>View order</Link>{' '}
      <Link className="button secondary" to="/">Continue shopping</Link>
    </section>
  );

  if (cart.length === 0) return <section><div className="empty-state"><h1>Your cart is empty</h1><Link className="button" to="/">Browse products</Link></div></section>;

  if (checking) return <section><StatusMessage>Checking your session…</StatusMessage></section>;

  if (!customer) return (
    <section><div className="empty-state">
      <p className="eyebrow">SIMULATED CHECKOUT</p>
      <h1>Sign in to place your order</h1>
      <p>Orders are saved to your account so only you can view them. Your cart is kept.</p>
      <Link className="button" to="/account?next=/checkout">Sign in or create an account</Link>
    </div></section>
  );

  return (
    <section className="checkout-layout">
      <form onSubmit={submitOrder}>
        <p className="eyebrow">SIMULATED CHECKOUT</p><h1>Delivery information</h1>
        <StatusMessage type="error">{error}</StatusMessage>
        <label>Full name<input name="customerName" value={form.customerName} placeholder={customer.name} onChange={updateField} minLength="2" maxLength="80" /></label>
        <label>Account email<input value={customer.email} readOnly /></label>
        <label>Delivery address (fictional)<textarea name="address" value={form.address} onChange={updateField} minLength="10" maxLength="300" required /></label>
        <button disabled={submitting}>{submitting ? 'Submitting order…' : 'Place simulated order'}</button>
      </form>
      <aside className="summary">
        <h2>Amount due</h2>
        <div className="checkout-items">
          {cart.map((item) => (
            <p key={item.productId}>
              <span>{item.name} × {item.quantity}</span>
              <strong>₱{calculateItemSubtotal(item).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</strong>
            </p>
          ))}
        </div>
        <p className="summary-total"><span>Total</span><strong>₱{total.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></p>
        <small>No actual payment will be collected.</small>
      </aside>
    </section>
  );
}
