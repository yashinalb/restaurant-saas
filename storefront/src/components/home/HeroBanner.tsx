import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useBanners } from '../../hooks/useBanners';
import type { Banner, BannerTranslation, TextAlignment, TextPosition } from '../../api/types';

const POSITION_CLASSES: Record<TextPosition, string> = {
  'top-left': 'items-start justify-start text-left',
  'top-center': 'items-start justify-center text-center',
  'top-right': 'items-start justify-end text-right',
  'center-left': 'items-center justify-start text-left',
  'center': 'items-center justify-center text-center',
  'center-right': 'items-center justify-end text-right',
  'bottom-left': 'items-end justify-start text-left',
  'bottom-center': 'items-end justify-center text-center',
  'bottom-right': 'items-end justify-end text-right',
};

const ALIGN_CLASSES: Record<TextAlignment, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

const CTA_CLASSES: Record<string, string> = {
  primary: 'bg-brand-primary text-white hover:opacity-90',
  secondary: 'bg-brand-secondary text-brand-primary hover:opacity-90',
  outline: 'border border-white text-white hover:bg-white/10',
  ghost: 'text-white hover:underline',
};

function pickTranslation(banner: Banner, langCode: string): BannerTranslation | null {
  if (!banner.translations?.length) return null;
  const exact = banner.translations.find((t) => t.language_code === langCode);
  if (exact) return exact;
  const en = banner.translations.find((t) => t.language_code === 'en');
  return en ?? banner.translations[0];
}

function bannerHref(banner: Banner): string | null {
  switch (banner.link_type) {
    case 'menu_item':
      return banner.link_menu_item_id ? `/menu/${banner.link_menu_item_id}` : null;
    case 'menu_category':
      return banner.link_menu_category_id ? `/menu?category=${banner.link_menu_category_id}` : null;
    case 'page':
      return banner.link_page_code ? `/page/${banner.link_page_code}` : null;
    case 'url':
      return banner.link_url || null;
    default:
      return null;
  }
}

function BannerSlide({ banner }: { banner: Banner }) {
  const { i18n } = useTranslation();
  const tr = pickTranslation(banner, i18n.language.split('-')[0]);
  const isExternal = banner.link_type === 'url';
  const href = bannerHref(banner);

  const position = banner.text_position || 'center';
  const alignment = banner.text_alignment || 'center';
  const posClass = POSITION_CLASSES[position] || POSITION_CLASSES.center;
  const alignClass = ALIGN_CLASSES[alignment] || ALIGN_CLASSES.center;

  const style: React.CSSProperties = {
    backgroundColor: banner.background_color || undefined,
    color: banner.text_color || '#FFFFFF',
  };

  const inner = (
    <div
      className={`relative w-full h-[320px] sm:h-[420px] lg:h-[520px] overflow-hidden rounded-xl flex ${posClass}`}
      style={style}
    >
      {banner.image_url && (
        <img
          src={banner.image_url}
          alt={tr?.alt_text || tr?.title || ''}
          className="absolute inset-0 w-full h-full object-cover hidden sm:block"
        />
      )}
      {banner.mobile_image_url ? (
        <img
          src={banner.mobile_image_url}
          alt={tr?.alt_text || tr?.title || ''}
          className="absolute inset-0 w-full h-full object-cover sm:hidden"
        />
      ) : banner.image_url ? (
        <img
          src={banner.image_url}
          alt={tr?.alt_text || tr?.title || ''}
          className="absolute inset-0 w-full h-full object-cover sm:hidden"
        />
      ) : null}
      {banner.image_url && <div className="absolute inset-0 bg-black/25" />}
      <div className={`relative max-w-3xl px-6 sm:px-10 py-10 ${alignClass}`}>
        {tr?.subtitle && (
          <div className="uppercase tracking-widest text-xs sm:text-sm mb-2 opacity-90">
            {tr.subtitle}
          </div>
        )}
        {tr?.title && (
          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold drop-shadow">
            {tr.title}
          </h2>
        )}
        {tr?.description && (
          <p className="mt-3 text-sm sm:text-base max-w-2xl opacity-95">{tr.description}</p>
        )}
        {banner.show_cta && tr?.cta_text && href && (
          <div className="mt-5">
            {isExternal ? (
              <a
                href={href}
                target={banner.link_target}
                rel="noopener noreferrer"
                className={`inline-flex px-5 py-2.5 rounded-lg font-semibold ${CTA_CLASSES[banner.cta_style] || CTA_CLASSES.primary}`}
              >
                {tr.cta_text}
              </a>
            ) : (
              <Link
                to={href}
                className={`inline-flex px-5 py-2.5 rounded-lg font-semibold ${CTA_CLASSES[banner.cta_style] || CTA_CLASSES.primary}`}
              >
                {tr.cta_text}
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );

  if (href && !banner.show_cta) {
    return isExternal ? (
      <a href={href} target={banner.link_target} rel="noopener noreferrer" className="block">
        {inner}
      </a>
    ) : (
      <Link to={href} className="block">{inner}</Link>
    );
  }
  return inner;
}

export default function HeroBanner() {
  const { banners, loading } = useBanners('hero');
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (banners.length <= 1) return;
    const id = window.setInterval(() => setActive((i) => (i + 1) % banners.length), 6000);
    return () => window.clearInterval(id);
  }, [banners.length]);

  if (loading || banners.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-4 pt-4">
      <BannerSlide banner={banners[active]} />
      {banners.length > 1 && (
        <div className="flex justify-center gap-2 mt-3">
          {banners.map((b, i) => (
            <button
              key={b.id}
              aria-label={`Go to banner ${i + 1}`}
              onClick={() => setActive(i)}
              className={`w-2.5 h-2.5 rounded-full transition ${i === active ? 'bg-brand-primary' : 'bg-gray-300'}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
