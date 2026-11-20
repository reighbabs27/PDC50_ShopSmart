// Public, build-time setting. Must point at the HOSTED HTTPS API in a deployed build
// (or "/api" when nginx serves the frontend and API from one origin). Never put a
// secret in a VITE_ variable: it is copied into the browser bundle.
const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace(/\/+$/, '');

const DEFAULT_TIMEOUT_MS = 15000;

async function request(path, options = {}) {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, ...fetchOptions } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...fetchOptions,
      // Send the HttpOnly session cookie with every request.
      credentials: 'include',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', ...fetchOptions.headers }
    });
  } catch (caught) {
    const error = new Error(caught?.name === 'AbortError'
      ? 'The server took too long to respond. Please try again.'
      : 'Could not reach the ShopSmart API. Check your connection and try again.');
    error.code = caught?.name === 'AbortError' ? 'TIMEOUT' : 'NETWORK_ERROR';
    throw error;
  } finally {
    clearTimeout(timer);
  }

  if (response.status === 204) return null;
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message = data?.error?.message || `Request failed with status ${response.status}.`;
    const error = new Error(message);
    error.status = response.status;
    error.code = data?.error?.code;
    throw error;
  }
  return data;
}

export const api = {
  getProducts: (query = '') => request(`/products${query ? `?search=${encodeURIComponent(query)}` : ''}`),
  getProduct: (id) => request(`/products/${id}`),
  createOrder: (order) => request('/orders', { method: 'POST', body: JSON.stringify(order) }),
  getMyOrders: () => request('/orders'),
  getOrder: (id) => request(`/orders/${encodeURIComponent(id)}`),
  askAssistant: (question) => request('/assistant/questions', {
    method: 'POST', body: JSON.stringify({ question }), timeoutMs: 20000
  }),
  getCurrentCustomer: () => request('/auth/me'),
  register: (details) => request('/auth/register', { method: 'POST', body: JSON.stringify(details) }),
  login: (credentials) => request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  logout: () => request('/auth/logout', { method: 'POST', body: '{}' })
};
