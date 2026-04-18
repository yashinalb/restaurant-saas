import { useEffect, useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { usePermissions } from '../hooks/usePermissions';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher';
import {
  LayoutDashboard,
  Store,
  Settings,
  LogOut,
  Languages,
  DollarSign,
  Menu,
  Users,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
  Shield,
  Building2,
  CreditCard,
  Key,
  UtensilsCrossed,
  Package,
  ShoppingBag,
  ClipboardList,
  Navigation,
  Wallet,
  CircleDot,
  BadgeCheck,
  Leaf,
  Receipt,
  LayoutList,
  Armchair,
  CalendarClock,
  Inbox,
  Tags,
  ListChecks,
  BadgeDollarSign,
  ShoppingCart,
  QrCode,
  Truck,
  Boxes,
  FileText,
  PackageOpen,
  LucideIcon
} from 'lucide-react';

interface NavItem {
  name: string;
  to: string;
  icon: LucideIcon;
  show: boolean;
}

interface NavGroup {
  id: string;
  name: string;
  icon: LucideIcon;
  items: NavItem[];
}

export default function DashboardLayout() {
  const { t } = useTranslation();
  const { user, tenants, selectedTenant, selectTenant, logout, loadProfile } = useAuthStore();
  const { hasPermission, isSuperAdmin } = usePermissions();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Sidebar state
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<string[]>(['dashboard']);

  // Load collapsed state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    if (saved) setIsCollapsed(JSON.parse(saved));
  }, []);

  useEffect(() => {
    loadProfile();
  }, []);

  // Close mobile sidebar on route change
  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname]);

  // Handle escape key to close mobile sidebar
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMobileOpen(false);
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const toggleCollapse = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem('sidebarCollapsed', JSON.stringify(newState));
  };

  const toggleGroup = (groupId: string) => {
    if (isCollapsed) {
      setIsCollapsed(false);
      setExpandedGroups([groupId]);
      return;
    }
    setExpandedGroups(prev => 
      prev.includes(groupId) 
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  // Super Admin Navigation Groups
  const superAdminGroups: NavGroup[] = isSuperAdmin ? [
    {
      id: 'system',
      name: t('navigation.groups.system', 'System Management'),
      icon: Shield,
      items: [
        { name: t('navigation.adminUsers'), to: '/admin-users', icon: Users, show: true },
        { name: t('navigation.roles', 'Roles'), to: '/roles', icon: Shield, show: true },
        { name: t('navigation.permissions', 'Permissions'), to: '/permissions', icon: Key, show: true },
        { name: t('navigation.languages'), to: '/languages', icon: Languages, show: true },
        { name: t('navigation.currencies'), to: '/currencies', icon: DollarSign, show: true },
      ]
    },
    {
      id: 'masterData',
      name: t('navigation.groups.masterData', 'Master Data'),
      icon: UtensilsCrossed,
      items: [
        { name: t('navigation.addonTypes', 'Addon Types'), to: '/addon-types', icon: UtensilsCrossed, show: true },
        { name: t('navigation.addons', 'Addons'), to: '/addons', icon: Package, show: true },
        { name: t('navigation.orderSources', 'Order Sources'), to: '/order-sources', icon: ShoppingBag, show: true },
        { name: t('navigation.orderTypes', 'Order Types'), to: '/order-types', icon: ClipboardList, show: true },
        { name: t('navigation.orderDestinations', 'Order Destinations'), to: '/order-destinations', icon: Navigation, show: true },
        { name: t('navigation.paymentTypes', 'Payment Types'), to: '/payment-types', icon: Wallet, show: true },
        { name: t('navigation.orderItemStatuses', 'Order Item Statuses'), to: '/order-item-statuses', icon: CircleDot, show: true },
        { name: t('navigation.paymentStatuses', 'Payment Statuses'), to: '/payment-statuses', icon: BadgeCheck, show: true },
        { name: t('navigation.ingredients', 'Ingredients'), to: '/ingredients', icon: Leaf, show: true },
        { name: t('navigation.expenseCategories', 'Expense Categories'), to: '/expense-categories', icon: Receipt, show: true },
        { name: t('navigation.menuCategories', 'Menu Categories'), to: '/menu-categories', icon: LayoutList, show: true },
      ]
    },
    {
      id: 'tenants',
      name: t('navigation.groups.tenants', 'Tenant Management'),
      icon: Building2,
      items: [
        { name: t('navigation.tenantTypes'), to: '/tenant-types', icon: Store, show: true },
        { name: t('navigation.subscriptionPlans'), to: '/tenant-type-subscription-plans', icon: CreditCard, show: true },
        { name: t('navigation.tenants'), to: '/tenants', icon: Store, show: true },
      ]
    }
  ] : [];

  // Tenant Navigation Groups
  const tenantGroups: NavGroup[] = selectedTenant ? [
    {
      id: 'restaurant',
      name: t('navigation.groups.restaurant', 'Restaurant'),
      icon: Store,
      items: [
        { name: t('navigation.stores', 'Stores'), to: '/tenant/stores', icon: Store, show: hasPermission('stores.view') },
        { name: t('navigation.tenantMenuCategories', 'Menu Categories'), to: '/tenant/menu-categories', icon: LayoutList, show: hasPermission('menu_categories.view') },
        { name: t('navigation.tenantIngredients', 'Ingredients'), to: '/tenant/ingredients', icon: Leaf, show: hasPermission('ingredients.view') },
        { name: t('navigation.tenantAddonTypes', 'Addon Types'), to: '/tenant/addon-types', icon: UtensilsCrossed, show: hasPermission('addon_types.view') },
        { name: t('navigation.tenantAddons', 'Addons'), to: '/tenant/addons', icon: Package, show: hasPermission('addons.view') },
        { name: t('navigation.tenantOrderDestinations', 'Order Destinations'), to: '/tenant/order-destinations', icon: Navigation, show: hasPermission('order_destinations.view') },
        { name: t('navigation.tenantMenuItems', 'Menu Items'), to: '/tenant/menu-items', icon: ClipboardList, show: hasPermission('menu_items.view') },
        { name: t('navigation.tenantSeatingAreas', 'Seating Areas'), to: '/tenant/seating-areas', icon: Armchair, show: hasPermission('seating_areas.view') },
        { name: t('navigation.tenantTables', 'Tables'), to: '/tenant/tables', icon: LayoutDashboard, show: hasPermission('tables.view') },
        { name: t('navigation.reservations', 'Reservations'), to: '/tenant/reservations', icon: CalendarClock, show: hasPermission('reservations.view') },
        { name: t('navigation.tenantOrderSources', 'Order Sources'), to: '/tenant/order-sources', icon: Inbox, show: hasPermission('order_sources.view') },
        { name: t('navigation.tenantOrderTypes', 'Order Types'), to: '/tenant/order-types', icon: Tags, show: hasPermission('order_types.view') },
        { name: t('navigation.tenantOrderItemStatuses', 'Order Item Statuses'), to: '/tenant/order-item-statuses', icon: ListChecks, show: hasPermission('order_item_statuses.view') },
        { name: t('navigation.tenantPaymentStatuses', 'Payment Statuses'), to: '/tenant/payment-statuses', icon: BadgeDollarSign, show: hasPermission('payment_statuses.view') },
        { name: t('navigation.tenantPaymentTypes', 'Payment Types'), to: '/tenant/payment-types', icon: Wallet, show: hasPermission('payment_types.view') },
      ].filter(item => item.show)
    },
    {
      id: 'team',
      name: t('navigation.groups.team', 'Team'),
      icon: Users,
      items: [
        { name: t('navigation.tenantWaiters', 'Waiters'), to: '/tenant/waiters', icon: Users, show: hasPermission('waiters.view') },
        { name: t('navigation.tenantCustomers', 'Customers'), to: '/tenant/customers', icon: Users, show: hasPermission('customers.view') },
        { name: t('navigation.teamMembers'), to: '/tenant/users', icon: Users, show: hasPermission('tenant_users.view') },
      ].filter(item => item.show)
    },
    {
      id: 'operations',
      name: t('navigation.groups.operations', 'Operations'),
      icon: ShoppingCart,
      items: [
        { name: t('navigation.orders', 'Orders'), to: '/tenant/orders', icon: ShoppingCart, show: hasPermission('orders.view') },
        { name: t('navigation.transactions', 'Transactions'), to: '/tenant/transactions', icon: CreditCard, show: hasPermission('transactions.view') },
        { name: t('navigation.qrInvoiceTokens', 'QR Invoice Tokens'), to: '/tenant/qr-invoice-tokens', icon: QrCode, show: hasPermission('qr_invoice_tokens.view') },
        { name: t('navigation.tenantSuppliers', 'Suppliers'), to: '/tenant/suppliers', icon: Truck, show: hasPermission('suppliers.view') },
        { name: t('navigation.tenantInventoryProducts', 'Inventory Products'), to: '/tenant/inventory-products', icon: Boxes, show: hasPermission('inventory_products.view') },
        { name: t('navigation.supplierInvoices', 'Supplier Invoices'), to: '/tenant/supplier-invoices', icon: FileText, show: hasPermission('supplier_invoices.view') },
        { name: t('navigation.stockIntakes', 'Stock Intakes'), to: '/tenant/stock-intakes', icon: PackageOpen, show: hasPermission('stock_intakes.view') },
      ].filter(item => item.show)
    }
  ].filter(group => group.items.length > 0) : [];

  const isGroupActive = (group: NavGroup) => {
    return group.items.some(item => location.pathname === item.to || location.pathname.startsWith(item.to + '/'));
  };

  const renderNavGroup = (group: NavGroup) => {
    const isExpanded = expandedGroups.includes(group.id);
    const isActive = isGroupActive(group);

    return (
      <div key={group.id} className="mb-1">
        <button
          onClick={() => toggleGroup(group.id)}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200
            ${isActive ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'}
            ${isCollapsed ? 'justify-center' : 'justify-between'}
          `}
          title={isCollapsed ? group.name : undefined}
        >
          <div className="flex items-center gap-3">
            <group.icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-emerald-400' : ''}`} />
            {!isCollapsed && (
              <span className="font-medium text-sm">{group.name}</span>
            )}
          </div>
          {!isCollapsed && (
            <ChevronDown 
              className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} 
            />
          )}
        </button>
        
        {/* Expanded items */}
        {!isCollapsed && isExpanded && (
          <div className="mt-1 ml-4 pl-4 border-l border-slate-700/50 space-y-0.5">
            {group.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200
                  ${isActive 
                    ? 'bg-emerald-500/10 text-emerald-400 font-medium' 
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                  }`
                }
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                <span>{item.name}</span>
              </NavLink>
            ))}
          </div>
        )}

        {/* Collapsed hover menu */}
        {isCollapsed && (
          <div className="hidden group-hover:block absolute left-full top-0 ml-2 bg-slate-800 rounded-lg shadow-xl border border-slate-700 py-2 min-w-48 z-50">
            <div className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-700 mb-1">
              {group.name}
            </div>
            {group.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 text-sm transition-colors
                  ${isActive 
                    ? 'bg-emerald-500/10 text-emerald-400' 
                    : 'text-slate-300 hover:bg-slate-700'
                  }`
                }
              >
                <item.icon className="w-4 h-4" />
                <span>{item.name}</span>
              </NavLink>
            ))}
          </div>
        )}
      </div>
    );
  };

  const SidebarContent = ({ showCollapseButton = false }: { showCollapseButton?: boolean }) => (
    <>
      {/* Logo / Brand */}
      <div className={`p-4 border-b border-slate-700/50 ${isCollapsed ? 'px-2' : ''}`}>
        <div className={`flex items-center ${isCollapsed ? 'flex-col gap-2' : 'justify-between'}`}>
          <div className={`flex items-center ${isCollapsed ? '' : 'gap-3'}`}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center flex-shrink-0">
              <Store className="w-5 h-5 text-white" />
            </div>
            {!isCollapsed && (
              <div className="min-w-0">
                <h1 className="font-bold text-white text-lg truncate">
                  {t('common.adminSaas', 'Market SaaS')}
                </h1>
                <p className="text-xs text-slate-400 truncate">
                  {t('common.adminPanel', 'Admin Panel')}
                </p>
              </div>
            )}
          </div>
          {/* Collapse Toggle - Desktop Only */}
          {showCollapseButton && (
            <button
              onClick={toggleCollapse}
              className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      {/* Tenant Selector */}
      {tenants.length > 0 && !isCollapsed && (
        <div className="p-4 border-b border-slate-700/50">
          <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
            {t('common.currentTenant', 'Current Tenant')}
          </label>
          <select
            value={selectedTenant?.id || ''}
            onChange={(e) => {
              const tenant = tenants.find(t => t.id === parseInt(e.target.value));
              selectTenant(tenant || null);
            }}
            className="mt-2 w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white 
                       focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all
                       appearance-none cursor-pointer"
          >
            {tenants.map((tenant) => (
              <option key={tenant.id} value={tenant.id}>
                {tenant.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Navigation */}
      <nav className={`flex-1 overflow-y-auto py-4 ${isCollapsed ? 'px-2' : 'px-3'}`}>
        {/* Dashboard Link */}
        <div className="mb-4">
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200
              ${isActive 
                ? 'bg-emerald-500/10 text-emerald-400 font-medium' 
                : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
              }
              ${isCollapsed ? 'justify-center' : ''}`
            }
            title={isCollapsed ? t('navigation.dashboard') : undefined}
          >
            <LayoutDashboard className="w-5 h-5 flex-shrink-0" />
            {!isCollapsed && <span className="font-medium">{t('navigation.dashboard')}</span>}
          </NavLink>
        </div>

        {/* Super Admin Section */}
        {isSuperAdmin && superAdminGroups.length > 0 && (
          <div className="mb-6">
            {!isCollapsed && (
              <div className="px-3 mb-2 flex items-center gap-2">
                <Shield className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                  {t('navigation.groups.superAdmin', 'Super Admin')}
                </span>
              </div>
            )}
            {isCollapsed && (
              <div className="flex justify-center mb-2">
                <div className="w-8 h-px bg-amber-400/50" />
              </div>
            )}
            {superAdminGroups.map(renderNavGroup)}
          </div>
        )}

        {/* Tenant Section */}
        {selectedTenant && tenantGroups.length > 0 && (
          <div className="mb-6">
            {!isCollapsed && (
              <div className="px-3 mb-2 flex items-center gap-2">
                <Building2 className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  {selectedTenant.name}
                </span>
              </div>
            )}
            {isCollapsed && (
              <div className="flex justify-center mb-2">
                <div className="w-8 h-px bg-slate-600" />
              </div>
            )}
            {tenantGroups.map(renderNavGroup)}
          </div>
        )}

        {/* Settings Link */}
        {hasPermission('settings.view') && (
          <div className="mt-auto pt-4 border-t border-slate-700/50">
            <NavLink
              to="/tenant/settings"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200
                ${isActive 
                  ? 'bg-emerald-500/10 text-emerald-400 font-medium' 
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                }
                ${isCollapsed ? 'justify-center' : ''}`
              }
              title={isCollapsed ? t('navigation.settings') : undefined}
            >
              <Settings className="w-5 h-5 flex-shrink-0" />
              {!isCollapsed && <span className="font-medium">{t('navigation.settings')}</span>}
            </NavLink>
          </div>
        )}
      </nav>

      {/* User Section */}
      <div className={`border-t border-slate-700/50 ${isCollapsed ? 'p-2' : 'p-4'}`}>
        {!isCollapsed && (
          <>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-semibold flex-shrink-0">
                {user?.first_name?.[0] || user?.email[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {user?.first_name || user?.email}
                </p>
                <p className="text-xs text-slate-400 flex items-center gap-1">
                  {isSuperAdmin && <Shield className="w-3 h-3 text-amber-400" />}
                  {isSuperAdmin ? t('common.superAdmin') : t('common.admin')}
                </p>
              </div>
            </div>

            <div className="mb-3">
              <LanguageSwitcher />
            </div>
          </>
        )}

        <button
          onClick={handleLogout}
          className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-400 hover:bg-red-500/10 hover:text-red-400 rounded-lg transition-all duration-200
            ${isCollapsed ? 'justify-center' : ''}`}
          title={isCollapsed ? t('auth.logout') : undefined}
        >
          <LogOut className="w-4 h-4" />
          {!isCollapsed && <span>{t('auth.logout')}</span>}
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-slate-100 flex">
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Desktop Sidebar */}
      <aside 
        className={`hidden lg:flex flex-col bg-slate-900 border-r border-slate-700/50 transition-all duration-300 ease-in-out overflow-hidden
          ${isCollapsed ? 'w-[72px]' : 'w-72'}`}
      >
        <SidebarContent showCollapseButton={true} />
      </aside>

      {/* Mobile Sidebar */}
      <aside 
        className={`lg:hidden fixed inset-y-0 left-0 z-50 w-72 bg-slate-900 transform transition-transform duration-300 ease-in-out flex flex-col
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Mobile Close Button */}
        <button
          onClick={() => setIsMobileOpen(false)}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>
        
        <SidebarContent showCollapseButton={false} />
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <header className="lg:hidden bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-4">
          <button
            onClick={() => setIsMobileOpen(true)}
            className="w-10 h-10 flex items-center justify-center text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
              <Store className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-slate-900">
              {t('common.adminSaas', 'Market SaaS')}
            </span>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}