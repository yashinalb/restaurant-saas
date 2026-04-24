import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useBanners } from '../../hooks/useBanners';
import { trackBannerClick, trackBannerImpression } from '../../utils/analytics';
import type {
  Banner,
  BannerTranslation,
  TextAlignment,
  TextPosition,
} from '../../api/types';

const POSITION_DESKTOP: Record<TextPosition, string> = {
  'top-left': 'items-start justify-start',
  'top-center': 'items-start justify-center',
  'top-right': 'items-start justify-end',
  'center-left': 'items-center justify-start',
  'center': 'items-center justify-center',
  'center-right': 'items-center justify-end',
  'bottom-left': 'items-end justify-start',
  'bottom-center': 'items-end justify-center',
  'bottom-right': 'items-end justify-end',
};

const POSITION_MOBILE: Record<TextPosition, string> = {
  'top-left': 'max-sm:items-start max-sm:justify-start',
  'top-center': 'max-sm:items-start max-sm:justify-center',
  'top-right': 'max-sm:items-start max-sm:justify-end',
  'center-left': 'max-sm:items-center max-sm:justify-start',
  'center': 'max-sm:items-center max-sm:justify-center',
  'center-right': 'max-sm:items-center max-sm:justify-end',
  'bottom-left': 'max-sm:items-end max-sm:justify-start',
  'bottom-center': 'max-sm:items-end max-sm:justify-center',
  'bottom-right': 'max-sm:items-end max-sm:justify-end',
};

const ALIGN_DESKTOP: Record<TextAlignment, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

const ALIGN_MOBILE: Record<TextAlignment, string> = {
  left: 'max-sm:text-left',
  center: 'max-sm:text-center',
  right: 'max-sm:text-right',
};

function positionClasses(desktop: TextPosition | null, mobile: TextPosition | null): string {
  const base = POSITION_DESKTOP[desktop || 'center'] || POSITION_DESKTOP.center;
  const override = mobile ? POSITION_MOBILE[mobile] : '';
  return `${base} ${override}`.trim();
}

function alignmentClasses(desktop: TextAlignment | null, mobile: TextAlignment | null): string {
  const base = ALIGN_DESKTOP[desktop || 'center'] || ALIGN_DESKTOP.center;
  const override = mobile ? ALIGN_MOBILE[mobile] : '';
  return `${base} ${override}`.trim();
}

function pickTranslation(banner: Banner, lang: string): BannerTranslation | null {
  if (!banner.translations?.length) return null;
  return (
    banner.translations.find((t) => t.language_code === lang)
    || banner.translations.find((t) => t.language_code === 'en')
    || banner.translations[0]
  );
}

function bannerHref(banner: Banner): { href: string; external: boolean } | null {
  switch (banner.link_type) {
    case 'menu_item':
      return banner.link_menu_item_id ? { href: `/menu/${banner.link_menu_item_id}`, external: false } : null;
    case 'menu_category':
      return banner.link_menu_category_id ? { href: `/menu?category=${banner.link_menu_category_id}`, external: false } : null;
    case 'page':
      return banner.link_page_code ? { href: `/page/${banner.link_page_code}`, external: false } : null;
    case 'url':
      return banner.link_url ? { href: banner.link_url, external: true } : null;
    default:
      return null;
  }
}

export default function HeroBanner() {
  const { banners, loading } = useBanners('hero');
  const { i18n } = useTranslation();
  const [current, setCurrent] = useState(0);
  const impressionsTracked = useRef<Set<number>>(new Set());

  const next = useCallback(() => {
    setCurrent((i) => (banners.length ? (i + 1) % banners.length : 0));
  }, [banners.length]);

  const prev = useCallback(() => {
    setCurrent((i) => (banners.length ? (i - 1 + banners.length) % banners.length : 0));
  }, [banners.length]);

  // Auto-advance
  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = window.setInterval(next, 6000);
    return () => window.clearInterval(timer);
  }, [next, banners.length]);

  // Impression tracking on slide change (deduped per page view via ref; per-device via localStorage)
  useEffect(() => {
    if (banners.length === 0) return;
    const id = banners[current]?.id;
    if (id && !impressionsTracked.current.has(id)) {
      impressionsTracked.current.add(id);
      trackBannerImpression(id);
    }
  }, [current, banners]);

  if (loading || banners.length === 0) return null;

  const banner = banners[current];
  const lang = i18n.language.split('-')[0];
  const tr = pickTranslation(banner, lang);
  const link = bannerHref(banner);

  const ts = banner.text_style || {};
  const titleStyleDesktop = ts.titleSize ? { fontSize: `${ts.titleSize}px` } : { fontSize: '2.25rem' };
  const titleStyleMobile = { fontSize: `${ts.titleSizeMobile ?? ts.titleSize ?? 28}px` };
  const subtitleStyleDesktop = ts.subtitleSize ? { fontSize: `${ts.subtitleSize}px` } : { fontSize: '1.125rem' };
  const subtitleStyleMobile = { fontSize: `${ts.subtitleSizeMobile ?? ts.subtitleSize ?? 14}px` };
  const descStyleDesktop = ts.descriptionSize ? { fontSize: `${ts.descriptionSize}px` } : { fontSize: '1rem' };
  const descStyleMobile = { fontSize: `${ts.descriptionSizeMobile ?? ts.descriptionSize ?? 13}px` };

  const onBannerClick = () => {
    if (banner.id) trackBannerClick(banner.id);
  };

  const inner = (
    <div
      className="relative w-full"
      style={{
        backgroundColor: banner.background_color || undefined,
        color: banner.text_color || undefined,
      }}
    >
      {banner.image_url ? (
        <>
          <img
            src={banner.image_url}
            alt={tr?.alt_text || tr?.title || ''}
            className={`w-full object-contain ${banner.mobile_image_url ? 'hidden sm:block' : ''}`}
          />
          {banner.mobile_image_url && (
            <img
              src={banner.mobile_image_url}
              alt={tr?.alt_text || tr?.title || ''}
              className="w-full object-contain sm:hidden"
            />
          )}
        </>
      ) : (
        <div className="w-full h-[200px] sm:h-[300px] md:h-[400px] bg-brand-primary/10" />
      )}

      {(tr?.title || tr?.subtitle || tr?.description) && (
        <div
          className={`absolute inset-0 flex bg-black/10 p-6 sm:p-8 ${positionClasses(
            banner.text_position,
            banner.text_position_mobile,
          )}`}
        >
          <div className={`max-w-2xl ${alignmentClasses(banner.text_alignment, banner.text_alignment_mobile)}`}>
            {tr?.title && (
              <>
                <h2 className="font-bold text-white drop-shadow-lg sm:hidden" style={titleStyleMobile}>
                  {tr.title}
                </h2>
                <h2 className="font-bold text-white drop-shadow-lg hidden sm:block" style={titleStyleDesktop}>
                  {tr.title}
                </h2>
              </>
            )}
            {tr?.subtitle && (
              <>
                <p className="mt-2 text-white/90 drop-shadow sm:hidden" style={subtitleStyleMobile}>
                  {tr.subtitle}
                </p>
                <p className="mt-2 text-white/90 drop-shadow hidden sm:block" style={subtitleStyleDesktop}>
                  {tr.subtitle}
                </p>
              </>
            )}
            {tr?.description && (
              <>
                <div
                  className="mt-3 text-white/80 drop-shadow max-w-xl sm:hidden"
                  style={descStyleMobile}
                  dangerouslySetInnerHTML={{ __html: tr.description }}
                />
                <div
                  className="mt-3 text-white/80 drop-shadow max-w-xl hidden sm:block"
                  style={descStyleDesktop}
                  dangerouslySetInnerHTML={{ __html: tr.description }}
                />
              </>
            )}
            {banner.show_cta && tr?.cta_text && (
              <span className="inline-block mt-4 px-6 py-2 bg-brand-primary text-white rounded-lg text-sm font-medium">
                {tr.cta_text}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );

  const linkedInner = link
    ? link.external
      ? (
        <a
          href={link.href}
          target={banner.link_target || '_self'}
          rel="noopener noreferrer"
          className="block"
          onClick={onBannerClick}
        >
          {inner}
        </a>
      )
      : (
        <Link to={link.href} className="block" onClick={onBannerClick}>
          {inner}
        </Link>
      )
    : inner;

  return (
    <section className="max-w-7xl mx-auto px-4 pt-4">
      <div className="relative overflow-hidden rounded-xl bg-gray-100">
        {linkedInner}
        {banners.length > 1 && (
          <>
            <button
              type="button"
              aria-label="Previous banner"
              onClick={(e) => { e.preventDefault(); prev(); }}
              className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/80 hover:bg-white text-gray-800 shadow transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              type="button"
              aria-label="Next banner"
              onClick={(e) => { e.preventDefault(); next(); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/80 hover:bg-white text-gray-800 shadow transition-colors"
            >
              <ChevronRight size={20} />
            </button>
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
              {banners.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Go to banner ${i + 1}`}
                  onClick={(e) => { e.preventDefault(); setCurrent(i); }}
                  className={`w-2.5 h-2.5 rounded-full transition-colors ${i === current ? 'bg-white' : 'bg-white/50'}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
