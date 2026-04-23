import { Link, NavLink } from 'react-router-dom';
import { ShoppingCart, UtensilsCrossed } from 'lucide-react';
import { useCartStore } from '../../store/cartStore';

const navClass = ({ isActive }: { isActive: boolean }) =>
  `px-3 py-2 text-sm font-medium rounded-md transition
   ${isActive ? 'text-brand-primary' : 'text-brand-text hover:text-brand-primary'}`;

export default function Header() {
  const itemCount = useCartStore(s => s.items.reduce((n, i) => n + i.quantity, 0));

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-brand-primary font-bold text-lg">
          <UtensilsCrossed className="w-6 h-6" />
          <span>Restaurant</span>
        </Link>
        <nav className="flex items-center gap-1">
          <NavLink to="/" end className={navClass}>Home</NavLink>
          <NavLink to="/menu" className={navClass}>Menu</NavLink>
          <NavLink to="/reservations" className={navClass}>Reservations</NavLink>
        </nav>
        <Link to="/cart" className="relative p-2 text-brand-text hover:text-brand-primary">
          <ShoppingCart className="w-6 h-6" />
          {itemCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-brand-accent text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {itemCount}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
}
