import api from '../api/storefrontApi';
import { useTenantStore } from '../store/tenantStore';

const STORAGE_KEY = 'analytics:views';

interface ViewedState {
  banners: Record<string, true>;
}

function getViewedState(): ViewedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* localStorage unavailable or corrupt */ }
  return { banners: {} };
}

function markViewed(category: keyof ViewedState, key: string): void {
  try {
    const state = getViewedState();
    state[category][key] = true;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch { /* quota exceeded or unavailable */ }
}

function hasViewed(category: keyof ViewedState, key: string): boolean {
  try {
    const state = getViewedState();
    return !!state[category][key];
  } catch {
    return false;
  }
}

function tenantSlug(): string | null {
  return useTenantStore.getState().slug;
}

/**
 * Track a banner impression. Deduped per device (localStorage) — same banner
 * won't be counted again on this browser. Fire-and-forget; silently ignores
 * network errors so rendering is never blocked.
 */
export function trackBannerImpression(bannerId: number): void {
  const slug = tenantSlug();
  if (!slug) return;
  const key = String(bannerId);
  if (hasViewed('banners', key)) return;

  api
    .post(`/api/public/${encodeURIComponent(slug)}/banners/${bannerId}/track`, {
      interaction_type: 'impression',
    })
    .then(() => markViewed('banners', key))
    .catch(() => {});
}

/**
 * Track a banner click. Not deduped — every click is counted.
 */
export function trackBannerClick(bannerId: number): void {
  const slug = tenantSlug();
  if (!slug) return;

  api
    .post(`/api/public/${encodeURIComponent(slug)}/banners/${bannerId}/track`, {
      interaction_type: 'click',
    })
    .catch(() => {});
}
