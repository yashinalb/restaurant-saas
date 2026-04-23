import { Helmet } from 'react-helmet-async';

// Placeholder for TODO 46.x (storefront menu browsing).
export default function MenuPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <Helmet><title>Menu</title></Helmet>
      <h1 className="text-3xl font-bold text-brand-text">Menu</h1>
      <p className="mt-2 text-brand-text-muted">The menu browser will live here.</p>
    </div>
  );
}
