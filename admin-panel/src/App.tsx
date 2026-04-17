import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { useAuthStore } from './store/authStore';
import LoginPage from './pages/LoginPage';
import DashboardLayout from './components/DashboardLayout';
import DashboardPage from './pages/DashboardPage';
import LanguagesPage from './pages/LanguagesPage';
import CurrenciesPage from './pages/CurrenciesPage';
import TenantTypesPage from './pages/TenantTypesPage';
import SubscriptionPlansPage from './pages/SubscriptionPlansPage';
import TenantsPage from './pages/Tenants/TenantsPage';
import CreateTenantPage from './pages/Tenants/CreateTenantPage';
import TenantDetailPage from './pages/Tenants/TenantDetailPage';
import AdminUsersPage from './pages/MasterAdmins/AdminUsersPage';
import AdminUserFormPage from './pages/MasterAdmins/AdminUserFormPage';
import AdminUserDetailPage from './pages/MasterAdmins/AdminUserDetailPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import TenantUsersPage from './pages/TenantUsers/TenantUsersPage';
import TenantUserInvitePage from './pages/TenantUsers/TenantUserInvitePage';
import TenantUserDetailPage from './pages/TenantUsers/TenantUserDetailPage';
import AcceptInvitationPage from './pages/TenantUsers/AcceptInvitationPage';
import RolesPage from './pages/RolesPermissions/RolesPage';
import PermissionsPage from './pages/RolesPermissions/PermissionsPage';
import StoresPage from './pages/Stores/StoresPage';
import TenantSettingsPage from './pages/Settings/TenantSettingsPage';
import AddonTypesPage from './pages/AddonTypesPage';
import AddonsPage from './pages/AddonsPage';
import OrderSourcesPage from './pages/OrderSourcesPage';
import OrderTypesPage from './pages/OrderTypesPage';
import OrderDestinationsPage from './pages/OrderDestinationsPage';
import PaymentTypesPage from './pages/PaymentTypesPage';
import OrderItemStatusesPage from './pages/OrderItemStatusesPage';
import PaymentStatusesPage from './pages/PaymentStatusesPage';
import IngredientsPage from './pages/IngredientsPage';
import ExpenseCategoriesPage from './pages/ExpenseCategoriesPage';
import MenuCategoriesPage from './pages/MenuCategoriesPage';
import TenantMenuCategoriesPage from './pages/TenantMenuCategoriesPage';
import TenantIngredientsPage from './pages/TenantIngredientsPage';
import TenantAddonTypesPage from './pages/TenantAddonTypesPage';
import TenantAddonsPage from './pages/TenantAddonsPage';
import TenantOrderDestinationsPage from './pages/TenantOrderDestinationsPage';
import TenantMenuItemsPage from './pages/TenantMenuItemsPage';
import TenantSeatingAreasPage from './pages/TenantSeatingAreasPage';
import TenantTableStructuresPage from './pages/TenantTableStructuresPage';
import TenantWaitersPage from './pages/TenantWaitersPage';
import TenantCustomersPage from './pages/TenantCustomersPage';
import ReservationsPage from './pages/ReservationsPage';
import TenantOrderSourcesPage from './pages/TenantOrderSourcesPage';
import TenantOrderTypesPage from './pages/TenantOrderTypesPage';


function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" richColors />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/accept-invitation" element={<AcceptInvitationPage />} />

        <Route path="/" element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="languages" element={<LanguagesPage />} />
          <Route path="currencies" element={<CurrenciesPage />} />
          <Route path="tenant-types" element={<TenantTypesPage />} />
          <Route path="tenant-type-subscription-plans" element={<SubscriptionPlansPage />} />
          <Route path="tenants" element={<TenantsPage />} />
          <Route path="tenants/new" element={<CreateTenantPage />} />
          <Route path="tenants/:id" element={<TenantDetailPage />} />
         
          <Route path="admin-users" element={<AdminUsersPage />} />
          <Route path="admin-users/new" element={<AdminUserFormPage />} />
          <Route path="admin-users/:id" element={<AdminUserDetailPage />} />
          <Route path="admin-users/:id/edit" element={<AdminUserFormPage />} />
          <Route path="addon-types" element={<AddonTypesPage />} />
          <Route path="addons" element={<AddonsPage />} />
          <Route path="order-sources" element={<OrderSourcesPage />} />
          <Route path="order-types" element={<OrderTypesPage />} />
          <Route path="order-destinations" element={<OrderDestinationsPage />} />
          <Route path="payment-types" element={<PaymentTypesPage />} />
          <Route path="order-item-statuses" element={<OrderItemStatusesPage />} />
          <Route path="payment-statuses" element={<PaymentStatusesPage />} />
          <Route path="ingredients" element={<IngredientsPage />} />
          <Route path="expense-categories" element={<ExpenseCategoriesPage />} />
          <Route path="menu-categories" element={<MenuCategoriesPage />} />
          <Route path="roles" element={<RolesPage />} />
          <Route path="permissions" element={<PermissionsPage />} />
          <Route path="tenant/menu-categories" element={<TenantMenuCategoriesPage />} />
          <Route path="tenant/ingredients" element={<TenantIngredientsPage />} />
          <Route path="tenant/addon-types" element={<TenantAddonTypesPage />} />
          <Route path="tenant/addons" element={<TenantAddonsPage />} />
          <Route path="tenant/order-destinations" element={<TenantOrderDestinationsPage />} />
          <Route path="tenant/menu-items" element={<TenantMenuItemsPage />} />
          <Route path="tenant/seating-areas" element={<TenantSeatingAreasPage />} />
          <Route path="tenant/tables" element={<TenantTableStructuresPage />} />
          <Route path="tenant/waiters" element={<TenantWaitersPage />} />
          <Route path="tenant/customers" element={<TenantCustomersPage />} />
          <Route path="tenant/reservations" element={<ReservationsPage />} />
          <Route path="tenant/order-sources" element={<TenantOrderSourcesPage />} />
          <Route path="tenant/order-types" element={<TenantOrderTypesPage />} />
          <Route path="tenant/stores" element={<StoresPage />} />
          <Route path="tenant/settings" element={<TenantSettingsPage />} />
          <Route path="tenant/users" element={<TenantUsersPage />} />
          <Route path="tenant/users/invite" element={<TenantUserInvitePage />} />
          <Route path="tenant/users/:id" element={<TenantUserDetailPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
