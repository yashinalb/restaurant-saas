import { Helmet } from 'react-helmet-async';
import { useCartStore } from '../store/cartStore';

export default function CartPage() {
  const { items, clear } = useCartStore();

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <Helmet><title>Cart</title></Helmet>
      <h1 className="text-3xl font-bold text-brand-text mb-4">Your cart</h1>
      {items.length === 0 ? (
        <p className="text-brand-text-muted">Cart is empty — pick something from the menu.</p>
      ) : (
        <>
          <ul className="divide-y divide-gray-200 border border-gray-200 rounded-lg bg-white">
            {items.map(i => (
              <li key={i.id} className="p-4 flex items-center justify-between">
                <span>{i.name}</span>
                <span className="text-brand-text-muted">×{i.quantity}</span>
              </li>
            ))}
          </ul>
          <button onClick={clear} className="mt-4 text-sm text-brand-accent hover:underline">
            Clear cart
          </button>
        </>
      )}
    </div>
  );
}
