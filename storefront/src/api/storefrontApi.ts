import axios from 'axios';

/**
 * Storefront API client.
 *
 * Tenant identity is resolved server-side from the request host (subdomain /
 * custom domain). In local dev, set VITE_TENANT_SLUG or pass `?tenant=<slug>`
 * so the backend's /api/public routes can scope to the right tenant.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Inject tenant slug from env or query string so /api/public routes can scope.
api.interceptors.request.use(config => {
  const envSlug = import.meta.env.VITE_TENANT_SLUG;
  const querySlug = new URLSearchParams(window.location.search).get('tenant');
  const slug = querySlug || envSlug;
  if (slug && config.headers) config.headers['X-Tenant-Slug'] = slug;
  return config;
});

export default api;
