export const SETTINGS_WORKSPACE_SECTIONS = [
  { key: "generic", label: "Generic Settings", to: "/admin/settings/generic", hint: "Salon defaults" },
  { key: "shift-management", label: "Shift Management", to: "/admin/settings/shift-management", hint: "Shift templates" },
  { key: "roster-management", label: "Roster Management", to: "/admin/settings/roster-management", hint: "Team roster" },
  { key: "tax-mapping", label: "Tax Mapping", to: "/admin/settings/tax-mapping", hint: "Rates and labels" },
  { key: "feedback-setting", label: "Feedback Setting", to: "/admin/settings/feedback-setting", hint: "Review flow" },
  { key: "access-control", label: "Access Control", to: "/admin/roles-permissions", hint: "Roles and access" },
  { key: "loyalty", label: "Loyalty", to: "/admin/settings/loyalty", hint: "Points defaults" },
  { key: "membership", label: "Membership", to: "/admin/settings/membership", hint: "Plan rules" },
  { key: "packages", label: "Packages", to: "/admin/settings/packages", hint: "Package rules" },
  { key: "gift-card", label: "Gift Card", to: "/admin/settings/gift-card", hint: "Voucher limits" },
  { key: "notification-settings", label: "Notification Settings", to: "/admin/settings/notification-settings", hint: "Alerts" },
  { key: "sms-center", label: "Messaging Center", to: "/admin/settings/sms-center", hint: "Email gateway" },
  { key: "crm-segment", label: "CRM Segment", to: "/admin/settings/crm-segment", hint: "Audience groups" },
  { key: "coupons", label: "Coupons", to: "/admin/settings/coupons", hint: "Promo rules" },
  { key: "referrals", label: "Referrals", to: "/admin/settings/referrals", hint: "Referral benefits" },
  { key: "designation", label: "Designation", to: "/admin/settings/designation", hint: "Job titles" },
  { key: "privacy-policy", label: "Privacy Policy", to: "/admin/settings/privacy-policy", hint: "Legal copy" },
  { key: "terms-and-conditions", label: "Terms & Conditions", to: "/admin/settings/terms-and-conditions", hint: "Policies" },
  { key: "pnl-categories", label: "PNL Categories", to: "/admin/settings/pnl-categories", hint: "Profit buckets" },
  { key: "pnl-income-taxes", label: "PNL Income Taxes", to: "/admin/settings/pnl-income-taxes", hint: "Tax buckets" },
  { key: "incentive", label: "Incentive", to: "/admin/settings/incentive", hint: "Payout defaults" },
  { key: "footer-content", label: "Footer Content", to: "/admin/settings/footer-content", hint: "Brand footer" }
];

const legacyPathMap = {
  "/admin/settings/business": "generic",
  "/admin/settings/invoices": "footer-content",
  "/admin/settings/payments": "generic",
  "/admin/settings/booking": "generic",
  "/admin/settings/notifications": "notification-settings",
  "/admin/settings/whatsapp": "sms-center",
  "/admin/settings/payroll": "incentive",
  "/admin/settings/advanced": "access-control"
};

export const getSettingsSection = (pathname) => {
  const direct = SETTINGS_WORKSPACE_SECTIONS.find((item) => pathname.startsWith(item.to));
  if (direct) return direct;
  const legacyKey = legacyPathMap[pathname];
  return SETTINGS_WORKSPACE_SECTIONS.find((item) => item.key === legacyKey) || SETTINGS_WORKSPACE_SECTIONS[0];
};
