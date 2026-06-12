const canAccess = (permissions, key, action = "view") =>
  Array.isArray(permissions?.[key]) && permissions[key].includes(action);

const isFeatureEnabled = (featureFlags, key) => featureFlags?.[key] !== false;

const LANDING_ROUTES = [
  { path: "/admin/dashboard", moduleKey: "dashboard" },
  { path: "/admin/my-dashboard", moduleKey: "myDashboard" },
  { path: "/admin/payroll", moduleKey: "payroll", featureKey: "payroll" },
  { path: "/admin/my-payroll", moduleKey: "myPayroll" },
  { path: "/admin/appointments", moduleKey: "appointments", featureKey: "appointments" },
  { path: "/admin/my-appointments", moduleKey: "myAppointments", featureKey: "appointments" },
  { path: "/admin/my-schedule", moduleKey: "mySchedule", featureKey: "appointments" },
  { path: "/admin/invoices", moduleKey: "invoices" },
  { path: "/admin/payments", moduleKey: "payments" },
  { path: "/admin/customers", moduleKey: "customers" },
  { path: "/admin/services", moduleKey: "services" },
  { path: "/admin/users", moduleKey: "staff" },
  { path: "/admin/inventory", moduleKey: "inventory", featureKey: "inventory" },
  { path: "/admin/branches", moduleKey: "branches" },
  { path: "/admin/settings/generic", moduleKey: "settings" },
  { path: "/admin/support-tickets", moduleKey: "support" },
  { path: "/admin/my-profile", moduleKey: "myProfile" }
];

export const getLandingPath = ({ permissions = {}, featureFlags = {} } = {}) => {
  const match = LANDING_ROUTES.find(({ moduleKey, featureKey }) => (
    canAccess(permissions, moduleKey) && (!featureKey || isFeatureEnabled(featureFlags, featureKey))
  ));

  return match?.path || "/admin/dashboard";
};

