import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { UtensilsCrossed, CalendarDays, QrCode } from 'lucide-react';

export default function HomePage() {
  return (
    <>
      <Helmet><title>Restaurant · Home</title></Helmet>
      <section className="bg-gradient-to-br from-brand-secondary to-white">
        <div className="max-w-7xl mx-auto px-4 py-20 text-center">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-brand-text">
            Welcome to our table
          </h1>
          <p className="mt-4 text-brand-text-muted max-w-2xl mx-auto">
            Browse the menu, book a table, or order straight from your seat.
          </p>
          <div className="mt-8 flex flex-wrap gap-3 justify-center">
            <Link to="/menu"
              className="inline-flex items-center gap-2 bg-brand-primary text-white px-6 py-3 rounded-lg font-semibold hover:opacity-90">
              <UtensilsCrossed className="w-5 h-5" /> View Menu
            </Link>
            <Link to="/reservations"
              className="inline-flex items-center gap-2 bg-white border border-brand-primary text-brand-primary px-6 py-3 rounded-lg font-semibold hover:bg-brand-secondary">
              <CalendarDays className="w-5 h-5" /> Book a Table
            </Link>
          </div>
        </div>
      </section>
      <section className="max-w-7xl mx-auto px-4 py-12 grid gap-6 sm:grid-cols-3">
        <FeatureCard icon={<UtensilsCrossed className="w-6 h-6" />} title="Full Menu" body="Photos, allergens, add-ons, multilingual." />
        <FeatureCard icon={<QrCode className="w-6 h-6" />}          title="QR Order" body="Scan at your table and order from your phone." />
        <FeatureCard icon={<CalendarDays className="w-6 h-6" />}    title="Reservations" body="Pick a table and time — confirmation by SMS." />
      </section>
    </>
  );
}

function FeatureCard({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="w-10 h-10 rounded-lg bg-brand-secondary flex items-center justify-center text-brand-primary mb-3">
        {icon}
      </div>
      <h3 className="font-semibold text-brand-text mb-1">{title}</h3>
      <p className="text-sm text-brand-text-muted">{body}</p>
    </div>
  );
}
