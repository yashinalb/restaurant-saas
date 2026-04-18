import { useEffect } from 'react';
import { Outlet, useNavigate, Link, NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { LogOut, ShoppingCart, UtensilsCrossed, Users, ArrowLeft } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { usePermissions } from '../../hooks/usePermissions';
import { usePosSessionStore } from '../../store/posSessionStore';

export default function PosLayout() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isAuthenticated, selectedTenant } = useAuthStore();
  const { hasPermission } = usePermissions();
  const { session, refresh, logout } = usePosSessionStore();

  const canAccess = hasPermission('pos.access');

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true });
      return;
    }
    if (!canAccess) {
      toast.error(t('pos.noAccess', 'You do not have permission to access POS'));
      navigate('/', { replace: true });
      return;
    }
    if (!selectedTenant) {
      toast.error(t('common.selectTenantFirst', 'Please select a tenant first'));
      navigate('/', { replace: true });
      return;
    }
    refresh();
  }, [isAuthenticated, canAccess, selectedTenant?.id]);

  if (!isAuthenticated || !canAccess || !selectedTenant) return null;

  const handleLogout = async () => {
    await logout();
    toast.success(t('pos.loggedOut', 'Waiter logged out'));
    navigate('/pos/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <header className="bg-slate-900 text-white shadow-lg">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2 text-gray-300 hover:text-white text-sm">
              <ArrowLeft className="w-4 h-4" />
              <span>{t('pos.backToAdmin', 'Back to Admin')}</span>
            </Link>
            <div className="h-6 w-px bg-gray-700" />
            <div className="flex items-center gap-2">
              <UtensilsCrossed className="w-5 h-5 text-amber-400" />
              <span className="font-bold text-lg">{t('pos.title', 'POS')}</span>
            </div>
            <span className="text-xs text-gray-400 hidden md:inline">· {selectedTenant.name}</span>
          </div>

          {session && (
            <nav className="hidden md:flex items-center gap-1">
              <NavLink to="/pos/floor" className={({ isActive }) =>
                `px-3 py-2 rounded text-sm flex items-center gap-2 ${isActive ? 'bg-slate-700 text-white' : 'text-gray-300 hover:bg-slate-800'}`
              }>
                <Users className="w-4 h-4" /> {t('pos.nav.floor', 'Floor')}
              </NavLink>
              <NavLink to="/pos/orders" className={({ isActive }) =>
                `px-3 py-2 rounded text-sm flex items-center gap-2 ${isActive ? 'bg-slate-700 text-white' : 'text-gray-300 hover:bg-slate-800'}`
              }>
                <ShoppingCart className="w-4 h-4" /> {t('pos.nav.orders', 'Orders')}
              </NavLink>
            </nav>
          )}

          <div className="flex items-center gap-3">
            {session ? (
              <>
                <div className="flex items-center gap-2 bg-slate-800 rounded-full px-3 py-1.5">
                  {session.waiter_image_url ? (
                    <img src={session.waiter_image_url} alt="" className="w-6 h-6 rounded-full object-cover" />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-amber-500 text-slate-900 flex items-center justify-center text-xs font-bold">
                      {session.waiter_name?.charAt(0).toUpperCase() || 'W'}
                    </div>
                  )}
                  <div className="text-xs leading-tight">
                    <div className="font-semibold">{session.waiter_name}</div>
                    <div className="text-gray-400">{session.store_name}</div>
                  </div>
                </div>
                <button onClick={handleLogout}
                  className="flex items-center gap-1 px-3 py-2 bg-red-600 hover:bg-red-700 rounded text-sm">
                  <LogOut className="w-4 h-4" />
                  <span className="hidden md:inline">{t('pos.logout', 'Logout')}</span>
                </button>
              </>
            ) : (
              <span className="text-xs text-gray-400">{t('pos.notSignedIn', 'Not signed in')}</span>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
