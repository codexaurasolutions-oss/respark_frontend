import { Suspense, lazy, useEffect, useState } from "react";
import { Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import Sidebar from "./components/Sidebar.jsx";
import Topbar from "./components/Topbar.jsx";
import { useAuth } from "./context/AuthContext";
import PageLoader from "./components/PageLoader.jsx";
import { SETTINGS_WORKSPACE_SECTIONS } from "./pages/owner/settingsWorkspaceConfig.js";
const LoginPage = lazy(() => import("./pages/LoginPage.jsx"));
const ForgotPasswordPage = lazy(() => import("./pages/ForgotPasswordPage.jsx"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage.jsx"));
const OwnerDashboard = lazy(() => import("./pages/owner/Dashboard.jsx"));
const AppointmentsPage = lazy(() => import("./pages/owner/AppointmentsPage.jsx"));
const AppointmentDetailPage = lazy(() => import("./pages/owner/AppointmentDetailPage.jsx"));
const AppointmentEditPage = lazy(() => import("./pages/owner/AppointmentEditPage.jsx"));
const CustomersPage = lazy(() => import("./pages/owner/CustomersPage.jsx"));
const CustomerHistoryPage = lazy(() => import("./pages/owner/CustomerHistoryPage.jsx"));
const CustomerPortalSettingsPage = lazy(() => import("./pages/owner/CustomerPortalSettingsPage.jsx"));
const LoyaltyPage = lazy(() => import("./pages/owner/LoyaltyPage.jsx"));
const CouponsPage = lazy(() => import("./pages/owner/CouponsPage.jsx"));
const FeedbackPage = lazy(() => import("./pages/owner/FeedbackPage.jsx"));
const EnquiriesPage = lazy(() => import("./pages/owner/EnquiriesPage.jsx"));
const ExpensesPage = lazy(() => import("./pages/owner/ExpensesPage.jsx"));
const PayrollPage = lazy(() => import("./pages/owner/PayrollPage.jsx"));
const NotificationsPage = lazy(() => import("./pages/owner/NotificationsPage.jsx"));
const OwnerAuditLogsPage = lazy(() => import("./pages/owner/OwnerAuditLogsPage.jsx"));
const WhatsAppPage = lazy(() => import("./pages/owner/WhatsAppPage.jsx"));
const BranchesPage = lazy(() => import("./pages/owner/BranchesPage.jsx"));
const InventoryPage = lazy(() => import("./pages/owner/InventoryPage.jsx"));
const ProductCategoriesPage = lazy(() => import("./pages/owner/ProductCategoriesPage.jsx"));
const MembershipsPage = lazy(() => import("./pages/owner/MembershipsPage.jsx"));
const MyAppointmentsPage = lazy(() => import("./pages/owner/MyAppointmentsPage.jsx"));
const MyCommissionPage = lazy(() => import("./pages/owner/MyCommissionPage.jsx"));
const MyDashboardPage = lazy(() => import("./pages/owner/MyDashboardPage.jsx"));
const MyPayrollPage = lazy(() => import("./pages/owner/MyPayrollPage.jsx"));
const MyProfilePage = lazy(() => import("./pages/owner/MyProfilePage.jsx"));
const MySchedulePage = lazy(() => import("./pages/owner/MySchedulePage.jsx"));
const ServiceCategoriesPage = lazy(() => import("./pages/owner/ServiceCategoriesPage.jsx"));
const StaffSchedulePage = lazy(() => import("./pages/owner/StaffSchedulePage.jsx"));
const UsersPage = lazy(() => import("./pages/owner/UsersPage.jsx"));
const ExpertsPage = lazy(() => import("./pages/owner/ExpertsPage.jsx"));
const StaffRolesPage = lazy(() => import("./pages/owner/StaffRolesPage.jsx"));
const ReportsPage = lazy(() => import("./pages/owner/ReportsPage.jsx"));
const PosPage = lazy(() => import("./pages/owner/PosPage.jsx"));
const InvoicesPage = lazy(() => import("./pages/owner/InvoicesPage.jsx"));
const PosDashboardPage = lazy(() => import("./pages/owner/PosDashboardPage.jsx"));
const PaymentsPage = lazy(() => import("./pages/owner/PaymentsPage.jsx"));
const TrendsPage = lazy(() => import("./pages/owner/TrendsPage.jsx"));
const ReportsHubPage = lazy(() => import("./pages/owner/ReportsHubPage.jsx"));
const SupportTicketsPage = lazy(() => import("./pages/owner/SupportTicketsPage.jsx"));
const SettingsPage = lazy(() => import("./pages/owner/SettingsPage.jsx"));

const CustomerLoginPage = lazy(() => import("./pages/customer/CustomerLoginPage.jsx"));
const CustomerRegisterPage = lazy(() => import("./pages/customer/CustomerRegisterPage.jsx"));
const CustomerPortalPage = lazy(() => import("./pages/customer/CustomerPortalPage.jsx"));

const OrdersPage = lazy(() => import("./pages/owner/OrdersPage.jsx"));
const CampaignsPage = lazy(() => import("./pages/owner/CampaignsPage.jsx"));
const CampaignTemplatesPage = lazy(() => import("./pages/owner/CampaignTemplatesPage.jsx"));
const MessageTemplatesPage = lazy(() => import("./pages/owner/MessageTemplatesPage.jsx"));

const StorefrontLayout = lazy(() => import("./pages/storefront/StorefrontLayout.jsx"));
const HomePage = lazy(() => import("./pages/storefront/HomePage.jsx"));
const CollectionsPage = lazy(() => import("./pages/storefront/CollectionsPage.jsx"));
const CategoryDetailPage = lazy(() => import("./pages/storefront/CategoryDetailPage.jsx"));
const ProductDetailPage = lazy(() => import("./pages/storefront/ProductDetailPage.jsx"));
const CartPage = lazy(() => import("./pages/storefront/CartPage.jsx"));
const CheckoutPage = lazy(() => import("./pages/storefront/CheckoutPage.jsx"));
const LegalContentPage = lazy(() => import("./pages/shared/LegalContentPage.jsx"));
const WebsiteEditorPage = lazy(() => import("./pages/owner/WebsiteEditorPage.jsx"));
const ManagePage = lazy(() => import("./pages/owner/ManagePage.jsx"));

const RouteFallback = () => (
  <div className="page-shell">
    <div className="panel-card">
      <PageLoader title="Loading workspace" message="We are preparing the right panel, modules, and live data for you." />
    </div>
  </div>
);

const Protected = () => {
  const { auth, logout } = useAuth();
  const location = useLocation();
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  useEffect(() => {
    setSidebarExpanded(false);
  }, [location.pathname]);
  if (!auth) return <Navigate to="/login" replace />;
  const perms = auth.membership?.permissions || {};
  const flags = auth.membership?.featureFlags || {};
  const salonRole = auth.membership?.salonRole || "";
  const can = (key, action = "view") => Array.isArray(perms[key]) && perms[key].includes(action);
  const enabled = (key) => flags[key] !== false;
  const shouldShowMyWorkspace = salonRole && salonRole !== "SALON_OWNER";
  const myWorkspaceItems = [
    can("myDashboard") && { label: "My Dashboard", to: "/admin/my-dashboard" },
    can("myAppointments") && enabled("appointments") && { label: "My Appointments", to: "/admin/my-appointments" },
    can("mySchedule") && enabled("appointments") && { label: "My Schedule", to: "/admin/my-schedule" },
    can("myCommission") && { label: "My Commission", to: "/admin/my-commission" },
    can("myProfile") && { label: "My Profile", to: "/admin/my-profile" }
  ].filter(Boolean);
  const groups = [
        {
          label: "Operations",
          hint: "Daily flow",
          items: [
            can("inventory") && enabled("inventory") && { label: "Products", to: "/admin/product-categories" },
            can("packages") && { label: "Packages Manage", to: "/admin/packages" },
            can("memberships") && { label: "Membership Manage", to: "/admin/memberships" },
            can("services") && { label: "Services", to: "/admin/services" }
          ].filter(Boolean)
        },
        {
          label: "Setup",
          hint: "Branches and team",
          items: [
            can("branches") && { label: "Branches", to: "/admin/branches" },
            can("staff") && {
              label: "Staff Details",
              to: "/admin/users"
            },
            can("staff") && {
              label: "Roles & Permissions",
              to: "/admin/roles-permissions"
            }
          ].filter(Boolean)
        },

        enabled("expenses") && can("expenses") && {
          label: "Expenses",
          hint: "Outflow & Accounts",
          items: [
            { label: "Dashboard", to: "/admin/expenses/dashboard" },
            { label: "Types", to: "/admin/expenses/types" },
            { label: "Accounts", to: "/admin/expenses/accounts" }
          ]
        },
        enabled("enquiries") && can("enquiries") && {
          label: "Enquiries",
          hint: "Lead pipeline",
          items: [
            { label: "Enquiries", to: "/admin/enquiries" }
          ]
        },
        {
          label: "Website",
          hint: "Storefront & Portal",
          items: [
            can("settings", "edit") && { label: "Website Editor", to: "/admin/website-editor" },
            can("customerPortalSettings", "view") && { label: "Portal Settings", to: "/admin/customer-portal-settings" },
            { label: "View Live Site", to: `/site/${auth?.membership?.salon?.slug || "demo-salon"}` }
          ].filter(Boolean)
        },
        {
          label: "System",
          hint: "Help and config",
          items: [
            can("settings", "edit") && {
              label: "Settings",
              to: "/admin/settings/generic"
            }
          ].filter(Boolean)
        }
      ].filter((group) => Array.isArray(group?.items) && group.items.length > 0);

  const settingsGroups = [
    {
      label: "Workspace",
      hint: "Back to main pages",
      defaultOpen: true,
      items: [
        can("dashboard") && { label: "Home / Dashboard", to: "/admin/dashboard" },
        can("pos") && { label: "POS", to: "/admin/pos" },
        can("orders") && enabled("onlineOrders") && { label: "POS Dashboard", to: "/admin/pos-dashboard" },
        can("appointments") && enabled("appointments") && { label: "Appointments", to: "/admin/appointments" },
        can("customers") && { label: "CRM", to: "/admin/customers" },
        can("reports") && enabled("reports") && { label: "Reports", to: "/admin/reports" },
        can("inventory") && enabled("inventory") && { label: "Inventory", to: "/admin/inventory" },
        { label: "Trends", to: "/admin/trends" }
      ].filter(Boolean)
    },
    {
      label: "Settings",
      hint: "Business configuration",
      defaultOpen: true,
      items: can("settings", "edit")
        ? SETTINGS_WORKSPACE_SECTIONS.map((item) => ({ label: item.label, to: item.to }))
        : []
    }
  ].filter((group) => Array.isArray(group?.items) && group.items.length > 0);

  const manageGroups = [
    {
      label: "Manage",
      hint: "Salon lifecycle",
      items: [
        { label: "Branches", to: "/admin/branches" },
        { label: "Services", to: "/admin/services" },
        {
          label: "Staff & Roles",
          to: "/admin/users"
        },
        {
          label: "Staff Schedule",
          to: "/admin/staff-schedule",
          children: [
            { label: "Availability", to: "/admin/staff-availability" }
          ]
        },
        { label: "Memberships / Packages", to: "/admin/memberships", children: [{ label: "Packages", to: "/admin/packages" }] },
        { label: "Loyalty / Coupons", to: "/admin/loyalty", children: [{ label: "Coupons", to: "/admin/coupons" }, { label: "Gift Cards", to: "/admin/gift-cards" }] },
        {
          label: "WhatsApp / Notifications",
          to: "/admin/whatsapp",
          children: [
            { label: "Settings", to: "/admin/whatsapp/settings" },
            { label: "Logs", to: "/admin/whatsapp/logs" },
            { label: "Automations", to: "/admin/whatsapp/automations" }
          ]
        },
        { label: "Payments", to: "/admin/payments" },
        { label: "Campaigns", to: "/admin/campaigns" },
        { label: "Reports Hub", to: "/admin/reports-hub" },
        { label: "Inventory", to: "/admin/inventory" }
      ]
    }
  ];

  const visibleGroups = [
    ...(shouldShowMyWorkspace && myWorkspaceItems.length
      ? [{
          label: "My Workspace",
          hint: "Personal pages",
          defaultOpen: true,
          items: myWorkspaceItems
        }]
      : []),
    ...groups
  ];

  return (
    <div className={`app-shell ${!sidebarExpanded ? "sidebar-collapsed" : ""}`}>
      <Sidebar
        groups={visibleGroups}
        auth={auth}
        onLogout={logout}
        sidebarExpanded={sidebarExpanded}
        onToggleSidebar={() => setSidebarExpanded((current) => !current)}
      />
      <div className="app-content-wrapper">
        <Topbar auth={auth} sidebarExpanded={sidebarExpanded} onToggleSidebar={() => setSidebarExpanded((current) => !current)} onLogout={logout} />
        <main className="app-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

const AccessNotice = ({ title, message }) => (
  <div className="page-shell">
    <div className="panel-card">
      <h2>{title}</h2>
      <p className="muted">{message}</p>
    </div>
  </div>
);

const OwnerRoute = ({ moduleKey, action = "view", featureKey, element }) => {
  const { auth } = useAuth();

  if (!auth) return <Navigate to="/login" replace />;

  const permissions = auth.membership?.permissions || {};
  const featureFlags = auth.membership?.featureFlags || {};
  const allowed = Array.isArray(permissions[moduleKey]) && permissions[moduleKey].includes(action);
  const enabled = featureKey ? featureFlags[featureKey] !== false : true;

  if (!enabled) {
    return <AccessNotice title="Module Disabled" message="This module is currently turned off in business settings." />;
  }

  if (!allowed) {
    return <AccessNotice title="Access Restricted" message="You are logged in, but this module is not assigned to your current role permissions." />;
  }

  return element;
};

const Home = () => {
  return <OwnerDashboard />;
};

export default function App() {
  const location = useLocation();

  return (
    <>
      <div key={location.pathname} className="route-progress active" aria-hidden="true" />
      <Suspense fallback={<RouteFallback />}>
        <div key={location.pathname} className="route-stage">
      <Routes location={location}>
        <Route path="/" element={<Navigate to="/login" replace />} />

        <Route path="/customer/login" element={<CustomerLoginPage />} />
        <Route path="/customer/register" element={<CustomerRegisterPage />} />
        <Route path="/customer" element={<CustomerPortalPage />} />
        <Route path="/customer/home" element={<CustomerPortalPage />} />
        <Route path="/customer/profile" element={<CustomerPortalPage />} />
        <Route path="/customer/bookings" element={<CustomerPortalPage />} />
        <Route path="/customer/appointments" element={<CustomerPortalPage />} />
        <Route path="/customer/appointments/:id" element={<CustomerPortalPage />} />
        <Route path="/customer/invoices" element={<CustomerPortalPage />} />
        <Route path="/customer/invoices/:id" element={<CustomerPortalPage />} />
        <Route path="/customer/packages" element={<CustomerPortalPage />} />
        <Route path="/customer/memberships" element={<CustomerPortalPage />} />
        <Route path="/customer/loyalty" element={<CustomerPortalPage />} />
        <Route path="/customer/orders" element={<CustomerPortalPage />} />
        <Route path="/customer/orders/:id" element={<CustomerPortalPage />} />
        <Route path="/customer/coupons" element={<CustomerPortalPage />} />
        <Route path="/customer/notifications" element={<CustomerPortalPage />} />
        
        <Route path="/site/:slug" element={<StorefrontLayout />}>
          <Route index element={<HomePage />} />
          <Route path="home" element={<HomePage />} />
          <Route path="collections" element={<CollectionsPage />} />
          <Route path="category/:categoryId" element={<CategoryDetailPage />} />
          <Route path="product/:id" element={<ProductDetailPage />} />
          <Route path="cart" element={<CartPage />} />
          <Route path="checkout" element={<CheckoutPage />} />
          <Route path="terms" element={<LegalContentPage scope="salon" title="Terms & Conditions" contentKey="termsAndConditions" />} />
          <Route path="privacy" element={<LegalContentPage scope="salon" title="Privacy Policy" contentKey="privacyPolicy" />} />
          <Route path="about" element={<HomePage />} /> {/* Placeholder */}
          <Route path="book" element={<HomePage />} /> {/* Placeholder */}
        </Route>

        <Route path="/terms" element={<LegalContentPage scope="global" title="Terms & Conditions" contentKey="termsUrl" />} />
        <Route path="/privacy" element={<LegalContentPage scope="global" title="Privacy Policy" contentKey="privacyUrl" />} />

        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route element={<Protected />}>
          <Route path="/app" element={<Home />} />
          <Route path="/admin/dashboard" element={<OwnerRoute moduleKey="dashboard" element={<OwnerDashboard />} />} />
          <Route path="/admin/appointments" element={<OwnerRoute moduleKey="appointments" featureKey="appointments" element={<AppointmentsPage />} />} />
          <Route path="/admin/appointments/calendar" element={<OwnerRoute moduleKey="appointments" featureKey="appointments" element={<AppointmentsPage />} />} />
          <Route path="/admin/appointments/create" element={<OwnerRoute moduleKey="appointments" featureKey="appointments" element={<AppointmentsPage />} />} />
          <Route path="/admin/appointments/:id" element={<OwnerRoute moduleKey="appointments" featureKey="appointments" element={<AppointmentDetailPage />} />} />
          <Route path="/admin/appointments/:id/edit" element={<OwnerRoute moduleKey="appointments" featureKey="appointments" element={<AppointmentEditPage />} />} />
          <Route path="/admin/branches" element={<OwnerRoute moduleKey="branches" element={<BranchesPage />} />} />
          <Route path="/admin/services" element={<OwnerRoute moduleKey="services" element={<ServiceCategoriesPage />} />} />
          <Route path="/admin/service-categories" element={<OwnerRoute moduleKey="services" element={<ServiceCategoriesPage />} />} />
          <Route path="/admin/staff-schedule" element={<OwnerRoute moduleKey="staffSchedule" featureKey="appointments" element={<StaffSchedulePage />} />} />
          <Route path="/admin/staff-availability" element={<OwnerRoute moduleKey="staffSchedule" featureKey="appointments" element={<StaffSchedulePage />} />} />
          <Route path="/admin/customers" element={<OwnerRoute moduleKey="customers" element={<CustomersPage />} />} />
          <Route path="/admin/customers/:id" element={<OwnerRoute moduleKey="customers" element={<CustomerHistoryPage />} />} />
          <Route path="/admin/customers/:id/timeline" element={<OwnerRoute moduleKey="customers" element={<CustomerHistoryPage />} />} />
          <Route path="/admin/customers/:id/history" element={<OwnerRoute moduleKey="customers" element={<CustomerHistoryPage />} />} />
          <Route path="/admin/users" element={<OwnerRoute moduleKey="staff" element={<UsersPage />} />} />
          <Route path="/admin/experts" element={<OwnerRoute moduleKey="staff" element={<ExpertsPage />} />} />
          <Route path="/admin/roles-permissions" element={<OwnerRoute moduleKey="staff" element={<StaffRolesPage />} />} />
          <Route path="/admin/pos" element={<OwnerRoute moduleKey="pos" featureKey="pos" element={<PosPage />} />} />
          <Route path="/admin/pos/new" element={<OwnerRoute moduleKey="pos" featureKey="pos" element={<PosPage />} />} />
          <Route path="/admin/pos/day-closing" element={<OwnerRoute moduleKey="payments" featureKey="pos" element={<PosPage />} />} />
          <Route path="/admin/order-dashboard" element={<OwnerRoute moduleKey="orders" featureKey="onlineOrders" element={<PosDashboardPage />} />} />
          <Route path="/admin/order-dashboard/new" element={<OwnerRoute moduleKey="orders" featureKey="onlineOrders" element={<PosDashboardPage />} />} />
          <Route path="/admin/order-dashboard/accepted" element={<OwnerRoute moduleKey="orders" featureKey="onlineOrders" element={<PosDashboardPage />} />} />
          <Route path="/admin/order-dashboard/ready" element={<OwnerRoute moduleKey="orders" featureKey="onlineOrders" element={<PosDashboardPage />} />} />
          <Route path="/admin/order-dashboard/completed" element={<OwnerRoute moduleKey="orders" featureKey="onlineOrders" element={<PosDashboardPage />} />} />
          <Route path="/admin/order-dashboard/cancelled" element={<OwnerRoute moduleKey="orders" featureKey="onlineOrders" element={<PosDashboardPage />} />} />
          <Route path="/admin/order-dashboard/:id" element={<OwnerRoute moduleKey="orders" featureKey="onlineOrders" element={<PosDashboardPage />} />} />
          <Route path="/admin/pos-dashboard" element={<OwnerRoute moduleKey="orders" featureKey="onlineOrders" element={<PosDashboardPage />} />} />
          <Route path="/admin/pos-dashboard/:id" element={<OwnerRoute moduleKey="orders" featureKey="onlineOrders" element={<PosDashboardPage />} />} />
          <Route path="/admin/trends" element={<OwnerRoute moduleKey="reports" featureKey="reports" element={<TrendsPage />} />} />
          <Route path="/admin/reports-hub" element={<OwnerRoute moduleKey="reports" featureKey="reports" element={<ReportsHubPage />} />} />
          <Route path="/admin/invoices" element={<OwnerRoute moduleKey="pos" element={<InvoicesPage />} />} />
          <Route path="/admin/invoices/:id" element={<OwnerRoute moduleKey="pos" element={<InvoicesPage />} />} />
          <Route path="/admin/payments" element={<OwnerRoute moduleKey="payments" element={<PaymentsPage />} />} />
          <Route path="/admin/product-categories" element={<OwnerRoute moduleKey="inventory" featureKey="inventory" element={<ProductCategoriesPage />} />} />
          <Route path="/admin/inventory" element={<OwnerRoute moduleKey="inventory" featureKey="inventory" element={<InventoryPage />} />} />
          <Route path="/admin/inventory/approval" element={<OwnerRoute moduleKey="inventory" featureKey="inventory" element={<InventoryPage />} />} />
          <Route path="/admin/inventory/reconciliation" element={<OwnerRoute moduleKey="inventory" featureKey="inventory" element={<InventoryPage />} />} />
          <Route path="/admin/inventory/products/create" element={<OwnerRoute moduleKey="inventory" featureKey="inventory" element={<InventoryPage />} />} />
          <Route path="/admin/inventory/products" element={<OwnerRoute moduleKey="inventory" featureKey="inventory" element={<InventoryPage />} />} />
          <Route path="/admin/inventory/products/:id/edit" element={<OwnerRoute moduleKey="inventory" featureKey="inventory" element={<InventoryPage />} />} />
          <Route path="/admin/inventory/categories" element={<OwnerRoute moduleKey="inventory" featureKey="inventory" element={<InventoryPage />} />} />
          <Route path="/admin/inventory/stock-movements" element={<OwnerRoute moduleKey="inventory" featureKey="inventory" element={<InventoryPage />} />} />
          <Route path="/admin/inventory/low-stock" element={<OwnerRoute moduleKey="inventory" featureKey="inventory" element={<InventoryPage />} />} />
          <Route path="/admin/purchases/vendors" element={<OwnerRoute moduleKey="purchases" featureKey="inventory" element={<InventoryPage />} />} />
          <Route path="/admin/purchases/orders/create" element={<OwnerRoute moduleKey="purchases" featureKey="inventory" element={<InventoryPage />} />} />
          <Route path="/admin/purchases/orders" element={<OwnerRoute moduleKey="purchases" featureKey="inventory" element={<InventoryPage />} />} />
          <Route path="/admin/purchases/transfers" element={<OwnerRoute moduleKey="purchases" featureKey="inventory" element={<InventoryPage />} />} />
          <Route path="/admin/purchases/reconciliation" element={<OwnerRoute moduleKey="purchases" featureKey="inventory" element={<InventoryPage />} />} />
          <Route path="/admin/memberships" element={<OwnerRoute moduleKey="memberships" element={<MembershipsPage />} />} />
          <Route path="/admin/memberships/create" element={<OwnerRoute moduleKey="memberships" element={<MembershipsPage />} />} />
          <Route path="/admin/memberships/:id/edit" element={<OwnerRoute moduleKey="memberships" element={<MembershipsPage />} />} />
          <Route path="/admin/packages" element={<OwnerRoute moduleKey="packages" element={<MembershipsPage />} />} />
          <Route path="/admin/packages/create" element={<OwnerRoute moduleKey="packages" element={<MembershipsPage />} />} />
          <Route path="/admin/packages/:id/edit" element={<OwnerRoute moduleKey="packages" element={<MembershipsPage />} />} />
          <Route path="/admin/customers/:id/memberships" element={<OwnerRoute moduleKey="memberships" element={<MembershipsPage />} />} />
          <Route path="/admin/customers/:id/packages" element={<OwnerRoute moduleKey="packages" element={<MembershipsPage />} />} />
          <Route path="/admin/customers/:id/loyalty" element={<OwnerRoute moduleKey="loyalty" featureKey="loyalty" element={<LoyaltyPage />} />} />
          <Route path="/admin/loyalty" element={<OwnerRoute moduleKey="loyalty" featureKey="loyalty" element={<LoyaltyPage />} />} />
          <Route path="/admin/loyalty/rules" element={<OwnerRoute moduleKey="loyalty" featureKey="loyalty" element={<LoyaltyPage />} />} />
          <Route path="/admin/loyalty/transactions" element={<OwnerRoute moduleKey="loyalty" featureKey="loyalty" element={<LoyaltyPage />} />} />
          <Route path="/admin/loyalty/reports" element={<OwnerRoute moduleKey="loyalty" featureKey="loyalty" element={<LoyaltyPage />} />} />
          <Route path="/admin/coupons" element={<OwnerRoute moduleKey="couponsGiftCards" featureKey="couponsGiftCards" element={<CouponsPage />} />} />
          <Route path="/admin/coupons/reports" element={<OwnerRoute moduleKey="couponsGiftCards" featureKey="couponsGiftCards" element={<CouponsPage />} />} />
          <Route path="/admin/gift-cards" element={<OwnerRoute moduleKey="couponsGiftCards" featureKey="couponsGiftCards" element={<CouponsPage />} />} />
          <Route path="/admin/feedback" element={<OwnerRoute moduleKey="feedback" featureKey="feedback" element={<FeedbackPage />} />} />
          <Route path="/admin/feedback/reports" element={<OwnerRoute moduleKey="feedback" featureKey="feedback" element={<FeedbackPage />} />} />
          <Route path="/admin/feedback/settings" element={<OwnerRoute moduleKey="feedback" featureKey="feedback" element={<FeedbackPage />} />} />
          <Route path="/admin/enquiries" element={<OwnerRoute moduleKey="enquiries" featureKey="enquiries" element={<EnquiriesPage />} />} />
          <Route path="/admin/enquiries/follow-ups" element={<OwnerRoute moduleKey="enquiries" featureKey="enquiries" element={<EnquiriesPage />} />} />
          <Route path="/admin/enquiries/reports" element={<OwnerRoute moduleKey="enquiries" featureKey="enquiries" element={<EnquiriesPage />} />} />
          <Route path="/admin/expenses" element={<OwnerRoute moduleKey="expenses" featureKey="expenses" element={<ExpensesPage />} />} />
          <Route path="/admin/expenses/dashboard" element={<OwnerRoute moduleKey="expenses" featureKey="expenses" element={<ExpensesPage />} />} />
          <Route path="/admin/expenses/types" element={<OwnerRoute moduleKey="expenses" featureKey="expenses" element={<ExpensesPage />} />} />
          <Route path="/admin/expenses/accounts" element={<OwnerRoute moduleKey="expenses" featureKey="expenses" element={<ExpensesPage />} />} />
          <Route path="/admin/expenses/categories" element={<OwnerRoute moduleKey="expenses" featureKey="expenses" element={<ExpensesPage />} />} />
          <Route path="/admin/expenses/reports" element={<OwnerRoute moduleKey="expenses" featureKey="expenses" element={<ExpensesPage />} />} />
          <Route path="/admin/payroll" element={<OwnerRoute moduleKey="payroll" featureKey="payroll" element={<PayrollPage />} />} />
          <Route path="/admin/attendance" element={<OwnerRoute moduleKey="attendance" featureKey="attendance" element={<PayrollPage />} />} />
          <Route path="/admin/leaves" element={<OwnerRoute moduleKey="leaves" featureKey="leaves" element={<PayrollPage />} />} />
          <Route path="/admin/incentives" element={<OwnerRoute moduleKey="incentives" featureKey="incentives" element={<PayrollPage />} />} />
          <Route path="/admin/staff-performance" element={<OwnerRoute moduleKey="advancedReports" featureKey="advancedReports" element={<PayrollPage />} />} />
          <Route path="/admin/notifications" element={<OwnerRoute moduleKey="notifications" featureKey="notifications" element={<NotificationsPage />} />} />
          <Route path="/admin/audit-logs" element={<OwnerRoute moduleKey="auditLogs" featureKey="auditLogs" element={<OwnerAuditLogsPage />} />} />
          <Route path="/admin/whatsapp" element={<OwnerRoute moduleKey="whatsapp" featureKey="whatsapp" element={<WhatsAppPage />} />} />
          <Route path="/admin/whatsapp/settings" element={<OwnerRoute moduleKey="whatsapp" featureKey="whatsapp" element={<WhatsAppPage />} />} />
          <Route path="/admin/whatsapp/logs" element={<OwnerRoute moduleKey="whatsapp" featureKey="whatsapp" element={<WhatsAppPage />} />} />
          <Route path="/admin/whatsapp/automations" element={<OwnerRoute moduleKey="whatsapp" featureKey="whatsapp" element={<WhatsAppPage />} />} />
          <Route path="/admin/reports" element={<OwnerRoute moduleKey="reports" featureKey="reports" element={<ReportsHubPage />} />} />
          <Route path="/admin/reports/appointments" element={<OwnerRoute moduleKey="reports" featureKey="reports" element={<ReportsPage />} />} />
          <Route path="/admin/reports/staff-performance" element={<OwnerRoute moduleKey="reports" featureKey="reports" element={<ReportsPage />} />} />
          <Route path="/admin/reports/product-sales" element={<OwnerRoute moduleKey="reports" featureKey="reports" element={<ReportsPage />} />} />
          <Route path="/admin/reports/service-sales" element={<OwnerRoute moduleKey="reports" featureKey="reports" element={<ReportsPage />} />} />
          <Route path="/admin/reports/memberships" element={<OwnerRoute moduleKey="reports" featureKey="reports" element={<ReportsPage />} />} />
          <Route path="/admin/reports/packages" element={<OwnerRoute moduleKey="reports" featureKey="reports" element={<ReportsPage />} />} />
          <Route path="/admin/reports/stock" element={<OwnerRoute moduleKey="reports" featureKey="reports" element={<ReportsPage />} />} />
          <Route path="/admin/reports/low-stock" element={<OwnerRoute moduleKey="reports" featureKey="reports" element={<ReportsPage />} />} />
          <Route path="/admin/reports/customers" element={<OwnerRoute moduleKey="reports" featureKey="reports" element={<ReportsPage />} />} />
          <Route path="/admin/reports/branch-sales" element={<OwnerRoute moduleKey="reports" featureKey="reports" element={<ReportsPage />} />} />
          <Route path="/admin/reports/payments" element={<OwnerRoute moduleKey="reports" featureKey="reports" element={<ReportsPage />} />} />
          <Route path="/admin/reports/cancelled-invoices" element={<OwnerRoute moduleKey="reports" featureKey="reports" element={<ReportsPage />} />} />
          <Route path="/admin/reports/loyalty" element={<OwnerRoute moduleKey="reports" featureKey="reports" element={<ReportsPage />} />} />
          <Route path="/admin/reports/gift-cards" element={<OwnerRoute moduleKey="reports" featureKey="reports" element={<ReportsPage />} />} />
          <Route path="/admin/reports/coupons" element={<OwnerRoute moduleKey="reports" featureKey="reports" element={<ReportsPage />} />} />
          <Route path="/admin/reports/campaigns" element={<OwnerRoute moduleKey="reports" featureKey="reports" element={<ReportsPage />} />} />
          <Route path="/admin/reports/feedback" element={<OwnerRoute moduleKey="reports" featureKey="reports" element={<ReportsPage />} />} />
          <Route path="/admin/reports/enquiries" element={<OwnerRoute moduleKey="reports" featureKey="reports" element={<ReportsPage />} />} />
          <Route path="/admin/reports/expenses" element={<OwnerRoute moduleKey="reports" featureKey="reports" element={<ReportsPage />} />} />
          <Route path="/admin/reports/profit-loss" element={<OwnerRoute moduleKey="reports" featureKey="reports" element={<ReportsPage />} />} />
          <Route path="/admin/reports/payroll" element={<OwnerRoute moduleKey="reports" featureKey="reports" element={<ReportsPage />} />} />
          <Route path="/admin/reports/tax" element={<OwnerRoute moduleKey="reports" featureKey="reports" element={<ReportsPage />} />} />

          <Route path="/admin/orders" element={<OwnerRoute moduleKey="orders" featureKey="onlineOrders" element={<OrdersPage />} />} />
          <Route path="/admin/orders/new" element={<OwnerRoute moduleKey="orders" featureKey="onlineOrders" element={<OrdersPage />} />} />
          <Route path="/admin/orders/accepted" element={<OwnerRoute moduleKey="orders" featureKey="onlineOrders" element={<OrdersPage />} />} />
          <Route path="/admin/orders/ready" element={<OwnerRoute moduleKey="orders" featureKey="onlineOrders" element={<OrdersPage />} />} />
          <Route path="/admin/orders/completed" element={<OwnerRoute moduleKey="orders" featureKey="onlineOrders" element={<OrdersPage />} />} />
          <Route path="/admin/orders/cancelled" element={<OwnerRoute moduleKey="orders" featureKey="onlineOrders" element={<OrdersPage />} />} />
          <Route path="/admin/orders/:id" element={<OwnerRoute moduleKey="orders" featureKey="onlineOrders" element={<OrdersPage />} />} />
          <Route path="/admin/campaigns" element={<OwnerRoute moduleKey="campaigns" featureKey="campaigns" element={<CampaignsPage />} />} />
          <Route path="/admin/campaigns/create" element={<OwnerRoute moduleKey="campaigns" featureKey="campaigns" element={<CampaignsPage />} />} />
          <Route path="/admin/campaigns/:id" element={<OwnerRoute moduleKey="campaigns" featureKey="campaigns" element={<CampaignsPage />} />} />
          <Route path="/admin/campaigns/:id/edit" element={<OwnerRoute moduleKey="campaigns" featureKey="campaigns" element={<CampaignsPage />} />} />
          <Route path="/admin/campaigns/:id/logs" element={<OwnerRoute moduleKey="campaigns" featureKey="campaigns" element={<CampaignsPage />} />} />
          <Route path="/admin/campaign-templates" element={<OwnerRoute moduleKey="campaignTemplates" featureKey="campaignTemplates" element={<CampaignTemplatesPage />} />} />
          <Route path="/admin/campaign-templates/create" element={<OwnerRoute moduleKey="campaignTemplates" featureKey="campaignTemplates" element={<CampaignTemplatesPage />} />} />
          <Route path="/admin/campaign-templates/:id/edit" element={<OwnerRoute moduleKey="campaignTemplates" featureKey="campaignTemplates" element={<CampaignTemplatesPage />} />} />
          <Route path="/admin/message-templates" element={<OwnerRoute moduleKey="messageTemplates" featureKey="messageTemplates" element={<MessageTemplatesPage />} />} />
          <Route path="/admin/message-templates/:type" element={<OwnerRoute moduleKey="messageTemplates" featureKey="messageTemplates" element={<MessageTemplatesPage />} />} />
          <Route path="/admin/message-templates/:type/edit" element={<OwnerRoute moduleKey="messageTemplates" featureKey="messageTemplates" element={<MessageTemplatesPage />} />} />
          <Route path="/admin/customer-portal-settings" element={<OwnerRoute moduleKey="customerPortalSettings" featureKey="customerPortal" element={<CustomerPortalSettingsPage />} />} />
          <Route path="/admin/support-tickets" element={<OwnerRoute moduleKey="support" element={<SupportTicketsPage />} />} />
          <Route path="/admin/settings" element={<OwnerRoute moduleKey="settings" action="edit" element={<Navigate to="/admin/settings/generic" replace />} />} />
          <Route path="/admin/settings/:section" element={<OwnerRoute moduleKey="settings" action="edit" element={<SettingsPage />} />} />
          <Route path="/admin/website-editor" element={<OwnerRoute moduleKey="settings" action="edit" element={<WebsiteEditorPage />} />} />
          <Route path="/admin/manage" element={<OwnerRoute moduleKey="settings" action="edit" element={<ManagePage />} />} />
          <Route path="/admin/my-dashboard" element={<OwnerRoute moduleKey="myDashboard" element={<MyDashboardPage />} />} />
          <Route path="/admin/my-appointments" element={<OwnerRoute moduleKey="myAppointments" featureKey="appointments" element={<MyAppointmentsPage />} />} />
          <Route path="/admin/my-schedule" element={<OwnerRoute moduleKey="mySchedule" featureKey="appointments" element={<MySchedulePage />} />} />
          <Route path="/admin/my-commission" element={<OwnerRoute moduleKey="myCommission" element={<MyCommissionPage />} />} />
          <Route path="/admin/my-payroll" element={<OwnerRoute moduleKey="myPayroll" element={<MyPayrollPage />} />} />
          <Route path="/admin/my-profile" element={<OwnerRoute moduleKey="myProfile" element={<MyProfilePage />} />} />
          <Route path="/branches" element={<Navigate to="/admin/branches" replace />} />
          <Route path="/services" element={<Navigate to="/admin/services" replace />} />
          <Route path="/customers" element={<Navigate to="/admin/customers" replace />} />
          <Route path="/roles" element={<Navigate to="/admin/roles-permissions" replace />} />
          <Route path="/invoices" element={<Navigate to="/admin/pos-dashboard" replace />} />
          <Route path="/reports" element={<Navigate to="/admin/reports" replace />} />
        </Route>
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
        </div>
      </Suspense>
    </>
  );
}
