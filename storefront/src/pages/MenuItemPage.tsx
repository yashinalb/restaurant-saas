import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import SEOHead from '../components/common/SEOHead';

/**
 * Menu item detail page. Real data wiring is done by the menu task —
 * this renders the layout shell so the route resolves.
 */
export default function MenuItemPage() {
  const { slug } = useParams<{ slug: string }>();

  return (
    <>
      <SEOHead title="Menu Item · Restaurant" />
      <section className="max-w-5xl mx-auto px-4 py-8">
        <Link to="/menu" className="inline-flex items-center gap-1 text-sm text-brand-text-muted hover:text-brand-primary mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to menu
        </Link>
        <div className="grid gap-8 md:grid-cols-2">
          <div className="aspect-square bg-gray-100 rounded-xl" />
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-brand-text">Item: {slug}</h1>
            <p className="text-brand-text-muted mt-3">
              Item description, allergens, and add-on selectors will be rendered here.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
