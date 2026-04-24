import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { UtensilsCrossed, CalendarDays } from 'lucide-react';
import SEOHead from '../components/common/SEOHead';
import HeroBanner from '../components/home/HeroBanner';
import MenuHighlights from '../components/home/MenuHighlights';
import FeaturedItems from '../components/home/FeaturedItems';

export default function HomePage() {
  const { t } = useTranslation();

  return (
    <>
      <SEOHead title="Restaurant · Home" description={t('home.tagline') || undefined} />

      <HeroBanner />

      {/* Static welcome section — only shown when no hero banner is configured or below it */}
      <section className="bg-gradient-to-br from-brand-secondary to-white">
        <div className="max-w-7xl mx-auto px-4 py-16 text-center">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-brand-text">
            {t('home.welcome')}
          </h1>
          <p className="mt-4 text-brand-text-muted max-w-2xl mx-auto">
            {t('home.tagline')}
          </p>
          <div className="mt-8 flex flex-wrap gap-3 justify-center">
            <Link
              to="/menu"
              className="inline-flex items-center gap-2 bg-brand-primary text-white px-6 py-3 rounded-lg font-semibold hover:opacity-90"
            >
              <UtensilsCrossed className="w-5 h-5" /> {t('home.viewMenu')}
            </Link>
            <Link
              to="/reservations"
              className="inline-flex items-center gap-2 bg-white border border-brand-primary text-brand-primary px-6 py-3 rounded-lg font-semibold hover:bg-brand-secondary"
            >
              <CalendarDays className="w-5 h-5" /> {t('home.bookTable')}
            </Link>
          </div>
        </div>
      </section>

      <MenuHighlights />
      <FeaturedItems />
    </>
  );
}
