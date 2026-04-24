import { create } from 'zustand';
import type { TenantInfo } from '../api/types';

interface TenantState {
  tenant: TenantInfo | null;
  slug: string | null;
  setTenant: (t: TenantInfo) => void;
  setSlug: (slug: string | null) => void;
}

function resolveInitialSlug(): string | null {
  if (typeof window === 'undefined') return null;
  const query = new URLSearchParams(window.location.search).get('tenant');
  if (query) return query;
  const envSlug = (import.meta.env.VITE_TENANT_SLUG as string | undefined) || null;
  if (envSlug) return envSlug;
  // Subdomain fallback: e.g. `mytenant.example.com` -> `mytenant`
  const host = window.location.hostname;
  const parts = host.split('.');
  if (parts.length >= 3 && parts[0] !== 'www') return parts[0];
  return null;
}

export const useTenantStore = create<TenantState>((set) => ({
  tenant: null,
  slug: resolveInitialSlug(),
  setTenant: (t) => set({ tenant: t, slug: t.slug }),
  setSlug: (slug) => set({ slug }),
}));
