import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import StatusMessage from '../components/StatusMessage.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../services/api.js';

function formatPeso(value) {
  return `₱${Number(value).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Only allow in-app redirects such as /checkout, never an external URL.
function safeNext(value) {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : null;
}

function SignInForms() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const next = safeNext(searchParams.get('next'));
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function submit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      if (mode === 'login') await login({ email: form.email, password: form.password });
      else await register(form);
      setForm({ name: '', email: '', password: '' });
      if (next) navigate(next);
    } catch (caught) {
      setError(caught.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="checkout-layout">
      <form onSubmit={submit}>
        <p className="eyebrow">{mode === 'login' ? 'SIGN IN' : 'CREATE A TEST ACCOUNT'}</p>
        <h1>{mode === 'login' ? 'Welcome back' : 'Create an account'}</h1>
        {next && <StatusMessage>Sign in to continue to {next.replace('/', '')}.</StatusMessage>}
        <StatusMessage type="error">{error}</StatusMessage>
        {mode === 'register' && (
          <label>Full name<input name="name" value={form.name} onChange={updateField} minLength="2" maxLength="80" autoComplete="name" required /></label>
        )}
        <label>Email address<input name="email" type="email" value={form.email} onChange={updateField} autoComplete="email" required /></label>
        <label>Password<input name="password" type="password" value={form.password} onChange={updateField} minLength={mode === 'register' ? 8 : 1} maxLength="72" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required /></label>
        <button disabled={submitting}>{submitting ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}</button>
        <button type="button" className="button secondary" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}>
          {mode === 'login' ? 'New here? Create an account' : 'Already registered? Sign in'}
        </button>
      </form>
      <aside className="summary">
        <h2>Classroom demo account</h2>
        <p>Use a <strong>fictional</strong> name and an address such as <em>juan.test@example.com</em>.</p>
        <p>Never use a real password you use elsewhere. No payment details are ever collected.</p>
      </aside>
    </section>
  );
}

function AccountOverview() {
  const { customer, logout } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    api.getMyOrders()
      .then((data) => { if (active) setOrders(data.orders); })
      .catch((caught) => { if (active) setError(caught.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return (
    <section>
      <div className="page-heading">
        <p className="eyebrow">MY ACCOUNT</p>
        <h1>{customer.name}</h1>
        <p>{customer.email}</p>
        <button type="button" className="button secondary" onClick={logout}>Sign out</button>
      </div>
      <h2>My simulated orders</h2>
      {loading && <StatusMessage>Loading your orders…</StatusMessage>}
      <StatusMessage type="error">{error}</StatusMessage>
      {!loading && !error && orders.length === 0 && (
        <div className="empty-state"><p>You have not placed an order yet.</p><Link className="button" to="/">Browse products</Link></div>
      )}
      <div className="cart-items">
        {orders.map((order) => (
          <article className="cart-item" key={order.id}>
            <div>
              <h2><Link to={`/orders/${order.id}`}>Order #{order.id}</Link></h2>
              <p>{new Date(order.createdAt).toLocaleString('en-PH')} • {order.status}</p>
            </div>
            <strong>{formatPeso(order.total)}</strong>
          </article>
        ))}
      </div>
    </section>
  );
}

export default function AccountPage() {
  const { customer, checking } = useAuth();
  if (checking) return <section><StatusMessage>Checking your session…</StatusMessage></section>;
  return customer ? <AccountOverview /> : <SignInForms />;
}
