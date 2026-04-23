import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  id: string;                  // composite key: `${menu_item_id}:${optionsHash}`
  menu_item_id: number;
  name: string;
  unit_price: number;
  quantity: number;
  selected_addons?: Array<{ addon_id: number; quantity: number }>;
  notes?: string;
}

interface CartState {
  items: CartItem[];
  add: (item: CartItem) => void;
  setQuantity: (id: string, qty: number) => void;
  remove: (id: string) => void;
  clear: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      add: (item) => set(state => {
        const existing = state.items.find(i => i.id === item.id);
        if (existing) {
          return {
            items: state.items.map(i =>
              i.id === item.id ? { ...i, quantity: i.quantity + item.quantity } : i
            ),
          };
        }
        return { items: [...state.items, item] };
      }),
      setQuantity: (id, qty) => set(state => ({
        items: qty > 0
          ? state.items.map(i => (i.id === id ? { ...i, quantity: qty } : i))
          : state.items.filter(i => i.id !== id),
      })),
      remove: (id) => set(state => ({ items: state.items.filter(i => i.id !== id) })),
      clear: () => set({ items: [] }),
    }),
    { name: 'restaurant-cart' }
  )
);
