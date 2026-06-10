import { Suspense, lazy } from "react";
import { Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import { useAuth } from "./context/AuthContext";
import PageLoader from "./components/PageLoader";
const LoginPage = lazy(() => import("./pages/LoginPage"));
const ForgotPasswordPage = lazy(() => import("./pages/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage"));
const OwnerDashboard = lazy(() => import("./pages/owner/Dashboard"));
const AppointmentsPage = lazy(() => import("./pages/owner/AppointmentsPage"));
const AppointmentDetailPage = lazy(() => import("./pages/owner/AppointmentDetailPage"));
const AppointmentEditPage = lazy(() => import("./pages/owner/AppointmentEditPage"));
const CustomersPage = lazy(() => import("./pages/owner/CustomersPage"));
const CustomerHistoryPage = lazy(() => import("./pages/owner/CustomerHistoryPage"));
const CustomerPortalSettingsPage = lazy(() => import("./pages/owner/CustomerPortalSettingsPage"));
const LoyaltyPage = lazy(() => import("./pages/owner/LoyaltyPage"));
const CouponsPage = lazy(() => import("./pages/owner/CouponsPage"));
const FeedbackPage = lazy(() => import("./pages/owner/FeedbackPage"));
const EnquiriesPage = lazy(() => import("./pages/owner/EnquiriesPage"));
const ExpensesPage = lazy(() => import("./pages/owner/ExpensesPage"));
const PayrollPage = lazy(() => import("./pages/owner/PayrollPage"));
const NotificationsPage = lazy(() => import("./pages/owner/NotificationsPage"));
const OwnerAuditLogsPage = lazy(() => import("./pages/owner/OwnerAuditLogsPage"));
const WhatsAppPage = lazy(() => import("./pages/owner/WhatsAppPage"));
const InvoicesPage = lazy(() => import("./pages/owner/InvoicesPage"));
const BranchesPage = lazy(() => import("./pages/owner/BranchesPage"));
const InventoryPage = lazy(() => import("./pages/owner/InventoryPage"));
const MembershipsPage = lazy(() => import("./pages/owner/MembershipsPage"));
const MyAppointmentsPage = lazy(() => import("./pages/owner/MyAppointmentsPage"));
const MyCommissionPage = lazy(() => import("./pages/owner/MyCommissionPage"));
const MyDashboardPage = lazy(() => import("./pages/owner/MyDashboardPage"));
const MyProfilePage = lazy(() => import("./pages/owner/MyProfilePage"));
const MySchedulePage = lazy(() => import("./pages/owner/MySchedulePage"));
const ServicesPage = lazy(() => import("./pages/owner/ServicesPage"));
const ServiceCategoriesPage = lazy(() => import("./pages/owner/ServiceCategoriesPage"));
const StaffSchedulePage = lazy(() => import("./pages/owner/StaffSchedulePage"));
const UsersPage = lazy(() => import("./pages/owner/UsersPage"));
const StaffRolesPage = lazy(() => import("./pages/owner/StaffRolesPage"));
const ReportsPage = lazy(() => import("./pages/owner/ReportsPage"));
const PosPage = lazy(() => import("./pages/owner/PosPage"));
const PaymentsPage = lazy(() => import("./pages/owner/PaymentsPage"));
const SupportTicketsPage = lazy(() => import("./pages/owner/SupportTicketsPage"));
const SettingsPage = lazy(() => import("./pages/owner/SettingsPage"));

const CustomerLoginPage = lazy(() => import("./pages/customer/CustomerLoginPage"));
const CustomerRegisterPage = lazy(() => import("./pages/customer/CustomerRegisterPage"));
const CustomerPortalPage = lazy(() => import("./pages/customer/CustomerPortalPage"));

const OrdersPage = lazy(() => import("./pages/owner/OrdersPage"));
const CampaignsPage = lazy(() => import("./pages/owner/CampaignsPage"));
const CampaignTemplatesPage = lazy(() => import("./pages/owner/CampaignTemplatesPage"));
const MessageTemplatesPage = lazy(() => import("./pages/owner/MessageTemplatesPage"));

const StorefrontLayout = lazy(() => import("./pages/storefront/StorefrontLayout"));
const HomePage = lazy(() => import("./pages/storefront/HomePage"));
const CollectionsPage = lazy(() => import("./pages/storefront/CollectionsPage"));
const CategoryDetailPage = lazy(() => import("./pages/storefront/CategoryDetailPage"));
const ProductDetailPage = lazy(() => import("./pages/storefront/ProductDetailPage"));
const CartPage = lazy(() => import("./pages/storefront/CartPage"));
const CheckoutPage = lazy(() => import("./pages/storefront/CheckoutPage"));
const WebsiteEditorPage = lazy(() => import("./pages/owner/WebsiteEditorPage"));

const RouteFallback = () => (
  <div className="page-shell">
    <div className="panel-card">
      <PageLoader title="Loading workspace" message="We are preparing the right panel, modules, and live data for you." />
    </div>
  </div>
);

const Protected = () => {
  const { auth, logout } = useAuth();
  if (!auth) return <Navigate to="/login" replace />;
  const perms = auth.membership?.permissions || {};
  const flags = auth.membership?.featureFlags || {};
  const can = (key, action = "view") => Array.isArray(perms[key]) && perms[key].includes(action);
  const enabled = (key) => flags[key] !== false;
  const groups = [
        {
          label: "Operations",
          hint: "Daily flow",
          items: [
            can("dashboard") && { label: "Owner Dashboard", to: "/admin/dashboard" },
            can("appointments") && {
              label: "Appointments",
              to: "/admin/appointments",
              children: [
                { label: "Calendar", to: "/admin/appointments/calendar" },
                { label: "Create Booking", to: "/admin/appointments/create" }
              ]
            },
            enabled("pos") && can("pos") && {
              label: "POS & Billing",
              to: "/admin/pos",
              children: [
                { label: "New Sale", to: "/admin/pos/new" },
                { label: "Day Closing", to: "/admin/pos/day-closing" }
              ]
            },
            can("invoices") && { label: "Invoices", to: "/admin/invoices" },
            can("payments") && { label: "Payments", to: "/admin/payments" }
          ].filter(Boolean)
        },
        {
          label: "Setup",
          hint: "Branches and team",
          items: [
            can("branches") && { label: "Branches", to: "/admin/branches" },
            can("services") && {
              label: "Services",
              to: "/admin/services",
              children: [
                { label: "Categories", to: "/admin/service-categories" }
              ]
            },
            can("staff") && {
              label: "Staff & Roles",
              to: "/admin/users",
              children: [
                { label: "Roles & Permissions", to: "/admin/roles-permissions" }
              ]
            },
            can("staffSchedule") && {
              label: "Staff Schedule",
              to: "/admin/staff-schedule",
              children: [
                { label: "Availability", to: "/admin/staff-availability" }
              ]
            }
          ].filter(Boolean)
        },
        {
          label: "CRM & Revenue",
          hint: "Customer growth",
          items: [
            can("customers") && { label: "Customers / CRM", to: "/admin/customers" },
            can("memberships") && { label: "Memberships", to: "/admin/memberships" },
            can("packages") && { label: "Packages", to: "/admin/packages" },
            enabled("loyalty") && can("loyalty") && {
              label: "Loyalty",
              to: "/admin/loyalty",
              children: [
                { label: "Rules", to: "/admin/loyalty/rules" },
                { label: "Transactions", to: "/admin/loyalty/transactions" },
                { label: "Reports", to: "/admin/loyalty/reports" }
              ]
            },
            enabled("couponsGiftCards") && can("couponsGiftCards") && {
              label: "Coupons & Gift Cards",
              to: "/admin/coupons",
              children: [
                { label: "Gift Cards", to: "/admin/gift-cards" },
                { label: "Reports", to: "/admin/coupons/reports" }
              ]
            },
            can("reports") && {
              label: "Reports",
              to: "/admin/reports",
              children: [
                { label: "Operations", to: "/admin/reports/appointments" },
                { label: "Loyalty", to: "/admin/reports/loyalty" },
                { label: "Finance", to: "/admin/reports/profit-loss" },
                { label: "Payroll", to: "/admin/reports/payroll" }
              ]
            }
          ].filter(Boolean)
        },
        {
          label: "Digital & Online",
          hint: "Catalog and sales",
          items: [
            { label: "Website Editor", to: "/admin/website-editor" },
            enabled("onlineOrders") && can("orders") && {
              label: "Online Orders",
              to: "/admin/orders",
              children: [
                { label: "New", to: "/admin/orders/new" },
                { label: "Accepted", to: "/admin/orders/accepted" },
                { label: "Ready", to: "/admin/orders/ready" },
                { label: "Completed", to: "/admin/orders/completed" },
                { label: "Cancelled", to: "/admin/orders/cancelled" }
              ]
            },
            enabled("campaigns") && can("campaigns") && {
              label: "Campaigns",
              to: "/admin/campaigns",
              children: [
                { label: "Template Library", to: "/admin/campaign-templates" }
              ]
            },
            enabled("campaignTemplates") && can("campaignTemplates") && { label: "Campaign Templates", to: "/admin/campaign-templates" },
            enabled("messageTemplates") && can("messageTemplates") && { label: "Message Templates", to: "/admin/message-templates" },
            enabled("customerPortal") && can("customerPortalSettings") && { label: "Customer Portal Settings", to: "/admin/customer-portal-settings" }
          ].filter(Boolean)
        },
        {
          label: "Inventory",
          hint: "Stock control",
          items: [
            enabled("inventory") && can("inventory") && {
              label: "Inventory",
              to: "/admin/inventory",
              children: [
                { label: "Products", to: "/admin/inventory/products" },
                { label: "Categories", to: "/admin/inventory/categories" },
                { label: "Stock Movements", to: "/admin/inventory/stock-movements" },
                { label: "Low Stock", to: "/admin/inventory/low-stock" }
              ]
            },
            can("purchases") && {
              label: "Purchases / Vendors",
              to: "/admin/purchases/vendors",
              children: [
                { label: "Purchase Orders", to: "/admin/purchases/orders" },
                { label: "Transfers", to: "/admin/purchases/transfers" },
                { label: "Reconciliation", to: "/admin/purchases/reconciliation" }
              ]
            }
          ].filter(Boolean)
        },
        {
          label: "My Workspace",
          hint: "Personal view",
          items: [
            can("myDashboard") && { label: "My Dashboard", to: "/admin/my-dashboard" },
            can("myAppointments") && { label: "My Appointments", to: "/admin/my-appointments" },
            can("mySchedule") && { label: "My Schedule", to: "/admin/my-schedule" },
            can("myCommission") && { label: "My Commission", to: "/admin/my-commission" },
            can("myProfile") && { label: "My Profile", to: "/admin/my-profile" }
          ].filter(Boolean)
        },
        {
          label: "System",
          hint: "Help and config",
          items: [
            enabled("feedback") && can("feedback") && {
              label: "Feedback",
              to: "/admin/feedback",
              children: [
                { label: "Reports", to: "/admin/feedback/reports" },
                { label: "Settings", to: "/admin/feedback/settings" }
              ]
            },
            enabled("enquiries") && can("enquiries") && {
              label: "Enquiries",
              to: "/admin/enquiries",
              children: [
                { label: "Follow-ups", to: "/admin/enquiries/follow-ups" },
                { label: "Reports", to: "/admin/enquiries/reports" }
              ]
            },
            enabled("expenses") && can("expenses") && {
              label: "Expenses",
              to: "/admin/expenses",
              children: [
                { label: "Categories", to: "/admin/expenses/categories" },
                { label: "Reports", to: "/admin/expenses/reports" }
              ]
            },
            enabled("payroll") && can("payroll") && {
              label: "Payroll & Attendance",
              to: "/admin/payroll",
              children: [
                { label: "Attendance", to: "/admin/attendance" },
                { label: "Leaves", to: "/admin/leaves" },
                { label: "Incentives", to: "/admin/incentives" },
                { label: "Staff Performance", to: "/admin/staff-performance" }
              ]
            },
            enabled("notifications") && can("notifications") && { label: "Notifications", to: "/admin/notifications" },
            enabled("auditLogs") && can("auditLogs") && { label: "Audit Logs", to: "/admin/audit-logs" },
            enabled("whatsapp") && can("whatsapp") && {
              label: "WhatsApp",
              to: "/admin/whatsapp",
              children: [
                { label: "Settings", to: "/admin/whatsapp/settings" },
                { label: "Logs", to: "/admin/whatsapp/logs" },
                { label: "Automations", to: "/admin/whatsapp/automations" }
              ]
            },
            can("support") && { label: "Support Tickets", to: "/admin/support-tickets" },
            can("settings") && {
              label: "Settings",
              to: "/admin/settings/business",
              children: [
                { label: "Business", to: "/admin/settings/business" },
                { label: "Invoices", to: "/admin/settings/invoices" },
                { label: "Payments", to: "/admin/settings/payments" },
                { label: "Booking", to: "/admin/settings/booking" },
                { label: "Notifications", to: "/admin/settings/notifications" },
                { label: "WhatsApp", to: "/admin/settings/whatsapp" },

                { label: "Payroll", to: "/admin/settings/payroll" }
              ]
            }
          ].filter(Boolean)
        }
      ].filter((group) => group.items.length);

  return (
    <div className="app-shell">
      <Sidebar groups={groups} auth={auth} onLogout={logout} />
      <main className="app-main">
        <Outlet />
      </main>
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
          <Route path="about" element={<HomePage />} /> {/* Placeholder */}
          <Route path="book" element={<HomePage />} /> {/* Placeholder */}
        </Route>

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
          <Route path="/admin/services" element={<OwnerRoute moduleKey="services" element={<ServicesPage />} />} />
          <Route path="/admin/service-categories" element={<OwnerRoute moduleKey="services" element={<ServiceCategoriesPage />} />} />
          <Route path="/admin/staff-schedule" element={<OwnerRoute moduleKey="staffSchedule" featureKey="appointments" element={<StaffSchedulePage />} />} />
          <Route path="/admin/staff-availability" element={<OwnerRoute moduleKey="staffSchedule" featureKey="appointments" element={<StaffSchedulePage />} />} />
          <Route path="/admin/customers" element={<OwnerRoute moduleKey="customers" element={<CustomersPage />} />} />
          <Route path="/admin/customers/:id" element={<OwnerRoute moduleKey="customers" element={<CustomerHistoryPage />} />} />
          <Route path="/admin/customers/:id/timeline" element={<OwnerRoute moduleKey="customers" element={<CustomerHistoryPage />} />} />
          <Route path="/admin/customers/:id/history" element={<OwnerRoute moduleKey="customers" element={<CustomerHistoryPage />} />} />
          <Route path="/admin/users" element={<OwnerRoute moduleKey="staff" element={<UsersPage />} />} />
          <Route path="/admin/roles-permissions" element={<OwnerRoute moduleKey="staff" element={<StaffRolesPage />} />} />
          <Route path="/admin/pos" element={<OwnerRoute moduleKey="pos" featureKey="pos" element={<PosPage />} />} />
          <Route path="/admin/pos/new" element={<OwnerRoute moduleKey="pos" featureKey="pos" element={<PosPage />} />} />
          <Route path="/admin/pos/day-closing" element={<OwnerRoute moduleKey="payments" featureKey="pos" element={<PosPage />} />} />
          <Route path="/admin/invoices" element={<OwnerRoute moduleKey="invoices" element={<InvoicesPage />} />} />
          <Route path="/admin/invoices/:id" element={<OwnerRoute moduleKey="invoices" element={<InvoicesPage />} />} />
          <Route path="/admin/payments" element={<OwnerRoute moduleKey="payments" element={<PaymentsPage />} />} />
          <Route path="/admin/inventory" element={<OwnerRoute moduleKey="inventory" featureKey="inventory" element={<InventoryPage />} />} />
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
          <Route path="/admin/reports" element={<OwnerRoute moduleKey="reports" featureKey="reports" element={<ReportsPage />} />} />
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
          <Route path="/admin/settings" element={<Navigate to="/admin/settings/business" replace />} />
          <Route path="/admin/settings/business" element={<OwnerRoute moduleKey="settings" element={<SettingsPage />} />} />
          <Route path="/admin/settings/invoices" element={<OwnerRoute moduleKey="settings" element={<SettingsPage />} />} />
          <Route path="/admin/settings/payments" element={<OwnerRoute moduleKey="settings" element={<SettingsPage />} />} />
          <Route path="/admin/settings/booking" element={<OwnerRoute moduleKey="settings" element={<SettingsPage />} />} />
          <Route path="/admin/settings/notifications" element={<OwnerRoute moduleKey="settings" element={<SettingsPage />} />} />
          <Route path="/admin/settings/whatsapp" element={<OwnerRoute moduleKey="settings" element={<SettingsPage />} />} />
          <Route path="/admin/website-editor" element={<OwnerRoute moduleKey="settings" element={<WebsiteEditorPage />} />} />
          <Route path="/admin/settings/payroll" element={<OwnerRoute moduleKey="settings" element={<SettingsPage />} />} />
          <Route path="/admin/my-dashboard" element={<OwnerRoute moduleKey="myDashboard" element={<MyDashboardPage />} />} />
          <Route path="/admin/my-appointments" element={<OwnerRoute moduleKey="myAppointments" featureKey="appointments" element={<MyAppointmentsPage />} />} />
          <Route path="/admin/my-schedule" element={<OwnerRoute moduleKey="mySchedule" featureKey="appointments" element={<MySchedulePage />} />} />
          <Route path="/admin/my-commission" element={<OwnerRoute moduleKey="myCommission" element={<MyCommissionPage />} />} />
          <Route path="/admin/my-profile" element={<OwnerRoute moduleKey="myProfile" element={<MyProfilePage />} />} />
          <Route path="/branches" element={<Navigate to="/admin/branches" replace />} />
          <Route path="/services" element={<Navigate to="/admin/services" replace />} />
          <Route path="/customers" element={<Navigate to="/admin/customers" replace />} />
          <Route path="/roles" element={<Navigate to="/admin/roles-permissions" replace />} />
          <Route path="/invoices" element={<Navigate to="/admin/invoices" replace />} />
          <Route path="/reports" element={<Navigate to="/admin/reports" replace />} />
        </Route>
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
        </div>
      </Suspense>
    </>
  );
}
