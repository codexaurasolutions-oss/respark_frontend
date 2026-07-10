import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Edit2, Trash2, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { api } from "../../api/client";
import EmptyState from "../../components/EmptyState";
import PageLoader from "../../components/PageLoader";
import { useAuth } from "../../context/AuthContext";
import { useBranch } from "../../context/BranchContext";
import { useSalonSettings } from "../../context/SalonSettingsContext";
import { formatApiError } from "../../utils/apiError";
import { normalizeCurrencyCode } from "../../utils/currency";
import { readSalonSettingsCache, writeSalonSettingsCache } from "../../utils/salonSettings";
import { SETTINGS_WORKSPACE_SECTIONS, getSettingsSection } from "./settingsWorkspaceConfig";
import "./SettingsPage.css";

const WEEK_DAYS = [
  { key: "sun", label: "Sun", dayOfWeekValue: 0 },
  { key: "mon", label: "Mon", dayOfWeekValue: 1 },
  { key: "tue", label: "Tue", dayOfWeekValue: 2 },
  { key: "wed", label: "Wed", dayOfWeekValue: 3 },
  { key: "thu", label: "Thu", dayOfWeekValue: 4 },
  { key: "fri", label: "Fri", dayOfWeekValue: 5 },
  { key: "sat", label: "Sat", dayOfWeekValue: 6 }
];

const defaultPaymentModes = {
  cash: true,
  card: true,
  upi: true,
  bankTransfer: true,
  wallet: true,
  online: true
};

const makeId = (prefix) => `${prefix}-${Math.random().toString(36).slice(2, 10)}`;

const defaultAdvancedSettings = {
  allowFutureBackdatedBills: false,
  allowBackdatedAppointments: false,
  allowPriceEditOnBill: false,
  allowPOPriceEdit: false,
  allowPriceEditWhilePOSettlement: false,
  allowEditConsumable: false,
  allowReportDateRestriction: false,
  allowReportDownloading: true,
  allowRosterMgtSettings: true,
  genericSettings: {
    businessOpen: true,
    businessStart: "09:00",
    businessEnd: "21:00",
    applicableFor: "both",
    weeklyOff: [],
    onlinePaymentEnabled: true,
    productOrderingEnabled: false,
    pickupOrderingEnabled: true,
    cashOnPickupEnabled: true,
    homeDeliveryEnabled: false,
    cashOnDeliveryEnabled: false,
    minimumOrderValue: 0,
    appointmentBookingEnabled: true,
    sendAppointmentSms: true,
    allowCancellationFromCatalogue: false,
    allowRescheduleFromCatalogue: false,
    hideCancelledAppointments: false,
    appointmentReminderDays: 1,
    appointmentReminderHours: 1,
    serviceReminderDays: 1,
    onlineAppointmentTag: "",
    recommendedExpertTag: "",
    walkInTag: "",
    memberTag: "",
    showProductsOnHome: true,
    showServicePdf: false,
    showProductPdf: true,
    showProductGrid: true,
    showProductThumbnails: false,
    showAddButtonOnProductCard: false,
    showGetQuoteButton: false,
    showAllBranchesInCatalogue: false,
    otpValidationOnRegistration: false,
    deliveryDisclaimer: "",
    pickupDisclaimer: "",
    serviceListHeading: "Our Services",
    productListHeading: "Products For Sale",
    currency: "INR"
  },
  shiftManagement: {
    shifts: [
      {
        id: makeId("shift"),
        name: "General",
        active: true,
        startTime: "09:00",
        endTime: "21:00",
        days: WEEK_DAYS.map((item) => item.key),
        breakLabel: "Lunch"
      }
    ]
  },
  rosterManagement: {
    selectedDate: new Date().toISOString().slice(0, 10),
    applyFor: "All",
    useShiftId: "",
    rows: []
  },
  taxMapping: {
    inclusiveTax: false,
    rates: [
      { id: makeId("tax"), label: "Standard Tax", code: "STD", rate: 18, active: true, applicableFor: ["SERVICE", "PRODUCT"] }
    ]
  },
  feedbackSetting: {
    enabled: true,
    sendSms: true,
    sendWhatsapp: false,
    feedbackDelayHours: 24,
    ratingPrompt: "How was your salon experience?",
    lowRatingAlertEmail: "",
    thankYouMessage: "",
    types: [
      { id: "service-quality", name: "Service Quality", active: true },
      { id: "social-etiquette", name: "Social Etiquette", active: true },
      { id: "personal-hygiene", name: "Personal Hygiene", active: true },
      { id: "remark", name: "Remark", active: true }
    ]
  },
  accessControl: {
    approvalRequiredForRoleEdits: true,
    branchScopedDefault: true,
    allowStaffExport: true,
    allowRosterOverrides: true
  },
  loyaltySettings: {
    enabled: true,
    expiryDays: 180,
    earnIndividually: false,
    skipEarnOnRedemption: false,
    earnOnMembershipApplied: false,
    serviceEarning: { amount: 100, points: 1 },
    productEarning: { amount: 100, points: 1 },
    packageEarning: { amount: 100, points: 1 },
    redeemIndividually: false,
    redeemPoints: 100,
    redeemAmount: 10,
    minRedeemPoints: 100,
    maxRedeemPoints: 0,
    maxRedeemPercent: 20
  },
  membershipSettings: {
    enabled: true,
    allowMultipleActivePlans: false,
    autoRenewReminderDays: 7,
    gracePeriodDays: 3,
    walletCarryForward: true
  },
  packageSettings: {
    enabled: true,
    allowPartialRedeem: true,
    expiryReminderDays: 7,
    transferAllowed: false
  },
  giftCardSettings: {
    enabled: true,
    validityDays: 365,
    minimumAmount: 500,
    maximumAmount: 25000
  },
  notificationSettings: {
    emailEnabled: true,
    smsEnabled: true,
    whatsappEnabled: true,
    pushEnabled: true,
    digestHour: "20:00",
    alertEmail: "",
    toggles: {
      anniversaryOffer: true,
      birthdayOffer: true,
      loyaltyExpiryReminder: true,
      loyaltyEarning: true,
      membershipPurchase: true,
      membershipExpiry: true,
      membershipRenewal: true,
      onlineRedeemablePurchaseToOwner: true,
      appointmentCreatedToOwner: true,
      appointmentConfirmedToCustomer: true,
      appointmentCancelledToCustomer: true,
      appointmentReminderBeforeDays: true,
      appointmentReminderBeforeHours: true,
      appointmentInvoiceLink: true,
      appointmentFeedbackLink: true,
      smsForServiceReminder: true,
      combineFeedbackAndInvoiceSms: true,
      messageForAppointments: true,
      appointmentRescheduledToCustomer: true,
      appointmentCancelledToOwner: true,
      onlineAppointmentBookedToOwner: true,
      appointmentMsgToStaff: true,
      orderPlacedToStaff: true,
      orderConfirmed: true,
      orderRejected: true,
      orderInvoiceLink: true,
      messageForOrders: true,
      orderFeedbackLink: true,
      referralCodeSMS: true,
      referrerRewardSMS: true,
      giftCard: true,
      giftCardExpiryReminder: true,
      packagePurchase: true,
      packageExpiryReminder: true,
      advanceReceivedInvoice: true,
      balanceClearedInvoice: true
    }
  },
  crmSegments: [
    { id: makeId("segment"), name: "VIP Guests", description: "High-value repeat customers", filterType: "HIGH_SPENDERS", serviceId: "", active: true }
  ],
  couponSettings: {
    enabled: true,
    stackable: false,
    maxDiscountPercent: 25,
    minimumBillAmount: 0
  },
  referralSettings: {
    enabled: false,
    maxReferLimit: 1000,
    referrerMaxBenefitAmount: 500,
    referrerFixedAmount: 0,
    referrerPercentage: 10,
    referredMaxBenefitAmount: 500,
    referredFixedAmount: 0,
    referredPercentage: 10,
    affiliateServiceCreditValue: 1,
    affiliateCashCreditValue: 0.5
  },
  expenseSettings: {
    autoApprove: false
  },
  designations: [
    { id: makeId("designation"), name: "Salon Manager", description: "Runs floor operations", active: true }
  ],
  legalContent: {
    privacyPolicy: "",
    termsAndConditions: ""
  },
  pnlCategories: [
    { id: makeId("pnl"), name: "Service Revenue", type: "Income", active: true }
  ],
  pnlIncomeTaxes: [
    { id: makeId("taxbucket"), slabFrom: 0, slabTo: 100000, rate: 18, active: true }
  ],
  footerContent: {
    supportLine: "",
    copyrightLine: "",
    socialLine: "",
    brandNote: ""
  },
  uiSettings: {
    activeThemePreset: "classic",
    buttonColor: "",
    buttonHoverColor: "",
    sidebarColor: "",
    navbarColor: "",
    fontColor: ""
  }
};

const mergeAdvancedSettings = (raw = {}) => {
  const merged = {
    ...defaultAdvancedSettings,
    ...raw,
    genericSettings: { ...defaultAdvancedSettings.genericSettings, ...(raw.genericSettings || {}) },
  shiftManagement: {
    ...defaultAdvancedSettings.shiftManagement,
    ...(raw.shiftManagement || {}),
    shifts: Array.isArray(raw.shiftManagement?.shifts) && raw.shiftManagement.shifts.length
      ? raw.shiftManagement.shifts
      : defaultAdvancedSettings.shiftManagement.shifts
  },
  rosterManagement: {
    ...defaultAdvancedSettings.rosterManagement,
    ...(raw.rosterManagement || {}),
    rows: Array.isArray(raw.rosterManagement?.rows) ? raw.rosterManagement.rows : defaultAdvancedSettings.rosterManagement.rows
  },
  taxMapping: {
    ...defaultAdvancedSettings.taxMapping,
    ...(raw.taxMapping || {}),
    rates: Array.isArray(raw.taxMapping?.rates) && raw.taxMapping.rates.length ? raw.taxMapping.rates : defaultAdvancedSettings.taxMapping.rates
  },
  feedbackSetting: { ...defaultAdvancedSettings.feedbackSetting, ...(raw.feedbackSetting || {}) },
  accessControl: { ...defaultAdvancedSettings.accessControl, ...(raw.accessControl || {}) },
  loyaltySettings: { ...defaultAdvancedSettings.loyaltySettings, ...(raw.loyaltySettings || {}) },
  membershipSettings: { ...defaultAdvancedSettings.membershipSettings, ...(raw.membershipSettings || {}) },
  packageSettings: { ...defaultAdvancedSettings.packageSettings, ...(raw.packageSettings || {}) },
  giftCardSettings: { ...defaultAdvancedSettings.giftCardSettings, ...(raw.giftCardSettings || {}) },
  notificationSettings: {
    ...defaultAdvancedSettings.notificationSettings,
    ...(raw.notificationSettings || {}),
    toggles: {
      ...defaultAdvancedSettings.notificationSettings.toggles,
      ...(raw.notificationSettings?.toggles || {})
    }
  },
  crmSegments: Array.isArray(raw.crmSegments) && raw.crmSegments.length ? raw.crmSegments : defaultAdvancedSettings.crmSegments,
  couponSettings: { ...defaultAdvancedSettings.couponSettings, ...(raw.couponSettings || {}) },
  referralSettings: { ...defaultAdvancedSettings.referralSettings, ...(raw.referralSettings || {}) },
  expenseSettings: { ...defaultAdvancedSettings.expenseSettings, ...(raw.expenseSettings || {}) },
  designations: Array.isArray(raw.designations) && raw.designations.length ? raw.designations : defaultAdvancedSettings.designations,
  legalContent: { ...defaultAdvancedSettings.legalContent, ...(raw.legalContent || {}) },
  pnlCategories: Array.isArray(raw.pnlCategories) && raw.pnlCategories.length ? raw.pnlCategories : defaultAdvancedSettings.pnlCategories,
  pnlIncomeTaxes: (Array.isArray(raw.pnlIncomeTaxes) && raw.pnlIncomeTaxes.length ? raw.pnlIncomeTaxes : defaultAdvancedSettings.pnlIncomeTaxes).map((item) => ({
    id: item.id || makeId("taxbucket"),
    slabFrom: item.slabFrom !== undefined ? Number(item.slabFrom) : 0,
    slabTo: item.slabTo !== undefined ? Number(item.slabTo) : 100000,
    rate: item.rate !== undefined ? Number(item.rate) : 18,
    active: item.active !== undefined ? Boolean(item.active) : true
  })),
  footerContent: { ...defaultAdvancedSettings.footerContent, ...(raw.footerContent || {}) },
  uiSettings: { ...defaultAdvancedSettings.uiSettings, ...(raw.uiSettings || {}) }
  };
  merged.genericSettings.currency = normalizeCurrencyCode(merged.genericSettings.currency);
  return merged;
};

const initialForm = {
  invoicePrefix: "INV",
  invoiceFooter: "",
  taxLabel: "Tax",
  whatsappNumber: "",
  bookingNotes: "",
  cancellationPolicy: "",
  allowNegativeStock: false,
  paymentGatewaySettings: {
    defaultGateway: "RAZORPAY_PLACEHOLDER",
    paymentLinkEnabled: true,
    edcTerminalName: "",
    upiHandle: "",
    gatewayNotes: ""
  },
  advancedSettings: mergeAdvancedSettings(),
  smsSettings: {
    gatewayProvider: "TWILIO_PLACEHOLDER",
    apiKey: "",
    senderId: ""
  }
};

const liveSummaryFallback = {
  staffRows: [],
  customRoles: [],
  staffSchedules: [],
  customers: [],
  services: [],
  memberships: [],
  packages: [],
  loyaltyRules: [],
  coupons: [],
  giftCards: [],
  notifications: [],
  feedbackSummary: {
    total: 0,
    averageRating: 0,
    negativeCount: 0
  },
  expenseAccountInjections: []
};

const emptyGiftCardDraft = {
  code: "",
  title: "",
  originalAmount: 1000
};

const defaultReferralRuleDraft = {
  enabled: false,
  maxReferLimit: 1000,
  referrerMaxBenefitAmount: 500,
  referrerFixedAmount: 0,
  referrerPercentage: 10,
  referredMaxBenefitAmount: 500,
  referredFixedAmount: 0,
  referredPercentage: 10
};

const rowsFromResponse = (response) => {
  const data = response?.status === "fulfilled" ? response.value?.data : null;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.rows)) return data.rows;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.notifications)) return data.notifications;
  if (Array.isArray(data?.redemptions)) return data.redemptions;
  return [];
};

const objectFromResponse = (response, fallback = {}) => {
  const data = response?.status === "fulfilled" ? response.value?.data : null;
  return data && typeof data === "object" && !Array.isArray(data) ? data : fallback;
};

const summaryStats = (summary) => [
  { label: "Staff", value: summary.staffRows.length },
  { label: "Roles", value: summary.customRoles.length },
  { label: "Memberships", value: summary.memberships.length },
  { label: "Packages", value: summary.packages.length },
  { label: "Coupons", value: summary.coupons.length },
  { label: "Gift Cards", value: summary.giftCards.length }
];

const inputLabelStyle = { display: "grid", gap: 6 };

const ToggleRow = ({ checked, label, helper, onChange }) => (
  <label className="premium-toggle-label">
    <div className="premium-toggle-text">
      <strong>{label}</strong>
      {helper ? <small>{helper}</small> : null}
    </div>
    <input type="checkbox" className="premium-toggle-input" checked={Boolean(checked)} onChange={(event) => onChange(event.target.checked)} />
    <div className="premium-toggle-switch"></div>
  </label>
);

const SectionHeader = ({ title, description, badges, action }) => (
  <div className="settings-section-head">
    <div>
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
    <div className="settings-section-head-actions">
      {badges?.length ? (
        <div className="badge-row">
          {badges.map((badge) => <span key={badge} className="badge">{badge}</span>)}
        </div>
      ) : null}
      {action}
    </div>
  </div>
);

export default function SettingsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { auth } = useAuth();
  const { selectedBranchId } = useBranch();
  const salonId = auth?.salonId || auth?.membership?.salonId || auth?.membership?.salon?.id || "global";
  const { formatMoney } = useSalonSettings();
  const [form, setForm] = useState(initialForm);
  const [paymentModes, setPaymentModes] = useState(defaultPaymentModes);
  const [summary, setSummary] = useState(liveSummaryFallback);
  const [segmentPreviewCounts, setSegmentPreviewCounts] = useState({});
  const [taxRates, setTaxRates] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [feedbackTypes, setFeedbackTypes] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [referralRule, setReferralRule] = useState(null);
  const [savingReferral, setSavingReferral] = useState(false);
  const [referralDraft, setReferralDraft] = useState(defaultReferralRuleDraft);
  const [affiliateServiceCreditInput, setAffiliateServiceCreditInput] = useState("1");
  const [affiliateCashCreditInput, setAffiliateCashCreditInput] = useState("0.5");
  const [taxSlabs, setTaxSlabs] = useState([]);
  const [pnlCategories, setPnlCategories] = useState([]);
  const [status, setStatus] = useState({ loading: true, error: "", success: "" });
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [giftCardDraft, setGiftCardDraft] = useState(emptyGiftCardDraft);
  const [issuingGiftCard, setIssuingGiftCard] = useState(false);
  const [selectedTaxId, setSelectedTaxId] = useState(null);
  const [draftTax, setDraftTax] = useState(null);
  const [selectedShiftId, setSelectedShiftId] = useState(null);
  const [selectedPnlCategoryId, setSelectedPnlCategoryId] = useState(null);
  const [draftPnlCategory, setDraftPnlCategory] = useState(null);
  const [selectedPnlIncomeTaxId, setSelectedPnlIncomeTaxId] = useState(null);
  const [draftPnlIncomeTax, setDraftPnlIncomeTax] = useState(null);
  const [selectedCouponId, setSelectedCouponId] = useState(null);
  const [draftCoupon, setDraftCoupon] = useState(null);
  const [couponSearch, setCouponSearch] = useState("");
  const [editingCard, setEditingCard] = useState(null);
  const [newCardName, setNewCardName] = useState("");
  const [cardForm, setCardForm] = useState({ name: "", description: "", active: true, amount: "", validityDays: 30, renewalReminderDays: 7 });
  const [selectedFeedbackTypeId, setSelectedFeedbackTypeId] = useState(null);
  const [draftFeedbackType, setDraftFeedbackType] = useState(null);
  const [shiftDraft, setShiftDraft] = useState(null);
  const [shiftSaving, setShiftSaving] = useState(false);
  const [designationDraft, setDesignationDraft] = useState(null);
  const [buttonColor, setButtonColor] = useState(() => {
    const cached = readSalonSettingsCache(salonId);
    return cached?.advancedSettings?.uiSettings?.buttonColor || "#3b82f6";
  });
  const [buttonHoverColor, setButtonHoverColor] = useState(() => {
    const cached = readSalonSettingsCache(salonId);
    return cached?.advancedSettings?.uiSettings?.buttonHoverColor || "#2563eb";
  });
  const [sidebarColor, setSidebarColor] = useState(() => {
    const cached = readSalonSettingsCache(salonId);
    return cached?.advancedSettings?.uiSettings?.sidebarColor || "#0f172a";
  });
  const [navbarColor, setNavbarColor] = useState(() => {
    const cached = readSalonSettingsCache(salonId);
    return cached?.advancedSettings?.uiSettings?.navbarColor || "#ffffff";
  });
  const [fontColor, setFontColor] = useState(() => {
    const cached = readSalonSettingsCache(salonId);
    return cached?.advancedSettings?.uiSettings?.fontColor || "#1e293b";
  });
  const [activeThemePreset, setActiveThemePreset] = useState("classic");
  const [isPreviewHovered, setIsPreviewHovered] = useState(false);
  const [isSaveHovered, setIsSaveHovered] = useState(false);
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());
  const rosterInitializedRef = useRef(false);
  const giftCardInitializedRef = useRef(false);
  const couponsInitializedRef = useRef(false);
  const salonSlug = auth?.membership?.salon?.slug || auth?.salon?.slug || "";
  const settingsPermissions = Array.isArray(auth?.membership?.permissions?.settings)
    ? auth.membership.permissions.settings
    : [];
  const canViewSettings = settingsPermissions.includes("view") || settingsPermissions.includes("edit");
  const canEditSettings = settingsPermissions.includes("edit");
  const settingsLocked = canViewSettings && !canEditSettings;

  const selectedShiftForDraft = shifts.find(s => s.id === selectedShiftId) || shifts[0] || null;
  useEffect(() => {
    if (selectedShiftForDraft) {
      setShiftDraft({
        ...selectedShiftForDraft,
        days: (selectedShiftForDraft.days || []).map(d => ({ dayOfWeek: d.dayOfWeek, startTime: d.startTime, endTime: d.endTime, active: d.active })),
        breaks: (selectedShiftForDraft.breaks || []).map(b => ({ name: b.name, active: b.active, fromTime: b.fromTime, toTime: b.toTime }))
      });
    } else {
      setShiftDraft(null);
    }
  }, [selectedShiftForDraft?.id]);

  const refreshGiftCardsSummary = useCallback(async () => {
    try {
      const response = await api.get("/owner/gift-cards", { params: selectedBranchId ? { branchId: selectedBranchId } : {} });
      const rows = Array.isArray(response.data) ? response.data : [];
      setSummary((current) => ({ ...current, giftCards: rows }));
    } catch {
      // Keep the last known summary if refresh fails.
    }
  }, [selectedBranchId]);

  const activeSection = useMemo(() => getSettingsSection(location.pathname), [location.pathname]);

  useEffect(() => {
    setReferralDraft(referralRule || defaultReferralRuleDraft);
  }, [referralRule]);

  useEffect(() => {
    const referralSettings = form.advancedSettings?.referralSettings || {};
    const serviceValue = referralSettings.affiliateServiceCreditValue;
    const cashValue = referralSettings.affiliateCashCreditValue;
    setAffiliateServiceCreditInput(serviceValue !== undefined && serviceValue !== null ? String(serviceValue) : "1");
    setAffiliateCashCreditInput(cashValue !== undefined && cashValue !== null ? String(cashValue) : "0.5");
  }, [form.advancedSettings?.referralSettings]);

  const filteredSections = useMemo(() => {
    if (!canViewSettings) return [];
    if (!deferredSearch) return SETTINGS_WORKSPACE_SECTIONS;
    return SETTINGS_WORKSPACE_SECTIONS.filter((item) => `${item.label} ${item.hint}`.toLowerCase().includes(deferredSearch));
  }, [canViewSettings, deferredSearch]);

  useEffect(() => {
    if (!canViewSettings) {
      return undefined;
    }
    let active = true;
    const load = async () => {
      try {
        const [settingsResponse, ...summaryResponses] = await Promise.allSettled([
          api.get("/owner/settings", { params: selectedBranchId ? { branchId: selectedBranchId } : {} }),
          api.get("/owner/users", { params: selectedBranchId ? { branchId: selectedBranchId } : {} }),
          api.get("/owner/custom-roles"),
          api.get("/owner/staff-schedule"),
          api.get("/owner/customers", { params: selectedBranchId ? { branchId: selectedBranchId } : {} }),
          api.get("/owner/services", { params: selectedBranchId ? { branchId: selectedBranchId } : {} }),
          api.get("/owner/memberships"),
          api.get("/owner/packages"),
          api.get("/owner/loyalty/rules", { params: selectedBranchId ? { branchId: selectedBranchId } : {} }),
          api.get("/owner/coupons", { params: selectedBranchId ? { branchId: selectedBranchId } : {} }),
          api.get("/owner/gift-cards", { params: selectedBranchId ? { branchId: selectedBranchId } : {} }),
          api.get("/owner/notifications"),
          api.get("/owner/feedback/reports"),
          api.get("/owner/expenses/accounts"),
          api.get("/owner/tax-rates", { params: selectedBranchId ? { branchId: selectedBranchId } : {} }),
          api.get("/owner/designations", { params: selectedBranchId ? { branchId: selectedBranchId } : {} }),
          api.get("/owner/feedback-types"),
          api.get("/owner/shifts", { params: selectedBranchId ? { branchId: selectedBranchId } : {} }),
          api.get("/owner/referrals/rule"),
          api.get("/owner/tax-slabs"),
          api.get("/owner/pnl-categories")
        ]);

        if (!active) return;

        if (settingsResponse.status === "fulfilled" && settingsResponse.value.data) {
          const row = settingsResponse.value.data;
          writeSalonSettingsCache(salonId, row);
          setForm({
            invoicePrefix: row.invoicePrefix || "INV",
            invoiceFooter: row.invoiceFooter || "",
            taxLabel: row.taxLabel || "Tax",
            whatsappNumber: row.whatsappNumber || "",
            bookingNotes: row.bookingNotes || "",
            cancellationPolicy: row.cancellationPolicy || "",
            allowNegativeStock: Boolean(row.allowNegativeStock),
            paymentGatewaySettings: {
              defaultGateway: row.paymentGatewaySettings?.defaultGateway || "RAZORPAY_PLACEHOLDER",
              paymentLinkEnabled: row.paymentGatewaySettings?.paymentLinkEnabled ?? true,
              edcTerminalName: row.paymentGatewaySettings?.edcTerminalName || "",
              upiHandle: row.paymentGatewaySettings?.upiHandle || "",
              gatewayNotes: row.paymentGatewaySettings?.gatewayNotes || ""
            },
            advancedSettings: mergeAdvancedSettings(row.advancedSettings || {}),
            smsSettings: {
              gatewayProvider: row.smsSettings?.gatewayProvider || "TWILIO_PLACEHOLDER",
              apiKey: row.smsSettings?.apiKey || "",
              senderId: row.smsSettings?.senderId || ""
            }
          });
          setPaymentModes({ ...defaultPaymentModes, ...(row.paymentModes || {}) });
          const mergedAdvanced = mergeAdvancedSettings(row.advancedSettings || {});
          setSelectedShiftId(mergedAdvanced.shiftManagement?.shifts?.[0]?.id || null);
        }

        const nextSummary = {
          staffRows: rowsFromResponse(summaryResponses[0]),
          customRoles: rowsFromResponse(summaryResponses[1]),
          staffSchedules: rowsFromResponse(summaryResponses[2]),
          customers: rowsFromResponse(summaryResponses[3]),
          services: rowsFromResponse(summaryResponses[4]),
          memberships: rowsFromResponse(summaryResponses[5]),
          packages: rowsFromResponse(summaryResponses[6]),
          loyaltyRules: rowsFromResponse(summaryResponses[7]),
          coupons: rowsFromResponse(summaryResponses[8]),
          giftCards: rowsFromResponse(summaryResponses[9]),
          notifications: rowsFromResponse(summaryResponses[10]),
          feedbackSummary: objectFromResponse(summaryResponses[11], liveSummaryFallback.feedbackSummary).summary || liveSummaryFallback.feedbackSummary,
          expenseAccountInjections: objectFromResponse(summaryResponses[12], { injections: [] }).injections || []
        };
        setSummary(nextSummary);
        setTaxRates(rowsFromResponse(summaryResponses[13]));
        setDesignations(rowsFromResponse(summaryResponses[14]));
        setFeedbackTypes(rowsFromResponse(summaryResponses[15]));
        setShifts(rowsFromResponse(summaryResponses[16]));
        setReferralRule(objectFromResponse(summaryResponses[17], null));
        setTaxSlabs(rowsFromResponse(summaryResponses[18]));
        setPnlCategories(rowsFromResponse(summaryResponses[19]));
        setStatus({ loading: false, error: "", success: "" });
      } catch (error) {
        if (!active) return;
        setStatus({ loading: false, error: formatApiError(error, "Could not load settings workspace"), success: "" });
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [canViewSettings, salonId, selectedBranchId]);

  useEffect(() => {
    let active = true;
    const segments = form.advancedSettings.crmSegments || [];
    if (!segments.length) {
      setSegmentPreviewCounts({});
      return undefined;
    }

    const loadPreview = async () => {
      try {
        const response = await api.post("/owner/settings/crm-segment-preview", { segments });
        if (!active) return;
        setSegmentPreviewCounts(response.data?.preview || {});
      } catch {
        if (!active) return;
        setSegmentPreviewCounts({});
      }
    };

    void loadPreview();
    return () => {
      active = false;
    };
  }, [form.advancedSettings.crmSegments]);

  useEffect(() => {
    if (form.advancedSettings?.uiSettings) {
      const ui = form.advancedSettings.uiSettings;
      if (ui.activeThemePreset) setActiveThemePreset(ui.activeThemePreset);
      if (ui.buttonColor) setButtonColor(ui.buttonColor);
      if (ui.buttonHoverColor) setButtonHoverColor(ui.buttonHoverColor);
      if (ui.sidebarColor) setSidebarColor(ui.sidebarColor);
      if (ui.navbarColor) setNavbarColor(ui.navbarColor);
      if (ui.fontColor) setFontColor(ui.fontColor);
    }
  }, [form.advancedSettings?.uiSettings]);

  useEffect(() => {
    if (status.loading === false && !giftCardInitializedRef.current) {
      const templates = form.advancedSettings?.giftCardSettings?.templates || [
        { name: "Birthday Voucher", description: "Special birthday gift card for loyal customers", active: true, amount: 1000, validityDays: 90, renewalReminderDays: 7 },
        { name: "Festive Special", description: "Limited edition festive season gift card", active: true, amount: 2500, validityDays: 180, renewalReminderDays: 14 },
        { name: "Premium Package", description: "High-value gift card for premium services", active: true, amount: 5000, validityDays: 365, renewalReminderDays: 30 }
      ];
      if (templates.length > 0) {
        giftCardInitializedRef.current = true;
        const first = templates[0];
        setEditingCard({ ...first, _idx: 0 });
        setCardForm({
          name: first.name,
          description: first.description || "",
          active: first.active !== false,
          amount: first.amount,
          validityDays: first.validityDays,
          renewalReminderDays: first.renewalReminderDays
        });
      }
    }
  }, [status.loading, form.advancedSettings?.giftCardSettings?.templates]);

  useEffect(() => {
    if (status.loading === false && !couponsInitializedRef.current && summary.coupons?.length > 0) {
      couponsInitializedRef.current = true;
      const first = summary.coupons[0];
      setSelectedCouponId(first.id);
      
      let valDays = 90;
      if (first.startsAt && first.endsAt) {
        const diffTime = Math.abs(new Date(first.endsAt) - new Date(first.startsAt));
        valDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }
      
      const match = String(first.notes || "").match(/\[MaxBenefitAmt:\s*([^\]]*)\s*\]/);
      const maxBenefitAmt = match ? match[1] : "";
      const isPrivate = String(first.notes || "").includes("PRIVATE");
      
      setDraftCoupon({
        id: first.id,
        branchId: first.branchId || "",
        serviceId: first.serviceId || "",
        productId: first.productId || "",
        code: first.code || "",
        title: first.title || "",
        description: first.description || "",
        discountType: first.discountType || "PERCENT",
        discountValue: first.discountValue ?? 10,
        minBillAmount: first.minBillAmount ?? 0,
        usageLimit: first.usageLimit ?? "",
        customerUsageLimit: first.customerUsageLimit ?? "",
        startsAt: first.startsAt ? new Date(first.startsAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        endsAt: first.endsAt ? new Date(first.endsAt).toISOString().split('T')[0] : "",
        validityDays: valDays,
        isReferral: Boolean(first.isReferral),
        isInfluencer: Boolean(first.isInfluencer),
        isBirthday: Boolean(first.isBirthday),
        isFestival: Boolean(first.isFestival),
        isArchived: Boolean(first.isArchived),
        maxBenefitAmt: maxBenefitAmt,
        isPrivate: isPrivate,
        notesText: first.notes ? first.notes.replace(/\[MaxBenefitAmt:\s*[^\]]*\s*\]/, "").replace("PRIVATE", "").trim() : "",
        _isNew: false
      });
    }
  }, [status.loading, summary.coupons]);

  useEffect(() => {
    const root = document.documentElement;
    if (sidebarColor) root.style.setProperty("--sidebar-bg", sidebarColor);
    if (buttonColor) {
      root.style.setProperty("--button-bg", buttonColor);
      root.style.setProperty("--button-bg-solid", buttonColor);
      root.style.setProperty("--accent", buttonColor);
    }
    if (buttonHoverColor) {
      root.style.setProperty("--button-bg-hover", buttonHoverColor);
    }
    if (navbarColor) root.style.setProperty("--navbar-bg", navbarColor);
    if (fontColor) root.style.setProperty("--font-color", fontColor);

    return () => {
      const cached = readSalonSettingsCache(salonId);
      const ui = cached?.advancedSettings?.uiSettings || {};
      if (ui.sidebarColor) root.style.setProperty("--sidebar-bg", ui.sidebarColor);
      else root.style.removeProperty("--sidebar-bg");
      
      if (ui.buttonColor) {
        root.style.setProperty("--button-bg", ui.buttonColor);
        root.style.setProperty("--button-bg-solid", ui.buttonColor);
        root.style.setProperty("--accent", ui.buttonColor);
      } else {
        root.style.removeProperty("--button-bg");
        root.style.removeProperty("--button-bg-solid");
        root.style.removeProperty("--accent");
      }

      if (ui.buttonHoverColor) {
        root.style.setProperty("--button-bg-hover", ui.buttonHoverColor);
      } else {
        root.style.removeProperty("--button-bg-hover");
      }
      
      if (ui.navbarColor) root.style.setProperty("--navbar-bg", ui.navbarColor);
      else root.style.removeProperty("--navbar-bg");
      
      if (ui.fontColor) root.style.setProperty("--font-color", ui.fontColor);
      else root.style.removeProperty("--font-color");
    };
  }, [buttonColor, buttonHoverColor, sidebarColor, navbarColor, fontColor, salonId]);

  useEffect(() => {
    if (!summary.staffRows.length) return;
    setForm((current) => {
      const existingRows = current.advancedSettings.rosterManagement.rows;
      const existingIds = new Set(existingRows.map((row) => String(row.id)));
      const defaultShift = (current.advancedSettings.shiftManagement?.shifts || []).find((row) => row?.active !== false)
        || current.advancedSettings.shiftManagement?.shifts?.[0]
        || null;
      const appendedRows = summary.staffRows
        .filter((row) => !existingIds.has(String(row.id)))
        .map((row) => ({
          id: row.id,
          staffName: row.user?.name || row.phone || "Staff",
          fromTime: defaultShift?.startTime || "09:00",
          toTime: defaultShift?.endTime || "21:00",
          isWorking: true, // Default to working when a staff member is first added to roster
          breakLabel: defaultShift?.breakLabel || ""
        }));
      if (!existingRows.length && !appendedRows.length) return current;
      if (!appendedRows.length && existingRows.length) return current;
      if (rosterInitializedRef.current && existingRows.length && !appendedRows.length) return current;
      if (!rosterInitializedRef.current && existingRows.length) rosterInitializedRef.current = true;
      if (rosterInitializedRef.current && !existingRows.length) return current;
      return {
        ...current,
        advancedSettings: {
          ...current.advancedSettings,
          rosterManagement: {
            ...current.advancedSettings.rosterManagement,
            rows: existingRows.length
              ? [...existingRows, ...appendedRows]
              : summary.staffRows.map((row) => ({
                  id: row.id,
                  staffName: row.user?.name || row.phone || "Staff",
                  fromTime: defaultShift?.startTime || "09:00",
                  toTime: defaultShift?.endTime || "21:00",
                  isWorking: true, // Default to working when first building roster from staff list
                  breakLabel: defaultShift?.breakLabel || ""
                }))
          }
        }
      };
    });
  }, [summary.staffRows]);

  useEffect(() => {
    if (draftCoupon?._isNew) return;
    if (!summary.coupons.length) {
      if (selectedCouponId !== null) setSelectedCouponId(null);
      return;
    }
    const exists = summary.coupons.some((row) => row.id === selectedCouponId);
    if (!exists) {
      setSelectedCouponId(summary.coupons[0].id);
    }
  }, [summary.coupons, selectedCouponId, draftCoupon]);

  const handleReset = async () => {
    try {
      setSaving(true);
      setStatus({ loading: true, error: "", success: "" });
      const response = await api.get("/owner/settings");
      if (response.data) {
        const row = response.data;
        writeSalonSettingsCache(salonId, row);
        setForm({
          invoicePrefix: row.invoicePrefix || "INV",
          invoiceFooter: row.invoiceFooter || "",
          taxLabel: row.taxLabel || "Tax",
          whatsappNumber: row.whatsappNumber || "",
          bookingNotes: row.bookingNotes || "",
          cancellationPolicy: row.cancellationPolicy || "",
          allowNegativeStock: Boolean(row.allowNegativeStock),
          paymentGatewaySettings: {
            defaultGateway: row.paymentGatewaySettings?.defaultGateway || "RAZORPAY_PLACEHOLDER",
            paymentLinkEnabled: row.paymentGatewaySettings?.paymentLinkEnabled ?? true,
            edcTerminalName: row.paymentGatewaySettings?.edcTerminalName || "",
            upiHandle: row.paymentGatewaySettings?.upiHandle || "",
            gatewayNotes: row.paymentGatewaySettings?.gatewayNotes || ""
          },
          advancedSettings: mergeAdvancedSettings(row.advancedSettings || {}),
          smsSettings: {
            gatewayProvider: row.smsSettings?.gatewayProvider || "TWILIO_PLACEHOLDER",
            apiKey: row.smsSettings?.apiKey || "",
            senderId: row.smsSettings?.senderId || ""
          }
        });
        setPaymentModes({ ...defaultPaymentModes, ...(row.paymentModes || {}) });
        setStatus({ loading: false, error: "", success: "Settings reset to saved values." });
      } else {
        setForm(initialForm);
        setPaymentModes(defaultPaymentModes);
        setStatus({ loading: false, error: "", success: "Settings reset to defaults." });
      }
    } catch (error) {
      setStatus({ loading: false, error: formatApiError(error, "Could not reset settings"), success: "" });
    } finally {
      setSaving(false);
    }
  };

  const saveWorkspace = async () => {
    setSaving(true);
    setStatus((current) => ({ ...current, error: "", success: "" }));

    const updatedAdvancedSettings = {
      ...form.advancedSettings,
      uiSettings: {
        activeThemePreset,
        buttonColor,
        buttonHoverColor,
        sidebarColor,
        navbarColor,
        fontColor
      }
    };

    try {
      const response = await api.post("/owner/settings", {
        branchId: selectedBranchId || undefined,
        invoicePrefix: form.invoicePrefix,
        invoiceFooter: form.invoiceFooter,
        taxLabel: form.taxLabel,
        whatsappNumber: form.whatsappNumber,
        bookingNotes: form.bookingNotes,
        cancellationPolicy: form.cancellationPolicy,
        paymentModes,
        allowNegativeStock: Boolean(form.allowNegativeStock),
        paymentGatewaySettings: form.paymentGatewaySettings,
        advancedSettings: updatedAdvancedSettings,
        smsSettings: form.smsSettings
      });
      setStatus({ loading: false, error: "", success: "Settings workspace saved successfully." });
      writeSalonSettingsCache(salonId, response.data || {
        advancedSettings: updatedAdvancedSettings,
        invoicePrefix: form.invoicePrefix,
        invoiceFooter: form.invoiceFooter,
        taxLabel: form.taxLabel
      });
      if (response.data?.advancedSettings) {
        setForm((current) => ({
          ...current,
          advancedSettings: mergeAdvancedSettings(response.data.advancedSettings)
        }));
      }
    } catch (error) {
      setStatus({ loading: false, error: formatApiError(error, "Could not save settings workspace"), success: "" });
    } finally {
      setSaving(false);
    }
  };

  const togglePaymentMode = (key) => setPaymentModes((current) => ({ ...current, [key]: !current[key] }));

  const updateGeneric = (key, value) => setForm((current) => ({
    ...current,
    advancedSettings: {
      ...current.advancedSettings,
      genericSettings: {
        ...current.advancedSettings.genericSettings,
        [key]: value
      }
    }
  }));

  const updateAdvancedObject = (key, patch) => setForm((current) => ({
    ...current,
    advancedSettings: {
      ...current.advancedSettings,
      [key]: {
        ...current.advancedSettings[key],
        ...patch
      }
    }
  }));

  const updateArrayCollection = (key, nextRows) => setForm((current) => ({
    ...current,
    advancedSettings: {
      ...current.advancedSettings,
      [key]: nextRows
    }
  }));

  const liveStats = summaryStats(summary);

  const refreshCouponsSummary = useCallback(async () => {
    try {
      const response = await api.get("/owner/coupons", { params: selectedBranchId ? { branchId: selectedBranchId } : {} });
      setSummary((current) => ({ ...current, coupons: Array.isArray(response.data) ? response.data : [] }));
    } catch {
      // keep last known list
    }
  }, [selectedBranchId]);

  const issueGiftCardFromSettings = async (event) => {
    event.preventDefault();
    setIssuingGiftCard(true);
    setStatus((current) => ({ ...current, error: "", success: "" }));
    try {
      const payloadCode = giftCardDraft.code || "GC-" + Math.floor(100000 + Math.random() * 900000);
      await api.post("/owner/gift-cards", {
        code: payloadCode,
        title: giftCardDraft.title || "Gift Card",
        originalAmount: Number(giftCardDraft.originalAmount),
        branchId: selectedBranchId || null
      });
      setGiftCardDraft(emptyGiftCardDraft);
      await refreshGiftCardsSummary();
      setStatus({ loading: false, error: "", success: "Gift card issued successfully from settings." });
    } catch (error) {
      setStatus({ loading: false, error: formatApiError(error, "Could not issue gift card"), success: "" });
    } finally {
      setIssuingGiftCard(false);
    }
  };

  const renderGenericSection = () => {
    const generic = form.advancedSettings.genericSettings;
    const allChecked = WEEK_DAYS.every((day) => generic.weeklyOff.includes(day.key));

    const toggleWeeklyOff = (dayKey) => {
      const active = generic.weeklyOff.includes(dayKey);
      const nextWeeklyOff = active 
        ? generic.weeklyOff.filter((item) => item !== dayKey)
        : [...generic.weeklyOff, dayKey];
      updateGeneric("weeklyOff", nextWeeklyOff);
    };

    const toggleAllWeeklyOff = (checked) => {
      if (checked) {
        updateGeneric("weeklyOff", WEEK_DAYS.map((day) => day.key));
      } else {
        updateGeneric("weeklyOff", []);
      }
    };

    return (
      <>
        <SectionHeader
          title="Generic Settings"
          description="Business timing, storefront behavior, booking rules, checkout defaults, and currency propagation are managed from this workspace."
          badges={[
            `${normalizeCurrencyCode(generic.currency || "INR")} live currency`,
            generic.appointmentBookingEnabled ? "Booking Live" : "Booking Off",
            generic.productOrderingEnabled ? "Store Orders Live" : "Store Orders Off"
          ]}
          action={<Link className="secondary-button" to="/site">Open Storefront</Link>}
        />

        <div className="muted" style={{ marginBottom: 12, fontSize: 12 }}>
          Currency, storefront product layout, minimum online order value, cancellation/reschedule permissions, and cancelled-appointment visibility are already wired into live customer/storefront flows. Appointment tags and service-PDP preferences are kept here as saved rollout metadata unless noted otherwise.
        </div>

        <div className="settings-panel-card">
          <div className="settings-panel-header-with-toggle" style={{ borderBottom: "none", marginBottom: 16, paddingBottom: 0 }}>
            <h3>Business Settings</h3>
          </div>

          <div className="business-settings-content">
            <div className="toggle-option-row" style={{ borderBottom: "1px solid #e2e8f0", paddingBottom: 16, marginBottom: 16 }}>
              <span className="label-text">Is Open ?</span>
              <div className="header-toggle-container">
                <label className="toggle-switch-label">
                  <input
                    type="checkbox"
                    checked={generic.businessOpen}
                    onChange={(e) => updateGeneric("businessOpen", e.target.checked)}
                  />
                  <span className="toggle-switch-slider" />
                </label>
                <span className="toggle-status-text" style={{ marginLeft: 8 }}>{generic.businessOpen ? "On" : "Off"}</span>
              </div>
            </div>

            <div className="business-settings-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1.5fr", gap: "24px", alignItems: "start" }}>
              <div>
                <span className="sub-section-title">Business Timing</span>
                <div className="timing-inputs" style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "8px" }}>
                  <label className="checkbox-option">
                    <span style={{ minWidth: 40 }}>From :</span>
                    <input
                      type="time"
                      value={generic.businessStart}
                      onChange={(event) => updateGeneric("businessStart", event.target.value)}
                      style={{ padding: "6px", border: "1px solid #cbd5e1", borderRadius: "4px" }}
                    />
                  </label>
                  <label className="checkbox-option">
                    <span style={{ minWidth: 40 }}>To :</span>
                    <input
                      type="time"
                      value={generic.businessEnd}
                      onChange={(event) => updateGeneric("businessEnd", event.target.value)}
                      style={{ padding: "6px", border: "1px solid #cbd5e1", borderRadius: "4px" }}
                    />
                  </label>
                </div>
              </div>

              <div>
                <span className="sub-section-title">Applicable For</span>
                <div className="radio-group" style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "8px" }}>
                  <label className="radio-option">
                    <input
                      type="radio"
                      name="applicableFor"
                      value="female"
                      checked={generic.applicableFor === "female"}
                      onChange={() => updateGeneric("applicableFor", "female")}
                    />
                    Female
                  </label>
                  <label className="radio-option">
                    <input
                      type="radio"
                      name="applicableFor"
                      value="male"
                      checked={generic.applicableFor === "male"}
                      onChange={() => updateGeneric("applicableFor", "male")}
                    />
                    Male
                  </label>
                  <label className="radio-option">
                    <input
                      type="radio"
                      name="applicableFor"
                      value="both"
                      checked={generic.applicableFor === "both"}
                      onChange={() => updateGeneric("applicableFor", "both")}
                    />
                    Both
                  </label>
                </div>
              </div>

              <div className="weekly-off-section">
                <span className="sub-section-title">Set weekly off</span>
                <div className="checkbox-group" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginTop: "8px" }}>
                  <label className="checkbox-option">
                    <input
                      type="checkbox"
                      checked={allChecked}
                      onChange={(e) => toggleAllWeeklyOff(e.target.checked)}
                    />
                    All
                  </label>
                  {WEEK_DAYS.map((day) => (
                    <label key={day.key} className="checkbox-option">
                      <input
                        type="checkbox"
                        checked={generic.weeklyOff.includes(day.key)}
                        onChange={() => toggleWeeklyOff(day.key)}
                      />
                      {day.label}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="payment-section">
            <span className="sub-section-title">Online payment</span>
            <div className="checkbox-group">
              <label className="checkbox-option">
                <input
                  type="checkbox"
                  checked={generic.onlinePaymentEnabled}
                  onChange={(e) => updateGeneric("onlinePaymentEnabled", e.target.checked)}
                />
                Online Payment for Orders & Appointments are Enabled
              </label>
            </div>
            <div className="muted" style={{ marginTop: 8, fontSize: 12 }}>
              This setting feeds public checkout and booking payment availability.
            </div>
          </div>

          <div className="product-ordering-section">
            <div className="settings-panel-header-with-toggle" style={{ borderBottom: "none", marginBottom: 0, paddingBottom: 0 }}>
              <h3>Product Ordering</h3>
              <div className="header-toggle-container">
                <label className="toggle-switch-label">
                  <input
                    type="checkbox"
                    checked={generic.productOrderingEnabled}
                    onChange={(e) => updateGeneric("productOrderingEnabled", e.target.checked)}
                  />
                  <span className="toggle-switch-slider" />
                </label>
                <span className="toggle-status-text">{generic.productOrderingEnabled ? "On" : "Off"}</span>
              </div>
            </div>

            <div className="ordering-grid">
              <div className="ordering-column">
                <span className="col-header">Delivery Order</span>
                <label className="checkbox-option">
                  <input
                    type="checkbox"
                    checked={generic.homeDeliveryEnabled}
                    onChange={(e) => updateGeneric("homeDeliveryEnabled", e.target.checked)}
                  />
                  Home Delivery Orders are Enabled
                </label>
              </div>
              <div className="ordering-column">
                <span className="col-header">Pickup Order</span>
                <label className="checkbox-option">
                  <input
                    type="checkbox"
                    checked={generic.pickupOrderingEnabled}
                    onChange={(e) => updateGeneric("pickupOrderingEnabled", e.target.checked)}
                  />
                  Pickup ordering is Enabled
                </label>
              </div>
              <div className="ordering-column">
                <span className="col-header">Cash on pickup</span>
                <label className="checkbox-option">
                  <input
                    type="checkbox"
                    checked={generic.cashOnPickupEnabled}
                    onChange={(e) => updateGeneric("cashOnPickupEnabled", e.target.checked)}
                  />
                  Cash on pickup is Enabled
                </label>
              </div>
              <div className="ordering-column">
                <span className="col-header">Cash on delivery</span>
                <label className="checkbox-option">
                  <input
                    type="checkbox"
                    checked={generic.cashOnDeliveryEnabled}
                    onChange={(e) => updateGeneric("cashOnDeliveryEnabled", e.target.checked)}
                  />
                  Cash on delivery is Enabled
                </label>
              </div>
              <div className="ordering-column">
                <span className="col-header">Minimum Order Value</span>
                <input
                  type="number"
                  placeholder="Enter Mini Order Amount"
                  value={generic.minimumOrderValue || ""}
                  onChange={(e) => updateGeneric("minimumOrderValue", Number(e.target.value))}
                  style={{ padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "6px", width: "100%", outline: "none" }}
                />
              </div>
            </div>
            <div className="muted" style={{ marginTop: 10, fontSize: 12 }}>
              Delivery, pickup, COD, and minimum order value are enforced in the live online-order checkout flow.
            </div>
          </div>
        </div>

        <div className="settings-panel-card">
          <div className="settings-panel-header-with-toggle">
            <h3>Appointment Booking</h3>
            <div className="header-toggle-container">
              <label className="toggle-switch-label">
                <input
                  type="checkbox"
                  checked={generic.appointmentBookingEnabled}
                  onChange={(e) => updateGeneric("appointmentBookingEnabled", e.target.checked)}
                />
                <span className="toggle-switch-slider" />
              </label>
              <span className="toggle-status-text">{generic.appointmentBookingEnabled ? "On" : "Off"}</span>
            </div>
          </div>

          <div className="appointment-columns-grid">
            <div className="appointment-col">
              <div>
                <span className="sub-section-title">Send appointment notification</span>
                <label className="checkbox-option">
                  <input
                    type="checkbox"
                    checked={generic.sendAppointmentSms}
                    onChange={(e) => updateGeneric("sendAppointmentSms", e.target.checked)}
                  />
                  Send email/SMS notification to Guests
                </label>
              </div>
              <div>
                <span className="sub-section-title">Enable Cancellation from catalogue</span>
                <label className="checkbox-option">
                  <input
                    type="checkbox"
                    checked={generic.allowCancellationFromCatalogue}
                    onChange={(e) => updateGeneric("allowCancellationFromCatalogue", e.target.checked)}
                  />
                  Allow Cancellation from catalogue
                </label>
              </div>
              <div>
                <span className="sub-section-title">Hide Cancelled Appointment</span>
                <label className="checkbox-option">
                  <input
                    type="checkbox"
                    checked={generic.hideCancelledAppointments}
                    onChange={(e) => updateGeneric("hideCancelledAppointments", e.target.checked)}
                  />
                  Hide Cancelled Appointment From Dashboard
                </label>
              </div>
            </div>

            <div className="appointment-col">
              <div>
                <span className="sub-section-title">Appointment Reminder before days</span>
                <input
                  type="number"
                  value={generic.appointmentReminderDays}
                  onChange={(e) => updateGeneric("appointmentReminderDays", Number(e.target.value))}
                  placeholder="Enter days"
                  style={{ width: "100%", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "6px", outline: "none" }}
                />
              </div>
              <div className="muted" style={{ marginTop: 6, fontSize: 12 }}>
                Reminder badges and guest-tag metadata stay hidden here until the related appointment badge rollout is wired end-to-end.
              </div>
            </div>

            <div className="appointment-col">
              <div>
                <span className="sub-section-title">Enable Reschedule from catalogue</span>
                <label className="checkbox-option">
                  <input
                    type="checkbox"
                    checked={generic.allowRescheduleFromCatalogue}
                    onChange={(e) => updateGeneric("allowRescheduleFromCatalogue", e.target.checked)}
                  />
                  Allow Reschedule from catalogue
                </label>
              </div>
              <div>
                <span className="sub-section-title">Appointment Reminder before hours</span>
                <input
                  type="number"
                  value={generic.appointmentReminderHours}
                  onChange={(e) => updateGeneric("appointmentReminderHours", Number(e.target.value))}
                  placeholder="Enter hours"
                  style={{ width: "100%", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "6px", outline: "none" }}
                />
              </div>
              <div className="muted" style={{ marginTop: 6, fontSize: 12 }}>
                Reschedule, cancel, reminder-days, and reminder-hours are the live controls in this section today.
              </div>
            </div>
          </div>
        </div>

        <div className="settings-panel-card">
          <div className="settings-panel-header-with-toggle">
            <h3>Feedback</h3>
            <div className="header-toggle-container">
              <label className="toggle-switch-label">
                <input
                  type="checkbox"
                  checked={form.advancedSettings.feedbackSetting.enabled}
                  onChange={(e) => updateAdvancedObject("feedbackSetting", { enabled: e.target.checked })}
                />
                <span className="toggle-switch-slider" />
              </label>
              <span className="toggle-status-text">{form.advancedSettings.feedbackSetting.enabled ? "On" : "Off"}</span>
            </div>
          </div>
          <div className="appointment-grid">
            <div className="appointment-col">
                <span className="sub-section-title">Send feedback notification</span>
                <label className="checkbox-option">
                  <input
                    type="checkbox"
                    checked={form.advancedSettings.feedbackSetting.sendSms}
                    onChange={(e) => updateAdvancedObject("feedbackSetting", { sendSms: e.target.checked })}
                  />
                  Send feedback SMS to Guests
                </label>
              </div>
              <div className="appointment-col">
              <span className="sub-section-title">Secondary channel</span>
              <label className="checkbox-option">
                <input
                  type="checkbox"
                  checked={form.advancedSettings.feedbackSetting.sendWhatsapp}
                  onChange={(e) => updateAdvancedObject("feedbackSetting", { sendWhatsapp: e.target.checked })}
                />
                Keep manual share fallback enabled
              </label>
            </div>
          </div>
        </div>

        <div className="settings-panel-card">
          <div className="settings-panel-header-with-toggle" style={{ borderBottom: "none", marginBottom: 0, paddingBottom: 0 }}>
            <h3>Discount</h3>
            <div className="header-toggle-container">
              <label className="toggle-switch-label">
                <input
                  type="checkbox"
                  checked={form.advancedSettings.couponSettings.enabled}
                  onChange={(e) => updateAdvancedObject("couponSettings", { enabled: e.target.checked })}
                />
                <span className="toggle-switch-slider" />
              </label>
              <span className="toggle-status-text">{form.advancedSettings.couponSettings.enabled ? "On" : "Off"}</span>
            </div>
          </div>
        </div>

        <div className="settings-panel-card">
          <div className="settings-panel-header-with-toggle" style={{ borderBottom: "none", marginBottom: 12 }}>
            <h3>Catalogue Presentation</h3>
          </div>

          <div className="toggle-options-grid">
            <div className="toggle-option-row">
              <span className="label-text">Show products in grid view on Home Page</span>
              <label className="toggle-switch-label">
                <input
                  type="checkbox"
                  checked={generic.showProductsOnHome}
                  onChange={(e) => updateGeneric("showProductsOnHome", e.target.checked)}
                />
                <span className="toggle-switch-slider" />
              </label>
            </div>
            <div className="toggle-option-row">
              <span className="label-text">Show PDP(Product description page) for products</span>
              <label className="toggle-switch-label">
                <input
                  type="checkbox"
                  checked={generic.showProductPdf}
                  onChange={(e) => updateGeneric("showProductPdf", e.target.checked)}
                />
                <span className="toggle-switch-slider" />
              </label>
            </div>
            <div className="muted" style={{ marginTop: -6, marginBottom: 6, fontSize: 12 }}>
              Product PDP preference is stored here while current storefront list/detail presentation remains live.
            </div>
            <div className="toggle-option-row">
              <span className="label-text">Show grid view for products listing</span>
              <label className="toggle-switch-label">
                <input
                  type="checkbox"
                  checked={generic.showProductGrid}
                  onChange={(e) => updateGeneric("showProductGrid", e.target.checked)}
                />
                <span className="toggle-switch-slider" />
              </label>
            </div>
            <div className="toggle-option-row">
              <span className="label-text">Show thumbnails on product page</span>
              <label className="toggle-switch-label">
                <input
                  type="checkbox"
                  checked={generic.showProductThumbnails}
                  onChange={(e) => updateGeneric("showProductThumbnails", e.target.checked)}
                />
                <span className="toggle-switch-slider" />
              </label>
            </div>
            <div className="toggle-option-row">
              <span className="label-text">Show add button on product card</span>
              <label className="toggle-switch-label">
                <input
                  type="checkbox"
                  checked={generic.showAddButtonOnProductCard}
                  onChange={(e) => updateGeneric("showAddButtonOnProductCard", e.target.checked)}
                />
                <span className="toggle-switch-slider" />
              </label>
            </div>
            <div className="toggle-option-row">
              <span className="label-text">Show get quote button</span>
              <label className="toggle-switch-label">
                <input
                  type="checkbox"
                  checked={generic.showGetQuoteButton}
                  onChange={(e) => updateGeneric("showGetQuoteButton", e.target.checked)}
                />
                <span className="toggle-switch-slider" />
              </label>
            </div>
            <div className="toggle-option-row">
              <span className="label-text">Show all branches(Store Locator) in catalogue</span>
              <label className="toggle-switch-label">
                <input
                  type="checkbox"
                  checked={generic.showAllBranchesInCatalogue}
                  onChange={(e) => updateGeneric("showAllBranchesInCatalogue", e.target.checked)}
                />
                <span className="toggle-switch-slider" />
              </label>
            </div>
          </div>

          <div className="settings-form-grid">
            <label className="settings-input-group">
              <span className="muted">Delivery Disclaimer</span>
              <textarea
                rows="3"
                value={generic.deliveryDisclaimer}
                onChange={(event) => updateGeneric("deliveryDisclaimer", event.target.value)}
                placeholder="Enter Delivery Disclaimer text..."
              />
            </label>
            <label className="settings-input-group">
              <span className="muted">Pickup Disclaimer</span>
              <textarea
                rows="3"
                value={generic.pickupDisclaimer}
                onChange={(event) => updateGeneric("pickupDisclaimer", event.target.value)}
                placeholder="Enter Pickup Disclaimer text..."
              />
            </label>
            <label className="settings-input-group">
              <span className="muted">Service List Heading</span>
              <input
                type="text"
                value={generic.serviceListHeading}
                onChange={(event) => updateGeneric("serviceListHeading", event.target.value)}
                placeholder="Our Services"
              />
            </label>
            <label className="settings-input-group">
              <span className="muted">Product List Heading</span>
              <input
                type="text"
                value={generic.productListHeading}
                onChange={(event) => updateGeneric("productListHeading", event.target.value)}
                placeholder="Products For Sale"
              />
            </label>
            <label className="settings-input-group">
              <span className="muted">Use Currency :</span>
              <select
                value={normalizeCurrencyCode(generic.currency || "INR")}
                onChange={(event) => updateGeneric("currency", event.target.value)}
              >
                <option value="INR">Indian Rupee (INR)</option>
                <option value="USD">US Dollar (USD)</option>
                <option value="EUR">Euro (EUR)</option>
                <option value="GBP">British Pound (GBP)</option>
                <option value="AED">UAE Dirham (AED)</option>
                <option value="SAR">Saudi Riyal (SAR)</option>
              </select>
            </label>
          </div>
        </div>

        <div className="settings-panel-card">
          <div className="settings-panel-header-with-toggle" style={{ borderBottom: "1px solid #e2e8f0", paddingBottom: 12, marginBottom: 16 }}>
            <h3>Payment Modes</h3>
          </div>
          <div className="toggle-options-grid">
            {Object.entries(paymentModes).map(([key, value]) => (
              <div key={key} className="toggle-option-row">
                <span className="label-text">{key === "bankTransfer" ? "Bank Transfer" : key.charAt(0).toUpperCase() + key.slice(1)}</span>
                <label className="toggle-switch-label">
                  <input type="checkbox" checked={value} onChange={() => togglePaymentMode(key)} />
                  <span className="toggle-switch-slider" />
                </label>
              </div>
            ))}
          </div>
        </div>

        <div className="settings-panel-card">
          <div className="settings-panel-header-with-toggle" style={{ borderBottom: "1px solid #e2e8f0", paddingBottom: 12, marginBottom: 16 }}>
            <h3>POS & Back-Office Rules</h3>
          </div>
          <div className="toggle-options-grid">
            <div className="toggle-option-row">
              <span className="label-text">Allow future backdated bills</span>
              <label className="toggle-switch-label">
                <input type="checkbox" checked={form.advancedSettings.allowFutureBackdatedBills} onChange={(e) => updateAdvancedObject("allowFutureBackdatedBills", e.target.checked)} />
                <span className="toggle-switch-slider" />
              </label>
            </div>
            <div className="toggle-option-row">
              <span className="label-text">Allow backdated appointments</span>
              <label className="toggle-switch-label">
                <input type="checkbox" checked={form.advancedSettings.allowBackdatedAppointments} onChange={(e) => updateAdvancedObject("allowBackdatedAppointments", e.target.checked)} />
                <span className="toggle-switch-slider" />
              </label>
            </div>
            <div className="toggle-option-row">
              <span className="label-text">Allow price edit on bill</span>
              <label className="toggle-switch-label">
                <input type="checkbox" checked={form.advancedSettings.allowPriceEditOnBill} onChange={(e) => updateAdvancedObject("allowPriceEditOnBill", e.target.checked)} />
                <span className="toggle-switch-slider" />
              </label>
            </div>
            <div className="toggle-option-row">
              <span className="label-text">Allow PO price edit</span>
              <label className="toggle-switch-label">
                <input type="checkbox" checked={form.advancedSettings.allowPOPriceEdit} onChange={(e) => updateAdvancedObject("allowPOPriceEdit", e.target.checked)} />
                <span className="toggle-switch-slider" />
              </label>
            </div>
            <div className="toggle-option-row">
              <span className="label-text">Allow price edit while PO settlement</span>
              <label className="toggle-switch-label">
                <input type="checkbox" checked={form.advancedSettings.allowPriceEditWhilePOSettlement} onChange={(e) => updateAdvancedObject("allowPriceEditWhilePOSettlement", e.target.checked)} />
                <span className="toggle-switch-slider" />
              </label>
            </div>
            <div className="toggle-option-row">
              <span className="label-text">Allow edit consumable</span>
              <label className="toggle-switch-label">
                <input type="checkbox" checked={form.advancedSettings.allowEditConsumable} onChange={(e) => updateAdvancedObject("allowEditConsumable", e.target.checked)} />
                <span className="toggle-switch-slider" />
              </label>
            </div>
            <div className="toggle-option-row">
              <span className="label-text">Allow report date restriction</span>
              <label className="toggle-switch-label">
                <input type="checkbox" checked={form.advancedSettings.allowReportDateRestriction} onChange={(e) => updateAdvancedObject("allowReportDateRestriction", e.target.checked)} />
                <span className="toggle-switch-slider" />
              </label>
            </div>
          </div>
        </div>

        <div className="settings-panel-card">
          <div className="settings-panel-header-with-toggle" style={{ borderBottom: "1px solid #e2e8f0", paddingBottom: 12, marginBottom: 16 }}>
            <h3>Booking & Invoice Defaults</h3>
          </div>
          <div className="settings-form-grid">
            <label className="settings-input-group">
              <span className="muted">Tax Label</span>
              <input type="text" value={form.taxLabel} onChange={(e) => setForm((c) => ({ ...c, taxLabel: e.target.value }))} placeholder="e.g. GST" />
            </label>
            <label className="settings-input-group">
              <span className="muted">Booking Notes</span>
              <textarea value={form.bookingNotes} onChange={(e) => setForm((c) => ({ ...c, bookingNotes: e.target.value }))} placeholder="e.g. Please arrive 10 minutes early" style={{ padding: "10px", border: "1px solid #e2e8f0", borderRadius: 6, width: "100%", boxSizing: "border-box", outline: "none", minHeight: 60, resize: "vertical", fontFamily: "inherit" }} />
            </label>
            <label className="settings-input-group">
              <span className="muted">Cancellation Policy</span>
              <textarea value={form.cancellationPolicy} onChange={(e) => setForm((c) => ({ ...c, cancellationPolicy: e.target.value }))} placeholder="e.g. Free cancellation up to 24 hours before" style={{ padding: "10px", border: "1px solid #e2e8f0", borderRadius: 6, width: "100%", boxSizing: "border-box", outline: "none", minHeight: 60, resize: "vertical", fontFamily: "inherit" }} />
            </label>
          </div>
        </div>

      </>
    );
  };

  const renderShiftSection = () => {
    const shiftList = shifts;
    const selectedShift = shiftList.find(s => s.id === selectedShiftId) || shiftList[0] || null;

    const createShift = async () => {
      try {
        setShiftSaving(true);
        const payload = {
          name: "New Shift",
          active: true,
          sameForAllDays: true,
          startTime: "09:00",
          endTime: "21:00",
          days: WEEK_DAYS.map(d => ({ dayOfWeek: d.dayOfWeekValue, startTime: "09:00", endTime: "21:00", active: true })),
          breaks: [],
          branchId: selectedBranchId || undefined
        };
        const res = await api.post("/owner/shifts", payload);
        setShifts((prev) => [...prev, res.data]);
        setSelectedShiftId(res.data.id);
        setForm((prev) => ({
          ...prev,
          advancedSettings: {
            ...prev.advancedSettings,
            shiftManagement: {
              ...(prev.advancedSettings?.shiftManagement || {}),
              shifts: [...((prev.advancedSettings?.shiftManagement?.shifts) || []), res.data]
            }
          }
        }));
        setStatus({ loading: false, error: "", success: "Shift created." });
      } catch (err) {
        setStatus({ loading: false, error: formatApiError(err, "Could not create shift"), success: "" });
      } finally {
        setShiftSaving(false);
      }
    };

    const deleteShift = async (id) => {
      try {
        setShiftSaving(true);
        await api.delete(`/owner/shifts/${id}`);
        setShifts((prev) => prev.filter(s => s.id !== id));
        if (selectedShiftId === id) setSelectedShiftId(null);
        setForm((prev) => ({
          ...prev,
          advancedSettings: {
            ...prev.advancedSettings,
            shiftManagement: {
              ...(prev.advancedSettings?.shiftManagement || {}),
              shifts: (prev.advancedSettings?.shiftManagement?.shifts || []).filter(s => s.id !== id)
            }
          }
        }));
        setStatus({ loading: false, error: "", success: "Shift deleted." });
      } catch (err) {
        setStatus({ loading: false, error: formatApiError(err, "Could not delete shift"), success: "" });
      } finally {
        setShiftSaving(false);
      }
    };

    const saveShift = async () => {
      if (!selectedShift || !shiftDraft) return;
      try {
        setShiftSaving(true);
        const payload = {
          name: shiftDraft.name?.trim() || "Untitled Shift",
          active: shiftDraft.active !== false,
          sameForAllDays: shiftDraft.sameForAllDays !== false,
          startTime: shiftDraft.sameForAllDays ? (shiftDraft.startTime || "09:00") : null,
          endTime: shiftDraft.sameForAllDays ? (shiftDraft.endTime || "21:00") : null,
          sortOrder: shiftDraft.sortOrder || 0,
          days: shiftDraft.sameForAllDays ? [] : (shiftDraft.days || []).map(d => ({
            dayOfWeek: Number(d.dayOfWeek),
            startTime: d.startTime || "09:00",
            endTime: d.endTime || "21:00",
            active: d.active !== false
          })),
          breaks: (shiftDraft.breaks || []).filter(b => b.name || b.fromTime || b.toTime).map(b => ({
            name: b.name || "Break",
            active: b.active !== false,
            fromTime: b.fromTime || "00:00",
            toTime: b.toTime || "00:00"
          })),
          branchId: selectedBranchId || undefined
        };
        const res = await api.patch(`/owner/shifts/${selectedShift.id}`, payload);
        setShifts((prev) => prev.map(s => s.id === res.data.id ? res.data : s));
        setForm((prev) => ({
          ...prev,
          advancedSettings: {
            ...prev.advancedSettings,
            shiftManagement: {
              ...(prev.advancedSettings?.shiftManagement || {}),
              shifts: (prev.advancedSettings?.shiftManagement?.shifts || []).map(s => s.id === res.data.id ? res.data : s)
            }
          }
        }));
        setStatus({ loading: false, error: "", success: "Shift saved." });
      } catch (err) {
        setStatus({ loading: false, error: formatApiError(err, "Could not save shift"), success: "" });
      } finally {
        setShiftSaving(false);
      }
    };

    const updateDraftField = (field, value) => {
      setShiftDraft((current) => current ? { ...current, [field]: value } : current);
    };

    const updateDayField = (dayOfWeek, patch) => {
      setShiftDraft((current) => {
        if (!current) return current;
        const days = (current.days || []).map(d => d.dayOfWeek === dayOfWeek ? { ...d, ...patch } : d);
        return { ...current, days };
      });
    };

    const addBreakToDraft = () => {
      setShiftDraft((current) => current ? {
        ...current,
        breaks: [...(current.breaks || []), { name: "", active: true, fromTime: "", toTime: "" }]
      } : current);
    };

    const updateBreakInDraft = (index, patch) => {
      setShiftDraft((current) => {
        if (!current) return current;
        const breaks = (current.breaks || []).map((b, i) => i === index ? { ...b, ...patch } : b);
        return { ...current, breaks };
      });
    };

    const removeBreakFromDraft = (index) => {
      setShiftDraft((current) => {
        if (!current) return current;
        const breaks = (current.breaks || []).filter((_, i) => i !== index);
        return { ...current, breaks };
      });
    };

    const toggleSameForAllDays = (checked) => {
      setShiftDraft((current) => {
        if (!current) return current;
        if (checked) {
          const firstDay = (current.days || [])[0] || {};
          const startTime = firstDay.startTime || "09:00";
          const endTime = firstDay.endTime || "21:00";
          return {
            ...current,
            sameForAllDays: true,
            startTime,
            endTime,
            days: WEEK_DAYS.map(d => ({ dayOfWeek: d.dayOfWeekValue, startTime, endTime, active: true }))
          };
        } else {
          const startTime = current.startTime || "09:00";
          const endTime = current.endTime || "21:00";
          return {
            ...current,
            sameForAllDays: false,
            startTime: null,
            endTime: null,
            days: WEEK_DAYS.map(d => ({ dayOfWeek: d.dayOfWeekValue, startTime, endTime, active: true }))
          };
        }
      });
    };

    return (
      <>
        <SectionHeader title="Shift Management" description="Create reusable shift templates with per-day timing so roster planning stays consistent across staff, roles, and branches." badges={[`${shiftList.length} shifts`]} action={<button type="button" onClick={saveShift} disabled={!selectedShift || shiftSaving} className="primary-button" style={{ padding: "8px 18px", background: "var(--button-bg-solid, #3b82f6)", color: "white", border: "none", borderRadius: 8, fontWeight: 600, cursor: shiftSaving ? "not-allowed" : "pointer", opacity: !selectedShift || shiftSaving ? 0.6 : 1 }}>{shiftSaving ? "Saving..." : "Save Shift"}</button>} />

        <div className="shift-layout-grid">
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, padding: 12, height: "fit-content" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
              {shiftList.map((shift) => (
                <button
                  key={shift.id}
                  type="button"
                  onClick={() => setSelectedShiftId(shift.id)}
                  style={{
                    padding: "10px 14px",
                    border: selectedShiftId === shift.id ? "2px solid #3b82f6" : "1px solid #e2e8f0",
                    borderRadius: 8,
                    background: selectedShiftId === shift.id ? "#eff6ff" : "#fff",
                    textAlign: "left",
                    fontSize: 14,
                    color: "#0f172a",
                    cursor: "pointer",
                    fontWeight: selectedShiftId === shift.id ? 600 : 500,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    width: "100%"
                  }}
                >
                  <span>{shift.name || "Untitled Shift"}</span>
                  {!shift.active && <span style={{ color: "#ef4444", fontSize: 12 }}>(Inactive)</span>}
                </button>
              ))}
              {shiftList.length === 0 && (
                <div style={{ padding: "20px 14px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>No shifts yet</div>
              )}
            </div>
            <button
              type="button"
              onClick={createShift}
              disabled={shiftSaving}
              style={{ width: "100%", padding: "10px 16px", background: "var(--button-bg-solid, #3b82f6)", color: "#fff", border: "none", borderRadius: 8, fontWeight: 600, cursor: shiftSaving ? "not-allowed" : "pointer", fontSize: 14 }}
            >
              {shiftSaving ? "Creating..." : "Create New"}
            </button>
          </div>

          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, padding: 20 }}>
            {!selectedShift || !shiftDraft ? (
              <div style={{ padding: "60px 20px", textAlign: "center", color: "#94a3b8" }}>
                <strong>Select a shift to edit</strong>
                <div style={{ fontSize: 12, marginTop: 4 }}>Or create a new shift to get started.</div>
              </div>
            ) : (
              <>
                <h2 style={{ margin: 0, marginBottom: 16, fontSize: 20, fontWeight: 700, color: "#2563eb" }}>Shift Details</h2>
                <div className="settings-form-grid" style={{ marginBottom: 16, alignItems: "center" }}>
                  <label style={{ display: "block" }}>
                    <div style={{ fontSize: 13, color: "#475569", marginBottom: 4, fontWeight: 600 }}>Shift Name</div>
                    <input
                      value={shiftDraft.name || ""}
                      onChange={(event) => updateDraftField("name", event.target.value)}
                      placeholder="Enter shift name"
                      style={{ width: "100%", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: 14 }}
                    />
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={Boolean(shiftDraft.active)}
                      onChange={(event) => updateDraftField("active", event.target.checked)}
                      style={{ width: 18, height: 18 }}
                    />
                    <span style={{ fontSize: 14, fontWeight: 600 }}>Active</span>
                  </label>
                </div>

                <label style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "#f8fafc", borderRadius: 8, marginBottom: 16, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={Boolean(shiftDraft.sameForAllDays)}
                    onChange={(event) => toggleSameForAllDays(event.target.checked)}
                    style={{ width: 18, height: 18 }}
                  />
                  <span style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>Same For All Days</span>
                </label>

                {shiftDraft.sameForAllDays ? (
                  <div className="settings-form-grid" style={{ marginBottom: 16 }}>
                    <label>
                      <div style={{ fontSize: 13, color: "#475569", marginBottom: 4, fontWeight: 600 }}>Start Time</div>
                      <input
                        type="time"
                        value={shiftDraft.startTime || "09:00"}
                        onChange={(event) => updateDraftField("startTime", event.target.value)}
                        style={{ width: "100%", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: 14 }}
                      />
                    </label>
                    <label>
                      <div style={{ fontSize: 13, color: "#475569", marginBottom: 4, fontWeight: 600 }}>End Time</div>
                      <input
                        type="time"
                        value={shiftDraft.endTime || "21:00"}
                        onChange={(event) => updateDraftField("endTime", event.target.value)}
                        style={{ width: "100%", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: 14 }}
                      />
                    </label>
                  </div>
                ) : (
                  <div className="settings-table-wrap" style={{ marginBottom: 16, overflowX: "auto" }}>
                    <div style={{ minWidth: 400 }}>
                      <div style={{ display: "grid", gridTemplateColumns: "120px 1fr 1fr 60px", gap: 12, padding: "8px 12px", background: "#f8fafc", borderRadius: "6px 6px 0 0", borderBottom: "1px solid #e2e8f0", fontSize: 12, fontWeight: 600, color: "#475569" }}>
                        <div>Day</div>
                        <div>Start Time</div>
                        <div>End Time</div>
                        <div>Active</div>
                      </div>
                    {WEEK_DAYS.map((day) => {
                      const dayData = (shiftDraft.days || []).find(d => d.dayOfWeek === day.dayOfWeekValue) || { dayOfWeek: day.dayOfWeekValue, startTime: "09:00", endTime: "21:00", active: true };
                      return (
                        <div key={day.key} style={{ display: "grid", gridTemplateColumns: "120px 1fr 1fr 60px", gap: 12, padding: "10px 12px", borderBottom: "1px solid #f1f5f9", alignItems: "center" }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{day.label}</div>
                          <input
                            type="time"
                            value={dayData.startTime || "09:00"}
                            onChange={(event) => updateDayField(day.dayOfWeekValue, { startTime: event.target.value })}
                            style={{ width: "100%", padding: "6px 10px", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: 13 }}
                          />
                          <input
                            type="time"
                            value={dayData.endTime || "21:00"}
                            onChange={(event) => updateDayField(day.dayOfWeekValue, { endTime: event.target.value })}
                            style={{ width: "100%", padding: "6px 10px", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: 13 }}
                          />
                          <input
                            type="checkbox"
                            checked={dayData.active !== false}
                            onChange={(event) => updateDayField(day.dayOfWeekValue, { active: event.target.checked })}
                            style={{ width: 18, height: 18 }}
                          />
                        </div>
                      );
                    })}
                    </div>
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#0f172a" }}>Break Types</h3>
                  <button
                    type="button"
                    onClick={addBreakToDraft}
                    style={{ padding: "6px 14px", background: "var(--button-bg-solid, #3b82f6)", color: "#fff", border: "none", borderRadius: 6, fontWeight: 600, cursor: "pointer", fontSize: 12 }}
                  >
                    + Add Break
                  </button>
                </div>

                {(shiftDraft.breaks || []).length === 0 && (
                  <div style={{ padding: "16px", textAlign: "center", color: "#94a3b8", fontSize: 13, background: "#f8fafc", borderRadius: 8, marginBottom: 12 }}>
                    No breaks added yet.
                  </div>
                )}

                {(shiftDraft.breaks || []).map((brk, idx) => (
                  <div key={idx} style={{ padding: 16, background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0", position: "relative", marginBottom: 12 }}>
                    <button type="button" onClick={() => removeBreakFromDraft(idx)} style={{ position: "absolute", top: 8, right: 8, background: "#fee2e2", color: "#991b1b", border: "none", cursor: "pointer", width: 24, height: 24, borderRadius: 6, fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 100px", gap: 12, marginBottom: 12, paddingRight: 30 }}>
                      <label>
                        <div style={{ fontSize: 12, color: "#475569", marginBottom: 4, fontWeight: 600 }}>Break Name</div>
                        <input value={brk.name || ""} onChange={(e) => updateBreakInDraft(idx, { name: e.target.value })} placeholder="e.g. Lunch" style={{ padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: 6, width: "100%", fontSize: 13, outline: "none" }} />
                      </label>
                      <label style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 18, cursor: "pointer" }}>
                        <input type="checkbox" checked={brk.active !== false} onChange={(e) => updateBreakInDraft(idx, { active: e.target.checked })} style={{ width: 16, height: 16 }} />
                        <span style={{ fontSize: 12 }}>Active</span>
                      </label>
                    </div>
                    <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: 12 }}>
                      <div style={{ fontSize: 12, color: "#475569", marginBottom: 8, fontWeight: 600 }}>Break Timing</div>
                      <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#475569" }}>
                          From
                          <input type="time" value={brk.fromTime || ""} onChange={(e) => updateBreakInDraft(idx, { fromTime: e.target.value })} style={{ padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: 6, outline: "none" }} />
                        </label>
                        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#475569" }}>
                          To
                          <input type="time" value={brk.toTime || ""} onChange={(e) => updateBreakInDraft(idx, { toTime: e.target.value })} style={{ padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: 6, outline: "none" }} />
                        </label>
                      </div>
                    </div>
                  </div>
                ))}

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 20, paddingTop: 16, borderTop: "1px solid #f1f5f9" }}>
                  <button
                    type="button"
                    onClick={() => deleteShift(selectedShift.id)}
                    disabled={shiftSaving}
                    style={{ padding: "10px 20px", background: "#fff", border: "1px solid #ef4444", color: "#ef4444", borderRadius: 8, fontWeight: 600, cursor: shiftSaving ? "not-allowed" : "pointer", fontSize: 14 }}
                  >
                    Delete Shift
                  </button>
                  <button
                    type="button"
                    onClick={saveShift}
                    disabled={shiftSaving}
                    style={{ padding: "10px 28px", background: "var(--button-bg-solid, #3b82f6)", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, cursor: shiftSaving ? "not-allowed" : "pointer", fontSize: 14, opacity: shiftSaving ? 0.6 : 1 }}
                  >
                    {shiftSaving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </>
    );
  };

  const renderRosterSection = () => {
    const roster = form.advancedSettings.rosterManagement;
    const rosterModuleEnabled = form.advancedSettings.allowRosterMgtSettings !== false;
    const updateRow = (id, patch) => updateAdvancedObject("rosterManagement", {
      rows: roster.rows.map((row) => row.id === id ? { ...row, ...patch } : row)
    });
    const applyShiftTemplate = () => {
      if (!rosterModuleEnabled) return;
      const selectedShift = shifts.find((item) => item.id === roster.useShiftId);
      if (!selectedShift) return;
      // If shift is per-day, pick the first day's times
      let fromTime = selectedShift.startTime;
      let toTime = selectedShift.endTime;
      if (!selectedShift.sameForAllDays && (selectedShift.days || []).length > 0) {
        const firstDay = selectedShift.days[0];
        fromTime = firstDay.startTime || fromTime;
        toTime = firstDay.endTime || toTime;
      }
      updateAdvancedObject("rosterManagement", {
        rows: roster.rows.map((row) => ({
          ...row,
          applyToAll: true,
          fromTime: fromTime || "09:00",
          toTime: toTime || "21:00",
          isWorking: selectedShift.active !== false ? true : row.isWorking ?? true,
          breakLabel: selectedShift.breakLabel || row.breakLabel || ""
        }))
      });
    };
    const handleDateNav = (offset) => {
      const current = roster.selectedDate ? new Date(roster.selectedDate) : new Date();
      current.setDate(current.getDate() + offset);
      updateAdvancedObject("rosterManagement", { selectedDate: current.toISOString().split("T")[0] });
    };
    const handleSaveRoster = async () => {
      try {
        setStatus({ error: "", success: "" });
        const response = await api.post("/owner/settings", {
          branchId: selectedBranchId || undefined,
          invoicePrefix: form.invoicePrefix,
          invoiceFooter: form.invoiceFooter,
          taxLabel: form.taxLabel,
          whatsappNumber: form.whatsappNumber,
          bookingNotes: form.bookingNotes,
          cancellationPolicy: form.cancellationPolicy,
          paymentModes,
          allowNegativeStock: Boolean(form.allowNegativeStock),
          paymentGatewaySettings: form.paymentGatewaySettings,
          advancedSettings: form.advancedSettings,
          smsSettings: form.smsSettings
        });
        writeSalonSettingsCache(salonId, response.data || {
          advancedSettings: form.advancedSettings,
          invoicePrefix: form.invoicePrefix,
          invoiceFooter: form.invoiceFooter,
          taxLabel: form.taxLabel
        });
        setStatus({ error: "", success: "Roster saved successfully." });
      } catch (error) {
        setStatus({ error: formatApiError(error, "Could not save roster"), success: "" });
      }
    };
    const formatDate = (dateStr) => {
      if (!dateStr) return "";
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    };

    return (
      <>
        <SectionHeader title="Roster Management" description="Use saved shifts as templates and keep a quick day-wise operating roster for all staff inside settings." badges={[`${roster.rows.length} staff rows`, `${summary.staffSchedules.length} live schedule rows`, rosterModuleEnabled ? "Roster Editable" : "Roster Locked"]} />
        {!rosterModuleEnabled ? (
          <div className="muted" style={{ marginBottom: 12, fontSize: 12 }}>
            Roster management is locked from settings, so these rows remain visible but editing is intentionally paused until the module is enabled again.
          </div>
        ) : null}

        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>Apply Shift for</span>
            <input
              type="number"
              min="1"
              disabled={!rosterModuleEnabled}
              value={roster.applyFor || 1}
              onChange={(event) => updateAdvancedObject("rosterManagement", { applyFor: Number(event.target.value) || 1 })}
              style={{ width: 60, padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: 14, textAlign: "center" }}
            />
            <span style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>Days:</span>
            <select
              disabled={!rosterModuleEnabled}
              value={roster.useShiftId}
              onChange={(event) => updateAdvancedObject("rosterManagement", { useShiftId: event.target.value })}
              style={{ minWidth: 200, padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: 14, background: "#fff" }}
            >
              <option value="">Select shift template</option>
              {shifts.filter((shift) => shift.active !== false).map((shift) => <option key={shift.id} value={shift.id}>{shift.name || "Unnamed Shift"}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button
              type="button"
              onClick={() => handleDateNav(-1)}
              disabled={!rosterModuleEnabled}
              title="Previous Day"
              style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 34, height: 34, border: "1px solid #cbd5e1", background: "#fff", borderRadius: 6, cursor: "pointer", color: "#475569" }}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={() => updateAdvancedObject("rosterManagement", { selectedDate: new Date().toISOString().split("T")[0] })}
              disabled={!rosterModuleEnabled}
              style={{ height: 34, padding: "0 12px", border: "1px solid #cbd5e1", background: "#fff", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600, color: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              TODAY
            </button>
            <span style={{ padding: "0 12px", fontSize: 14, fontWeight: 600, color: "#0f172a", minWidth: 110, textAlign: "center", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
              {formatDate(roster.selectedDate)}
            </span>
            <button
              type="button"
              onClick={() => handleDateNav(1)}
              disabled={!rosterModuleEnabled}
              title="Next Day"
              style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 34, height: 34, border: "1px solid #cbd5e1", background: "#fff", borderRadius: 6, cursor: "pointer", color: "#475569" }}
            >
              <ChevronRight size={16} />
            </button>
            <button
              type="button"
              onClick={applyShiftTemplate}
              disabled={!rosterModuleEnabled}
              style={{ marginLeft: 8, height: 34, padding: "0 16px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              Apply
            </button>
          </div>
        </div>

        <div className="settings-table-wrap" style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, overflowX: "auto" }}>
          <div style={{ minWidth: 850 }}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid #f1f5f9", background: "#f8fafc", display: "grid", gridTemplateColumns: "100px 1fr 180px 180px 120px 1fr", alignItems: "center", gap: 12, fontSize: 14, fontWeight: 600, color: "#475569" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <input
                type="checkbox"
                disabled={!rosterModuleEnabled}
                checked={roster.rows.length > 0 && roster.rows.every((row) => row.applyToAll)}
                onChange={(event) => updateAdvancedObject("rosterManagement", {
                  rows: roster.rows.map((row) => ({ ...row, applyToAll: event.target.checked }))
                })}
                style={{ width: 16, height: 16 }}
              />
              <span>Apply to All</span>
            </label>
            <div>Staff Name</div>
            <div>From Time</div>
            <div>To Time</div>
            <div>Is Working</div>
            <div>Add Break</div>
          </div>
          {roster.rows.map((row) => (
            <div key={row.id} style={{ padding: "12px 16px", borderBottom: "1px solid #f1f5f9", display: "grid", gridTemplateColumns: "100px 1fr 180px 180px 120px 1fr", alignItems: "center", gap: 12 }}>
              <input
                type="checkbox"
                disabled={!rosterModuleEnabled}
                checked={Boolean(row.applyToAll)}
                onChange={(event) => updateRow(row.id, { applyToAll: event.target.checked })}
                style={{ width: 16, height: 16 }}
              />
              <div style={{ fontSize: 14, color: "#0f172a", fontWeight: 500 }}>{row.staffName}</div>
              <input
                type="time"
                disabled={!rosterModuleEnabled}
                value={row.fromTime || "09:00"}
                onChange={(event) => updateRow(row.id, { fromTime: event.target.value })}
                style={{ width: "100%", padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: 13, background: "#f8fafc" }}
              />
              <input
                type="time"
                disabled={!rosterModuleEnabled}
                value={row.toTime || "21:00"}
                onChange={(event) => updateRow(row.id, { toTime: event.target.value })}
                style={{ width: "100%", padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: 13, background: "#f8fafc" }}
              />
              <input
                type="checkbox"
                disabled={!rosterModuleEnabled}
                checked={Boolean(row.isWorking)}
                onChange={(event) => updateRow(row.id, { isWorking: event.target.checked })}
                style={{ width: 18, height: 18 }}
              />
              <input
                type="text"
                disabled={!rosterModuleEnabled}
                value={row.breakLabel || ""}
                onChange={(event) => updateRow(row.id, { breakLabel: event.target.value })}
                placeholder="Add Break"
                style={{ width: "100%", padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: 13 }}
              />
            </div>
          ))}
          {roster.rows.length === 0 && (
            <div style={{ padding: "48px 24px", textAlign: "center", color: "#64748b", background: "#f8fafc" }}>
              <strong>No staff members found</strong>
              <div style={{ fontSize: "12px", marginTop: 4 }}>Staff roster is dynamically populated from your Users/Staff list.</div>
            </div>
          )}
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
          <button
            type="button"
            onClick={() => {
              updateAdvancedObject("rosterManagement", { rows: [], selectedDate: new Date().toISOString().split("T")[0], useShiftId: "", applyFor: 1 });
            }}
            style={{ padding: "10px 24px", background: "#fff", border: "1px solid #cbd5e1", color: "#475569", borderRadius: 8, fontWeight: 600, cursor: "pointer", fontSize: 14 }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSaveRoster}
            style={{ padding: "10px 32px", background: "var(--button-bg-solid, #3b82f6)", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer", fontSize: 14 }}
          >
            Save
          </button>
        </div>
      </>
    );
  };

  const renderTaxSection = () => {
    const taxRows = taxRates;
    const inclusiveTax = form.advancedSettings.taxMapping.inclusiveTax ?? false;

    const selectedRow = taxRows.find((r) => r.id === selectedTaxId) || null;

    const startCreate = () => {
      setDraftTax({ id: null, label: "", code: "", rate: 0, active: true, applicableFor: ["SERVICE", "PRODUCT"], _isNew: true });
      setSelectedTaxId(null);
    };

    const startEdit = (row) => {
      setDraftTax({ ...row, applicableFor: typeof row.applicableFor === "string" ? row.applicableFor.split(",").filter(Boolean) : (row.applicableFor || []), _isNew: false });
      setSelectedTaxId(row.id);
    };

    const cancelDraft = () => {
      setDraftTax(null);
      setSelectedTaxId(null);
    };

    const saveDraft = async () => {
      if (!draftTax) return;
      if (!draftTax.label.trim()) return;
      try {
        const payload = {
          label: draftTax.label.trim(),
          code: draftTax.code?.trim() || draftTax.label.trim().toUpperCase().replace(/\s+/g, "").slice(0, 8),
          rate: Number(draftTax.rate) || 0,
          active: draftTax.active !== false,
          applicableFor: Array.isArray(draftTax.applicableFor) ? draftTax.applicableFor : ["SERVICE", "PRODUCT"],
          branchId: selectedBranchId || null
        };
        if (draftTax._isNew) {
          const res = await api.post("/owner/tax-rates", payload);
          setTaxRates((prev) => [...prev, res.data]);
        } else {
          const res = await api.patch(`/owner/tax-rates/${draftTax.id}`, payload);
          setTaxRates((prev) => prev.map((r) => (r.id === draftTax.id ? res.data : r)));
        }
        cancelDraft();
        setStatus({ loading: false, error: "", success: "Tax rate saved." });
      } catch (err) {
        setStatus({ loading: false, error: formatApiError(err, "Could not save tax rate"), success: "" });
      }
    };

    const deleteTax = async (id) => {
      try {
        await api.delete(`/owner/tax-rates/${id}`);
        setTaxRates((prev) => prev.filter((r) => r.id !== id));
        if (selectedTaxId === id) cancelDraft();
        setStatus({ loading: false, error: "", success: "Tax rate deleted." });
      } catch (err) {
        setStatus({ loading: false, error: formatApiError(err, "Could not delete tax rate"), success: "" });
      }
    };

    const toggleApplicable = (key) => {
      if (!draftTax) return;
      const current = draftTax.applicableFor || [];
      const next = current.includes(key) ? current.filter((k) => k !== key) : [...current, key];
      setDraftTax({ ...draftTax, applicableFor: next });
    };

    const editing = draftTax || selectedRow;

    return (
      <>
        <SectionHeader title="Tax Mapping" description="Define named tax mappings for billing, services, packages, and reporting labels." badges={["Tax label: " + form.taxLabel, taxRows.length + " tax rows", inclusiveTax ? "Inclusive" : "Exclusive"]} />
        <div className="muted" style={{ marginBottom: 12, fontSize: 12 }}>
          New services without an explicit tax rate now inherit the first active tax mapping automatically.
        </div>

        <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
          {/* LEFT PANEL â€” Tax List */}
          <div style={{ width: 260, flexShrink: 0 }}>
            <div className="settings-panel-card" style={{ padding: 0 }}>
              <div style={{ padding: "16px 16px 12px", borderBottom: "1px solid #f1f5f9" }}>
                <button type="button" onClick={startCreate} style={{ width: "100%", padding: "10px", background: "#14b8a6", color: "white", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: "pointer" }}>Create New</button>
              </div>
              <div style={{ maxHeight: 400, overflowY: "auto" }}>
                {taxRows.map((row) => (
                  <div
                    key={row.id}
                    style={{
                      padding: "14px 16px",
                      borderBottom: "1px solid #f1f5f9",
                      cursor: "pointer",
                      background: selectedTaxId === row.id ? "#eff6ff" : "white",
                      borderLeft: selectedTaxId === row.id ? "3px solid #3b82f6" : "3px solid transparent",
                      transition: "all 0.15s",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between"
                    }}
                  >
                    <div style={{ flex: 1 }} onClick={() => { setSelectedTaxId(row.id); setDraftTax(null); }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: "#0f172a" }}>{row.label || "Untitled Tax"}</div>
                      <div style={{ fontSize: 11, color: "#64748b", marginTop: 4, display: "flex", alignItems: "center", gap: 6 }}>
                        <span>{row.code}</span>
                        <span>·</span>
                        <span>{row.rate}%</span>
                        <span>·</span>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                          <span style={{ width: 6, height: 6, borderRadius: "50%", background: row.active ? "#22c55e" : "#94a3b8" }} />
                          {row.active ? "Active" : "Inactive"}
                        </span>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                      <button type="button" onClick={(e) => { e.stopPropagation(); startEdit(row); }} title="Edit tax" style={{ width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 6, cursor: "pointer", color: "#475569", padding: 0 }}><Edit2 size={13} /></button>
                      <button type="button" onClick={(e) => { e.stopPropagation(); deleteTax(row.id); }} title="Delete tax" style={{ width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 6, cursor: "pointer", color: "#dc2626", padding: 0 }}><Trash2 size={13} /></button>
                    </div>
                  </div>
                ))}
                {!taxRows.length && <div style={{ padding: 24, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>No taxes defined</div>}
              </div>
            </div>
          </div>

          {/* RIGHT PANEL â€” Form */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {editing ? (
              <div className="settings-panel-card">
                <h3 style={{ color: "#14b8a6" }}>{draftTax?._isNew ? "Create Tax" : `Edit: ${editing.label || "Tax"}`}</h3>

                <div className="settings-form-grid" style={{ marginBottom: 16 }}>
                  <label className="settings-input-group">
                    <span className="muted">Tax Name</span>
                    <input value={draftTax?.label ?? editing.label} onChange={(e) => draftTax && setDraftTax({ ...draftTax, label: e.target.value })} placeholder="Enter Tax Name" />
                  </label>
                  <label className="settings-input-group">
                    <span className="muted">Tax Value</span>
                    <div style={{ display: "flex", alignItems: "center" }}>
                      <input type="number" value={draftTax?.rate ?? editing.rate} onChange={(e) => draftTax && setDraftTax({ ...draftTax, rate: Number(e.target.value) })} placeholder="Enter Tax Value" style={{ flex: 1 }} />
                      <span style={{ padding: "8px 12px", background: "#f1f5f9", border: "1px solid #e2e8f0", borderLeft: "none", borderRadius: "0 8px 8px 0", fontSize: 13, color: "#475569" }}>%</span>
                    </div>
                  </label>
                </div>

                <div style={{ display: "flex", gap: 32, marginBottom: 16 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600, color: "#334155", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={draftTax?.active ?? editing.active}
                      onChange={(e) => draftTax && setDraftTax({ ...draftTax, active: e.target.checked })}
                      style={{ width: 18, height: 18, accentColor: "var(--accent, #3b82f6)", cursor: "pointer" }}
                    />
                    Active
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600, color: "#334155", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={inclusiveTax}
                      onChange={(e) => updateAdvancedObject("taxMapping", { inclusiveTax: e.target.checked })}
                      style={{ width: 18, height: 18, accentColor: "var(--accent, #3b82f6)", cursor: "pointer" }}
                    />
                    Inclusive Taxes
                  </label>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: "#334155", marginBottom: 8 }}>Applicable For</div>
                  <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                    {[{ key: "SERVICE", label: "Service" }, { key: "PRODUCT", label: "Product" }, { key: "MEMBERSHIP", label: "Membership" }, { key: "PACKAGE", label: "Packages" }].map(({ key, label }) => (
                      <label key={key} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#334155", cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={(draftTax?.applicableFor ?? (typeof editing.applicableFor === "string" ? editing.applicableFor.split(",") : (editing.applicableFor || []))).includes(key)}
                          onChange={() => draftTax && toggleApplicable(key)}
                          style={{ width: 16, height: 16, accentColor: "var(--accent, #3b82f6)", cursor: "pointer" }}
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 20, paddingTop: 16, borderTop: "1px solid #f1f5f9" }}>
                  <button type="button" onClick={cancelDraft} style={{ padding: "10px 24px", background: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: 8, fontWeight: 600, cursor: "pointer", color: "#475569", fontSize: 13 }}>Cancel</button>
                  <button type="button" onClick={saveDraft} style={{ padding: "10px 24px", background: "var(--button-bg-solid, #3b82f6)", color: "white", border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer", fontSize: 13 }}>Save</button>
                </div>
              </div>
            ) : (
              <div className="settings-panel-card" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 300, color: "#94a3b8", fontSize: 14 }}>
                Select a tax from the left panel or click "Create New"
              </div>
            )}
          </div>
        </div>
      </>
    );
  };

  const renderLoyaltySettingsSection = () => {
    const loyalty = form.advancedSettings.loyaltySettings;
    const u = (patch) => updateAdvancedObject("loyaltySettings", patch);
    const uService = (patch) => u({ serviceEarning: { ...loyalty.serviceEarning, ...patch } });
    const uProduct = (patch) => u({ productEarning: { ...loyalty.productEarning, ...patch } });
    const uPackage = (patch) => u({ packageEarning: { ...loyalty.packageEarning, ...patch } });

    const summaryText = loyalty.earnIndividually
      ? `Earn ${formatMoney(loyalty.serviceEarning?.amount || 0)} = ${loyalty.serviceEarning?.points || 0} pts (Service) | ${formatMoney(loyalty.productEarning?.amount || 0)} = ${loyalty.productEarning?.points || 0} pts (Product) | ${formatMoney(loyalty.packageEarning?.amount || 0)} = ${loyalty.packageEarning?.points || 0} pts (Package)`
      : `Earn ${loyalty.serviceEarning?.points || 0} Points on Every ${formatMoney(loyalty.serviceEarning?.amount || 0)} Spent`;
    const redeemText = `Redeem ${formatMoney(loyalty.redeemAmount || 0)} on Every ${loyalty.redeemPoints || 0} Point`;

    return (
      <>
        <div className="settings-panel-card" style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <h3 style={{ margin: 0, border: "none", padding: 0, fontSize: 16 }}>Loyalty</h3>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <input type="checkbox" checked={loyalty.enabled} onChange={(e) => u({ enabled: e.target.checked })} style={{ width: 20, height: 20, accentColor: "var(--accent, #3b82f6)", cursor: "pointer" }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: loyalty.enabled ? "#16a34a" : "#64748b" }}>Enabled</span>
              </label>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#475569" }}>
              <span style={{ fontWeight: 600 }}>Loyalty Expiration:</span>
              <input type="number" value={loyalty.expiryDays} onChange={(e) => u({ expiryDays: Number(e.target.value) })} style={{ width: 100, padding: "6px 10px", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: 13, textAlign: "center", outline: "none" }} />
              <span>Days</span>
            </div>
          </div>
        </div>

        <div className="settings-panel-card" style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, fontWeight: 600, color: "#334155", cursor: "pointer" }}>
              <input type="checkbox" checked={loyalty.earnIndividually} onChange={(e) => u({ earnIndividually: e.target.checked })} style={{ width: 18, height: 18, accentColor: "var(--accent, #3b82f6)", cursor: "pointer" }} />
              Earn Loyalty on Service, Product and Package Individually
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, fontWeight: 600, color: "#334155", cursor: "pointer" }}>
              <input type="checkbox" checked={loyalty.skipEarnOnRedemption} onChange={(e) => u({ skipEarnOnRedemption: e.target.checked })} style={{ width: 18, height: 18, accentColor: "var(--accent, #3b82f6)", cursor: "pointer" }} />
              Skip Earning Loyalty on Redemption
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, fontWeight: 600, color: "#334155", cursor: "pointer" }}>
              <input type="checkbox" checked={loyalty.earnOnMembershipApplied} onChange={(e) => u({ earnOnMembershipApplied: e.target.checked })} style={{ width: 18, height: 18, accentColor: "var(--accent, #3b82f6)", cursor: "pointer" }} />
              Earn Loyalty on Service, Product when Percentage Membership is Applied
            </label>
          </div>
        </div>

        <div className="settings-panel-card" style={{ marginBottom: 24 }}>
          {loyalty.earnIndividually ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
              {[
                { key: "service", title: "Service Loyalty Earning", data: loyalty.serviceEarning, updater: uService },
                { key: "product", title: "Product Loyalty Earning", data: loyalty.productEarning, updater: uProduct },
                { key: "package", title: "Package Loyalty Earning", data: loyalty.packageEarning, updater: uPackage }
              ].map((item) => (
                <div key={item.key}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: "#334155", marginBottom: 12 }}>Configuration for {item.title}</div>
                  <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: 11, color: "#475569", display: "block", marginBottom: 4, fontWeight: 600 }}>Amount</label>
                      <div style={{ display: "flex", border: "1px solid #cbd5e1", borderRadius: 6, overflow: "hidden", background: "#fff" }}>
                        <span style={{ padding: "8px 10px", background: "#f1f5f9", color: "#475569", fontWeight: 600, fontSize: 13, borderRight: "1px solid #cbd5e1", display: "flex", alignItems: "center" }}>$</span>
                        <input type="number" placeholder="Enter Amount" value={item.data?.amount || ""} onChange={(e) => item.updater({ amount: Number(e.target.value) })} style={{ flex: 1, border: "none", padding: "8px 10px", fontSize: 13, outline: "none", background: "transparent" }} />
                      </div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: 11, color: "#475569", display: "block", marginBottom: 4, fontWeight: 600 }}>Points</label>
                      <div style={{ display: "flex", border: "1px solid #cbd5e1", borderRadius: 6, overflow: "hidden", background: "#fff" }}>
                        <input type="number" placeholder="Enter Points" value={item.data?.points || ""} onChange={(e) => item.updater({ points: Number(e.target.value) })} style={{ flex: 1, border: "none", padding: "8px 10px", fontSize: 13, outline: "none", background: "transparent" }} />
                        <span style={{ padding: "8px 10px", background: "#f1f5f9", color: "#475569", fontWeight: 600, fontSize: 13, borderLeft: "1px solid #cbd5e1", display: "flex", alignItems: "center" }}>pts</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: "#475569" }}>Earn {item.data?.points || 0} Points on Every {formatMoney(item.data?.amount || 0)} Spent</div>
                </div>
              ))}
            </div>
          ) : (
            <div>
              <div style={{ fontWeight: 600, fontSize: 13, color: "#334155", marginBottom: 12 }}>Configuration for Loyalty Earning</div>
              <div style={{ display: "flex", gap: 16, marginBottom: 8, flexWrap: "wrap" }}>
                <div style={{ width: 240 }}>
                  <label style={{ fontSize: 11, color: "#475569", display: "block", marginBottom: 4, fontWeight: 600 }}>Amount</label>
                  <div style={{ display: "flex", border: "1px solid #cbd5e1", borderRadius: 6, overflow: "hidden", background: "#fff" }}>
                    <span style={{ padding: "8px 10px", background: "#f1f5f9", color: "#475569", fontWeight: 600, fontSize: 13, borderRight: "1px solid #cbd5e1", display: "flex", alignItems: "center" }}>$</span>
                    <input type="number" placeholder="Enter Amount" value={loyalty.serviceEarning?.amount || ""} onChange={(e) => { uService({ amount: Number(e.target.value) }); uProduct({ amount: Number(e.target.value) }); uPackage({ amount: Number(e.target.value) }); }} style={{ flex: 1, border: "none", padding: "8px 10px", fontSize: 13, outline: "none", background: "transparent" }} />
                  </div>
                </div>
                <div style={{ width: 240 }}>
                  <label style={{ fontSize: 11, color: "#475569", display: "block", marginBottom: 4, fontWeight: 600 }}>Points</label>
                  <div style={{ display: "flex", border: "1px solid #cbd5e1", borderRadius: 6, overflow: "hidden", background: "#fff" }}>
                    <input type="number" placeholder="Enter Points" value={loyalty.serviceEarning?.points || ""} onChange={(e) => { uService({ points: Number(e.target.value) }); uProduct({ points: Number(e.target.value) }); uPackage({ points: Number(e.target.value) }); }} style={{ flex: 1, border: "none", padding: "8px 10px", fontSize: 13, outline: "none", background: "transparent" }} />
                    <span style={{ padding: "8px 10px", background: "#f1f5f9", color: "#475569", fontWeight: 600, fontSize: 13, borderLeft: "1px solid #cbd5e1", display: "flex", alignItems: "center" }}>pts</span>
                  </div>
                </div>
              </div>
              <div style={{ fontSize: 12, color: "#475569" }}>{summaryText}</div>
            </div>
          )}
        </div>

        <div className="settings-panel-card" style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <h3 style={{ margin: 0, border: "none", padding: 0, fontSize: 16, color: "#94a3b8" }}>Redeem Loyalty on Service, Product and Package Individually</h3>
            <input type="checkbox" checked={loyalty.redeemIndividually} onChange={(e) => u({ redeemIndividually: e.target.checked })} style={{ width: 18, height: 18, accentColor: "var(--accent, #3b82f6)", cursor: "pointer" }} />
          </div>

          {loyalty.redeemIndividually ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
              <div key="service">
                <div style={{ fontWeight: 600, fontSize: 13, color: "#334155", marginBottom: 12 }}>Service Redeem Config</div>
                <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 11, color: "#64748b", display: "block", marginBottom: 4 }}>Points</label>
                    <input type="number" placeholder="Points" value={loyalty.serviceEarning?.redeemPoints || ""} onChange={(e) => { const n = { ...loyalty.serviceEarning, redeemPoints: Number(e.target.value) }; uService(n); }} style={{ width: "100%", padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 13, boxSizing: "border-box" }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 11, color: "#64748b", display: "block", marginBottom: 4 }}>{formatMoney(1).replace(/[\d.,]/g, '').trim()}</label>
                    <input type="number" placeholder="Amount" value={loyalty.serviceEarning?.redeemAmount || ""} onChange={(e) => { const n = { ...loyalty.serviceEarning, redeemAmount: Number(e.target.value) }; uService(n); }} style={{ width: "100%", padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 13, boxSizing: "border-box" }} />
                  </div>
                </div>
              </div>
              <div key="product">
                <div style={{ fontWeight: 600, fontSize: 13, color: "#334155", marginBottom: 12 }}>Product Redeem Config</div>
                <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 11, color: "#64748b", display: "block", marginBottom: 4 }}>Points</label>
                    <input type="number" placeholder="Points" value={loyalty.productEarning?.redeemPoints || ""} onChange={(e) => { const n = { ...loyalty.productEarning, redeemPoints: Number(e.target.value) }; uProduct(n); }} style={{ width: "100%", padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 13, boxSizing: "border-box" }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 11, color: "#64748b", display: "block", marginBottom: 4 }}>{formatMoney(1).replace(/[\d.,]/g, '').trim()}</label>
                    <input type="number" placeholder="Amount" value={loyalty.productEarning?.redeemAmount || ""} onChange={(e) => { const n = { ...loyalty.productEarning, redeemAmount: Number(e.target.value) }; uProduct(n); }} style={{ width: "100%", padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 13, boxSizing: "border-box" }} />
                  </div>
                </div>
              </div>
              <div key="package">
                <div style={{ fontWeight: 600, fontSize: 13, color: "#334155", marginBottom: 12 }}>Package Redeem Config</div>
                <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 11, color: "#64748b", display: "block", marginBottom: 4 }}>Points</label>
                    <input type="number" placeholder="Points" value={loyalty.packageEarning?.redeemPoints || ""} onChange={(e) => { const n = { ...loyalty.packageEarning, redeemPoints: Number(e.target.value) }; uPackage(n); }} style={{ width: "100%", padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 13, boxSizing: "border-box" }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 11, color: "#64748b", display: "block", marginBottom: 4 }}>{formatMoney(1).replace(/[\d.,]/g, '').trim()}</label>
                    <input type="number" placeholder="Amount" value={loyalty.packageEarning?.redeemAmount || ""} onChange={(e) => { const n = { ...loyalty.packageEarning, redeemAmount: Number(e.target.value) }; uPackage(n); }} style={{ width: "100%", padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 13, boxSizing: "border-box" }} />
                  </div>
                </div>
              </div>
            </div>
          ) : (
          <>
          <div style={{ fontWeight: 600, fontSize: 13, color: "#334155", marginBottom: 12 }}>Configuration for Loyalty Redemption</div>
          <div style={{ display: "flex", gap: 16, marginBottom: 8 }}>
            <div style={{ width: 200 }}>
              <label style={{ fontSize: 11, color: "#64748b", display: "block", marginBottom: 4 }}>Points</label>
              <input type="number" placeholder="Enter Points*" value={loyalty.redeemPoints || ""} onChange={(e) => u({ redeemPoints: Number(e.target.value) })} style={{ width: "100%", padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 13, boxSizing: "border-box" }} />
            </div>
            <div style={{ width: 200 }}>
              <label style={{ fontSize: 11, color: "#64748b", display: "block", marginBottom: 4 }}>{formatMoney(1).replace(/[\d.,]/g, '').trim()}</label>
              <input type="number" placeholder="Enter Amount*" value={loyalty.redeemAmount || ""} onChange={(e) => u({ redeemAmount: Number(e.target.value) })} style={{ width: "100%", padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 13, boxSizing: "border-box" }} />
            </div>
          </div>
          <div style={{ fontSize: 12, color: "#475569", marginBottom: 20 }}>{redeemText}</div>
          </>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginTop: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#334155", display: "block", marginBottom: 6 }}>Minimum Points Eligible for Redemption</label>
              <input type="number" placeholder="Enter Min Points Req*" value={loyalty.minRedeemPoints || ""} onChange={(e) => u({ minRedeemPoints: Number(e.target.value) })} style={{ width: "100%", padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 13, boxSizing: "border-box" }} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#334155", display: "block", marginBottom: 6 }}>Maximum Points Redeemable per Order</label>
              <input type="number" placeholder="Enter Points*" value={loyalty.maxRedeemPoints || ""} onChange={(e) => u({ maxRedeemPoints: Number(e.target.value) })} style={{ width: "100%", padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 13, boxSizing: "border-box" }} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#334155", display: "block", marginBottom: 6 }}>Percentage Redeemable on Order</label>
              <input type="number" placeholder="Enter % Of Order Amount*" value={loyalty.maxRedeemPercent || ""} onChange={(e) => u({ maxRedeemPercent: Number(e.target.value) })} style={{ width: "100%", padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 13, boxSizing: "border-box" }} />
            </div>
          </div>
        </div>
      </>
    );
  };

  const renderFeedbackSection = () => {
    const feedback = form.advancedSettings.feedbackSetting;
    const feedbackTypesList = feedbackTypes;
    const activeCount = feedbackTypesList.filter((type) => type.active).length;

    const selectedRow = feedbackTypesList.find((row) => row.id === selectedFeedbackTypeId) || null;
    const editing = draftFeedbackType || selectedRow;

    const startCreate = () => {
      setDraftFeedbackType({ id: null, name: "", slug: "", active: true, _isNew: true });
      setSelectedFeedbackTypeId(null);
    };

    const startEdit = (row) => {
      setDraftFeedbackType({ ...row, _isNew: false });
      setSelectedFeedbackTypeId(row.id);
    };

    const cancelDraft = () => {
      setDraftFeedbackType(null);
      setSelectedFeedbackTypeId(null);
    };

    const saveDraft = async () => {
      if (!draftFeedbackType) return;
      if (!draftFeedbackType.name?.trim()) return;
      try {
        const payload = {
          name: draftFeedbackType.name.trim(),
          slug: draftFeedbackType.slug?.trim() || draftFeedbackType.name.trim().toLowerCase().replace(/\s+/g, "-").slice(0, 32),
          active: draftFeedbackType.active !== false
        };
        if (draftFeedbackType._isNew) {
          const res = await api.post("/owner/feedback-types", payload);
          setFeedbackTypes((prev) => [...prev, res.data]);
        } else {
          const res = await api.patch(`/owner/feedback-types/${draftFeedbackType.id}`, payload);
          setFeedbackTypes((prev) => prev.map((r) => (r.id === draftFeedbackType.id ? res.data : r)));
        }
        cancelDraft();
        setStatus({ loading: false, error: "", success: "Feedback type saved." });
      } catch (err) {
        setStatus({ loading: false, error: formatApiError(err, "Could not save feedback type"), success: "" });
      }
    };

    const deleteRow = async (id) => {
      try {
        await api.delete(`/owner/feedback-types/${id}`);
        setFeedbackTypes((prev) => prev.filter((r) => r.id !== id));
        if (selectedFeedbackTypeId === id) cancelDraft();
        setStatus({ loading: false, error: "", success: "Feedback type deleted." });
      } catch (err) {
        setStatus({ loading: false, error: formatApiError(err, "Could not delete feedback type"), success: "" });
      }
    };

    return (
      <>
        <SectionHeader
          title="Feedback Setting"
          description="Control how guest feedback is requested, escalated, and acknowledged from one polished workspace."
          badges={[feedback.enabled ? "Feedback On" : "Feedback Off", `${feedbackTypesList.length} types`, `${activeCount} active`]}
          action={<Link className="secondary-button" to="/admin/feedback">Open Feedback Module</Link>}
        />
        <div className="muted" style={{ marginBottom: 16, fontSize: 12 }}>
          These values feed the live feedback settings endpoint, low-rating alert flow, and owner feedback workspace.
        </div>

        <div className="settings-panel-card" style={{ marginBottom: 20 }}>
          <div className="settings-toggle-grid">
            <ToggleRow checked={feedback.enabled} label="Enable feedback" onChange={(value) => updateAdvancedObject("feedbackSetting", { enabled: value })} />
            <ToggleRow checked={feedback.sendSms} label="Send feedback SMS" onChange={(value) => updateAdvancedObject("feedbackSetting", { sendSms: value })} />
            <ToggleRow checked={feedback.sendWhatsapp} label="Send follow-up WhatsApp" onChange={(value) => updateAdvancedObject("feedbackSetting", { sendWhatsapp: value })} />
          </div>
          <div className="settings-form-grid" style={{ marginTop: 18 }}>
            <label className="settings-input-group"><span className="muted">Feedback delay (hours)</span><input type="number" value={feedback.feedbackDelayHours} onChange={(event) => updateAdvancedObject("feedbackSetting", { feedbackDelayHours: Number(event.target.value) })} /></label>
            <label className="settings-input-group"><span className="muted">Low rating alert email</span><input value={feedback.lowRatingAlertEmail} onChange={(event) => updateAdvancedObject("feedbackSetting", { lowRatingAlertEmail: event.target.value })} /></label>
            <label className="settings-input-group"><span className="muted">Rating prompt</span><textarea rows="3" value={feedback.ratingPrompt} onChange={(event) => updateAdvancedObject("feedbackSetting", { ratingPrompt: event.target.value })} /></label>
            <label className="settings-input-group"><span className="muted">Thank you message</span><textarea rows="3" value={feedback.thankYouMessage} onChange={(event) => updateAdvancedObject("feedbackSetting", { thankYouMessage: event.target.value })} /></label>
          </div>
        </div>

        <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
          <div style={{ width: 280, flexShrink: 0 }}>
            <div className="settings-panel-card" style={{ padding: 0 }}>
              <div style={{ padding: "16px 16px 12px", borderBottom: "1px solid #f1f5f9" }}>
                <button type="button" onClick={startCreate} style={{ width: "100%", padding: "10px", background: "var(--button-bg-solid, #3b82f6)", color: "white", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: "pointer" }}>Create New</button>
              </div>
              <div style={{ maxHeight: 420, overflowY: "auto" }}>
                {feedbackTypesList.map((row) => (
                  <div
                    key={row.id}
                    style={{
                      padding: "14px 16px",
                      borderBottom: "1px solid #f1f5f9",
                      cursor: "pointer",
                      background: selectedFeedbackTypeId === row.id ? "#eff6ff" : "white",
                      borderLeft: selectedFeedbackTypeId === row.id ? "3px solid #3b82f6" : "3px solid transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between"
                    }}
                  >
                    <div style={{ flex: 1 }} onClick={() => { setSelectedFeedbackTypeId(row.id); setDraftFeedbackType(null); }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: "#0f172a" }}>{row.name}</div>
                      <div style={{ fontSize: 11, color: "#64748b", marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: row.active ? "#22c55e" : "#94a3b8" }} />
                        <span>{row.active ? "Active" : "Inactive"}</span>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                      <button type="button" onClick={(event) => { event.stopPropagation(); startEdit(row); }} title="Edit type" style={{ width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 6, cursor: "pointer", color: "#475569", padding: 0 }}><Edit2 size={13} /></button>
                      <button type="button" onClick={(event) => { event.stopPropagation(); deleteRow(row.id); }} style={{ width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 6, cursor: "pointer", color: "#dc2626", padding: 0 }}><Trash2 size={13} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            {editing ? (
              <div className="settings-panel-card">
                <h3 style={{ color: "var(--accent, #3b82f6)" }}>{draftFeedbackType?._isNew ? "Create Feedback Type" : "Edit Feedback Type"}</h3>
                <div className="settings-form-grid" style={{ marginBottom: 16 }}>
                  <label className="settings-input-group">
                    <span className="muted">Feedback Name</span>
                    <input type="text" value={draftFeedbackType?.name ?? editing.name} onChange={(event) => draftFeedbackType && setDraftFeedbackType({ ...draftFeedbackType, name: event.target.value })} placeholder="Enter Feedback Name" />
                  </label>
                </div>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600, color: "#334155", cursor: "pointer", marginBottom: 20 }}>
                  <input type="checkbox" checked={draftFeedbackType?.active ?? editing.active} onChange={(event) => draftFeedbackType && setDraftFeedbackType({ ...draftFeedbackType, active: event.target.checked })} style={{ width: 18, height: 18, accentColor: "var(--accent, #3b82f6)", cursor: "pointer" }} />
                  Active
                </label>
                <div style={{ marginTop: 18, padding: 16, borderRadius: 12, background: "#f8fafc", border: "1px solid #e2e8f0", marginBottom: 20 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>How it works</div>
                  <div style={{ fontSize: 12, color: "#475569", lineHeight: 1.6 }}>
                    Feedback types stay synced with the live feedback request flow. When an invoice completes or a service closes, the selected type can be used to organize the request and follow-up sequence.
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 20, paddingTop: 16, borderTop: "1px solid #f1f5f9" }}>
                  <button type="button" onClick={cancelDraft} style={{ padding: "10px 24px", background: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: 8, fontWeight: 600, cursor: "pointer", color: "#475569", fontSize: 13 }}>Cancel</button>
                  <button type="button" onClick={saveDraft} style={{ padding: "10px 24px", background: "var(--button-bg-solid, #3b82f6)", color: "white", border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer", fontSize: 13 }}>Save</button>
                </div>
              </div>
            ) : (
              <div className="settings-panel-card" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 300, color: "#94a3b8", fontSize: 14 }}>
                Select a feedback type from the left panel or click "Create New"
              </div>
            )}
          </div>
        </div>
      </>
    );
  };

  const renderAccessControlSection = () => {
    const access = form.advancedSettings.accessControl;
    return (
      <>
        <SectionHeader title="Access Control" description="Keep team access governed from one place while still using the full staff and role matrix whenever deeper edits are needed." badges={[`${summary.staffRows.length} users`, `${summary.customRoles.length} custom roles`]} action={<div className="inline-actions"><Link className="secondary-button" to="/admin/users">Staff Users</Link><Link className="secondary-button" to="/admin/roles-permissions">Roles & Permissions</Link></div>} />
        <div className="settings-section-grid">
          <div className="settings-panel-card">
            <h3>Permission Guardrails</h3>
            <div className="settings-toggle-stack">
              <ToggleRow checked={access.approvalRequiredForRoleEdits} label="Approval required for role edits" onChange={(value) => updateAdvancedObject("accessControl", { approvalRequiredForRoleEdits: value })} />
              <ToggleRow checked={access.branchScopedDefault} label="Branch-scoped by default" onChange={(value) => updateAdvancedObject("accessControl", { branchScopedDefault: value })} />
              <ToggleRow checked={access.allowStaffExport} label="Allow staff export" onChange={(value) => updateAdvancedObject("accessControl", { allowStaffExport: value })} />
              <ToggleRow checked={access.allowRosterOverrides} label="Allow roster overrides" onChange={(value) => updateAdvancedObject("accessControl", { allowRosterOverrides: value })} />
            </div>
          </div>
          <div className="settings-panel-card">
            <h3>Live Directory Snapshot</h3>
            <div className="settings-list-stack">
              {summary.staffRows.slice(0, 6).map((row) => (
                <div key={row.id} className="list-item">
                  <div className="item-head">
                    <strong>{row.user?.name || row.phone || "Staff"}</strong>
                    <span className="badge">{row.salonRole || "Role"}</span>
                  </div>
                  <div className="item-meta">{row.branch?.name || "All branches"}{row.customRole?.name ? ` | ${row.customRole.name}` : ""}</div>
                </div>
              ))}
              {!summary.staffRows.length && <EmptyState title="No staff members yet" message="Users added to the salon will appear here for quick access-control review." />}
            </div>
          </div>
        </div>
      </>
    );
  };

  const renderNotificationsSection = () => {
    const config = form.advancedSettings.notificationSettings;

    const handleToggleChange = (key, value) => {
      const currentToggles = config.toggles || {};
      updateAdvancedObject("notificationSettings", {
        toggles: {
          ...currentToggles,
          [key]: value
        }
      });
    };

    const categories = [
      {
        title: "Occasional",
        items: [
          { key: "anniversaryOffer", label: "Anniversary Offer" },
          { key: "birthdayOffer", label: "Birthday Offer" }
        ]
      },
      {
        title: "Loyalty",
        items: [
          { key: "loyaltyExpiryReminder", label: "Loyalty Expiry Reminder" },
          { key: "loyaltyEarning", label: "Loyalty Earning" }
        ]
      },
      {
        title: "Membership",
        items: [
          { key: "membershipPurchase", label: "Membership Purchase" },
          { key: "membershipExpiry", label: "Membership Expiry" },
          { key: "membershipRenewal", label: "Membership Renewal" },
          { key: "onlineRedeemablePurchaseToOwner", label: "Online Redeemable purchase to Owner" }
        ]
      },
      {
        title: "Appointment",
        items: [
          { key: "appointmentCreatedToOwner", label: "Appointment Created message to Owner" },
          { key: "appointmentConfirmedToCustomer", label: "Appointment Confirmed message to Customer" },
          { key: "appointmentCancelledToCustomer", label: "Appointment Cancelled message to Customer" },
          { key: "appointmentReminderBeforeDays", label: "Appointment Reminder before days" },
          { key: "appointmentReminderBeforeHours", label: "Appointment Reminder beforehours" },
          { key: "appointmentInvoiceLink", label: "Appointment Invoice link" },
          { key: "appointmentFeedbackLink", label: "Appointment Feedback link" },
          { key: "smsForServiceReminder", label: "SMS for service reminder" },
          { key: "combineFeedbackAndInvoiceSms", label: "Combine feedback and invoice sms" },
          { key: "messageForAppointments", label: "Message for appointments (Keep this default ON for sending any appointment related message)" },
          { key: "appointmentRescheduledToCustomer", label: "Appointment Resheduled Message to Customer" },
          { key: "appointmentCancelledToOwner", label: "Appointment Cancelled Message to Owner" },
          { key: "onlineAppointmentBookedToOwner", label: "Online Appointment Booked message to Owner" },
          { key: "appointmentMsgToStaff", label: "Appointment Msg to staff" }
        ]
      },
      {
        title: "Order",
        items: [
          { key: "orderPlacedToStaff", label: "Order Placed message to staff" },
          { key: "orderConfirmed", label: "Order Confirmed" },
          { key: "orderRejected", label: "Order Rejected" },
          { key: "orderInvoiceLink", label: "Order Invoice Link" },
          { key: "messageForOrders", label: "Message for orders ( Keep this default ON for sending any order related message)" },
          { key: "orderFeedbackLink", label: "Order Feedback link" }
        ]
      },
      {
        title: "Referral",
        items: [
          { key: "referralCodeSMS", label: "Referral Code SMS" },
          { key: "referrerRewardSMS", label: "Referrer Reward SMS" }
        ]
      },
      {
        title: "Gift Card",
        items: [
          { key: "giftCard", label: "Gift Card" },
          { key: "giftCardExpiryReminder", label: "GiftCard Expiry Reminder" }
        ]
      },
      {
        title: "Package",
        items: [
          { key: "packagePurchase", label: "Package Purchase" },
          { key: "packageExpiryReminder", label: "Package Expiry Reminder" }
        ]
      },
      {
        title: "Advance",
        items: [
          { key: "advanceReceivedInvoice", label: "Advance Received Invoice" }
        ]
      },
      {
        title: "Balance",
        items: [
          { key: "balanceClearedInvoice", label: "Balance Cleared Invoice" }
        ]
      }
    ];

    const channelLabels = {
      anniversaryOffer: "Email + customer web",
      birthdayOffer: "Email + customer web",
      loyaltyExpiryReminder: "Email + customer web",
      loyaltyEarning: "Customer web",
      membershipPurchase: "Email + customer web",
      membershipExpiry: "Email + customer web",
      membershipRenewal: "Email + customer web",
      onlineRedeemablePurchaseToOwner: "Owner web",
      appointmentCreatedToOwner: "Owner web",
      appointmentConfirmedToCustomer: "Email + customer web",
      appointmentCancelledToCustomer: "Email + customer web",
      appointmentReminderBeforeDays: "Email scheduler",
      appointmentReminderBeforeHours: "Email scheduler",
      appointmentInvoiceLink: "Email + customer web",
      appointmentFeedbackLink: "Email feedback",
      smsForServiceReminder: "Email reminder gate",
      combineFeedbackAndInvoiceSms: "Email + customer web",
      messageForAppointments: "Appointment master gate",
      appointmentRescheduledToCustomer: "Email + customer web",
      appointmentCancelledToOwner: "Owner web",
      onlineAppointmentBookedToOwner: "Owner web",
      appointmentMsgToStaff: "Staff web",
      orderPlacedToStaff: "Staff web",
      orderConfirmed: "Customer web",
      orderRejected: "Customer + owner web",
      orderInvoiceLink: "Email + customer web",
      messageForOrders: "Order master gate",
      orderFeedbackLink: "Email + customer web",
      referralCodeSMS: "Email + customer web",
      referrerRewardSMS: "Email + customer web",
      giftCard: "Email + customer web",
      giftCardExpiryReminder: "Email + customer web",
      packagePurchase: "Email + customer web",
      packageExpiryReminder: "Email + customer web",
      advanceReceivedInvoice: "Email",
      balanceClearedInvoice: "Owner web"
    };

    return (
      <>
        <SectionHeader title="Notification Settings" description="Control email delivery and in-web alert rules for automated business notifications. SMS/WhatsApp provider details are saved separately until a live gateway is connected." badges={[`${summary.notifications.filter((row) => !row.isRead).length} unread live alerts`]} action={<Link className="secondary-button" to="/admin/notifications">Open Notifications</Link>} />
        
        <div className="settings-panel-card" style={{ marginBottom: 20 }}>
          <div className="settings-toggle-grid">
            <ToggleRow checked={config.emailEnabled} label="Email alerts" onChange={(value) => updateAdvancedObject("notificationSettings", { emailEnabled: value })} />
            <ToggleRow checked={config.smsEnabled} label="SMS alerts" onChange={(value) => updateAdvancedObject("notificationSettings", { smsEnabled: value })} />
            <ToggleRow checked={config.whatsappEnabled} label="WhatsApp alerts" onChange={(value) => updateAdvancedObject("notificationSettings", { whatsappEnabled: value })} />
            <ToggleRow checked={config.pushEnabled} label="In-web alerts" onChange={(value) => updateAdvancedObject("notificationSettings", { pushEnabled: value })} />
            <label className="settings-input-group"><span className="muted">Digest hour</span><input type="time" value={config.digestHour} onChange={(event) => updateAdvancedObject("notificationSettings", { digestHour: event.target.value })} /></label>
            <div className="settings-input-group" style={{ alignSelf: "end" }}><span className="muted" style={{ fontSize: 12 }}>Email uses SMTP. In-web alerts appear in the bell and notifications page.</span></div>
            <label className="settings-input-group"><span className="muted">Alert email</span><input value={config.alertEmail} onChange={(event) => updateAdvancedObject("notificationSettings", { alertEmail: event.target.value })} /></label>
          </div>
        </div>

        {categories.map((category) => (
          <div key={category.title} style={{ marginBottom: 24 }}>
            <h4 style={{ margin: "0 0 10px 0", fontSize: 15, fontWeight: 700, color: "#1e293b" }}>{category.title}</h4>
            <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 8, overflow: "hidden" }}>
              {category.items.map((item, index) => {
                const isChecked = config.toggles ? (config.toggles[item.key] !== false) : true;
                return (
                  <div key={item.key} style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 190px",
                    alignItems: "center",
                    padding: "12px 16px",
                    borderBottom: index === category.items.length - 1 ? "none" : "1px solid #f1f5f9",
                    fontSize: 14,
                    color: "#0f172a"
                  }}>
                    <div style={{ fontWeight: 500, color: "#334155" }}>{item.label}</div>
                    <label style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer", userSelect: "none" }}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => handleToggleChange(item.key, e.target.checked)}
                        style={{ width: 16, height: 16, cursor: "pointer", accentColor: "var(--accent, #3b82f6)" }}
                      />
                      <span style={{ fontSize: 12, fontWeight: 700, color: channelLabels[item.key] === "Not wired yet" ? "#b45309" : "#475569" }}>
                        {channelLabels[item.key] || "Saved rule"}
                      </span>
                    </label>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </>
    );
  };

  const renderGiftCardSection = () => {
    const section = form.advancedSettings.giftCardSettings || {};
    const previewRows = (summary.giftCards || []).slice(0, 6);
    const gcTemplateDefaults = [
      { name: "Birthday Voucher", description: "Special birthday gift card for loyal customers", active: true, amount: 1000, validityDays: 90, renewalReminderDays: 7 },
      { name: "Festive Special", description: "Limited edition festive season gift card", active: true, amount: 2500, validityDays: 180, renewalReminderDays: 14 },
      { name: "Premium Package", description: "High-value gift card for premium services", active: true, amount: 5000, validityDays: 365, renewalReminderDays: 30 }
    ];
    const cardTemplates = (section.templates || gcTemplateDefaults);

    return (
      <>
        <SectionHeader
          title="Gift Card"
          description="Configure gift card templates, validity, and renewal alerts."
          badges={[`${cardTemplates.length} templates`]}
        />
        
        <div className="settings-panel-card" style={{ marginTop: 16, padding: "24px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 32 }}>
            
            {/* Left Column: list of templates */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16, borderRight: "1px solid #e2e8f0", paddingRight: 24 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {cardTemplates.map((template, idx) => {
                  const isSelected = editingCard?._idx === idx;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setCardForm({
                          name: template.name,
                          description: template.description || "",
                          active: template.active !== false,
                          amount: template.amount,
                          validityDays: template.validityDays,
                          renewalReminderDays: template.renewalReminderDays
                        });
                        setEditingCard({ ...template, _idx: idx });
                      }}
                      style={{
                        width: "100%",
                        padding: "16px",
                        borderRadius: 6,
                        background: isSelected ? "var(--button-bg-solid, #3b82f6)" : "#f8fafc",
                        border: isSelected ? "none" : "1px solid #cbd5e1",
                        textAlign: "left",
                        fontSize: 14,
                        color: isSelected ? "#fff" : "#1e293b",
                        cursor: "pointer",
                        fontWeight: 600,
                        boxShadow: isSelected ? "0 4px 6px -1px rgba(59, 130, 246, 0.2), 0 2px 4px -1px rgba(59, 130, 246, 0.1)" : "none",
                        transition: "all 0.15s ease"
                      }}
                    >
                      {template.name}
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingCard(null);
                  setCardForm({ name: "", description: "", active: true, amount: "", validityDays: 30, renewalReminderDays: 7 });
                }}
                style={{
                  width: "100%",
                  padding: "12px 20px",
                  background: "var(--button-bg-solid, #3b82f6)",
                  color: "#fff",
                  border: "none",
                  borderRadius: 6,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontSize: 14,
                  marginTop: 12,
                  transition: "all 0.15s ease",
                  textAlign: "center"
                }}
              >
                Create New Gift Card
              </button>
            </div>

            {/* Right Column: Update / Create Form */}
            <div style={{ paddingLeft: 8 }}>
              <h2 style={{ margin: 0, marginBottom: 24, fontSize: 22, fontWeight: 700, color: "#3b82f6" }}>
                {editingCard ? "Update Gift Card" : "Create Gift Card"}
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                
                {/* Row 1: Name, Description, Active */}
                <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1.5fr auto", gap: 20, alignItems: "center" }}>
                  <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>Name</span>
                    <input
                      value={cardForm.name}
                      onChange={(e) => setCardForm({ ...cardForm, name: e.target.value })}
                      placeholder="Enter Gift Card Name"
                      style={{ border: "1px solid #cbd5e1", borderRadius: 6, padding: "10px 14px", fontSize: 14, outline: "none" }}
                    />
                  </label>
                  <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>Description</span>
                    <input
                      value={cardForm.description}
                      onChange={(e) => setCardForm({ ...cardForm, description: e.target.value })}
                      placeholder="Enter Gift Card Description"
                      style={{ border: "1px solid #cbd5e1", borderRadius: 6, padding: "10px 14px", fontSize: 14, outline: "none" }}
                    />
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginTop: 24 }}>
                    <input
                      type="checkbox"
                      checked={cardForm.active}
                      onChange={(e) => setCardForm({ ...cardForm, active: e.target.checked })}
                      style={{ width: 18, height: 18, accentColor: "#3b82f6" }}
                    />
                    <span style={{ fontSize: 14, fontWeight: 600, color: "#475569" }}>Active</span>
                  </label>
                </div>

                {/* Row 2: Amount, Validity (In days), Renewal Reminder */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20 }}>
                  <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>Amount</span>
                    <input
                      type="number"
                      value={cardForm.amount}
                      onChange={(e) => setCardForm({ ...cardForm, amount: e.target.value })}
                      placeholder="Enter Amount"
                      style={{ border: "1px solid #cbd5e1", borderRadius: 6, padding: "10px 14px", fontSize: 14, outline: "none" }}
                    />
                  </label>
                  <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>Validity (In days)</span>
                    <input
                      type="number"
                      value={cardForm.validityDays}
                      onChange={(e) => setCardForm({ ...cardForm, validityDays: e.target.value })}
                      placeholder="Enter Days"
                      style={{ border: "1px solid #cbd5e1", borderRadius: 6, padding: "10px 14px", fontSize: 14, outline: "none" }}
                    />
                  </label>
                  <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>Renewal Reminder</span>
                    <input
                      type="number"
                      value={cardForm.renewalReminderDays}
                      onChange={(e) => setCardForm({ ...cardForm, renewalReminderDays: e.target.value })}
                      placeholder="In Days"
                      style={{ border: "1px solid #cbd5e1", borderRadius: 6, padding: "10px 14px", fontSize: 14, outline: "none" }}
                    />
                  </label>
                </div>

                {/* Form Buttons */}
                <div style={{ display: "flex", gap: 12, marginTop: 24, justifyContent: "flex-end" }}>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingCard(null);
                      setCardForm({ name: "", description: "", active: true, amount: "", validityDays: 30, renewalReminderDays: 7 });
                    }}
                    style={{
                      padding: "10px 24px",
                      background: "#fff",
                      border: "1px solid #cbd5e1",
                      color: "#475569",
                      borderRadius: 6,
                      fontWeight: 600,
                      cursor: "pointer",
                      fontSize: 14
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (editingCard?._idx !== undefined) {
                        const next = cardTemplates.map((t, i) =>
                          i === editingCard._idx
                            ? {
                                name: cardForm.name,
                                description: cardForm.description,
                                active: cardForm.active,
                                amount: Number(cardForm.amount) || 0,
                                validityDays: Number(cardForm.validityDays) || 0,
                                renewalReminderDays: Number(cardForm.renewalReminderDays) || 0
                              }
                            : t
                        );
                        updateAdvancedObject("giftCardSettings", { templates: next });
                      } else {
                        const newTemplate = {
                          name: cardForm.name,
                          description: cardForm.description,
                          active: cardForm.active,
                          amount: Number(cardForm.amount) || 0,
                          validityDays: Number(cardForm.validityDays) || 0,
                          renewalReminderDays: Number(cardForm.renewalReminderDays) || 0
                        };
                        updateAdvancedObject("giftCardSettings", { templates: [...cardTemplates, newTemplate] });
                      }
                      setEditingCard(null);
                      setCardForm({ name: "", description: "", active: true, amount: "", validityDays: 30, renewalReminderDays: 7 });
                      await saveWorkspace();
                    }}
                    style={{
                      padding: "10px 28px",
                      background: "var(--button-bg-solid, #3b82f6)",
                      color: "#fff",
                      border: "none",
                      borderRadius: 6,
                      fontWeight: 700,
                      cursor: "pointer",
                      fontSize: 14
                    }}
                  >
                    Save
                  </button>
                </div>

              </div>
            </div>

          </div>
        </div>

        <div className="settings-panel-card" style={{ marginTop: 16 }}>
          <div className="item-head" style={{ marginBottom: 12 }}>
            <div>
              <h3 style={{ margin: 0 }}>Live Gift Cards</h3>
              <p className="muted" style={{ margin: "4px 0 0 0" }}>Recent issued gift cards preview from the live module.</p>
            </div>
            <Link className="secondary-button" to="/admin/gift-cards">Create / Manage</Link>
          </div>
          <div className="settings-list-stack">
            {previewRows.map((row) => (
              <div key={row.id} className="settings-panel-card">
                <div className="badge-row" style={{ marginBottom: 8 }}>
                  <span className="badge">{row.code || "No code"}</span>
                  <span className="badge">{row.isActive === false ? "Inactive" : "Active"}</span>
                </div>
                <div style={{ fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>{row.title || "Gift Card"}</div>
                <div className="muted" style={{ fontSize: 13 }}>
                  Original: {row.originalAmount ?? 0} | Balance: {row.balanceAmount ?? 0}
                </div>
                <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                  Expires: {row.expiresAt ? new Date(row.expiresAt).toLocaleDateString() : "No expiry"} | Holder: {row.issuedToCustomer?.name || "Unassigned"}
                </div>
              </div>
            ))}
            {!previewRows.length ? (
              <EmptyState
                title="No gift cards issued yet"
                message="Gift cards will appear here after creation. Use the Open Module to issue a new gift card."
              />
            ) : null}
          </div>
        </div>
      </>
    );
  };

  const renderSmsSection = () => (
    <>
      <SectionHeader title="Messaging Center" description="Review delivery-provider defaults. Email is sent through backend SMTP; SMS and WhatsApp values stay ready for live gateway integration." badges={[form.smsSettings.gatewayProvider.replace("_PLACEHOLDER", ""), form.smsSettings.senderId || "No Sender ID"]} action={<Link className="secondary-button" to="/admin/whatsapp">Open Messaging</Link>} />
      <div className="muted" style={{ marginBottom: 12, fontSize: 12 }}>
        SMTP credentials are configured on the backend environment. SMS/WhatsApp provider details are saved here so the UI stays ready when the real gateway API is connected.
      </div>
      <div className="settings-panel-card">
        <div className="settings-form-grid">
          <label className="settings-input-group">
            <span className="muted">Gateway provider</span>
            <select value={form.smsSettings.gatewayProvider} onChange={(event) => setForm((current) => ({ ...current, smsSettings: { ...current.smsSettings, gatewayProvider: event.target.value } }))}>
              <option value="TWILIO_PLACEHOLDER">Twilio</option>
              <option value="MSG91_PLACEHOLDER">Msg91</option>
              <option value="GUPSHUP_PLACEHOLDER">Gupshup</option>
            </select>
          </label>
          <label className="settings-input-group">
            <span className="muted">Sender ID</span>
            <input value={form.smsSettings.senderId} onChange={(event) => setForm((current) => ({ ...current, smsSettings: { ...current.smsSettings, senderId: event.target.value } }))} />
          </label>
          <label className="settings-input-group">
            <span className="muted">API key / auth token</span>
            <textarea rows="3" value={form.smsSettings.apiKey} onChange={(event) => setForm((current) => ({ ...current, smsSettings: { ...current.smsSettings, apiKey: event.target.value } }))} />
          </label>
          <div className="settings-input-group" style={{ alignSelf: "end" }}>
            <span className="muted" style={{ fontSize: 12 }}>
              Provider, sender ID, and auth token are stored with salon settings. They do not send real SMS until a gateway connector is added.
            </span>
          </div>
        </div>
      </div>
    </>
  );

  const renderSegmentSection = () => {
    const segments = form.advancedSettings.crmSegments;
    const updateSegment = (id, patch) => updateArrayCollection("crmSegments", segments.map((item) => item.id === id ? { ...item, ...patch } : item));
    return (
      <>
        <SectionHeader title="CRM Referral" description="Create reusable customer referrals for campaigns, loyalty outreach, and targeted service pushes." badges={[`${segments.length} saved referrals`, `${summary.customers.length} live customers`]} action={<Link className="secondary-button" to="/admin/campaigns">Open Campaigns</Link>} />
        <div className="settings-list-stack">
          {segments.map((segment) => (
            <div key={segment.id} className="settings-panel-card">
              <div className="badge-row" style={{ marginBottom: 12 }}>
                <span className="badge">{segment.active === false ? "Inactive" : "Active"}</span>
                <span className="badge">{segmentPreviewCounts[segment.id] ?? 0} guests matched</span>
              </div>
              <div className="settings-form-grid">
                <label className="settings-input-group"><span className="muted">Name</span><input value={segment.name} onChange={(event) => updateSegment(segment.id, { name: event.target.value })} /></label>
                <label className="settings-input-group"><span className="muted">Description</span><input value={segment.description} onChange={(event) => updateSegment(segment.id, { description: event.target.value })} /></label>
                <label className="settings-input-group">
                  <span className="muted">Audience rule</span>
                  <select value={segment.filterType || "ALL_CUSTOMERS"} onChange={(event) => updateSegment(segment.id, { filterType: event.target.value, serviceId: event.target.value === "SERVICE_BASED_CUSTOMERS" ? segment.serviceId || "" : "" })}>
                    <option value="ALL_CUSTOMERS">All customers</option>
                    <option value="BIRTHDAY_CUSTOMERS">Birthday customers</option>
                    <option value="ANNIVERSARY_CUSTOMERS">Anniversary customers</option>
                    <option value="LOST_CUSTOMERS">Lost customers</option>
                    <option value="HIGH_SPENDERS">High spenders</option>
                    <option value="MEMBERSHIP_CUSTOMERS">Membership customers</option>
                    <option value="PACKAGE_CUSTOMERS">Package customers</option>
                    <option value="SERVICE_BASED_CUSTOMERS">Service-based customers</option>
                  </select>
                </label>
                {(segment.filterType || "ALL_CUSTOMERS") === "SERVICE_BASED_CUSTOMERS" ? (
                  <label className="settings-input-group">
                    <span className="muted">Service</span>
                    <select value={segment.serviceId || ""} onChange={(event) => updateSegment(segment.id, { serviceId: event.target.value })}>
                      <option value="">Select service</option>
                      {summary.services.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}
                    </select>
                  </label>
                ) : null}
                <ToggleRow checked={segment.active} label="Active" onChange={(value) => updateSegment(segment.id, { active: value })} />
              </div>
            </div>
          ))}
        </div>
        <button type="button" onClick={() => updateArrayCollection("crmSegments", [...segments, { id: makeId("segment"), name: "", description: "", filterType: "ALL_CUSTOMERS", serviceId: "", active: true }])}>Create Referral</button>
      </>
    );
  };

  const renderReferralSection = () => {
    const affiliateSettings = form.advancedSettings.referralSettings || {};
    const referral = referralRule || defaultReferralRuleDraft;
    const update = (patch) => setReferralDraft((current) => ({ ...current, ...patch }));

    const saveReferral = async () => {
      try {
        setSavingReferral(true);
        const res = await api.post("/owner/referrals/rule", referralDraft);
        setReferralRule(res.data);
        await saveWorkspace();
        setStatus({ loading: false, error: "", success: "Referral settings saved." });
      } catch (err) {
        setStatus({ loading: false, error: formatApiError(err, "Could not save referral settings"), success: "" });
      } finally {
        setSavingReferral(false);
      }
    };

    return (
      <>
        <SectionHeader
          title="Referral"
          description="Control whether referrals are active and define separate benefits for the referrer and the referred guest."
          badges={[referral.enabled ? "Enabled" : "Disabled", `Max Refer Limit ${referral.maxReferLimit}`]}
          action={<button type="button" onClick={saveReferral} disabled={savingReferral} className="primary-button" style={{ padding: "8px 18px", background: "var(--button-bg-solid, #3b82f6)", color: "white", border: "none", borderRadius: 8, fontWeight: 600, cursor: savingReferral ? "not-allowed" : "pointer", opacity: savingReferral ? 0.6 : 1 }}>{savingReferral ? "Saving..." : "Save"}</button>}
        />

        <div className="settings-panel-card" style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>Referral</span>
              <label style={{ position: "relative", display: "inline-block", width: 44, height: 24, cursor: "pointer" }}>
                <input type="checkbox" checked={Boolean(referralDraft.enabled)} onChange={(e) => update({ enabled: e.target.checked })} style={{ opacity: 0, width: 0, height: 0 }} />
                <span style={{
                  position: "absolute", inset: 0, borderRadius: 12, transition: "0.3s",
                  background: referralDraft.enabled ? "#2563eb" : "#cbd5e1"
                }} />
                <span style={{
                  position: "absolute", top: 2, left: referralDraft.enabled ? 22 : 2, width: 20, height: 20,
                  borderRadius: "50%", background: "white", transition: "0.3s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)"
                }} />
              </label>
              <span style={{ fontSize: 13, color: referralDraft.enabled ? "#2563eb" : "#64748b", fontWeight: 500 }}>
                {referralDraft.enabled ? "Enabled" : "Disabled"}
              </span>
            </div>
            <div style={{ marginLeft: "auto" }}>
              <label className="settings-input-group" style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <span className="muted" style={{ whiteSpace: "nowrap" }}>Max Refer Limit</span>
                <input type="number" value={referralDraft.maxReferLimit} onChange={(e) => update({ maxReferLimit: Number(e.target.value) })}
                  style={{ width: 100, padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: 13 }} />
              </label>
            </div>
          </div>
        </div>

        <div className="settings-panel-card" style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: "#7c3aed", marginBottom: 12 }}>Affiliate Credit Ratios</div>
          <p style={{ marginTop: 0, color: "#64748b", fontSize: 13 }}>
            Controls the wallet redemption values shown in the affiliate workflow.
          </p>
          <div className="settings-form-grid">
            <label className="settings-input-group">
              <span className="muted">Service redemption value per credit</span>
              <input
                type="text"
                inputMode="decimal"
                min="0.01"
                step="0.01"
                value={affiliateServiceCreditInput}
                onChange={(event) => {
                  const next = event.target.value;
                  setAffiliateServiceCreditInput(next);
                  const parsed = Number(next);
                  if (Number.isFinite(parsed) && parsed > 0) {
                    updateAdvancedObject("referralSettings", { affiliateServiceCreditValue: parsed });
                  }
                }}
              />
              <small className="muted">Default from workflow: 1 credit = {formatMoney(1)} service discount.</small>
            </label>
            <label className="settings-input-group">
              <span className="muted">Cash payout value per credit</span>
              <input
                type="text"
                inputMode="decimal"
                min="0.01"
                step="0.01"
                value={affiliateCashCreditInput}
                onChange={(event) => {
                  const next = event.target.value;
                  setAffiliateCashCreditInput(next);
                  const parsed = Number(next);
                  if (Number.isFinite(parsed) && parsed > 0) {
                    updateAdvancedObject("referralSettings", { affiliateCashCreditValue: parsed });
                  }
                }}
              />
              <small className="muted">Default from workflow: 1 credit = {formatMoney(0.5)} cash payout.</small>
            </label>
          </div>
        </div>

        <div className="settings-form-grid">
          {/* Benefit for Referral (Referrer) */}
          <div className="settings-panel-card">
            <div style={{ fontSize: 15, fontWeight: 600, color: "#2563eb", marginBottom: 20 }}>Benefit for Referral</div>
            <div style={{ display: "grid", gap: 16 }}>
              <label className="settings-input-group">
                <span className="muted">Max Benefit Amount</span>
                <input type="number" value={referralDraft.referrerMaxBenefitAmount} onChange={(e) => update({ referrerMaxBenefitAmount: Number(e.target.value) })} />
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 10, alignItems: "end" }}>
                <label className="settings-input-group">
                  <span className="muted">Fixed Amount</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 13, color: "#64748b" }}>{formatMoney(1).replace(/[\d.,]/g, '').trim()}</span>
                    <input type="number" value={referralDraft.referrerFixedAmount} onChange={(e) => update({ referrerFixedAmount: Number(e.target.value) })} style={{ flex: 1 }} />
                  </div>
                </label>
                <span style={{ fontSize: 13, color: "#94a3b8", paddingBottom: 4 }}>OR</span>
                <label className="settings-input-group">
                  <span className="muted">Percentage</span>
                  <input type="number" value={referralDraft.referrerPercentage} onChange={(e) => update({ referrerPercentage: Number(e.target.value) })} />
                </label>
              </div>
            </div>
          </div>

          {/* Benefit for Referred Guest */}
          <div className="settings-panel-card">
            <div style={{ fontSize: 15, fontWeight: 600, color: "#2563eb", marginBottom: 20 }}>Benefit for Referred Guest</div>
            <div style={{ display: "grid", gap: 16 }}>
              <label className="settings-input-group">
                <span className="muted">Max Benefit Amount</span>
                <input type="number" value={referralDraft.referredMaxBenefitAmount} onChange={(e) => update({ referredMaxBenefitAmount: Number(e.target.value) })} />
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 10, alignItems: "end" }}>
                <label className="settings-input-group">
                  <span className="muted">Fixed Amount</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 13, color: "#64748b" }}>{formatMoney(1).replace(/[\d.,]/g, '').trim()}</span>
                    <input type="number" value={referralDraft.referredFixedAmount} onChange={(e) => update({ referredFixedAmount: Number(e.target.value) })} style={{ flex: 1 }} />
                  </div>
                </label>
                <span style={{ fontSize: 13, color: "#94a3b8", paddingBottom: 4 }}>OR</span>
                <label className="settings-input-group">
                  <span className="muted">Percentage</span>
                  <input type="number" value={referralDraft.referredPercentage} onChange={(e) => update({ referredPercentage: Number(e.target.value) })} />
                </label>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  };

  const renderDesignationSection = () => {
    const rows = designations;

    const addNew = () => {
      setDesignationDraft({ name: "", description: "", active: true, _isNew: true });
    };

    const startEdit = (row) => {
      setDesignationDraft({ ...row, _isNew: false });
    };

    const cancel = () => setDesignationDraft(null);

    const save = async () => {
      if (!designationDraft || !designationDraft.name?.trim()) return;
      try {
        const payload = {
          name: designationDraft.name.trim(),
          description: designationDraft.description || null,
          active: designationDraft.active !== false,
          branchId: selectedBranchId || null
        };
        if (designationDraft._isNew) {
          const res = await api.post("/owner/designations", payload);
          setDesignations((prev) => [...prev, res.data]);
        } else {
          const res = await api.patch(`/owner/designations/${designationDraft.id}`, payload);
          setDesignations((prev) => prev.map((r) => (r.id === designationDraft.id ? res.data : r)));
        }
        cancel();
        setStatus({ loading: false, error: "", success: "Designation saved." });
      } catch (err) {
        setStatus({ loading: false, error: formatApiError(err, "Could not save designation"), success: "" });
      }
    };

    const remove = async (id) => {
      try {
        await api.delete(`/owner/designations/${id}`);
        setDesignations((prev) => prev.filter((r) => r.id !== id));
        if (designationDraft?.id === id) cancel();
        setStatus({ loading: false, error: "", success: "Designation deleted." });
      } catch (err) {
        setStatus({ loading: false, error: formatApiError(err, "Could not delete designation"), success: "" });
      }
    };

    return (
      <>
        <SectionHeader
          title="Designation"
          description="Maintain staff titles that can be assigned across teams and branches."
          badges={[`${rows.length} entries`]}
          action={<Link className="secondary-button" to="/admin/users">Open Staff Users</Link>}
        />
        <div className="muted" style={{ marginBottom: 12, fontSize: 12 }}>
          Saved designations appear in the staff create/edit form and are stored against each staff profile.
        </div>
        <div className="settings-list-stack">
          {rows.map((row) => (
            <div key={row.id} className="settings-panel-card" style={{ position: "relative" }}>
              <button
                type="button"
                onClick={() => remove(row.id)}
                title="Delete designation"
                style={{ position: "absolute", top: 10, right: 10, background: "#fee2e2", color: "#991b1b", border: "none", borderRadius: 6, padding: "4px 10px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
              >
                Delete
              </button>
              <button
                type="button"
                onClick={() => startEdit(row)}
                style={{ position: "absolute", top: 10, right: 70, background: "#dbeafe", color: "#1e40af", border: "none", borderRadius: 6, padding: "4px 10px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
              >
                Edit
              </button>
              <div className="settings-form-grid">
                <label className="settings-input-group">
                  <span className="muted">Name</span>
                  <input value={row.name} readOnly />
                </label>
                <label className="settings-input-group">
                  <span className="muted">Description</span>
                  <input value={row.description || ""} readOnly />
                </label>
                <div className="settings-input-group">
                  <span className="muted">Active</span>
                  <span style={{ fontWeight: 600, color: row.active ? "#16a34a" : "#94a3b8" }}>{row.active ? "Active" : "Inactive"}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addNew}
          style={{ marginTop: 12, padding: "10px 20px", background: "var(--button-bg-solid, #3b82f6)", color: "white", border: "none", borderRadius: 8, fontWeight: 600, cursor: "pointer" }}
        >
          Add New
        </button>
        {designationDraft && (
          <div className="settings-panel-card" style={{ marginTop: 16 }}>
            <h3 style={{ marginTop: 0 }}>{designationDraft._isNew ? "New Designation" : `Edit: ${designationDraft.name}`}</h3>
            <div className="settings-form-grid">
              <label className="settings-input-group">
                <span className="muted">Name</span>
                <input value={designationDraft.name} onChange={(e) => setDesignationDraft({ ...designationDraft, name: e.target.value })} placeholder="e.g. Senior Stylist" />
              </label>
              <label className="settings-input-group">
                <span className="muted">Description</span>
                <input value={designationDraft.description || ""} onChange={(e) => setDesignationDraft({ ...designationDraft, description: e.target.value })} placeholder="Optional description" />
              </label>
              <div className="settings-input-group">
                <span className="muted">Active</span>
                <label className="mini-toggle-label" style={{ display: "inline-flex", alignItems: "center" }}>
                  <input type="checkbox" className="premium-toggle-input" checked={designationDraft.active !== false} onChange={(e) => setDesignationDraft({ ...designationDraft, active: e.target.checked })} />
                  <div className="mini-toggle-switch"></div>
                </label>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
              <button type="button" onClick={cancel} style={{ padding: "10px 20px", background: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: 8, fontWeight: 600, cursor: "pointer", color: "#475569" }}>Cancel</button>
              <button type="button" onClick={save} style={{ padding: "10px 20px", background: "var(--button-bg-solid, #3b82f6)", color: "white", border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer" }}>Save</button>
            </div>
          </div>
        )}
      </>
    );
  };

  const renderSimpleListSection = (title, key, description, fieldDefs, options = {}) => {
    const rows = form.advancedSettings[key];
    const updateRow = (id, patch) => updateArrayCollection(key, rows.map((row) => row.id === id ? { ...row, ...patch } : row));
    const deleteRow = (id) => updateArrayCollection(key, rows.filter((row) => row.id !== id));
    return (
      <>
        <SectionHeader title={title} description={description} badges={options.badges || [`${rows.length} entries`]} action={options.action || null} />
        {options.helper ? (
          <div className="muted" style={{ marginBottom: 12, fontSize: 12 }}>
            {options.helper}
          </div>
        ) : null}
        <div className="settings-list-stack">
          {rows.map((row) => (
            <div key={row.id} className="settings-panel-card" style={{ position: "relative" }}>
              <button
                type="button"
                onClick={() => deleteRow(row.id)}
                title="Delete entry"
                style={{ position: "absolute", top: 10, right: 10, background: "#fee2e2", color: "#991b1b", border: "none", borderRadius: 6, padding: "4px 10px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
              >
                Delete
              </button>
              <div className="settings-form-grid">
                {fieldDefs.map((field) => (
                  field.type === "checkbox" ? (
                    <div key={field.key} className="settings-input-group">
                      <span className="muted">{field.label}</span>
                      <label className="mini-toggle-label" style={{ display: "inline-flex", alignItems: "center" }}>
                        <input type="checkbox" className="premium-toggle-input" checked={Boolean(row[field.key])} onChange={(event) => updateRow(row.id, { [field.key]: event.target.checked })} />
                        <div className="mini-toggle-switch"></div>
                      </label>
                    </div>
                  ) : (
                    <label key={field.key} className="settings-input-group">
                      <span className="muted">{field.label}</span>
                      <input
                        type={field.type || "text"}
                        value={row[field.key]}
                        onChange={(event) => updateRow(row.id, { [field.key]: field.type === "number" ? Number(event.target.value) : event.target.value })}
                      />
                    </label>
                  )
                ))}
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => updateArrayCollection(key, [...rows, { id: makeId(key), ...Object.fromEntries(fieldDefs.map((field) => [field.key, field.type === "checkbox" ? true : field.type === "number" ? 0 : ""])) }])}
        >
          Add New
        </button>
      </>
    );
  };

  const renderLegalSection = (title, key) => (
    <>
      <SectionHeader
        title={title}
        description={`Keep ${title.toLowerCase()} editable directly from the owner settings workspace.`}
        badges={[form.advancedSettings.legalContent[key] ? "Configured" : "Draft", salonSlug ? "Storefront linked" : "Portal linked"]}
        action={salonSlug ? <Link className="secondary-button" to={`/site/${salonSlug}/${key === "privacyPolicy" ? "privacy" : "terms"}`}>Preview Page</Link> : null}
      />
      <div className="muted" style={{ marginBottom: 12, fontSize: 12 }}>
        Saved legal copy is returned by the public salon API and rendered on the linked storefront legal page.
      </div>
      <div className="settings-panel-card">
        <textarea rows="14" value={form.advancedSettings.legalContent[key]} onChange={(event) => updateAdvancedObject("legalContent", { [key]: event.target.value })} placeholder={`Write ${title.toLowerCase()} here`} />
      </div>
    </>
  );

  const renderPnlCategoriesSection = () => {
    const rows = [...pnlCategories].sort((a, b) => {
      const leftSeq = Number(a.sequenceNumber || 0);
      const rightSeq = Number(b.sequenceNumber || 0);
      if (leftSeq !== rightSeq) return leftSeq - rightSeq;
      return String(a.name || "").localeCompare(String(b.name || ""));
    });
    const selectedRow = rows.find((row) => row.id === selectedPnlCategoryId) || null;
    const editing = draftPnlCategory || selectedRow;

    const startCreate = () => {
      setDraftPnlCategory({ id: null, name: "", type: "EXPENSE", sequenceNumber: rows.length ? Math.max(...rows.map((row) => Number(row.sequenceNumber || 0))) + 1 : 1, active: true, _isNew: true });
      setSelectedPnlCategoryId(null);
    };

    const startEdit = (row) => {
      setDraftPnlCategory({ ...row, _isNew: false });
      setSelectedPnlCategoryId(row.id);
    };

    const cancelDraft = () => {
      setDraftPnlCategory(null);
      setSelectedPnlCategoryId(null);
    };

    const saveDraft = async () => {
      if (!draftPnlCategory) return;
      if (!draftPnlCategory.name?.trim()) return;
      try {
        const payload = {
          name: draftPnlCategory.name.trim(),
          type: draftPnlCategory.type === "INCOME" ? "INCOME" : "EXPENSE",
          sequenceNumber: Number(draftPnlCategory.sequenceNumber || 0),
          active: draftPnlCategory.active !== false
        };
        if (draftPnlCategory._isNew) {
          const res = await api.post("/owner/pnl-categories", payload);
          setPnlCategories((prev) => [...prev, res.data]);
        } else {
          const res = await api.patch(`/owner/pnl-categories/${draftPnlCategory.id}`, payload);
          setPnlCategories((prev) => prev.map((r) => (r.id === draftPnlCategory.id ? res.data : r)));
        }
        cancelDraft();
        setStatus({ loading: false, error: "", success: "PNL category saved." });
      } catch (err) {
        setStatus({ loading: false, error: formatApiError(err, "Could not save PNL category"), success: "" });
      }
    };

    const deleteRow = async (id) => {
      try {
        await api.delete(`/owner/pnl-categories/${id}`);
        setPnlCategories((prev) => prev.filter((r) => r.id !== id));
        if (selectedPnlCategoryId === id) cancelDraft();
        setStatus({ loading: false, error: "", success: "PNL category deleted." });
      } catch (err) {
        setStatus({ loading: false, error: formatApiError(err, "Could not delete PNL category"), success: "" });
      }
    };

    return (
      <>
        <SectionHeader
          title="PNL Categories"
          description="Build ordered profit-and-loss buckets that can be reused by finance, expense, and reporting workflows."
          badges={[`${rows.length} entries`, `${summary.expenseAccountInjections.length} account injections`]}
          action={<div className="inline-actions"><Link className="secondary-button" to="/admin/expenses/categories">Expense Types</Link><Link className="secondary-button" to="/admin/expenses/accounts">Ledger Accounts</Link></div>}
        />
        <div className="muted" style={{ marginBottom: 12, fontSize: 12 }}>
          These categories behave like a finance taxonomy: income buckets, expense buckets, and ordered report rows. The active list is stored in salon settings and reused by report and expense modules.
        </div>

        <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
          <div style={{ width: 300, flexShrink: 0 }}>
            <div className="settings-panel-card" style={{ padding: 0 }}>
              <div style={{ padding: "16px 16px 12px", borderBottom: "1px solid #f1f5f9" }}>
                <button type="button" onClick={startCreate} style={{ width: "100%", padding: "10px", background: "var(--button-bg-solid, #3b82f6)", color: "white", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: "pointer" }}>Create New</button>
              </div>
              <div style={{ maxHeight: 420, overflowY: "auto" }}>
                {rows.map((row) => (
                  <div
                    key={row.id}
                    style={{
                      padding: "14px 16px",
                      borderBottom: "1px solid #f1f5f9",
                      cursor: "pointer",
                      background: selectedPnlCategoryId === row.id ? "#eff6ff" : "white",
                      borderLeft: selectedPnlCategoryId === row.id ? "3px solid #3b82f6" : "3px solid transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between"
                    }}
                  >
                    <div style={{ flex: 1 }} onClick={() => { setSelectedPnlCategoryId(row.id); setDraftPnlCategory(null); }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: "#0f172a" }}>{row.name || "Untitled Category"}</div>
                      <div style={{ fontSize: 11, color: "#64748b", marginTop: 4, display: "flex", alignItems: "center", gap: 6 }}>
                        <span>#{row.sequenceNumber || 0}</span>
                        <span>·</span>
                        <span>{row.type || "Expense"}</span>
                        <span>·</span>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                          <span style={{ width: 6, height: 6, borderRadius: "50%", background: row.active ? "#22c55e" : "#94a3b8" }} />
                          {row.active ? "Active" : "Inactive"}
                        </span>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                      <button type="button" onClick={(event) => { event.stopPropagation(); startEdit(row); }} title="Edit category" style={{ width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 6, cursor: "pointer", color: "#475569", padding: 0 }}><Edit2 size={13} /></button>
                      <button type="button" onClick={(event) => { event.stopPropagation(); deleteRow(row.id); }} title="Delete category" style={{ width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 6, cursor: "pointer", color: "#dc2626", padding: 0 }}><Trash2 size={13} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            {editing ? (
              <div className="settings-panel-card">
                <h3 style={{ color: "var(--accent, #3b82f6)" }}>{draftPnlCategory?._isNew ? "Create PNL Category" : `Edit: ${editing.name || "Category"}`}</h3>
                <div className="settings-form-grid" style={{ marginBottom: 16 }}>
                  <label className="settings-input-group">
                    <span className="muted">Category Name</span>
                    <input
                      type="text"
                      value={draftPnlCategory?.name ?? editing.name}
                      onChange={(event) => draftPnlCategory && setDraftPnlCategory({ ...draftPnlCategory, name: event.target.value })}
                      placeholder="Enter Name"
                    />
                  </label>
                  <label className="settings-input-group">
                    <span className="muted">Category Sequence Number</span>
                    <input
                      type="number"
                      min="0"
                      value={draftPnlCategory?.sequenceNumber ?? editing.sequenceNumber ?? 0}
                      onChange={(event) => draftPnlCategory && setDraftPnlCategory({ ...draftPnlCategory, sequenceNumber: Number(event.target.value || 0) })}
                      placeholder="Enter Sequence Number"
                    />
                  </label>
                  <label className="settings-input-group">
                    <span className="muted">Category Type</span>
                    <select
                      value={draftPnlCategory?.type ?? editing.type ?? "Expense"}
                      onChange={(event) => draftPnlCategory && setDraftPnlCategory({ ...draftPnlCategory, type: event.target.value })}
                    >
                      <option value="INCOME">Income</option>
                      <option value="EXPENSE">Expense</option>
                    </select>
                  </label>
                </div>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600, color: "#334155", cursor: "pointer", marginBottom: 20 }}>
                  <input
                    type="checkbox"
                    checked={draftPnlCategory?.active ?? editing.active}
                    onChange={(event) => draftPnlCategory && setDraftPnlCategory({ ...draftPnlCategory, active: event.target.checked })}
                    style={{ width: 18, height: 18, accentColor: "var(--accent, #3b82f6)", cursor: "pointer" }}
                  />
                  Active
                </label>
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 20, paddingTop: 16, borderTop: "1px solid #f1f5f9" }}>
                  <button type="button" onClick={cancelDraft} style={{ padding: "10px 24px", background: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: 8, fontWeight: 600, cursor: "pointer", color: "#475569", fontSize: 13 }}>Cancel</button>
                  <button type="button" onClick={saveDraft} style={{ padding: "10px 24px", background: "var(--button-bg-solid, #3b82f6)", color: "white", border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer", fontSize: 13 }}>Save</button>
                </div>
              </div>
            ) : (
              <div className="settings-panel-card" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 300, color: "#94a3b8", fontSize: 14 }}>
                Select a PNL category from the left panel or click "Create New"
              </div>
            )}
          </div>
        </div>

        <div className="settings-panel-card" style={{ marginTop: 16 }}>
          <div className="settings-toggle-grid">
            <ToggleRow
              checked={form.advancedSettings.expenseSettings.autoApprove}
              label="Auto-approve expenses"
              helper="When off, every new expense lands in Pending and only approver roles can approve or reject it."
              onChange={(value) => updateAdvancedObject("expenseSettings", { autoApprove: value })}
            />
          </div>
        </div>
      </>
    );
  };

  const renderCouponsSection = () => {
    const couponSettings = form.advancedSettings.couponSettings;
    const rows = [...summary.coupons].sort((a, b) => {
      const left = new Date(a.createdAt || 0).getTime();
      const right = new Date(b.createdAt || 0).getTime();
      if (left !== right) return right - left;
      return String(a.code || "").localeCompare(String(b.code || ""));
    });
    const filteredRows = rows.filter((row) => {
      const haystack = `${row.code || ""} ${row.title || ""} ${row.description || ""} ${row.branch?.name || ""}`.toLowerCase();
      return !couponSearch || haystack.includes(couponSearch.trim().toLowerCase());
    });
    const activeCount = rows.filter((row) => !row.isArchived).length;
    const archivedCount = rows.filter((row) => row.isArchived).length;
    const selectedRow = rows.find((row) => row.id === selectedCouponId) || null;
    const editing = draftCoupon || selectedRow;

    const toDateInput = (value) => {
      if (!value) return "";
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return "";
      return date.toISOString().slice(0, 10);
    };

    const makeDraftFromRow = (row, isNew = false) => {
      let valDays = 90;
      if (row?.startsAt && row?.endsAt) {
        const diffTime = Math.abs(new Date(row.endsAt) - new Date(row.startsAt));
        valDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }
      
      const match = String(row?.notes || "").match(/\[MaxBenefitAmt:\s*([^\]]*)\s*\]/);
      const maxBenefitAmt = match ? match[1] : "";
      const isPrivate = String(row?.notes || "").includes("PRIVATE");
      const cleanNotesText = row?.notes ? row.notes.replace(/\[MaxBenefitAmt:\s*[^\]]*\s*\]/, "").replace("PRIVATE", "").trim() : "";

      return {
        id: row?.id || makeId("coupon"),
        branchId: row?.branchId || row?.branch?.id || "",
        serviceId: row?.serviceId || row?.service?.id || "",
        productId: row?.productId || row?.product?.id || "",
        code: row?.code || "",
        title: row?.title || "",
        description: row?.description || "",
        discountType: row?.discountType || "PERCENT",
        discountValue: row?.discountValue ?? 10,
        minBillAmount: row?.minBillAmount ?? 0,
        usageLimit: row?.usageLimit ?? "",
        customerUsageLimit: row?.customerUsageLimit ?? "",
        startsAt: row?.startsAt ? toDateInput(row.startsAt) : new Date().toISOString().split('T')[0],
        endsAt: row?.endsAt ? toDateInput(row.endsAt) : "",
        validityDays: valDays,
        isReferral: Boolean(row?.isReferral),
        isInfluencer: Boolean(row?.isInfluencer),
        isBirthday: Boolean(row?.isBirthday),
        isFestival: Boolean(row?.isFestival),
        isArchived: Boolean(row?.isArchived),
        maxBenefitAmt: maxBenefitAmt,
        isPrivate: isPrivate,
        notesText: cleanNotesText,
        _isNew: isNew
      };
    };

    const handleSelectCoupon = (row) => {
      setSelectedCouponId(row.id);
      setDraftCoupon(makeDraftFromRow(row, false));
    };

    const handleFieldChange = (field, value) => {
      if (!draftCoupon) return;
      const updated = { ...draftCoupon, [field]: value };
      
      if (field === "startsAt" || field === "validityDays") {
        const start = updated.startsAt ? new Date(updated.startsAt) : new Date();
        if (!isNaN(start.getTime())) {
          const end = new Date(start);
          end.setDate(end.getDate() + Number(updated.validityDays || 0));
          updated.endsAt = end.toISOString().split('T')[0];
        }
      }
      
      setDraftCoupon(updated);
    };

    const startCreate = () => {
      const newDraft = makeDraftFromRow({ code: "", title: "", discountType: "PERCENT", discountValue: 10, minBillAmount: 0, isArchived: false }, true);
      setDraftCoupon(newDraft);
      setSelectedCouponId(newDraft.id);
    };

    const cancelDraft = () => {
      if (draftCoupon?._isNew) {
        setSelectedCouponId(rows[0]?.id || null);
      }
      setDraftCoupon(null);
    };

    const buildPayload = (draft) => {
      const start = draft.startsAt ? new Date(draft.startsAt) : new Date();
      const end = new Date(start);
      end.setDate(end.getDate() + Number(draft.validityDays || 0));

      const notesArr = [];
      if (draft.isPrivate) notesArr.push("PRIVATE");
      if (draft.maxBenefitAmt) notesArr.push(`[MaxBenefitAmt: ${draft.maxBenefitAmt}]`);
      if (draft.notesText) notesArr.push(draft.notesText);
      const finalNotes = notesArr.join(" ");

      return {
        branchId: draft.branchId || null,
        serviceId: draft.serviceId || null,
        productId: draft.productId || null,
        code: String(draft.code || "").trim().toUpperCase(),
        title: String(draft.title || "").trim(),
        description: String(draft.description || "").trim() || null,
        discountType: draft.discountType === "FIXED" ? "FIXED" : "PERCENT",
        discountValue: Number(draft.discountValue || 0),
        minBillAmount: Number(draft.minBillAmount || 0),
        usageLimit: draft.usageLimit === "" || draft.usageLimit == null ? null : Number(draft.usageLimit),
        customerUsageLimit: draft.customerUsageLimit === "" || draft.customerUsageLimit == null ? null : Number(draft.customerUsageLimit),
        startsAt: start.toISOString(),
        endsAt: end.toISOString(),
        isReferral: Boolean(draft.isReferral),
        isInfluencer: Boolean(draft.isInfluencer),
        isBirthday: Boolean(draft.isBirthday),
        isFestival: Boolean(draft.isFestival),
        isArchived: Boolean(draft.isArchived),
        notes: finalNotes || null
      };
    };

    const saveDraft = async () => {
      if (!draftCoupon) return;
      const cleanCode = String(draftCoupon.code || "").trim();
      const cleanTitle = String(draftCoupon.title || "").trim();
      if (!cleanCode || !cleanTitle) {
        setStatus({ loading: false, error: "Coupon code and title are required.", success: "" });
        return;
      }
      try {
        setSaving(true);
        setStatus((current) => ({ ...current, error: "", success: "" }));
        const payload = buildPayload(draftCoupon);
        if (draftCoupon._isNew) {
          const response = await api.post("/owner/coupons", payload);
          setSelectedCouponId(response.data?.id || draftCoupon.id);
          setStatus({ loading: false, error: "", success: "Coupon created successfully." });
        } else {
          await api.patch(`/owner/coupons/${draftCoupon.id}`, payload);
          setStatus({ loading: false, error: "", success: "Coupon updated successfully." });
        }
        setDraftCoupon(null);
        await refreshCouponsSummary();
      } catch (error) {
        setStatus({ loading: false, error: formatApiError(error, "Could not save coupon"), success: "" });
      } finally {
        setSaving(false);
      }
    };

    const toggleArchived = async (row) => {
      try {
        setStatus((current) => ({ ...current, error: "", success: "" }));
        const payload = buildPayload({ ...makeDraftFromRow(row, false), isArchived: !row.isArchived });
        await api.patch(`/owner/coupons/${row.id}`, payload);
        setStatus({ loading: false, error: "", success: row.isArchived ? "Coupon restored." : "Coupon archived." });
        await refreshCouponsSummary();
        if (selectedCouponId === row.id) {
          setDraftCoupon((current) => (current && current.id === row.id ? { ...current, isArchived: !row.isArchived } : current));
        }
      } catch (error) {
        setStatus({ loading: false, error: formatApiError(error, "Could not update coupon"), success: "" });
      }
    };

    return (
      <>
        <SectionHeader
          title="Coupons"
          description="Manage salon coupon rules from the settings hub while the live coupons module stays in sync."
          badges={[`${rows.length} live coupons`, `${activeCount} active`, `${archivedCount} archived`]}
          action={<Link className="secondary-button" to="/admin/coupons">Open Module</Link>}
        />
        <div className="muted" style={{ marginBottom: 12, fontSize: 12 }}>
          Coupon settings control whether discounts are stackable and how high a coupon can go. The records below are the live coupons used by POS, invoices, and campaigns.
        </div>

        <div className="settings-panel-card" style={{ marginBottom: 16 }}>
          <div className="settings-toggle-grid">
            <ToggleRow checked={couponSettings.enabled} label="Enable coupons" onChange={(value) => updateAdvancedObject("couponSettings", { enabled: value })} />
            <ToggleRow checked={couponSettings.stackable} label="Allow stackable coupons" onChange={(value) => updateAdvancedObject("couponSettings", { stackable: value })} />
            <label className="settings-input-group">
              <span className="muted">Max discount %</span>
              <input type="number" min="0" value={couponSettings.maxDiscountPercent} onChange={(event) => updateAdvancedObject("couponSettings", { maxDiscountPercent: Number(event.target.value || 0) })} />
            </label>
            <label className="settings-input-group">
              <span className="muted">Minimum bill amount</span>
              <input type="number" min="0" value={couponSettings.minimumBillAmount} onChange={(event) => updateAdvancedObject("couponSettings", { minimumBillAmount: Number(event.target.value || 0) })} />
            </label>
          </div>
        </div>

        <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
          {/* Left Column - List of Coupons */}
          <div style={{ width: 320, flexShrink: 0, display: "flex", flexDirection: "column", background: "white", borderRadius: 12, padding: "16px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
            <div style={{ marginBottom: 12 }}>
              <input
                value={couponSearch}
                onChange={(event) => setCouponSearch(event.target.value)}
                placeholder="Search coupons..."
                style={{ width: "100%", padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 14, boxSizing: "border-box" }}
              />
            </div>
            <div style={{ maxHeight: 520, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8, paddingRight: 4 }}>
              {filteredRows.map((row) => {
                const isSelected = selectedCouponId === row.id;
                return (
                  <div
                    key={row.id}
                    onClick={() => handleSelectCoupon(row)}
                    style={{
                      padding: "12px 14px",
                      borderRadius: 8,
                      cursor: "pointer",
                      background: isSelected ? "#e0f2fe" : "transparent",
                      border: isSelected ? "1px solid #0284c7" : "1px solid #f1f5f9",
                      transition: "all 0.2s"
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>
                      {row.discountType === "PERCENT" ? `FLAT ${Number(row.discountValue)}% OFF` : `FLAT ${Number(row.discountValue)} Rs OFF`}
                    </div>
                    <div style={{ color: isSelected ? "#0284c7" : "#475569", fontSize: 12, marginTop: 4, fontWeight: 500 }}>
                      {row.code}
                    </div>
                  </div>
                );
              })}
              {!filteredRows.length && (
                <div style={{ padding: "44px 16px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
                  <strong style={{ display: "block", marginBottom: 6 }}>No coupons found</strong>
                  <span>{couponSearch ? "Try a different search term." : "Create a coupon to manage discounts."}</span>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={startCreate}
              style={{
                marginTop: 16,
                width: "100%",
                padding: "12px",
                background: "var(--button-bg-solid, #3b82f6)",
                color: "white",
                border: "none",
                borderRadius: 8,
                fontWeight: 700,
                cursor: "pointer",
                fontSize: 14
              }}
            >
              Create New Coupon
            </button>
          </div>

          {/* Right Column - Coupon Form */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {draftCoupon ? (
              <div style={{ background: "white", borderRadius: 12, padding: "24px 30px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                <h3 style={{ color: "var(--accent, #3b82f6)", marginTop: 0, marginBottom: 24, fontSize: 18, fontWeight: 700 }}>
                  {draftCoupon?._isNew ? "Create Coupon" : "Update Coupon"}
                </h3>
                
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  {/* Row 1: Name, Code, Description, Active */}
                  <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1.5fr 2fr auto", gap: 16, alignItems: "center" }}>
                    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#475569" }}>Name</span>
                      <input
                        type="text"
                        value={draftCoupon.title}
                        onChange={(e) => handleFieldChange("title", e.target.value)}
                        placeholder="e.g. GMAP Review"
                        style={{ padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: "0.9rem", width: "100%", boxSizing: "border-box" }}
                      />
                    </label>
                    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#475569" }}>Code</span>
                      <input
                        type="text"
                        value={draftCoupon.code}
                        onChange={(e) => handleFieldChange("code", e.target.value.toUpperCase())}
                        placeholder="e.g. GMAP"
                        style={{ padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: "0.9rem", width: "100%", boxSizing: "border-box" }}
                      />
                    </label>
                    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#475569" }}>Description</span>
                      <input
                        type="text"
                        value={draftCoupon.description}
                        onChange={(e) => handleFieldChange("description", e.target.value)}
                        placeholder="e.g. Once Per Customer Where..."
                        style={{ padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: "0.9rem", width: "100%", boxSizing: "border-box" }}
                      />
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 22, cursor: "pointer", userSelect: "none" }}>
                      <input
                        type="checkbox"
                        checked={!draftCoupon.isArchived}
                        onChange={(e) => handleFieldChange("isArchived", !e.target.checked)}
                        style={{ width: 18, height: 18, cursor: "pointer" }}
                      />
                      <span style={{ fontSize: "0.9rem", fontWeight: 600, color: "#475569" }}>Active</span>
                    </label>
                  </div>

                  {/* Row 2: Benefit Type, Benefit Value, Coupon Activated Date */}
                  <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1.2fr 1.2fr", gap: 16 }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#475569" }}>Benefit Type</span>
                      <div style={{ display: "flex", gap: 20, marginTop: 10 }}>
                        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                          <input
                            type="radio"
                            name="discountType"
                            checked={draftCoupon.discountType === "FIXED"}
                            onChange={() => handleFieldChange("discountType", "FIXED")}
                            style={{ width: 16, height: 16 }}
                          />
                          <span style={{ fontSize: "0.9rem", fontWeight: 500, color: "#334155" }}>Fixed</span>
                        </label>
                        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                          <input
                            type="radio"
                            name="discountType"
                            checked={draftCoupon.discountType === "PERCENT"}
                            onChange={() => handleFieldChange("discountType", "PERCENT")}
                            style={{ width: 16, height: 16 }}
                          />
                          <span style={{ fontSize: "0.9rem", fontWeight: 500, color: "#334155" }}>Percentage</span>
                        </label>
                      </div>
                    </div>
                    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#475569" }}>
                        {draftCoupon.discountType === "PERCENT" ? "Benefit Value in %" : "Benefit Value in ₹"}
                      </span>
                      <input
                        type="number"
                        min="0"
                        value={draftCoupon.discountValue}
                        onChange={(e) => handleFieldChange("discountValue", Number(e.target.value || 0))}
                        placeholder="50"
                        style={{ padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: "0.9rem", width: "100%", boxSizing: "border-box" }}
                      />
                    </label>
                    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#475569" }}>Coupon Activated Date</span>
                      <input
                        type="date"
                        value={draftCoupon.startsAt}
                        onChange={(e) => handleFieldChange("startsAt", e.target.value)}
                        style={{ padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: "0.9rem", width: "100%", boxSizing: "border-box" }}
                      />
                    </label>
                  </div>

                  {/* Row 3: Minimum Amount, Max benefit Amt, Max Used Count, Validity */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 16 }}>
                    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#475569" }}>Minimum Amount for Redemption</span>
                      <input
                        type="number"
                        min="0"
                        value={draftCoupon.minBillAmount}
                        onChange={(e) => handleFieldChange("minBillAmount", Number(e.target.value || 0))}
                        placeholder="59"
                        style={{ padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: "0.9rem", width: "100%", boxSizing: "border-box" }}
                      />
                    </label>
                    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#475569" }}>Max benefit Amt</span>
                      <input
                        type="number"
                        min="0"
                        value={draftCoupon.maxBenefitAmt}
                        onChange={(e) => handleFieldChange("maxBenefitAmt", e.target.value)}
                        placeholder="e.g. 150"
                        style={{ padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: "0.9rem", width: "100%", boxSizing: "border-box" }}
                      />
                    </label>
                    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#475569" }}>Max Used Count</span>
                      <input
                        type="number"
                        min="0"
                        value={draftCoupon.usageLimit}
                        onChange={(e) => handleFieldChange("usageLimit", e.target.value)}
                        placeholder="Enter Count"
                        style={{ padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: "0.9rem", width: "100%", boxSizing: "border-box" }}
                      />
                    </label>
                    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#475569" }}>Validity (In days)</span>
                      <input
                        type="number"
                        min="1"
                        value={draftCoupon.validityDays}
                        onChange={(e) => handleFieldChange("validityDays", e.target.value)}
                        placeholder="90"
                        style={{ padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: "0.9rem", width: "100%", boxSizing: "border-box" }}
                      />
                    </label>
                  </div>

                  {/* Toggle Row: Private */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", border: "1px solid #e2e8f0", borderRadius: 8, background: "#f8fafc" }}>
                    <div>
                      <div style={{ fontWeight: 600, color: "#1e293b", fontSize: "0.9rem" }}>Private</div>
                      <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: 2 }}>This coupon will not be visible on the public online catalog.</div>
                    </div>
                    <div
                      onClick={() => handleFieldChange("isPrivate", !draftCoupon.isPrivate)}
                      style={{
                        width: 44,
                        height: 22,
                        background: draftCoupon.isPrivate ? "#10b981" : "#cbd5e1",
                        borderRadius: 11,
                        padding: 2,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: draftCoupon.isPrivate ? "flex-end" : "flex-start",
                        transition: "all 0.2s",
                        boxSizing: "border-box"
                      }}
                    >
                      <div style={{ width: 18, height: 18, background: "white", borderRadius: "50%", boxShadow: "0 1px 3px rgba(0,0,0,0.15)" }} />
                    </div>
                  </div>
                </div>

                {/* Form Buttons */}
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 24, paddingTop: 16, borderTop: "1px solid #f1f5f9" }}>
                  {!draftCoupon._isNew && (
                    <button
                      type="button"
                      onClick={() => toggleArchived(draftCoupon)}
                      disabled={saving}
                      style={{
                        marginRight: "auto",
                        padding: "10px 18px",
                        background: draftCoupon.isArchived ? "#f0fdf4" : "#fef2f2",
                        color: draftCoupon.isArchived ? "#166534" : "#dc2626",
                        border: `1px solid ${draftCoupon.isArchived ? "#dcfce7" : "#fee2e2"}`,
                        borderRadius: 8,
                        fontWeight: 600,
                        cursor: "pointer",
                        fontSize: "0.9rem"
                      }}
                    >
                      {draftCoupon.isArchived ? "Restore Coupon" : "Archive Coupon"}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={cancelDraft}
                    disabled={saving}
                    style={{
                      padding: "10px 18px",
                      background: "white",
                      color: "#475569",
                      border: "1px solid #cbd5e1",
                      borderRadius: 8,
                      fontWeight: 600,
                      cursor: "pointer",
                      fontSize: "0.9rem"
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={saveDraft}
                    disabled={saving}
                    style={{
                      padding: "10px 22px",
                      background: "var(--button-bg-solid, #3b82f6)",
                      color: "white",
                      border: "none",
                      borderRadius: 8,
                      fontWeight: 700,
                      cursor: "pointer",
                      fontSize: "0.9rem"
                    }}
                  >
                    {saving ? "Saving..." : "Save"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="settings-panel-card" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 420, color: "#94a3b8", fontSize: 14 }}>
                Select a coupon from the left panel or click "Create New Coupon"
              </div>
            )}
          </div>
        </div>
      </>
    );
  };

  const renderPnlIncomeTaxesSection = () => {
    const rows = [...taxSlabs].sort((a, b) => Number(a.slabFrom || 0) - Number(b.slabFrom || 0));
    const selectedRow = rows.find((row) => row.id === selectedPnlIncomeTaxId) || null;
    const editing = draftPnlIncomeTax || selectedRow;

    const startCreate = () => {
      setDraftPnlIncomeTax({ id: null, slabFrom: 0, slabTo: 0, rate: 0, active: true, _isNew: true });
      setSelectedPnlIncomeTaxId(null);
    };

    const startEdit = (row) => {
      setDraftPnlIncomeTax({ ...row, _isNew: false });
      setSelectedPnlIncomeTaxId(row.id);
    };

    const cancelDraft = () => {
      setDraftPnlIncomeTax(null);
      setSelectedPnlIncomeTaxId(null);
    };

    const saveDraft = async () => {
      if (!draftPnlIncomeTax) return;
      try {
        const payload = {
          name: draftPnlIncomeTax.name || `${Number(draftPnlIncomeTax.slabFrom || 0)}-${Number(draftPnlIncomeTax.slabTo || 0)}`,
          slabFrom: Number(draftPnlIncomeTax.slabFrom || 0),
          slabTo: Number(draftPnlIncomeTax.slabTo || 0),
          rate: Number(draftPnlIncomeTax.rate || 0),
          active: draftPnlIncomeTax.active !== false
        };
        if (draftPnlIncomeTax._isNew) {
          const res = await api.post("/owner/tax-slabs", payload);
          setTaxSlabs((prev) => [...prev, res.data]);
        } else {
          const res = await api.patch(`/owner/tax-slabs/${draftPnlIncomeTax.id}`, payload);
          setTaxSlabs((prev) => prev.map((r) => (r.id === draftPnlIncomeTax.id ? res.data : r)));
        }
        cancelDraft();
        setStatus({ loading: false, error: "", success: "Tax slab saved." });
      } catch (err) {
        setStatus({ loading: false, error: formatApiError(err, "Could not save tax slab"), success: "" });
      }
    };

    const deleteRow = async (id) => {
      try {
        await api.delete(`/owner/tax-slabs/${id}`);
        setTaxSlabs((prev) => prev.filter((r) => r.id !== id));
        if (selectedPnlIncomeTaxId === id) cancelDraft();
        setStatus({ loading: false, error: "", success: "Tax slab deleted." });
      } catch (err) {
        setStatus({ loading: false, error: formatApiError(err, "Could not delete tax slab"), success: "" });
      }
    };

    return (
      <>
        <SectionHeader title="PNL Income Taxes" description="Track tax slabs used in PNL and financial reporting." badges={[`${rows.length} entries`]} action={<Link className="secondary-button" to="/admin/services">Open Services</Link>} />
        <div className="muted" style={{ marginBottom: 12, fontSize: 12 }}>
          These slabs are kept for finance reporting. Billing tax behavior for services and products stays controlled from Tax Mapping.
        </div>

        <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
          <div style={{ width: 280, flexShrink: 0 }}>
            <div className="settings-panel-card" style={{ padding: 0 }}>
              <div style={{ padding: "16px 16px 12px", borderBottom: "1px solid #f1f5f9" }}>
                <button type="button" onClick={startCreate} style={{ width: "100%", padding: "10px", background: "var(--button-bg-solid, #3b82f6)", color: "white", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: "pointer" }}>Create New</button>
              </div>
              <div style={{ maxHeight: 420, overflowY: "auto" }}>
                {rows.map((row) => (
                  <div
                    key={row.id}
                    style={{
                      padding: "14px 16px",
                      borderBottom: "1px solid #f1f5f9",
                      cursor: "pointer",
                      background: selectedPnlIncomeTaxId === row.id ? "#eff6ff" : "white",
                      borderLeft: selectedPnlIncomeTaxId === row.id ? "3px solid #3b82f6" : "3px solid transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between"
                    }}
                  >
                    <div style={{ flex: 1 }} onClick={() => { setSelectedPnlIncomeTaxId(row.id); setDraftPnlIncomeTax(null); }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: "#0f172a" }}>{row.slabFrom} - {row.slabTo}</div>
                      <div style={{ fontSize: 11, color: "#64748b", marginTop: 4, display: "flex", alignItems: "center", gap: 6 }}>
                        <span>{row.rate}%</span>
                        <span>·</span>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                          <span style={{ width: 6, height: 6, borderRadius: "50%", background: row.active ? "#22c55e" : "#94a3b8" }} />
                          {row.active ? "Active" : "Inactive"}
                        </span>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                      <button type="button" onClick={(event) => { event.stopPropagation(); startEdit(row); }} title="Edit slab" style={{ width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 6, cursor: "pointer", color: "#475569", padding: 0 }}><Edit2 size={13} /></button>
                      <button type="button" onClick={(event) => { event.stopPropagation(); deleteRow(row.id); }} title="Delete slab" style={{ width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 6, cursor: "pointer", color: "#dc2626", padding: 0 }}><Trash2 size={13} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            {editing ? (
              <div className="settings-panel-card">
                <h3 style={{ color: "var(--accent, #3b82f6)" }}>{draftPnlIncomeTax?._isNew ? "Create PNL Income Tax Slab" : "Edit PNL Income Tax Slab"}</h3>
                <div className="settings-form-grid" style={{ marginBottom: 16 }}>
                  <label className="settings-input-group">
                    <span className="muted">Slab From</span>
                    <input type="number" min="0" value={draftPnlIncomeTax?.slabFrom ?? editing.slabFrom} onChange={(event) => draftPnlIncomeTax && setDraftPnlIncomeTax({ ...draftPnlIncomeTax, slabFrom: Number(event.target.value || 0) })} placeholder="Enter Tax Slab" />
                  </label>
                  <label className="settings-input-group">
                    <span className="muted">Slab To</span>
                    <input type="number" min="0" value={draftPnlIncomeTax?.slabTo ?? editing.slabTo} onChange={(event) => draftPnlIncomeTax && setDraftPnlIncomeTax({ ...draftPnlIncomeTax, slabTo: Number(event.target.value || 0) })} placeholder="Enter Tax Slab" />
                  </label>
                  <label className="settings-input-group">
                    <span className="muted">Tax Value</span>
                    <div style={{ display: "flex", alignItems: "center" }}>
                      <input type="number" min="0" max="100" value={draftPnlIncomeTax?.rate ?? editing.rate} onChange={(event) => draftPnlIncomeTax && setDraftPnlIncomeTax({ ...draftPnlIncomeTax, rate: Number(event.target.value || 0) })} placeholder="Enter Tax Value" style={{ flex: 1 }} />
                      <span style={{ padding: "8px 12px", background: "#f1f5f9", border: "1px solid #e2e8f0", borderLeft: "none", borderRadius: "0 8px 8px 0", fontSize: 13, color: "#475569" }}>%</span>
                    </div>
                  </label>
                </div>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600, color: "#334155", cursor: "pointer", marginBottom: 20 }}>
                  <input type="checkbox" checked={draftPnlIncomeTax?.active ?? editing.active} onChange={(event) => draftPnlIncomeTax && setDraftPnlIncomeTax({ ...draftPnlIncomeTax, active: event.target.checked })} style={{ width: 18, height: 18, accentColor: "var(--accent, #3b82f6)", cursor: "pointer" }} />
                  Active
                </label>
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 20, paddingTop: 16, borderTop: "1px solid #f1f5f9" }}>
                  <button type="button" onClick={cancelDraft} style={{ padding: "10px 24px", background: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: 8, fontWeight: 600, cursor: "pointer", color: "#475569", fontSize: 13 }}>Cancel</button>
                  <button type="button" onClick={saveDraft} style={{ padding: "10px 24px", background: "var(--button-bg-solid, #3b82f6)", color: "white", border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer", fontSize: 13 }}>Save</button>
                </div>
              </div>
            ) : (
              <div className="settings-panel-card" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 300, color: "#94a3b8", fontSize: 14 }}>
                Select an income-tax slab from the left panel or click "Create New"
              </div>
            )}
          </div>
        </div>
      </>
    );
  };

  const renderFooterSection = () => {
    const footer = form.advancedSettings.footerContent;
    return (
      <>
        <SectionHeader title="Footer Content" description="Manage receipt footer messaging and brand footer copy from one polished editor." badges={[form.invoiceFooter ? "Invoice Footer Ready" : "Invoice Footer Empty"]} action={<Link className="secondary-button" to="/site">Open Storefront</Link>} />
        <div className="muted" style={{ marginBottom: 12, fontSize: 12 }}>
          Invoice footer is used in POS billing, while support/social/brand footer copy is rendered on the storefront footer.
        </div>
        <div className="settings-panel-card">
          <div className="settings-form-grid">
            <label className="settings-input-group"><span className="muted">Invoice footer</span><textarea rows="4" value={form.invoiceFooter} onChange={(event) => setForm((current) => ({ ...current, invoiceFooter: event.target.value }))} /></label>
            <label className="settings-input-group"><span className="muted">Support line</span><input value={footer.supportLine} onChange={(event) => updateAdvancedObject("footerContent", { supportLine: event.target.value })} /></label>
            <label className="settings-input-group"><span className="muted">Copyright line</span><input value={footer.copyrightLine} onChange={(event) => updateAdvancedObject("footerContent", { copyrightLine: event.target.value })} /></label>
            <label className="settings-input-group"><span className="muted">Social line</span><input value={footer.socialLine} onChange={(event) => updateAdvancedObject("footerContent", { socialLine: event.target.value })} /></label>
            <label className="settings-input-group"><span className="muted">Brand note</span><textarea rows="4" value={footer.brandNote} onChange={(event) => updateAdvancedObject("footerContent", { brandNote: event.target.value })} /></label>
          </div>
        </div>
      </>
    );
  };

  const renderUiSettingsSection = () => {
    const presets = [
      { id: "classic", name: "Classic Indigo", button: "#3b82f6", buttonHover: "#2563eb", sidebar: "#0f172a", navbar: "#ffffff", font: "#1e293b" },
      { id: "ocean", name: "Ocean Breeze", button: "#0ea5e9", buttonHover: "#0284c7", sidebar: "#0c4a6e", navbar: "#f0f9ff", font: "#0369a1" },
      { id: "emerald", name: "Emerald Forest", button: "#10b981", buttonHover: "#059669", sidebar: "#064e3b", navbar: "#f0fdf4", font: "#047857" },
      { id: "midnight", name: "Midnight Premium", button: "#8b5cf6", buttonHover: "#7c3aed", sidebar: "#111827", navbar: "#1f2937", font: "#f9fafb" },
      { id: "rose", name: "Rose Gold", button: "#ec4899", buttonHover: "#db2777", sidebar: "#4c0519", navbar: "#fff1f2", font: "#be185d" }
    ];

    const applyPreset = (preset) => {
      setActiveThemePreset(preset.id);
      setButtonColor(preset.button);
      setButtonHoverColor(preset.buttonHover || preset.button);
      setSidebarColor(preset.sidebar);
      setNavbarColor(preset.navbar);
      setFontColor(preset.font);
    };

    return (
      <>
        <SectionHeader
          title="UI Settings"
          description="Customize the brand identity, dashboard layout color schemes, and fonts of your partner portal."
          badges={["Live Preview Active", "Theme Customizer"]}
        />
        <div className="muted" style={{ marginBottom: 20, fontSize: 12 }}>
          Choose preset colors or pick your own custom palette. Changes are reflected in the instant interactive dashboard mockup below.
        </div>

        <div style={{ display: "flex", gap: 24, alignItems: "flex-start", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 320 }}>
            {/* Color Selectors Card */}
            <div className="settings-panel-card" style={{ marginBottom: 20 }}>
              <h3 style={{ margin: "0 0 16px 0", fontSize: 15, fontWeight: 700, color: "#0f172a" }}>Theme Colors</h3>
              
              <div className="settings-form-grid">
                <label className="settings-input-group">
                  <span className="muted">Button Color</span>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input type="color" value={buttonColor} onChange={(e) => { setButtonColor(e.target.value); setActiveThemePreset("custom"); }} style={{ width: 42, height: 42, padding: 0, border: "1px solid #cbd5e1", borderRadius: 8, cursor: "pointer", background: "none" }} />
                    <input type="text" value={buttonColor} onChange={(e) => { setButtonColor(e.target.value); setActiveThemePreset("custom"); }} style={{ flex: 1, textTransform: "uppercase" }} />
                  </div>
                </label>
                <label className="settings-input-group">
                  <span className="muted">Button Hover Color</span>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input type="color" value={buttonHoverColor} onChange={(e) => { setButtonHoverColor(e.target.value); setActiveThemePreset("custom"); }} style={{ width: 42, height: 42, padding: 0, border: "1px solid #cbd5e1", borderRadius: 8, cursor: "pointer", background: "none" }} />
                    <input type="text" value={buttonHoverColor} onChange={(e) => { setButtonHoverColor(e.target.value); setActiveThemePreset("custom"); }} style={{ flex: 1, textTransform: "uppercase" }} />
                  </div>
                </label>
                <label className="settings-input-group">
                  <span className="muted">Sidebar Color</span>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input type="color" value={sidebarColor} onChange={(e) => { setSidebarColor(e.target.value); setActiveThemePreset("custom"); }} style={{ width: 42, height: 42, padding: 0, border: "1px solid #cbd5e1", borderRadius: 8, cursor: "pointer", background: "none" }} />
                    <input type="text" value={sidebarColor} onChange={(e) => { setSidebarColor(e.target.value); setActiveThemePreset("custom"); }} style={{ flex: 1, textTransform: "uppercase" }} />
                  </div>
                </label>
                <label className="settings-input-group">
                  <span className="muted">Navbar Color</span>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input type="color" value={navbarColor} onChange={(e) => { setNavbarColor(e.target.value); setActiveThemePreset("custom"); }} style={{ width: 42, height: 42, padding: 0, border: "1px solid #cbd5e1", borderRadius: 8, cursor: "pointer", background: "none" }} />
                    <input type="text" value={navbarColor} onChange={(e) => { setNavbarColor(e.target.value); setActiveThemePreset("custom"); }} style={{ flex: 1, textTransform: "uppercase" }} />
                  </div>
                </label>
                <label className="settings-input-group">
                  <span className="muted">Font & Icon Color</span>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input type="color" value={fontColor} onChange={(e) => { setFontColor(e.target.value); setActiveThemePreset("custom"); }} style={{ width: 42, height: 42, padding: 0, border: "1px solid #cbd5e1", borderRadius: 8, cursor: "pointer", background: "none" }} />
                    <input type="text" value={fontColor} onChange={(e) => { setFontColor(e.target.value); setActiveThemePreset("custom"); }} style={{ flex: 1, textTransform: "uppercase" }} />
                  </div>
                </label>
              </div>
            </div>

            {/* Presets Card */}
            <div className="settings-panel-card">
              <h3 style={{ margin: "0 0 16px 0", fontSize: 15, fontWeight: 700, color: "#0f172a" }}>Brand Presets</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 12 }}>
                {presets.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => applyPreset(p)}
                    style={{
                      padding: "12px 14px",
                      border: activeThemePreset === p.id ? "2px solid #3b82f6" : "1px solid #e2e8f0",
                      borderRadius: 10,
                      background: "#ffffff",
                      cursor: "pointer",
                      textAlign: "left",
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                      alignItems: "flex-start",
                      transition: "all 0.15s ease"
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#334155" }}>{p.name}</div>
                    <div style={{ display: "flex", gap: 4 }}>
                      <span title="Sidebar Color" style={{ width: 14, height: 14, borderRadius: "50%", background: p.sidebar, border: "1px solid #cbd5e1" }} />
                      <span title="Navbar Color" style={{ width: 14, height: 14, borderRadius: "50%", background: p.navbar, border: "1px solid #cbd5e1" }} />
                      <span title="Button Color" style={{ width: 14, height: 14, borderRadius: "50%", background: p.button, border: "1px solid #cbd5e1" }} />
                      <span title="Button Hover Color" style={{ width: 14, height: 14, borderRadius: "50%", background: p.buttonHover, border: "1px solid #cbd5e1" }} />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div style={{ width: 340, flexShrink: 0 }}>
            {/* Live Preview Card */}
            <div className="settings-panel-card" style={{ padding: 0, overflow: "hidden", border: "1px solid #cbd5e1", borderRadius: 12 }}>
              <div style={{ padding: "12px 16px", background: "#f8fafc", borderBottom: "1px solid #cbd5e1", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#475569" }}>Live Interactive Preview</span>
                <span style={{ fontSize: 10, background: "#dbeafe", color: "#2563eb", padding: "2px 8px", borderRadius: 20, fontWeight: 700 }}>Active</span>
              </div>

              {/* Mockup Container */}
              <div style={{ height: 260, display: "flex", background: "#f1f5f9" }}>
                {/* Mockup Sidebar */}
                <div style={{ width: 70, background: sidebarColor, display: "flex", flexDirection: "column", alignItems: "center", padding: "12px 4px", gap: 12, transition: "background 0.3s ease" }}>
                  <div style={{ width: 24, height: 24, borderRadius: "50%", background: "rgba(255,255,255,0.2)", marginBottom: 8 }} />
                  <div style={{ width: 36, height: 8, borderRadius: 4, background: "rgba(255,255,255,0.15)" }} />
                  <div style={{ width: 36, height: 8, borderRadius: 4, background: "rgba(255,255,255,0.15)" }} />
                  <div style={{ width: 36, height: 8, borderRadius: 4, background: "rgba(255,255,255,0.15)" }} />
                  <div style={{ width: 36, height: 8, borderRadius: 4, background: "rgba(255,255,255,0.15)" }} />
                </div>

                {/* Mockup Main */}
                <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                  {/* Mockup Navbar */}
                  <div style={{ height: 40, background: navbarColor, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 12px", borderBottom: "1px solid #e2e8f0", transition: "background 0.3s ease" }}>
                    <div style={{ width: 48, height: 8, borderRadius: 4, background: "#cbd5e1" }} />
                    <div style={{ display: "flex", gap: 6 }}>
                      <div style={{ width: 14, height: 14, borderRadius: "50%", background: "#cbd5e1" }} />
                      <div style={{ width: 14, height: 14, borderRadius: "50%", background: "#cbd5e1" }} />
                    </div>
                  </div>

                  {/* Mockup Content */}
                  <div style={{ flex: 1, padding: 16, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: fontColor, transition: "color 0.3s ease", marginBottom: 4 }}>
                        Dashboard Title
                      </div>
                      <div style={{ fontSize: 10, color: "#64748b", lineHeight: 1.4 }}>
                        Manage invoices, check ins, and appointments.
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        type="button"
                        onMouseEnter={() => setIsPreviewHovered(true)}
                        onMouseLeave={() => setIsPreviewHovered(false)}
                        style={{
                          flex: 1,
                          padding: "8px",
                          background: isPreviewHovered ? (buttonHoverColor || buttonColor) : buttonColor,
                          color: "#ffffff",
                          border: "none",
                          borderRadius: 6,
                          fontSize: 10,
                          fontWeight: 700,
                          cursor: "pointer",
                          transition: "background 0.3s ease"
                        }}
                      >
                        Primary Action
                      </button>
                      <button type="button" style={{ flex: 1, padding: "8px", background: "#ffffff", color: "#475569", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: 10, fontWeight: 600, cursor: "pointer" }}>
                        Secondary
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ padding: 14, borderTop: "1px solid #e2e8f0", display: "flex", gap: 10, justifyContent: "flex-end", background: "#ffffff" }}>
                <button type="button" onClick={() => applyPreset(presets[0])} style={{ padding: "8px 16px", background: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: 8, fontWeight: 600, color: "#475569", fontSize: 12, cursor: "pointer" }}>Reset Defaults</button>
                <button
                  type="button"
                  onClick={saveWorkspace}
                  disabled={saving}
                  onMouseEnter={() => setIsSaveHovered(true)}
                  onMouseLeave={() => setIsSaveHovered(false)}
                  style={{
                    padding: "8px 16px",
                    background: isSaveHovered ? (buttonHoverColor || buttonColor) : buttonColor,
                    color: "white",
                    border: "none",
                    borderRadius: 8,
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: "pointer",
                    transition: "background 0.3s ease",
                    opacity: saving ? 0.7 : 1
                  }}
                >
                  {saving ? "Saving..." : "Save Palette"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  };

  const renderSection = () => {
    switch (activeSection.key) {
      case "generic":
        return renderGenericSection();
      case "shift-management":
        return renderShiftSection();
      case "roster-management":
        return renderRosterSection();
      case "tax-mapping":
        return renderTaxSection();
      case "feedback-setting":
        return renderFeedbackSection();
      case "access-control":
        return renderAccessControlSection();
      case "notification-settings":
        return renderNotificationsSection();
      case "sms-center":
        return renderSmsSection();
      case "crm-segment":
        return renderSegmentSection();
      case "designation":
        return renderDesignationSection();
      case "privacy-policy":
        return renderLegalSection("Privacy Policy", "privacyPolicy");
      case "terms-and-conditions":
        return renderLegalSection("Terms & Conditions", "termsAndConditions");
      case "pnl-categories":
        return renderPnlCategoriesSection();
      case "pnl-income-taxes":
        return renderPnlIncomeTaxesSection();
      case "footer-content":
        return renderFooterSection();
      case "ui-settings":
        return renderUiSettingsSection();
      default:
        return renderGenericSection();
    }
  };

  return (
    <div className="settings-workspace-wrapper">
      {!canViewSettings ? (
        <div className="settings-panel-card">
          <p className="error-text">Access restricted. This settings workspace requires `settings.view` permission.</p>
        </div>
      ) : null}
      {settingsLocked ? (
        <div className="settings-panel-card">
          <p className="success-text">Read-only mode enabled. This role can review settings but cannot save changes without `settings.edit` permission.</p>
        </div>
      ) : null}
      {status.error ? <div className="settings-panel-card"><p className="error-text">{status.error}</p></div> : null}
      {status.success ? <div className="settings-panel-card"><p className="success-text">{status.success}</p></div> : null}

      {!canViewSettings ? null : status.loading ? (
        <PageLoader title="Loading settings workspace" message="Bringing together generic settings, staff controls, tax mappings, and communication defaults." />
      ) : (
        <div className="settings-layout">
          <aside className="settings-sidebar">
            <input className="settings-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search settings" />
            <div className="settings-sidebar-shortcuts">
              <Link to="/admin/dashboard" className="settings-sidebar-shortcut">
                <strong>Home / Dashboard</strong>
                <small>Return to the main workspace</small>
              </Link>
            </div>
            <div className="settings-nav-list">
              {filteredSections.map((item) => (
                <Link key={item.key} to={item.to} className={`settings-nav-item ${activeSection.key === item.key ? "active" : ""}`}>
                  <strong>{item.label}</strong>
                  <small>{item.hint}</small>
                </Link>
              ))}
              {!filteredSections.length ? <EmptyState title="No settings matched" message="Try another search word like loyalty, roster, tax, or footer." /> : null}
            </div>
          </aside>

          <section className="settings-content">
            {renderSection()}
            
            <div className="settings-footer-actions" style={{ marginTop: "32px", borderTop: "1px solid #e2e8f0", paddingTop: "24px" }}>
              <button type="button" className="btn-reset" onClick={handleReset} disabled={settingsLocked}>Reset</button>
              <button type="button" className="btn-update" onClick={saveWorkspace} disabled={saving || settingsLocked}>{saving ? "Saving..." : "Update"}</button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}



