import { useEffect, useState } from 'react';
import api from '../api/storefrontApi';
import { useTenantStore } from '../store/tenantStore';
import type { Banner, BannerType, ApiEnvelope } from '../api/types';

interface UseBannersResult {
  banners: Banner[];
  loading: boolean;
  error: string | null;
}

export function useBanners(type: BannerType): UseBannersResult {
  const slug = useTenantStore((s) => s.slug);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) { setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    setError(null);

    api
      .get<ApiEnvelope<Banner[]>>(`/api/public/${encodeURIComponent(slug)}/banners/type/${encodeURIComponent(type)}`)
      .then((res) => { if (!cancelled) setBanners(res.data.data || []); })
      .catch((err) => {
        if (cancelled) return;
        setError(err?.response?.data?.error || err.message || 'Failed to load banners');
        setBanners([]);
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [slug, type]);

  return { banners, loading, error };
}
