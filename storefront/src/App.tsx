import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import HomePage from './pages/HomePage';
import MenuPage from './pages/MenuPage';
import ReservationsPage from './pages/ReservationsPage';
import CartPage from './pages/CartPage';
import NotFoundPage from './pages/NotFoundPage';

/**
 * Storefront foundation (TODO 43).
 *
 * Route skeleton only — the menu, QR-ordering, and reservation flows are filled
 * in by later TODO items. Every public route is wrapped in `Layout` so nav,
 * footer, and tenant branding apply consistently.
 */
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="menu" element={<MenuPage />} />
          <Route path="reservations" element={<ReservationsPage />} />
          <Route path="cart" element={<CartPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
