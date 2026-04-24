import { Link } from 'react-router-dom';
import { UtensilsCrossed, QrCode, CalendarDays } from 'lucide-react';

/**
 * Placeholder tile grid — real category tiles are wired up in the menu task.
 */
export default function MenuHighlights() {
  return (
    <section className="max-w-7xl mx-auto px-4 py-12 grid gap-6 sm:grid-cols-3">
      <Tile to="/menu" icon={<UtensilsCrossed className="w-6 h-6" />} title="Full Menu" body="Photos, allergens, add-ons, multilingual." />
      <Tile to="/menu" icon={<QrCode className="w-6 h-6" />} title="QR Order" body="Scan at your table and order from your phone." />
      <Tile to="/reservations" icon={<CalendarDays className="w-6 h-6" />} title="Reservations" body="Pick a table and time — confirmation by SMS." />
    </section>
  );
}

function Tile({ to, icon, title, body }: { to: string; icon: React.ReactNode; title: string; body: string }) {
  return (
    <Link to={to} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition block">
      <div className="w-10 h-10 rounded-lg bg-brand-secondary flex items-center justify-center text-brand-primary mb-3">
        {icon}
      </div>
      <h3 className="font-semibold text-brand-text mb-1">{title}</h3>
      <p className="text-sm text-brand-text-muted">{body}</p>
    </Link>
  );
}
