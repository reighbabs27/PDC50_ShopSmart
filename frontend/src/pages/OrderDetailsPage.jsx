import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import StatusMessage from '../components/StatusMessage.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../services/api.js';

function formatPeso(value) {
  return `₱${Number(value).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function OrderDetailsPage() {
  const { orderId } = useParams();
  const { customer, checking } = useAuth();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (checking || !customer) return undefined;
    let active = true;
    setLoading(true);
    setError('');
    api.getOrder(orderId)
      .then((data) => { if (active) setOrder(data); })
      .catch((caught) => { if (active) setError(caught.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [orderId, customer, checking]);

  if (checking) return <section><StatusMessage>Checking your session…</StatusMessage></section>;
  if (!customer) {
    return (
      <section><div className="empty-state">
        <h1>Sign in to view this order</h1>
        <Link className="button" to={`/account?next=/orders/${encodeURIComponent(orderId)}`}>Sign in</Link>
      </div></section>
    );
  }
  if (loading) return <section><StatusMessage>Loading order…</StatusMessage></section>;
  if (error) {
    return (
      <section>
        <StatusMessage type="error">{error}</StatusMessage>
        <Link className="button" to="/account">Back to my orders</Link>
      </section>
    );
  }

  return (
    <section className="checkout-layout">
      <div className="summary">
        <p className="eyebrow">SIMULATED ORDER</p>
        <h1>Order #{order.id}</h1>
        <p>Status: <strong>{order.status}</strong></p>
        <p>Placed: {new Date(order.createdAt).toLocaleString('en-PH')}</p>
        <p>Deliver to: {order.customerName}, {order.address}</p>
        <Link className="button secondary" to="/account">Back to my orders</Link>
      </div>
      <aside className="summary">
        <h2>Items</h2>
        <div className="checkout-items">
          {order.items.map((item) => (
            <p key={item.id}>
              <span>{item.productName || `Product #${item.productId}`} × {item.quantity}</span>
              <strong>{formatPeso(item.unitPrice * item.quantity)}</strong>
            </p>
          ))}
        </div>
        <p className="summary-total"><span>Total</span><strong>{formatPeso(order.total)}</strong></p>
        <small>No actual payment was collected.</small>
      </aside>
    </section>
  );
}
