export const ROLE_OPTIONS = [
  { value: "SALON_OWNER", label: "Salon Owner", hint: "Full business control" },
  { value: "MANAGER", label: "Manager", hint: "Runs daily operations" },
  { value: "RECEPTIONIST", label: "Receptionist", hint: "Bookings and billing desk" },
  { value: "STAFF", label: "Staff Expert", hint: "Service delivery and schedule" },
  { value: "INVENTORY_MANAGER", label: "Inventory Manager", hint: "Stock and vendors" },
  { value: "ACCOUNTANT", label: "Accountant", hint: "Payments and finance" }
];

export const PERMISSION_ACTIONS = ["view", "create", "edit", "delete", "approve", "pay"];

export const MODULE_GROUPS = [
  {
    title: "Front Desk",
    hint: "Daily customer flow and billing",
    modules: [
      { key: "dashboard", label: "Dashboard" },
      { key: "appointments", label: "Appointments" },
      { key: "customers", label: "Customers / CRM" },
      { key: "pos", label: "POS Billing" },
      { key: "orders", label: "POS Dashboard" },
      { key: "invoices", label: "Invoices" },
      { key: "payments", label: "Payments" },
      { key: "feedback", label: "Feedback" },
      { key: "enquiries", label: "Enquiries" }
    ]
  },
  {
    title: "Operations",
    hint: "Branch setup and workforce",
    modules: [
      { key: "branches", label: "Branches" },
      { key: "services", label: "Services" },
      { key: "staff", label: "Staff / Users" },
      { key: "staffSchedule", label: "Staff Schedule" },
      { key: "attendance", label: "Attendance" }
    ]
  },
  {
    title: "Commerce",
    hint: "Inventory, plans, and reports",
    modules: [
      { key: "inventory", label: "Inventory" },
      { key: "purchases", label: "Purchases / Vendors" },
      { key: "memberships", label: "Memberships" },
      { key: "packages", label: "Packages" },
      { key: "loyalty", label: "Loyalty" },
      { key: "couponsGiftCards", label: "Coupons & Gift Cards" },
      { key: "expenses", label: "Expenses" },
      { key: "reports", label: "Reports" },
      { key: "advancedReports", label: "Advanced Reports" },
      { key: "support", label: "Support" },
      { key: "settings", label: "Settings" }
    ]
  },
  {
    title: "Marketing & Communication",
    hint: "Campaigns, templates, and outreach",
    modules: [
      { key: "campaigns", label: "Campaigns" },
      { key: "campaignTemplates", label: "Campaign Templates" },
      { key: "messageTemplates", label: "Message Templates" },
      { key: "whatsapp", label: "WhatsApp" },
      { key: "notifications", label: "Notifications" }
    ]
  },
  {
    title: "Platform",
    hint: "Storefront and system configuration",
    modules: [
      { key: "catalog", label: "Website Catalogue" },
      { key: "catalogAnalytics", label: "Catalogue Analytics" },
      { key: "ecommerce", label: "Online Orders" },
      { key: "customerPortalSettings", label: "Staff Portal Settings" },
      { key: "auditLogs", label: "Audit Logs" }
    ]
  },
  {
    title: "Personal Workspace",
    hint: "Self-service staff pages",
    modules: [
      { key: "myDashboard", label: "My Dashboard" },
      { key: "myAppointments", label: "My Appointments" },
      { key: "mySchedule", label: "My Schedule" },
      { key: "myAttendance", label: "My Attendance" },
      { key: "myProfile", label: "My Profile" }
    ]
  }
];

const moduleKeys = MODULE_GROUPS.flatMap((group) => group.modules.map((module) => module.key));

const makePermissions = (grants) =>
  moduleKeys.reduce((accumulator, key) => {
    if (grants[key]?.length) {
      accumulator[key] = [...grants[key]];
    }
    return accumulator;
  }, {});

export const ROLE_PRESETS = {
  SALON_OWNER: makePermissions(
    Object.fromEntries(moduleKeys.map((key) => [key, [...PERMISSION_ACTIONS]]))
  ),
  MANAGER: makePermissions({
    dashboard: ["view"],
    appointments: ["view", "create", "edit"],
    customers: ["view", "create", "edit"],
    pos: ["view", "create", "edit"],
    orders: ["view", "edit"],
    invoices: ["view", "create", "edit"],
    payments: ["view", "create"],
    branches: ["view"],
    services: ["view", "edit"],
    staff: ["view"],
    staffSchedule: ["view", "edit"],
    attendance: ["view", "create", "edit"],
    inventory: ["view", "edit"],
    purchases: ["view", "create"],
    memberships: ["view", "create", "edit"],
    packages: ["view", "create", "edit"],
    loyalty: ["view", "create", "edit"],
    couponsGiftCards: ["view", "create", "edit"],
    feedback: ["view", "edit"],
    enquiries: ["view", "create", "edit"],
    expenses: ["view", "create", "edit", "approve"],
    reports: ["view"],
    support: ["view", "create"],
    notifications: ["view"],
    whatsapp: ["view"],
    settings: ["view"],
    myDashboard: ["view"],
    myAppointments: ["view"],
    mySchedule: ["view"],
    myAttendance: ["view", "create", "edit"],
    myProfile: ["view", "edit"]
  }),
  RECEPTIONIST: makePermissions({
    dashboard: ["view"],
    appointments: ["view", "create", "edit"],
    customers: ["view", "create", "edit"],
    pos: ["view", "create"],
    orders: ["view"],
    invoices: ["view", "create"],
    payments: ["view", "create"],
    memberships: ["view"],
    packages: ["view"],
    loyalty: ["view"],
    couponsGiftCards: ["view"],
    feedback: ["view"],
    enquiries: ["view", "create", "edit"],
    attendance: ["view", "create", "edit"],
    branches: ["view"],
    notifications: ["view"],
    support: ["view", "create"],
    myDashboard: ["view"],
    myAppointments: ["view"],
    mySchedule: ["view"],
    myAttendance: ["view", "create", "edit"],
    myProfile: ["view", "edit"]
  }),
  STAFF: makePermissions({
    appointments: ["view", "edit"],
    customers: ["view"],
    feedback: ["view"],
    attendance: ["view", "create", "edit"],
    branches: ["view"],
    myDashboard: ["view"],
    myAppointments: ["view"],
    mySchedule: ["view"],
    myAttendance: ["view", "create", "edit"],
    myProfile: ["view", "edit"]
  }),
  INVENTORY_MANAGER: makePermissions({
    dashboard: ["view"],
    inventory: ["view", "create", "edit", "delete"],
    purchases: ["view", "create", "edit"],
    reports: ["view"],
    expenses: ["view"],
    myDashboard: ["view"],
    myProfile: ["view", "edit"]
  }),
  ACCOUNTANT: makePermissions({
    dashboard: ["view"],
    orders: ["view"],
    invoices: ["view", "edit"],
    payments: ["view", "create", "edit"],
    expenses: ["view", "create", "edit", "approve"],
    reports: ["view"],
    notifications: ["view"],
    support: ["view", "create"],
    myDashboard: ["view"],
    myProfile: ["view", "edit"]
  })
};

export const DEFAULT_PERMISSIONS = ROLE_PRESETS.RECEPTIONIST;

export const clonePermissions = (permissions = {}) =>
  Object.entries(permissions).reduce((accumulator, [key, actions]) => {
    accumulator[key] = Array.isArray(actions) ? [...actions] : [];
    return accumulator;
  }, {});

export const countGrantedModules = (permissions = {}) =>
  Object.values(permissions).filter((actions) => Array.isArray(actions) && actions.length > 0).length;

export const countGrantedActions = (permissions = {}) =>
  Object.values(permissions).reduce(
    (total, actions) => total + (Array.isArray(actions) ? actions.length : 0),
    0
  );

export const resolveRoleLabel = (roleCode) =>
  ROLE_OPTIONS.find((role) => role.value === roleCode)?.label || roleCode;
