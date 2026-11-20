// Request-forgery guard for cookie-authenticated APIs.
// 1. State-changing requests must send JSON. A plain HTML form cannot send
//    application/json, and a cross-site script that tries must pass a CORS preflight.
// 2. If the browser sends an Origin header, it must be one of the allowed frontend origins.
const STATE_CHANGING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export function allowedOrigins(env = process.env) {
  return String(env.FRONTEND_URL || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter(Boolean);
}

export function isAllowedOrigin(origin, origins) {
  if (!origin) return true; // same-origin navigations and non-browser clients (curl, smoke test)
  return origins.includes(String(origin).replace(/\/+$/, ''));
}

export function createRequestGuard(origins) {
  return function requestGuard(request, response, next) {
    if (!STATE_CHANGING.has(request.method)) return next();
    if (!request.is('application/json')) {
      return response.status(415).json({ error: { code: 'JSON_REQUIRED', message: 'Send the request body as application/json.' } });
    }
    const origin = request.headers.origin;
    const sameHost = origin && request.headers.host && origin.replace(/^https?:\/\//, '') === request.headers.host;
    if (!sameHost && !isAllowedOrigin(origin, origins)) {
      return response.status(403).json({ error: { code: 'ORIGIN_NOT_ALLOWED', message: 'This origin may not call the ShopSmart API.' } });
    }
    next();
  };
}
