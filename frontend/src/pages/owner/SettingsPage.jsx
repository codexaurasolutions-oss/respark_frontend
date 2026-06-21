import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { api } from "../../api/client";
import EmptyState from "../../components/EmptyState";
import PageLoader from "../../components/PageLoader";
import { useAuth } from "../../context/AuthContext";
import { useSalonSettings } from "../../context/SalonSettingsContext";
import { formatApiError } from "../../utils/apiError";
import { normalizeCurrencyCode } from "../../utils/currency";
import { writeSalonSettingsCache } from "../../utils/salonSettings";
import { SETTINGS_WORKSPACE_SECTIONS, getSettingsSection } from "./settingsWorkspaceConfig";
import "./SettingsPage.css";

const WEEK_DAYS = [
  { key: "sun", label: "Sun" },
  { key: "mon", label: "Mon" },
  { key: "tue", label: "Tue" },
  { key: "wed", label: "Wed" },
  { key: "thu", label: "Thu" },
  { key: "fri", label: "Fri" },
  { key: "sat", label: "Sat" }
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
    pushEnabled: false,
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
    referredPercentage: 10
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
  incentiveSettings: {
    enabled: true,
    autoApprove: false,
    payoutBasis: "revenue",
    defaultAmount: 0,
    notes: ""
  },
  footerContent: {
    supportLine: "",
    copyrightLine: "",
    socialLine: "",
    brandNote: ""
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
  incentiveSettings: { ...defaultAdvancedSettings.incentiveSettings, ...(raw.incentiveSettings || {}) },
  footerContent: { ...defaultAdvancedSettings.footerContent, ...(raw.footerContent || {}) }
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
  incentives: [],
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
  const { formatMoney } = useSalonSettings();
  const [form, setForm] = useState(initialForm);
  const [paymentModes, setPaymentModes] = useState(defaultPaymentModes);
  const [summary, setSummary] = useState(liveSummaryFallback);
  const [segmentPreviewCounts, setSegmentPreviewCounts] = useState({});
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
  const [newTypeName, setNewTypeName] = useState("");
  const [editingType, setEditingType] = useState(null);
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());
  const rosterInitializedRef = useRef(false);
  const salonId = auth?.salonId || auth?.membership?.salonId || auth?.membership?.salon?.id || "global";
  const salonSlug = auth?.membership?.salon?.slug || auth?.salon?.slug || "";
  const settingsPermissions = Array.isArray(auth?.membership?.permissions?.settings)
    ? auth.membership.permissions.settings
    : [];
  const canViewSettings = settingsPermissions.includes("view") || settingsPermissions.includes("edit");
  const canEditSettings = settingsPermissions.includes("edit");
  const settingsLocked = canViewSettings && !canEditSettings;

  const refreshGiftCardsSummary = useCallback(async () => {
    try {
      const response = await api.get("/owner/gift-cards");
      const rows = Array.isArray(response.data) ? response.data : [];
      setSummary((current) => ({ ...current, giftCards: rows }));
    } catch {
      // Keep the last known summary if refresh fails.
    }
  }, []);

  const activeSection = useMemo(() => getSettingsSection(location.pathname), [location.pathname]);

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
          api.get("/owner/settings"),
          api.get("/owner/users"),
          api.get("/owner/custom-roles"),
          api.get("/owner/staff-schedule"),
          api.get("/owner/customers"),
          api.get("/owner/services"),
          api.get("/owner/memberships"),
          api.get("/owner/packages"),
          api.get("/owner/loyalty/rules"),
          api.get("/owner/coupons"),
          api.get("/owner/gift-cards"),
          api.get("/owner/incentives"),
          api.get("/owner/notifications"),
          api.get("/owner/feedback/reports"),
          api.get("/owner/expenses/accounts")
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
          incentives: rowsFromResponse(summaryResponses[10]),
          notifications: rowsFromResponse(summaryResponses[11]),
          feedbackSummary: objectFromResponse(summaryResponses[12], liveSummaryFallback.feedbackSummary).summary || liveSummaryFallback.feedbackSummary,
          expenseAccountInjections: objectFromResponse(summaryResponses[13], { injections: [] }).injections || []
        };
        setSummary(nextSummary);
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
  }, [canViewSettings, salonId]);

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
          isWorking: defaultShift?.active !== false,
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
                  isWorking: defaultShift?.active !== false,
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
    try {
      const response = await api.post("/owner/settings", {
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
      setStatus({ loading: false, error: "", success: "Settings workspace saved successfully." });
      writeSalonSettingsCache(salonId, response.data || {
        advancedSettings: form.advancedSettings,
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
      const response = await api.get("/owner/coupons");
      setSummary((current) => ({ ...current, coupons: Array.isArray(response.data) ? response.data : [] }));
    } catch {
      // keep last known list
    }
  }, []);

  const issueGiftCardFromSettings = async (event) => {
    event.preventDefault();
    setIssuingGiftCard(true);
    setStatus((current) => ({ ...current, error: "", success: "" }));
    try {
      await api.post("/owner/gift-cards", {
        ...giftCardDraft,
        originalAmount: Number(giftCardDraft.originalAmount)
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
                <span className="sub-section-title">Send appointment email</span>
                <label className="checkbox-option">
                  <input
                    type="checkbox"
                    checked={generic.sendAppointmentSms}
                    onChange={(e) => updateGeneric("sendAppointmentSms", e.target.checked)}
                  />
                  Send email to Guests
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
                <span className="sub-section-title">Send feedback email</span>
                <label className="checkbox-option">
                  <input
                    type="checkbox"
                    checked={form.advancedSettings.feedbackSetting.sendSms}
                    onChange={(e) => updateAdvancedObject("feedbackSetting", { sendSms: e.target.checked })}
                  />
                  Send email to Guests
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
    const shifts = form.advancedSettings.shiftManagement.shifts;
    const rosterModuleEnabled = form.advancedSettings.allowRosterMgtSettings !== false;
    const updateShift = (id, patch) => {
      updateAdvancedObject("shiftManagement", {
        shifts: shifts.map((shift) => shift.id === id ? { ...shift, ...patch } : shift)
      });
    };
    const addShift = () => {
      const newShift = { id: makeId("shift"), name: "", active: true, sameForAllDays: true, startTime: "09:00", endTime: "21:00", days: WEEK_DAYS.reduce((acc, day) => ({ ...acc, [day.key]: { startTime: "09:00", endTime: "21:00", active: true } }), {}), breakLabel: "", breaks: [] };
      updateAdvancedObject("shiftManagement", { shifts: [...shifts, newShift] });
      setSelectedShiftId(newShift.id);
    };
    const removeShift = (id) => {
      updateAdvancedObject("shiftManagement", { shifts: shifts.filter((shift) => shift.id !== id) });
      if (selectedShiftId === id) setSelectedShiftId(null);
    };

    const addBreak = (shiftId) => {
      const shift = shifts.find(s => s.id === shiftId);
      const newBreaks = [...(shift.breaks || []), { id: makeId("break"), name: "", active: true, fromTime: "", toTime: "" }];
      updateShift(shiftId, { breaks: newBreaks });
    };

    const updateBreak = (shiftId, breakId, patch) => {
      const shift = shifts.find(s => s.id === shiftId);
      const newBreaks = (shift.breaks || []).map(b => b.id === breakId ? { ...b, ...patch } : b);
      updateShift(shiftId, { breaks: newBreaks });
    };

    const removeBreak = (shiftId, breakId) => {
      const shift = shifts.find(s => s.id === shiftId);
      const newBreaks = (shift.breaks || []).filter(b => b.id !== breakId);
      updateShift(shiftId, { breaks: newBreaks });
    };

    const handleSameForAllDays = (shift, checked) => {
      const newDays = WEEK_DAYS.reduce((acc, day) => {
        const existing = shift.days?.[day.key] || {};
        acc[day.key] = {
          startTime: existing.startTime || shift.startTime || "09:00",
          endTime: existing.endTime || shift.endTime || "21:00",
          active: checked ? true : (existing.active !== false)
        };
        return acc;
      }, {});
      updateShift(shift.id, { sameForAllDays: checked, days: newDays, startTime: shift.days?.SUN?.startTime || shift.startTime, endTime: shift.days?.SUN?.endTime || shift.endTime });
    };
    const updateDayTime = (shift, dayKey, patch) => {
      const newDays = { ...(shift.days || {}), [dayKey]: { ...(shift.days?.[dayKey] || {}), ...patch } };
      updateShift(shift.id, { days: newDays });
    };
    const selectedShift = shifts.find(s => s.id === selectedShiftId) || shifts[0] || null;

    return (
      <>
        <SectionHeader title="Shift Management" description="Create reusable shift templates with per-day timing so roster planning stays consistent across staff, roles, and branches." badges={[`${shifts.length} shifts`, rosterModuleEnabled ? "Roster Enabled" : "Roster Locked"]} />
        {!rosterModuleEnabled ? (
          <div className="muted" style={{ marginBottom: 12, fontSize: 12 }}>
            Roster management is currently disabled from settings, so these templates stay visible for reference but should not be treated as editable live defaults until the module is enabled again.
          </div>
        ) : null}

        <div style={{ display: "grid", gridTemplateColumns: "minmax(220px, 320px) 1fr", gap: 16 }}>
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, padding: 12, height: "fit-content" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
              {shifts.map((shift) => (
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
              {shifts.length === 0 && (
                <div style={{ padding: "20px 14px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>No shifts yet</div>
              )}
            </div>
            <button
              type="button"
              onClick={addShift}
              disabled={!rosterModuleEnabled}
              style={{ width: "100%", padding: "10px 16px", background: "#3b82f6", color: "#fff", border: "none", borderRadius: 8, fontWeight: 600, cursor: "pointer", fontSize: 14 }}
            >
              Create New
            </button>
          </div>

          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, padding: 20 }}>
            {!selectedShift ? (
              <div style={{ padding: "60px 20px", textAlign: "center", color: "#94a3b8" }}>
                <strong>Select a shift to edit</strong>
                <div style={{ fontSize: 12, marginTop: 4 }}>Or create a new shift to get started.</div>
              </div>
            ) : (
              <>
                <h2 style={{ margin: 0, marginBottom: 16, fontSize: 20, fontWeight: 700, color: "#2563eb" }}>Shift Details</h2>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16, alignItems: "center" }}>
                  <label style={{ display: "block" }}>
                    <div style={{ fontSize: 13, color: "#475569", marginBottom: 4, fontWeight: 600 }}>Shift Name</div>
                    <input
                      disabled={!rosterModuleEnabled}
                      value={selectedShift.name}
                      onChange={(event) => updateShift(selectedShift.id, { name: event.target.value })}
                      placeholder="Enter shift name"
                      style={{ width: "100%", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: 14 }}
                    />
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      disabled={!rosterModuleEnabled}
                      checked={Boolean(selectedShift.active)}
                      onChange={(event) => updateShift(selectedShift.id, { active: event.target.checked })}
                      style={{ width: 18, height: 18 }}
                    />
                    <span style={{ fontSize: 14, fontWeight: 600 }}>Active</span>
                  </label>
                </div>

                <label style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "#f8fafc", borderRadius: 8, marginBottom: 16, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    disabled={!rosterModuleEnabled}
                    checked={Boolean(selectedShift.sameForAllDays)}
                    onChange={(event) => handleSameForAllDays(selectedShift, event.target.checked)}
                    style={{ width: 18, height: 18 }}
                  />
                  <span style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>Same For All Days</span>
                </label>

                {selectedShift.sameForAllDays ? (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                    <label>
                      <div style={{ fontSize: 13, color: "#475569", marginBottom: 4, fontWeight: 600 }}>Start Time</div>
                      <input
                        type="time"
                        disabled={!rosterModuleEnabled}
                        value={selectedShift.startTime || "09:00"}
                        onChange={(event) => {
                          const newDays = WEEK_DAYS.reduce((acc, day) => {
                            acc[day.key] = { ...(selectedShift.days?.[day.key] || {}), startTime: event.target.value, endTime: selectedShift.days?.[day.key]?.endTime || selectedShift.endTime || "21:00", active: selectedShift.days?.[day.key]?.active !== false };
                            return acc;
                          }, {});
                          updateShift(selectedShift.id, { startTime: event.target.value, days: newDays });
                        }}
                        style={{ width: "100%", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: 14 }}
                      />
                    </label>
                    <label>
                      <div style={{ fontSize: 13, color: "#475569", marginBottom: 4, fontWeight: 600 }}>End Time</div>
                      <input
                        type="time"
                        disabled={!rosterModuleEnabled}
                        value={selectedShift.endTime || "21:00"}
                        onChange={(event) => {
                          const newDays = WEEK_DAYS.reduce((acc, day) => {
                            acc[day.key] = { ...(selectedShift.days?.[day.key] || {}), startTime: selectedShift.days?.[day.key]?.startTime || selectedShift.startTime || "09:00", endTime: event.target.value, active: selectedShift.days?.[day.key]?.active !== false };
                            return acc;
                          }, {});
                          updateShift(selectedShift.id, { endTime: event.target.value, days: newDays });
                        }}
                        style={{ width: "100%", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: 14 }}
                      />
                    </label>
                  </div>
                ) : (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "120px 1fr 1fr 60px", gap: 12, padding: "8px 12px", background: "#f8fafc", borderRadius: "6px 6px 0 0", borderBottom: "1px solid #e2e8f0", fontSize: 12, fontWeight: 600, color: "#475569" }}>
                      <div>Day</div>
                      <div>Start Time</div>
                      <div>End Time</div>
                      <div>Active</div>
                    </div>
                    {WEEK_DAYS.map((day) => {
                      const dayData = selectedShift.days?.[day.key] || {};
                      return (
                        <div key={day.key} style={{ display: "grid", gridTemplateColumns: "120px 1fr 1fr 60px", gap: 12, padding: "10px 12px", borderBottom: "1px solid #f1f5f9", alignItems: "center" }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{day.label}</div>
                          <input
                            type="time"
                            disabled={!rosterModuleEnabled}
                            value={dayData.startTime || "09:00"}
                            onChange={(event) => updateDayTime(selectedShift, day.key, { startTime: event.target.value })}
                            style={{ width: "100%", padding: "6px 10px", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: 13 }}
                          />
                          <input
                            type="time"
                            disabled={!rosterModuleEnabled}
                            value={dayData.endTime || "21:00"}
                            onChange={(event) => updateDayTime(selectedShift, day.key, { endTime: event.target.value })}
                            style={{ width: "100%", padding: "6px 10px", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: 13 }}
                          />
                          <input
                            type="checkbox"
                            disabled={!rosterModuleEnabled}
                            checked={dayData.active !== false}
                            onChange={(event) => updateDayTime(selectedShift, day.key, { active: event.target.checked })}
                            style={{ width: 18, height: 18 }}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
                  <button
                    type="button"
                    onClick={() => addBreak(selectedShift.id)}
                    disabled={!rosterModuleEnabled}
                    style={{ padding: "8px 16px", background: "#3b82f6", color: "#fff", border: "none", borderRadius: 6, fontWeight: 600, cursor: "pointer", fontSize: 13 }}
                  >
                    Add Break Type
                  </button>
                </div>

                {(selectedShift.breaks || []).map((brk) => (
                  <div key={brk.id} style={{ padding: 16, background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0", position: "relative", marginBottom: 12 }}>
                    <button type="button" onClick={() => removeBreak(selectedShift.id, brk.id)} style={{ position: "absolute", top: 12, right: 12, background: "none", border: "none", cursor: "pointer", color: "#64748b", fontSize: 20, fontWeight: "bold", lineHeight: 1 }}>&times;</button>
                    <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 12 }}>
                      <label style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, color: "#475569", marginBottom: 4, fontWeight: 600 }}>Break Name</div>
                        <input value={brk.name} onChange={(e) => updateBreak(selectedShift.id, brk.id, { name: e.target.value })} placeholder="Enter Break Name" disabled={!rosterModuleEnabled} style={{ padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: 6, width: "100%", fontSize: 13, outline: "none" }} />
                      </label>
                      <label style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 18, cursor: "pointer" }}>
                        <input type="checkbox" checked={brk.active} onChange={(e) => updateBreak(selectedShift.id, brk.id, { active: e.target.checked })} disabled={!rosterModuleEnabled} style={{ width: 16, height: 16 }} />
                        <span style={{ fontSize: 13 }}>Active</span>
                      </label>
                    </div>
                    <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: 12 }}>
                      <div style={{ fontSize: 12, color: "#475569", marginBottom: 8, fontWeight: 600 }}>Break Timing</div>
                      <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#64748b" }}>
                          From
                          <input type="time" value={brk.fromTime} onChange={(e) => updateBreak(selectedShift.id, brk.id, { fromTime: e.target.value })} style={{ padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: 6, outline: "none" }} disabled={!rosterModuleEnabled} />
                        </label>
                        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#64748b" }}>
                          To
                          <input type="time" value={brk.toTime} onChange={(e) => updateBreak(selectedShift.id, brk.id, { toTime: e.target.value })} style={{ padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: 6, outline: "none" }} disabled={!rosterModuleEnabled} />
                        </label>
                      </div>
                    </div>
                  </div>
                ))}

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
                  <button
                    type="button"
                    onClick={() => removeShift(selectedShift.id)}
                    style={{ padding: "10px 24px", background: "#fff", border: "1px solid #ef4444", color: "#ef4444", borderRadius: 8, fontWeight: 600, cursor: "pointer", fontSize: 14 }}
                  >
                    Delete
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedShiftId(null)}
                    style={{ padding: "10px 24px", background: "#fff", border: "1px solid #cbd5e1", color: "#475569", borderRadius: 8, fontWeight: 600, cursor: "pointer", fontSize: 14 }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      updateAdvancedObject("shiftManagement", { shifts });
                    }}
                    style={{ padding: "10px 32px", background: "#3b82f6", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer", fontSize: 14 }}
                  >
                    Save
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
    const shifts = form.advancedSettings.shiftManagement.shifts;
    const rosterModuleEnabled = form.advancedSettings.allowRosterMgtSettings !== false;
    const updateRow = (id, patch) => updateAdvancedObject("rosterManagement", {
      rows: roster.rows.map((row) => row.id === id ? { ...row, ...patch } : row)
    });
    const applyShiftTemplate = () => {
      if (!rosterModuleEnabled) return;
      const selectedShift = shifts.find((item) => item.id === roster.useShiftId);
      if (!selectedShift) return;
      updateAdvancedObject("rosterManagement", {
        rows: roster.rows.map((row) => ({
          ...row,
          applyToAll: true,
          fromTime: selectedShift.startTime,
          toTime: selectedShift.endTime,
          isWorking: selectedShift.active,
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
            <input
              type="number"
              min="1"
              disabled={!rosterModuleEnabled}
              value={roster.applyFor || 1}
              onChange={(event) => updateAdvancedObject("rosterManagement", { applyFor: Number(event.target.value) || 1 })}
              style={{ width: 70, padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: 14 }}
            />
            <select
              disabled={!rosterModuleEnabled}
              value={roster.useShiftId}
              onChange={(event) => updateAdvancedObject("rosterManagement", { useShiftId: event.target.value })}
              style={{ minWidth: 220, padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: 14, background: "#fff" }}
            >
              <option value="">Select shift</option>
              {shifts.filter((shift) => shift.active !== false).map((shift) => <option key={shift.id} value={shift.id}>{shift.name || "Unnamed Shift"}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <button type="button" onClick={() => handleDateNav(-1)} disabled={!rosterModuleEnabled} style={{ padding: "6px 10px", border: "1px solid #cbd5e1", background: "#fff", borderRadius: 6, cursor: "pointer", fontSize: 14 }}>&larr;</button>
            <button type="button" onClick={() => updateAdvancedObject("rosterManagement", { selectedDate: new Date().toISOString().split("T")[0] })} disabled={!rosterModuleEnabled} style={{ padding: "6px 12px", border: "1px solid #cbd5e1", background: "#fff", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600, color: "#2563eb" }}>TODAY</button>
            <span style={{ padding: "6px 10px", fontSize: 14, fontWeight: 600, color: "#0f172a", minWidth: 110, textAlign: "center" }}>{formatDate(roster.selectedDate)}</span>
            <button type="button" onClick={() => handleDateNav(1)} disabled={!rosterModuleEnabled} style={{ padding: "6px 10px", border: "1px solid #cbd5e1", background: "#fff", borderRadius: 6, cursor: "pointer", fontSize: 14 }}>&rarr;</button>
            <button type="button" onClick={applyShiftTemplate} disabled={!rosterModuleEnabled} style={{ marginLeft: 8, padding: "6px 12px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Apply</button>
          </div>
        </div>

        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, overflow: "hidden" }}>
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
            style={{ padding: "10px 32px", background: "#3b82f6", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer", fontSize: 14 }}
          >
            Save
          </button>
        </div>
      </>
    );
  };

  const renderTaxSection = () => {
    const taxRows = form.advancedSettings.taxMapping.rates;
    const inclusiveTax = form.advancedSettings.taxMapping.inclusiveTax ?? false;

    const selectedRow = taxRows.find((r) => r.id === selectedTaxId) || null;

    const startCreate = () => {
      const newId = makeId("tax");
      setDraftTax({ id: newId, label: "", code: "", rate: 0, active: true, applicableFor: ["SERVICE", "PRODUCT"], _isNew: true });
      setSelectedTaxId(newId);
    };

    const startEdit = (row) => {
      setDraftTax({ ...row, _isNew: false });
      setSelectedTaxId(row.id);
    };

    const cancelDraft = () => {
      if (draftTax?._isNew) {
        setSelectedTaxId(null);
        setDraftTax(null);
      } else {
        setDraftTax(null);
      }
    };

    const saveDraft = () => {
      if (!draftTax) return;
      if (!draftTax.label.trim()) return;
      const { _isNew, ...clean } = draftTax;
      if (_isNew) {
        updateAdvancedObject("taxMapping", { rates: [...taxRows, clean] });
      } else {
        updateAdvancedObject("taxMapping", { rates: taxRows.map((r) => r.id === clean.id ? clean : r) });
      }
      setDraftTax(null);
      setSelectedTaxId(clean.id);
    };

    const deleteTax = (id) => {
      updateAdvancedObject("taxMapping", { rates: taxRows.filter((r) => r.id !== id) });
      if (selectedTaxId === id) { setSelectedTaxId(null); setDraftTax(null); }
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
          {/* LEFT PANEL — Tax List */}
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
                      padding: "12px 16px",
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
                      <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{row.code} | {row.rate}% {row.active ? "● Active" : "○ Inactive"}</div>
                    </div>
                    <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                      <button type="button" onClick={(e) => { e.stopPropagation(); startEdit(row); }} title="Edit tax" style={{ width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 6, cursor: "pointer", fontSize: 13, color: "#475569", padding: 0 }}>✎</button>
                      <button type="button" onClick={(e) => { e.stopPropagation(); deleteTax(row.id); }} title="Delete tax" style={{ width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 6, cursor: "pointer", fontSize: 13, color: "#dc2626", padding: 0 }}>✕</button>
                    </div>
                  </div>
                ))}
                {!taxRows.length && <div style={{ padding: 24, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>No taxes defined</div>}
              </div>
            </div>
          </div>

          {/* RIGHT PANEL — Form */}
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
                      style={{ width: 18, height: 18, accentColor: "#3b82f6", cursor: "pointer" }}
                    />
                    Active
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600, color: "#334155", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={inclusiveTax}
                      onChange={(e) => updateAdvancedObject("taxMapping", { inclusiveTax: e.target.checked })}
                      style={{ width: 18, height: 18, accentColor: "#3b82f6", cursor: "pointer" }}
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
                          checked={(draftTax?.applicableFor ?? (editing.applicableFor || [])).includes(key)}
                          onChange={() => draftTax && toggleApplicable(key)}
                          style={{ width: 16, height: 16, accentColor: "#3b82f6", cursor: "pointer" }}
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 20, paddingTop: 16, borderTop: "1px solid #f1f5f9" }}>
                  <button type="button" onClick={cancelDraft} style={{ padding: "10px 24px", background: "white", border: "1px solid #cbd5e1", borderRadius: 8, fontWeight: 600, cursor: "pointer", color: "#475569", fontSize: 13 }}>Cancel</button>
                  <button type="button" onClick={saveDraft} style={{ padding: "10px 24px", background: "#3b82f6", color: "white", border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer", fontSize: 13 }}>Save</button>
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
                <input type="checkbox" checked={loyalty.enabled} onChange={(e) => u({ enabled: e.target.checked })} style={{ width: 20, height: 20, accentColor: "#3b82f6", cursor: "pointer" }} />
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
              <input type="checkbox" checked={loyalty.earnIndividually} onChange={(e) => u({ earnIndividually: e.target.checked })} style={{ width: 18, height: 18, accentColor: "#3b82f6", cursor: "pointer" }} />
              Earn Loyalty on Service, Product and Package Individually
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, fontWeight: 600, color: "#334155", cursor: "pointer" }}>
              <input type="checkbox" checked={loyalty.skipEarnOnRedemption} onChange={(e) => u({ skipEarnOnRedemption: e.target.checked })} style={{ width: 18, height: 18, accentColor: "#3b82f6", cursor: "pointer" }} />
              Skip Earning Loyalty on Redemption
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, fontWeight: 600, color: "#334155", cursor: "pointer" }}>
              <input type="checkbox" checked={loyalty.earnOnMembershipApplied} onChange={(e) => u({ earnOnMembershipApplied: e.target.checked })} style={{ width: 18, height: 18, accentColor: "#3b82f6", cursor: "pointer" }} />
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
            <input type="checkbox" checked={loyalty.redeemIndividually} onChange={(e) => u({ redeemIndividually: e.target.checked })} style={{ width: 18, height: 18, accentColor: "#3b82f6", cursor: "pointer" }} />
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
    const feedbackTypes = feedback.types || [
      { id: "service-quality", name: "Service Quality", active: true },
      { id: "social-etiquette", name: "Social Etiquette", active: true },
      { id: "personal-hygiene", name: "Personal Hygiene", active: true },
      { id: "remark", name: "Remark", active: true }
    ];
    const activeCount = feedbackTypes.filter((type) => type.active).length;
    const updateFeedbackTypes = (newTypes) => {
      updateAdvancedObject("feedbackSetting", { types: newTypes });
    };

    const handleCreateType = () => {
      if (!newTypeName.trim()) return;
      const newType = { id: `type-${Date.now()}`, name: newTypeName.trim(), active: true };
      updateFeedbackTypes([...feedbackTypes, newType]);
      setNewTypeName("");
    };

    const handleUpdateType = (id, updates) => {
      updateFeedbackTypes(feedbackTypes.map(t => t.id === id ? { ...t, ...updates } : t));
    };

    const handleDeleteType = (id) => {
      updateFeedbackTypes(feedbackTypes.filter(t => t.id !== id));
      if (editingType?.id === id) setEditingType(null);
    };

    return (
      <>
        <SectionHeader
          title="Feedback Setting"
          description="Control how guest feedback is requested, escalated, and acknowledged from one polished workspace."
          badges={[feedback.enabled ? "Feedback On" : "Feedback Off", `${feedbackTypes.length} types`, `${activeCount} active`]}
          action={<Link className="secondary-button" to="/admin/feedback">Open Feedback Module</Link>}
        />
        <div className="muted" style={{ marginBottom: 16, fontSize: 12 }}>
          These values feed the live feedback settings endpoint, low-rating alert flow, and owner feedback workspace.
        </div>
        <div className="settings-panel-card">
          <div className="settings-toggle-grid">
            <ToggleRow checked={feedback.enabled} label="Enable feedback" onChange={(value) => updateAdvancedObject("feedbackSetting", { enabled: value })} />
            <ToggleRow checked={feedback.sendSms} label="Send feedback email" onChange={(value) => updateAdvancedObject("feedbackSetting", { sendSms: value })} />
            <ToggleRow checked={feedback.sendWhatsapp} label="Send follow-up email" onChange={(value) => updateAdvancedObject("feedbackSetting", { sendWhatsapp: value })} />
          </div>
          <div className="settings-form-grid" style={{ marginTop: 18 }}>
            <label className="settings-input-group"><span className="muted">Feedback delay (hours)</span><input type="number" value={feedback.feedbackDelayHours} onChange={(event) => updateAdvancedObject("feedbackSetting", { feedbackDelayHours: Number(event.target.value) })} /></label>
            <label className="settings-input-group"><span className="muted">Low rating alert email</span><input value={feedback.lowRatingAlertEmail} onChange={(event) => updateAdvancedObject("feedbackSetting", { lowRatingAlertEmail: event.target.value })} /></label>
            <label className="settings-input-group"><span className="muted">Rating prompt</span><textarea rows="3" value={feedback.ratingPrompt} onChange={(event) => updateAdvancedObject("feedbackSetting", { ratingPrompt: event.target.value })} /></label>
            <label className="settings-input-group"><span className="muted">Thank you message</span><textarea rows="3" value={feedback.thankYouMessage} onChange={(event) => updateAdvancedObject("feedbackSetting", { thankYouMessage: event.target.value })} /></label>
          </div>
        </div>

        <div className="settings-panel-card" style={{ marginTop: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#0f172a" }}>Feedback Type Details</h3>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span className="status-pill">{`${feedbackTypes.length} entries`}</span>
              <span className="status-pill">{feedback.enabled ? "Live" : "Disabled"}</span>
              <span className="status-pill">{`Delay ${feedback.feedbackDelayHours || 0}h`}</span>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(260px, 360px) 1fr", gap: 20, alignItems: "start" }}>
            <div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16, maxHeight: 440, overflow: "auto", paddingRight: 2 }}>
                {feedbackTypes.map((type) => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setEditingType(type)}
                    style={{
                      padding: "14px 16px",
                      border: editingType?.id === type.id ? "2px solid #3b82f6" : "1px solid #e2e8f0",
                      borderRadius: 12,
                      background: editingType?.id === type.id ? "linear-gradient(180deg, #eff6ff 0%, #dbeafe 100%)" : "#fff",
                      textAlign: "left",
                      fontSize: 14,
                      color: "#0f172a",
                      cursor: "pointer",
                      fontWeight: editingType?.id === type.id ? 600 : 500
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                      <span>{type.name}</span>
                      <span style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: "4px 8px",
                        borderRadius: 999,
                        color: type.active ? "#166534" : "#991b1b",
                        background: type.active ? "#dcfce7" : "#fee2e2"
                      }}>
                        {type.active ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  value={newTypeName}
                  onChange={(e) => setNewTypeName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreateType()}
                  placeholder="New feedback type name"
                  style={{ flex: 1, padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: 10, fontSize: 13 }}
                />
                <button
                  type="button"
                  onClick={handleCreateType}
                  style={{ padding: "10px 16px", background: "#3b82f6", color: "#fff", border: "none", borderRadius: 10, fontWeight: 600, cursor: "pointer", fontSize: 13 }}
                >
                  Create New
                </button>
              </div>
            </div>
            <div>
              {editingType ? (
                <div style={{ minHeight: 320 }}>
                  <label className="settings-input-group">
                    <span className="muted">Feedback Name</span>
                    <input value={editingType.name} onChange={(e) => handleUpdateType(editingType.id, { name: e.target.value })} />
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14, cursor: "pointer" }}>
                    <input type="checkbox" checked={editingType.active} onChange={(e) => handleUpdateType(editingType.id, { active: e.target.checked })} style={{ width: 18, height: 18 }} />
                    <span style={{ fontSize: 14, fontWeight: 600 }}>Active</span>
                  </label>
                  <div style={{ marginTop: 18, padding: 16, borderRadius: 12, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>How it works</div>
                    <div style={{ fontSize: 12, color: "#475569", lineHeight: 1.6 }}>
                      Feedback types stay synced with the live feedback request flow. When an invoice completes or a service closes, the selected type can be used to organize the request and follow-up sequence.
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 10, marginTop: 20, justifyContent: "flex-end", flexWrap: "wrap" }}>
                    <button type="button" onClick={() => handleDeleteType(editingType.id)} style={{ padding: "9px 16px", background: "#fff", border: "1px solid #ef4444", color: "#ef4444", borderRadius: 10, fontWeight: 600, cursor: "pointer", fontSize: 13 }}>Delete</button>
                    <button type="button" onClick={() => setEditingType(null)} style={{ padding: "9px 16px", background: "#fff", border: "1px solid #cbd5e1", color: "#475569", borderRadius: 10, fontWeight: 600, cursor: "pointer", fontSize: 13 }}>Cancel</button>
                    <button type="button" onClick={() => setEditingType(null)} style={{ padding: "9px 20px", background: "#3b82f6", color: "#fff", border: "none", borderRadius: 10, fontWeight: 700, cursor: "pointer", fontSize: 13 }}>Update</button>
                  </div>
                </div>
              ) : (
                <div style={{ padding: "48px 24px", textAlign: "center", color: "#94a3b8", fontSize: 13, border: "1px dashed #cbd5e1", borderRadius: 12, background: "#f8fafc" }}>
                  Select a feedback type to edit, or create a new one
                </div>
              )}
            </div>
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

  const renderProgramSection = (title, key, description, stats, linkTo) => {
    const section = form.advancedSettings[key];
    return (
      <>
        <SectionHeader title={title} description={description} badges={stats} action={linkTo ? <Link className="secondary-button" to={linkTo}>Open Module</Link> : null} />
        <div className="settings-panel-card">
          <div className="settings-toggle-grid">
            <ToggleRow checked={section.enabled} label={`Enable ${title}`} onChange={(value) => updateAdvancedObject(key, { enabled: value })} />
            {"expiryDays" in section ? <label className="settings-input-group"><span className="muted">Expiry days</span><input type="number" value={section.expiryDays} onChange={(event) => updateAdvancedObject(key, { expiryDays: Number(event.target.value) })} /></label> : null}
            {"pointsPerCurrency" in section ? <label className="settings-input-group"><span className="muted">Points per currency</span><input type="number" value={section.pointsPerCurrency} onChange={(event) => updateAdvancedObject(key, { pointsPerCurrency: Number(event.target.value) })} /></label> : null}
            {"minRedeemPoints" in section ? <label className="settings-input-group"><span className="muted">Minimum redeem points</span><input type="number" value={section.minRedeemPoints} onChange={(event) => updateAdvancedObject(key, { minRedeemPoints: Number(event.target.value) })} /></label> : null}
            {"maxRedeemPercent" in section ? <label className="settings-input-group"><span className="muted">Max redeem %</span><input type="number" value={section.maxRedeemPercent} onChange={(event) => updateAdvancedObject(key, { maxRedeemPercent: Number(event.target.value) })} /></label> : null}
            {"allowMultipleActivePlans" in section ? <ToggleRow checked={section.allowMultipleActivePlans} label="Allow multiple active plans" onChange={(value) => updateAdvancedObject(key, { allowMultipleActivePlans: value })} /> : null}
            {"autoRenewReminderDays" in section ? <label className="settings-input-group"><span className="muted">Auto-renew reminder days</span><input type="number" value={section.autoRenewReminderDays} onChange={(event) => updateAdvancedObject(key, { autoRenewReminderDays: Number(event.target.value) })} /></label> : null}
            {"gracePeriodDays" in section ? <label className="settings-input-group"><span className="muted">Grace period days</span><input type="number" value={section.gracePeriodDays} onChange={(event) => updateAdvancedObject(key, { gracePeriodDays: Number(event.target.value) })} /></label> : null}
            {"walletCarryForward" in section ? <ToggleRow checked={section.walletCarryForward} label="Wallet carry forward" onChange={(value) => updateAdvancedObject(key, { walletCarryForward: value })} /> : null}
            {"allowPartialRedeem" in section ? <ToggleRow checked={section.allowPartialRedeem} label="Allow partial redeem" onChange={(value) => updateAdvancedObject(key, { allowPartialRedeem: value })} /> : null}
            {"expiryReminderDays" in section ? <label className="settings-input-group"><span className="muted">Expiry reminder days</span><input type="number" value={section.expiryReminderDays} onChange={(event) => updateAdvancedObject(key, { expiryReminderDays: Number(event.target.value) })} /></label> : null}
            {"transferAllowed" in section ? <ToggleRow checked={section.transferAllowed} label="Allow transfer" onChange={(value) => updateAdvancedObject(key, { transferAllowed: value })} /> : null}
            {"validityDays" in section ? <label className="settings-input-group"><span className="muted">Validity days</span><input type="number" value={section.validityDays} onChange={(event) => updateAdvancedObject(key, { validityDays: Number(event.target.value) })} /></label> : null}
            {"minimumAmount" in section ? <label className="settings-input-group"><span className="muted">Minimum amount</span><input type="number" value={section.minimumAmount} onChange={(event) => updateAdvancedObject(key, { minimumAmount: Number(event.target.value) })} /></label> : null}
            {"maximumAmount" in section ? <label className="settings-input-group"><span className="muted">Maximum amount</span><input type="number" value={section.maximumAmount} onChange={(event) => updateAdvancedObject(key, { maximumAmount: Number(event.target.value) })} /></label> : null}
            {"stackable" in section ? <ToggleRow checked={section.stackable} label="Allow stackable coupons" onChange={(value) => updateAdvancedObject(key, { stackable: value })} /> : null}
            {"maxDiscountPercent" in section ? <label className="settings-input-group"><span className="muted">Max discount %</span><input type="number" value={section.maxDiscountPercent} onChange={(event) => updateAdvancedObject(key, { maxDiscountPercent: Number(event.target.value) })} /></label> : null}
            {"minimumBillAmount" in section ? <label className="settings-input-group"><span className="muted">Minimum bill amount</span><input type="number" value={section.minimumBillAmount} onChange={(event) => updateAdvancedObject(key, { minimumBillAmount: Number(event.target.value) })} /></label> : null}
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
          { key: "referralCodeSMS", label: "referralCodeSMS" },
          { key: "referrerRewardSMS", label: "referrerRewardSMS" }
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

    return (
      <>
        <SectionHeader title="Notification Settings" description="Define how business alerts travel across live channels like SMS." badges={[`${summary.notifications.filter((row) => !row.isRead).length} unread live alerts`]} action={<Link className="secondary-button" to="/admin/notifications">Open Notifications</Link>} />
        
        <div className="settings-panel-card" style={{ marginBottom: 20 }}>
          <div className="settings-toggle-grid">
            <ToggleRow checked={config.emailEnabled} label="Email alerts" onChange={(value) => updateAdvancedObject("notificationSettings", { emailEnabled: value })} />
            <ToggleRow checked={config.smsEnabled} label="Transaction email alerts" onChange={(value) => updateAdvancedObject("notificationSettings", { smsEnabled: value })} />
            <ToggleRow checked={config.whatsappEnabled} label="Follow-up email alerts" onChange={(value) => updateAdvancedObject("notificationSettings", { whatsappEnabled: value })} />
            <ToggleRow checked={config.pushEnabled} label="Push alerts" onChange={(value) => updateAdvancedObject("notificationSettings", { pushEnabled: value })} />
            <label className="settings-input-group"><span className="muted">Digest hour</span><input type="time" value={config.digestHour} onChange={(event) => updateAdvancedObject("notificationSettings", { digestHour: event.target.value })} /></label>
            <div className="settings-input-group" style={{ alignSelf: "end" }}><span className="muted" style={{ fontSize: 12 }}>Digest hour is stored for scheduled notification batching.</span></div>
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
                    gridTemplateColumns: "1fr 120px",
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
                        style={{ width: 16, height: 16, cursor: "pointer", accentColor: "#3b82f6" }}
                      />
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>SMS</span>
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
    const section = form.advancedSettings.giftCardSettings;
    const previewRows = (summary.giftCards || []).slice(0, 6);
    const gcTemplateDefaults = [
      { name: "Birthday Voucher", description: "Special birthday gift card for loyal customers", amount: 1000, validityDays: 90, renewalReminderDays: 7 },
      { name: "Festive Special", description: "Limited edition festive season gift card", amount: 2500, validityDays: 180, renewalReminderDays: 14 },
      { name: "Premium Package", description: "High-value gift card for premium services", amount: 5000, validityDays: 365, renewalReminderDays: 30 }
    ];
    const cardTemplates = (form.advancedSettings.giftCardSettings.templates || gcTemplateDefaults);
    return (
      <>
        <SectionHeader
          title="Gift Card"
          description="Configure gift card validity, amount bands, and operational readiness."
          badges={[`${summary.giftCards.length} gift cards`]}
          action={<Link className="secondary-button" to="/admin/gift-cards">Open Module</Link>}
        />
        <div className="settings-panel-card">
          <div className="settings-toggle-grid">
            <ToggleRow checked={section.enabled} label="Enable Gift Card" onChange={(value) => updateAdvancedObject("giftCardSettings", { enabled: value })} />
            <label className="settings-input-group"><span className="muted">Validity days</span><input type="number" value={section.validityDays} onChange={(event) => updateAdvancedObject("giftCardSettings", { validityDays: Number(event.target.value) })} /></label>
            <label className="settings-input-group"><span className="muted">Minimum amount</span><input type="number" value={section.minimumAmount} onChange={(event) => updateAdvancedObject("giftCardSettings", { minimumAmount: Number(event.target.value) })} /></label>
            <label className="settings-input-group"><span className="muted">Maximum amount</span><input type="number" value={section.maximumAmount} onChange={(event) => updateAdvancedObject("giftCardSettings", { maximumAmount: Number(event.target.value) })} /></label>
          </div>
        </div>

        <div className="settings-panel-card" style={{ marginTop: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <div>
              <h3 style={{ margin: 0, marginBottom: 14, fontSize: 16, fontWeight: 700, color: "#0f172a" }}>{auth?.membership?.salon?.name || "Salon"} - Gift Card</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
                {cardTemplates.map((template, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => { setCardForm({ name: template.name, description: template.description || "", active: true, amount: template.amount, validityDays: template.validityDays, renewalReminderDays: template.renewalReminderDays }); setEditingCard({ ...template, _idx: idx }); }}
                    style={{
                      padding: "10px 14px",
                      border: editingCard?._idx === idx ? "2px solid #3b82f6" : "1px solid #e2e8f0",
                      borderRadius: 8,
                      background: editingCard?._idx === idx ? "#eff6ff" : "#fff",
                      textAlign: "left",
                      fontSize: 14,
                      color: "#0f172a",
                      cursor: "pointer",
                      fontWeight: editingCard?._idx === idx ? 600 : 500
                    }}
                  >
                    {template.name}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => {
                  const name = window.prompt("Enter new gift card name:");
                  if (name && name.trim()) {
                    const newTemplate = { name: name.trim(), description: "", amount: 1000, validityDays: 30, renewalReminderDays: 7 };
                    const next = [...cardTemplates, newTemplate];
                    updateAdvancedObject("giftCardSettings", { templates: next });
                    setCardForm({ name: newTemplate.name, description: "", active: true, amount: 1000, validityDays: 30, renewalReminderDays: 7 });
                    setEditingCard({ ...newTemplate, _idx: next.length - 1 });
                  }
                }}
                style={{ width: "100%", padding: "10px 16px", background: "#3b82f6", color: "#fff", border: "none", borderRadius: 8, fontWeight: 600, cursor: "pointer", fontSize: 14 }}
              >
                Create New Gift Card
              </button>
            </div>
            <div>
              <h3 style={{ margin: 0, marginBottom: 14, fontSize: 16, fontWeight: 700, color: "#0f172a" }}>{editingCard ? "Edit Gift Card" : "Create New Gift Card"}</h3>
              <div className="settings-form-grid">
                <label className="settings-input-group"><span className="muted">Name</span><input value={cardForm.name} onChange={(e) => setCardForm({ ...cardForm, name: e.target.value })} placeholder="Enter Gift Card Name" /></label>
                <label className="settings-input-group"><span className="muted">Description</span><input value={cardForm.description} onChange={(e) => setCardForm({ ...cardForm, description: e.target.value })} placeholder="Enter Gift Card Description" /></label>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", gridColumn: "span 2" }}>
                  <input type="checkbox" checked={cardForm.active} onChange={(e) => setCardForm({ ...cardForm, active: e.target.checked })} style={{ width: 18, height: 18 }} />
                  <span style={{ fontSize: 14, fontWeight: 600 }}>Active</span>
                </label>
                <label className="settings-input-group"><span className="muted">Amount</span><input type="number" value={cardForm.amount} onChange={(e) => setCardForm({ ...cardForm, amount: e.target.value })} placeholder="Enter Amount" /></label>
                <label className="settings-input-group"><span className="muted">Validity (In days)</span><input type="number" value={cardForm.validityDays} onChange={(e) => setCardForm({ ...cardForm, validityDays: Number(e.target.value) })} placeholder="Enter Days" /></label>
                <label className="settings-input-group"><span className="muted">Renewal Reminder</span><input type="number" value={cardForm.renewalReminderDays} onChange={(e) => setCardForm({ ...cardForm, renewalReminderDays: Number(e.target.value) })} placeholder="In Days" /></label>
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 18, justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => {
                    if (editingCard?._idx !== undefined) {
                      const next = cardTemplates.map((t, i) => i === editingCard._idx ? { ...cardForm, amount: Number(cardForm.amount), validityDays: Number(cardForm.validityDays), renewalReminderDays: Number(cardForm.renewalReminderDays) } : t);
                      updateAdvancedObject("giftCardSettings", { templates: next });
                    }
                    setEditingCard(null);
                    setCardForm({ name: "", description: "", active: true, amount: "", validityDays: 30, renewalReminderDays: 7 });
                  }}
                  style={{ padding: "10px 24px", background: "#fff", border: "1px solid #cbd5e1", color: "#475569", borderRadius: 8, fontWeight: 600, cursor: "pointer", fontSize: 14 }}
                >
                  {editingCard ? "Cancel" : "Clear"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (editingCard?._idx !== undefined) {
                      const next = cardTemplates.map((t, i) => i === editingCard._idx ? { name: cardForm.name, description: cardForm.description, amount: Number(cardForm.amount), validityDays: Number(cardForm.validityDays), renewalReminderDays: Number(cardForm.renewalReminderDays) } : t);
                      updateAdvancedObject("giftCardSettings", { templates: next });
                    } else {
                      const newTemplate = { name: cardForm.name, description: cardForm.description, amount: Number(cardForm.amount), validityDays: Number(cardForm.validityDays), renewalReminderDays: Number(cardForm.renewalReminderDays) };
                      updateAdvancedObject("giftCardSettings", { templates: [...cardTemplates, newTemplate] });
                    }
                    setEditingCard(null);
                    setCardForm({ name: "", description: "", active: true, amount: "", validityDays: 30, renewalReminderDays: 7 });
                  }}
                  style={{ padding: "10px 28px", background: "#3b82f6", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer", fontSize: 14 }}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
                <div className="settings-panel-card">
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
      <SectionHeader title="Messaging Center" description="Configure SMTP or delivery-provider credentials, sender identity, and message-routing defaults without leaving settings." badges={[form.smsSettings.gatewayProvider.replace("_PLACEHOLDER", ""), form.smsSettings.senderId || "No Sender ID"]} action={<Link className="secondary-button" to="/admin/whatsapp">Open Messaging</Link>} />
      <div className="muted" style={{ marginBottom: 12, fontSize: 12 }}>
        Gateway/provider details are synced into the live messaging configuration used by notification, reminder, and manual outreach defaults.
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
              Provider, sender ID, and auth token are the live values pushed into messaging defaults. Extra notes were removed here to avoid fake saved fields with no runtime effect.
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
        <SectionHeader title="CRM Segment" description="Create reusable customer segments for campaigns, loyalty outreach, and targeted service pushes." badges={[`${segments.length} saved segments`, `${summary.customers.length} live customers`]} action={<Link className="secondary-button" to="/admin/campaigns">Open Campaigns</Link>} />
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
        <button type="button" onClick={() => updateArrayCollection("crmSegments", [...segments, { id: makeId("segment"), name: "", description: "", filterType: "ALL_CUSTOMERS", serviceId: "", active: true }])}>Create Segment</button>
      </>
    );
  };

  const renderReferralSection = () => {
    const referral = form.advancedSettings.referralSettings;
    const update = (patch) => updateAdvancedObject("referralSettings", patch);
    return (
      <>
        <SectionHeader
          title="Referral"
          description="Control whether referrals are active and define separate benefits for the referrer and the referred guest."
          badges={[referral.enabled ? "Enabled" : "Disabled", `Max Refer Limit ${referral.maxReferLimit}`]}
        />

        <div className="settings-panel-card" style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>Referral</span>
              <label style={{ position: "relative", display: "inline-block", width: 44, height: 24, cursor: "pointer" }}>
                <input type="checkbox" checked={referral.enabled} onChange={(e) => update({ enabled: e.target.checked })} style={{ opacity: 0, width: 0, height: 0 }} />
                <span style={{
                  position: "absolute", inset: 0, borderRadius: 12, transition: "0.3s",
                  background: referral.enabled ? "#2563eb" : "#cbd5e1"
                }} />
                <span style={{
                  position: "absolute", top: 2, left: referral.enabled ? 22 : 2, width: 20, height: 20,
                  borderRadius: "50%", background: "white", transition: "0.3s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)"
                }} />
              </label>
              <span style={{ fontSize: 13, color: referral.enabled ? "#2563eb" : "#64748b", fontWeight: 500 }}>
                {referral.enabled ? "Enabled" : "Disabled"}
              </span>
            </div>
            <div style={{ marginLeft: "auto" }}>
              <label className="settings-input-group" style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <span className="muted" style={{ whiteSpace: "nowrap" }}>Max Refer Limit</span>
                <input type="number" value={referral.maxReferLimit} onChange={(e) => update({ maxReferLimit: Number(e.target.value) })}
                  style={{ width: 100, padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: 13 }} />
              </label>
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {/* Benefit for Referral (Referrer) */}
          <div className="settings-panel-card">
            <div style={{ fontSize: 15, fontWeight: 600, color: "#2563eb", marginBottom: 20 }}>Benefit for Referral</div>
            <div style={{ display: "grid", gap: 16 }}>
              <label className="settings-input-group">
                <span className="muted">Max Benefit Amount</span>
                <input type="number" value={referral.referrerMaxBenefitAmount} onChange={(e) => update({ referrerMaxBenefitAmount: Number(e.target.value) })} />
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 10, alignItems: "end" }}>
                <label className="settings-input-group">
                  <span className="muted">Fixed Amount</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 13, color: "#64748b" }}>{formatMoney(1).replace(/[\d.,]/g, '').trim()}</span>
                    <input type="number" value={referral.referrerFixedAmount} onChange={(e) => update({ referrerFixedAmount: Number(e.target.value) })} style={{ flex: 1 }} />
                  </div>
                </label>
                <span style={{ fontSize: 13, color: "#94a3b8", paddingBottom: 4 }}>OR</span>
                <label className="settings-input-group">
                  <span className="muted">Percentage</span>
                  <input type="number" value={referral.referrerPercentage} onChange={(e) => update({ referrerPercentage: Number(e.target.value) })} />
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
                <input type="number" value={referral.referredMaxBenefitAmount} onChange={(e) => update({ referredMaxBenefitAmount: Number(e.target.value) })} />
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 10, alignItems: "end" }}>
                <label className="settings-input-group">
                  <span className="muted">Fixed Amount</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 13, color: "#64748b" }}>{formatMoney(1).replace(/[\d.,]/g, '').trim()}</span>
                    <input type="number" value={referral.referredFixedAmount} onChange={(e) => update({ referredFixedAmount: Number(e.target.value) })} style={{ flex: 1 }} />
                  </div>
                </label>
                <span style={{ fontSize: 13, color: "#94a3b8", paddingBottom: 4 }}>OR</span>
                <label className="settings-input-group">
                  <span className="muted">Percentage</span>
                  <input type="number" value={referral.referredPercentage} onChange={(e) => update({ referredPercentage: Number(e.target.value) })} />
                </label>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  };

  const renderSimpleListSection = (title, key, description, fieldDefs, options = {}) => {
    const rows = form.advancedSettings[key];
    const updateRow = (id, patch) => updateArrayCollection(key, rows.map((row) => row.id === id ? { ...row, ...patch } : row));
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
            <div key={row.id} className="settings-panel-card">
              <div className="settings-form-grid">
                {fieldDefs.map((field) => (
                  <label key={field.key} className="settings-input-group">
                    <span className="muted">{field.label}</span>
                    {field.type === "checkbox" ? (<label className="mini-toggle-label"><input type="checkbox" className="premium-toggle-input" checked={Boolean(row[field.key])} onChange={(event) => updateRow(row.id, { [field.key]: event.target.checked })} /><div className="mini-toggle-switch"></div></label>) : (
                      <input
                        type={field.type || "text"}
                        value={row[field.key]}
                        onChange={(event) => updateRow(row.id, { [field.key]: field.type === "number" ? Number(event.target.value) : event.target.value })}
                      />
                    )}
                  </label>
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
    const rows = [...form.advancedSettings.pnlCategories].sort((a, b) => {
      const leftSeq = Number(a.sequenceNumber || 0);
      const rightSeq = Number(b.sequenceNumber || 0);
      if (leftSeq !== rightSeq) return leftSeq - rightSeq;
      return String(a.name || "").localeCompare(String(b.name || ""));
    });
    const selectedRow = rows.find((row) => row.id === selectedPnlCategoryId) || null;
    const editing = draftPnlCategory || selectedRow;

    const startCreate = () => {
      const newId = makeId("pnl");
      setDraftPnlCategory({ id: newId, name: "", type: "Expense", sequenceNumber: rows.length ? Math.max(...rows.map((row) => Number(row.sequenceNumber || 0))) + 1 : 1, active: true, _isNew: true });
      setSelectedPnlCategoryId(newId);
    };

    const startEdit = (row) => {
      setDraftPnlCategory({ ...row, _isNew: false });
      setSelectedPnlCategoryId(row.id);
    };

    const cancelDraft = () => {
      if (draftPnlCategory?._isNew) {
        setSelectedPnlCategoryId(null);
      }
      setDraftPnlCategory(null);
    };

    const saveDraft = () => {
      if (!draftPnlCategory) return;
      const { _isNew, ...cleanDraft } = draftPnlCategory;
      const clean = {
        ...cleanDraft,
        name: String(cleanDraft.name || "").trim(),
        type: cleanDraft.type === "Income" ? "Income" : "Expense",
        sequenceNumber: Number(cleanDraft.sequenceNumber || 0),
        active: Boolean(cleanDraft.active)
      };
      if (!clean.name) return;
      const nextRows = _isNew
        ? [...form.advancedSettings.pnlCategories, clean]
        : form.advancedSettings.pnlCategories.map((row) => (row.id === clean.id ? clean : row));
      updateArrayCollection("pnlCategories", nextRows);
      setDraftPnlCategory(null);
      setSelectedPnlCategoryId(clean.id);
    };

    const deleteRow = (id) => {
      updateArrayCollection("pnlCategories", form.advancedSettings.pnlCategories.filter((row) => row.id !== id));
      if (selectedPnlCategoryId === id) {
        setSelectedPnlCategoryId(null);
        setDraftPnlCategory(null);
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
                <button type="button" onClick={startCreate} style={{ width: "100%", padding: "10px", background: "#3b82f6", color: "white", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: "pointer" }}>Create New</button>
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
                      <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                        #{row.sequenceNumber || 0} | {row.type || "Expense"} {row.active ? "• Active" : "• Inactive"}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                      <button type="button" onClick={(event) => { event.stopPropagation(); startEdit(row); }} style={{ width: 28, height: 28, background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 6, cursor: "pointer", color: "#475569" }}>✎</button>
                      <button type="button" onClick={(event) => { event.stopPropagation(); deleteRow(row.id); }} style={{ width: 28, height: 28, background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 6, cursor: "pointer", color: "#dc2626" }}>✕</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            {editing ? (
              <div className="settings-panel-card">
                <h3 style={{ color: "#3b82f6" }}>{draftPnlCategory?._isNew ? "Create PNL Category" : `Edit: ${editing.name || "Category"}`}</h3>
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
                      <option value="Income">Income</option>
                      <option value="Expense">Expense</option>
                    </select>
                  </label>
                </div>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600, color: "#334155", cursor: "pointer", marginBottom: 20 }}>
                  <input
                    type="checkbox"
                    checked={draftPnlCategory?.active ?? editing.active}
                    onChange={(event) => draftPnlCategory && setDraftPnlCategory({ ...draftPnlCategory, active: event.target.checked })}
                    style={{ width: 18, height: 18, accentColor: "#3b82f6", cursor: "pointer" }}
                  />
                  Active
                </label>
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 20, paddingTop: 16, borderTop: "1px solid #f1f5f9" }}>
                  <button type="button" onClick={cancelDraft} style={{ padding: "10px 24px", background: "white", border: "1px solid #cbd5e1", borderRadius: 8, fontWeight: 600, cursor: "pointer", color: "#475569", fontSize: 13 }}>Cancel</button>
                  <button type="button" onClick={saveDraft} style={{ padding: "10px 24px", background: "#3b82f6", color: "white", border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer", fontSize: 13 }}>Save</button>
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

    const makeDraftFromRow = (row, isNew = false) => ({
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
      startsAt: toDateInput(row?.startsAt),
      endsAt: toDateInput(row?.endsAt),
      isReferral: Boolean(row?.isReferral),
      isInfluencer: Boolean(row?.isInfluencer),
      isBirthday: Boolean(row?.isBirthday),
      isFestival: Boolean(row?.isFestival),
      isArchived: Boolean(row?.isArchived),
      notes: row?.notes || "",
      _isNew: isNew
    });

    const startCreate = () => {
      const newDraft = makeDraftFromRow({ code: "", title: "", discountType: "PERCENT", discountValue: 10, minBillAmount: 0, isArchived: false }, true);
      setDraftCoupon(newDraft);
      setSelectedCouponId(newDraft.id);
    };

    const startEdit = (row) => {
      setDraftCoupon(makeDraftFromRow(row, false));
      setSelectedCouponId(row.id);
    };

    const cancelDraft = () => {
      if (draftCoupon?._isNew) {
        setSelectedCouponId(rows[0]?.id || null);
      }
      setDraftCoupon(null);
    };

    const buildPayload = (draft) => ({
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
      startsAt: draft.startsAt || null,
      endsAt: draft.endsAt || null,
      isReferral: Boolean(draft.isReferral),
      isInfluencer: Boolean(draft.isInfluencer),
      isBirthday: Boolean(draft.isBirthday),
      isFestival: Boolean(draft.isFestival),
      isArchived: Boolean(draft.isArchived),
      notes: String(draft.notes || "").trim() || null
    });

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
          <div style={{ width: 320, flexShrink: 0 }}>
            <div className="settings-panel-card" style={{ padding: 0 }}>
              <div style={{ padding: "16px 16px 12px", borderBottom: "1px solid #f1f5f9" }}>
                <button type="button" onClick={startCreate} style={{ width: "100%", padding: "10px", background: "#3b82f6", color: "white", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: "pointer" }}>Create New Coupon</button>
              </div>
              <div style={{ padding: 12, borderBottom: "1px solid #f1f5f9" }}>
                <input
                  value={couponSearch}
                  onChange={(event) => setCouponSearch(event.target.value)}
                  placeholder="Search coupons..."
                  style={{ width: "100%", padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 14, boxSizing: "border-box" }}
                />
              </div>
              <div style={{ maxHeight: 520, overflowY: "auto" }}>
                {filteredRows.map((row) => (
                  <div
                    key={row.id}
                    style={{
                      padding: "14px 16px",
                      borderBottom: "1px solid #f1f5f9",
                      cursor: "pointer",
                      background: selectedCouponId === row.id ? "#eff6ff" : "white",
                      borderLeft: selectedCouponId === row.id ? "3px solid #3b82f6" : "3px solid transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12
                    }}
                  >
                    <div style={{ flex: 1 }} onClick={() => { setSelectedCouponId(row.id); setDraftCoupon(null); }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: "#0f172a" }}>{row.code || "Untitled Coupon"}</div>
                      <div style={{ fontSize: 12, color: "#475569", marginTop: 3 }}>{row.title || "No title"}{row.isArchived ? " • Archived" : " • Active"}</div>
                      <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                        {row.discountType === "PERCENT" ? `${row.discountValue}% off` : `₹${Number(row.discountValue || 0) || 0} off`} | Min bill {formatMoney(Number(row.minBillAmount || 0))}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                      <button
                        type="button"
                        onClick={(event) => { event.stopPropagation(); startEdit(row); }}
                        title="Edit coupon"
                        style={{ width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 6, cursor: "pointer", fontSize: 13, color: "#475569", padding: 0 }}
                      >
                        ✎
                      </button>
                      <button
                        type="button"
                        onClick={(event) => { event.stopPropagation(); toggleArchived(row); }}
                        title={row.isArchived ? "Restore coupon" : "Archive coupon"}
                        style={{ width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", background: row.isArchived ? "#eff6ff" : "#fef2f2", border: `1px solid ${row.isArchived ? "#bfdbfe" : "#fecaca"}`, borderRadius: 6, cursor: "pointer", fontSize: 13, color: row.isArchived ? "#1d4ed8" : "#dc2626", padding: 0 }}
                      >
                        {row.isArchived ? "↺" : "⨯"}
                      </button>
                    </div>
                  </div>
                ))}
                {!filteredRows.length && (
                  <div style={{ padding: "44px 16px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
                    <strong style={{ display: "block", marginBottom: 6 }}>No coupons found</strong>
                    <span>{couponSearch ? "Try a different search term." : "Create a coupon to manage discounts, campaigns, and POS offers."}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            {editing ? (
              <div className="settings-panel-card">
                <h3 style={{ color: "#3b82f6", marginTop: 0 }}>{draftCoupon?._isNew ? "Create Coupon" : `Update Coupon: ${editing.code || "Coupon"}`}</h3>
                <div className="settings-form-grid" style={{ marginBottom: 16 }}>
                  <label className="settings-input-group">
                    <span className="muted">Name</span>
                    <input
                      type="text"
                      value={draftCoupon?.title ?? editing.title}
                      onChange={(event) => draftCoupon && setDraftCoupon({ ...draftCoupon, title: event.target.value })}
                      placeholder="e.g. Summer Sale Discount"
                    />
                  </label>
                  <label className="settings-input-group">
                    <span className="muted">Code</span>
                    <input
                      type="text"
                      value={draftCoupon?.code ?? editing.code}
                      onChange={(event) => draftCoupon && setDraftCoupon({ ...draftCoupon, code: event.target.value.toUpperCase() })}
                      placeholder="e.g. SUMMER20"
                    />
                  </label>
                  <label className="settings-input-group">
                    <span className="muted">Description</span>
                    <input
                      type="text"
                      value={draftCoupon?.description ?? editing.description ?? ""}
                      onChange={(event) => draftCoupon && setDraftCoupon({ ...draftCoupon, description: event.target.value })}
                      placeholder="Optional description"
                    />
                  </label>
                  <label className="settings-input-group">
                    <span className="muted">Benefit Type</span>
                    <select
                      value={draftCoupon?.discountType ?? editing.discountType}
                      onChange={(event) => draftCoupon && setDraftCoupon({ ...draftCoupon, discountType: event.target.value })}
                    >
                      <option value="PERCENT">Percentage</option>
                      <option value="FIXED">Fixed Amount</option>
                    </select>
                  </label>
                  <label className="settings-input-group">
                    <span className="muted">Benefit Value in {formatMoney(1).replace(/1/g, "") || "₹"}</span>
                    <input
                      type="number"
                      min="0"
                      value={draftCoupon?.discountValue ?? editing.discountValue ?? 0}
                      onChange={(event) => draftCoupon && setDraftCoupon({ ...draftCoupon, discountValue: Number(event.target.value || 0) })}
                      placeholder="e.g. 20"
                    />
                  </label>
                  <label className="settings-input-group">
                    <span className="muted">Minimum Amount for Redemption</span>
                    <input
                      type="number"
                      min="0"
                      value={draftCoupon?.minBillAmount ?? editing.minBillAmount ?? 0}
                      onChange={(event) => draftCoupon && setDraftCoupon({ ...draftCoupon, minBillAmount: Number(event.target.value || 0) })}
                      placeholder="e.g. 500"
                    />
                  </label>
                  <label className="settings-input-group">
                    <span className="muted">Coupon Activated Date</span>
                    <input
                      type="date"
                      value={draftCoupon?.startsAt ?? editing.startsAt ? toDateInput(draftCoupon?.startsAt ?? editing.startsAt) : ""}
                      onChange={(event) => draftCoupon && setDraftCoupon({ ...draftCoupon, startsAt: event.target.value })}
                    />
                  </label>
                  <label className="settings-input-group">
                    <span className="muted">Validity End Date</span>
                    <input
                      type="date"
                      value={draftCoupon?.endsAt ?? editing.endsAt ? toDateInput(draftCoupon?.endsAt ?? editing.endsAt) : ""}
                      onChange={(event) => draftCoupon && setDraftCoupon({ ...draftCoupon, endsAt: event.target.value })}
                    />
                  </label>
                  <label className="settings-input-group">
                    <span className="muted">Max Used Count</span>
                    <input
                      type="number"
                      min="0"
                      value={draftCoupon?.usageLimit ?? editing.usageLimit ?? ""}
                      onChange={(event) => draftCoupon && setDraftCoupon({ ...draftCoupon, usageLimit: event.target.value })}
                      placeholder="Unlimited if empty"
                    />
                  </label>
                  <label className="settings-input-group">
                    <span className="muted">Customer Usage Limit</span>
                    <input
                      type="number"
                      min="0"
                      value={draftCoupon?.customerUsageLimit ?? editing.customerUsageLimit ?? ""}
                      onChange={(event) => draftCoupon && setDraftCoupon({ ...draftCoupon, customerUsageLimit: event.target.value })}
                      placeholder="Per customer"
                    />
                  </label>
                  <label className="settings-input-group">
                    <span className="muted">Branch</span>
                    <input
                      type="text"
                      value={draftCoupon?.branchId ?? editing.branchId ?? ""}
                      onChange={(event) => draftCoupon && setDraftCoupon({ ...draftCoupon, branchId: event.target.value })}
                      placeholder="Optional branch id"
                    />
                  </label>
                  <label className="settings-input-group">
                    <span className="muted">Service</span>
                    <input
                      type="text"
                      value={draftCoupon?.serviceId ?? editing.serviceId ?? ""}
                      onChange={(event) => draftCoupon && setDraftCoupon({ ...draftCoupon, serviceId: event.target.value })}
                      placeholder="Optional service id"
                    />
                  </label>
                  <label className="settings-input-group">
                    <span className="muted">Product</span>
                    <input
                      type="text"
                      value={draftCoupon?.productId ?? editing.productId ?? ""}
                      onChange={(event) => draftCoupon && setDraftCoupon({ ...draftCoupon, productId: event.target.value })}
                      placeholder="Optional product id"
                    />
                  </label>
                </div>

                <div className="settings-toggle-grid" style={{ marginBottom: 16 }}>
                  <ToggleRow checked={Boolean(draftCoupon?.isReferral ?? editing.isReferral)} label="Referral coupon" onChange={(value) => draftCoupon && setDraftCoupon({ ...draftCoupon, isReferral: value })} />
                  <ToggleRow checked={Boolean(draftCoupon?.isInfluencer ?? editing.isInfluencer)} label="Influencer coupon" onChange={(value) => draftCoupon && setDraftCoupon({ ...draftCoupon, isInfluencer: value })} />
                  <ToggleRow checked={Boolean(draftCoupon?.isBirthday ?? editing.isBirthday)} label="Birthday coupon" onChange={(value) => draftCoupon && setDraftCoupon({ ...draftCoupon, isBirthday: value })} />
                  <ToggleRow checked={Boolean(draftCoupon?.isFestival ?? editing.isFestival)} label="Festival coupon" onChange={(value) => draftCoupon && setDraftCoupon({ ...draftCoupon, isFestival: value })} />
                </div>

                <div className="settings-panel-card" style={{ marginBottom: 16, background: "#f8fafc" }}>
                  <div className="settings-panel-header-with-toggle" style={{ borderBottom: "none", marginBottom: 0, paddingBottom: 0 }}>
                    <h3 style={{ margin: 0, fontSize: 16 }}>Status</h3>
                    <div className="header-toggle-container">
                      <label className="toggle-switch-label">
                        <input
                          type="checkbox"
                          checked={!Boolean(draftCoupon?.isArchived ?? editing.isArchived)}
                          onChange={(event) => draftCoupon && setDraftCoupon({ ...draftCoupon, isArchived: !event.target.checked })}
                        />
                        <span className="toggle-switch-slider" />
                      </label>
                      <span className="toggle-status-text">{Boolean(draftCoupon?.isArchived ?? editing.isArchived) ? "Archived" : "Active"}</span>
                    </div>
                  </div>
                  <div className="muted" style={{ marginTop: 10, fontSize: 12 }}>
                    Archived coupons stay in history, but you can keep them out of active redemption workflows.
                  </div>
                </div>

                <label className="settings-input-group" style={{ marginBottom: 20 }}>
                  <span className="muted">Notes</span>
                  <textarea
                    rows="4"
                    value={draftCoupon?.notes ?? editing.notes ?? ""}
                    onChange={(event) => draftCoupon && setDraftCoupon({ ...draftCoupon, notes: event.target.value })}
                    placeholder="Optional internal notes"
                  />
                </label>

                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 20, paddingTop: 16, borderTop: "1px solid #f1f5f9" }}>
                  <button type="button" onClick={cancelDraft} disabled={saving} style={{ padding: "10px 24px", background: "white", border: "1px solid #cbd5e1", borderRadius: 8, fontWeight: 600, cursor: "pointer", color: "#475569", fontSize: 13 }}>Cancel</button>
                  <button type="button" onClick={saveDraft} disabled={saving} style={{ padding: "10px 24px", background: "#3b82f6", color: "white", border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer", fontSize: 13 }}>{saving ? "Saving..." : "Save"}</button>
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
    const rows = [...form.advancedSettings.pnlIncomeTaxes].sort((a, b) => Number(a.slabFrom || 0) - Number(b.slabFrom || 0));
    const selectedRow = rows.find((row) => row.id === selectedPnlIncomeTaxId) || null;
    const editing = draftPnlIncomeTax || selectedRow;

    const startCreate = () => {
      const newId = makeId("taxbucket");
      setDraftPnlIncomeTax({ id: newId, slabFrom: 0, slabTo: 0, rate: 0, active: true, _isNew: true });
      setSelectedPnlIncomeTaxId(newId);
    };

    const startEdit = (row) => {
      setDraftPnlIncomeTax({ ...row, _isNew: false });
      setSelectedPnlIncomeTaxId(row.id);
    };

    const cancelDraft = () => {
      if (draftPnlIncomeTax?._isNew) setSelectedPnlIncomeTaxId(null);
      setDraftPnlIncomeTax(null);
    };

    const saveDraft = () => {
      if (!draftPnlIncomeTax) return;
      const { _isNew, ...cleanDraft } = draftPnlIncomeTax;
      const clean = {
        ...cleanDraft,
        slabFrom: Number(cleanDraft.slabFrom || 0),
        slabTo: Number(cleanDraft.slabTo || 0),
        rate: Number(cleanDraft.rate || 0),
        name: cleanDraft.name || `${cleanDraft.slabFrom || 0}-${cleanDraft.slabTo || 0}`
      };
      const nextRows = _isNew
        ? [...form.advancedSettings.pnlIncomeTaxes, clean]
        : form.advancedSettings.pnlIncomeTaxes.map((row) => (row.id === clean.id ? clean : row));
      updateArrayCollection("pnlIncomeTaxes", nextRows);
      setDraftPnlIncomeTax(null);
      setSelectedPnlIncomeTaxId(clean.id);
    };

    const deleteRow = (id) => {
      updateArrayCollection("pnlIncomeTaxes", form.advancedSettings.pnlIncomeTaxes.filter((row) => row.id !== id));
      if (selectedPnlIncomeTaxId === id) {
        setSelectedPnlIncomeTaxId(null);
        setDraftPnlIncomeTax(null);
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
                <button type="button" onClick={startCreate} style={{ width: "100%", padding: "10px", background: "#3b82f6", color: "white", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: "pointer" }}>Create New</button>
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
                      <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{row.rate}% {row.active ? "• Active" : "○ Inactive"}</div>
                    </div>
                    <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                      <button type="button" onClick={(event) => { event.stopPropagation(); startEdit(row); }} style={{ width: 28, height: 28, background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 6, cursor: "pointer", color: "#475569" }}>✎</button>
                      <button type="button" onClick={(event) => { event.stopPropagation(); deleteRow(row.id); }} style={{ width: 28, height: 28, background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 6, cursor: "pointer", color: "#dc2626" }}>✕</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            {editing ? (
              <div className="settings-panel-card">
                <h3 style={{ color: "#3b82f6" }}>{draftPnlIncomeTax?._isNew ? "Create PNL Income Tax Slab" : "Edit PNL Income Tax Slab"}</h3>
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
                  <input type="checkbox" checked={draftPnlIncomeTax?.active ?? editing.active} onChange={(event) => draftPnlIncomeTax && setDraftPnlIncomeTax({ ...draftPnlIncomeTax, active: event.target.checked })} style={{ width: 18, height: 18, accentColor: "#3b82f6", cursor: "pointer" }} />
                  Active
                </label>
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 20, paddingTop: 16, borderTop: "1px solid #f1f5f9" }}>
                  <button type="button" onClick={cancelDraft} style={{ padding: "10px 24px", background: "white", border: "1px solid #cbd5e1", borderRadius: 8, fontWeight: 600, cursor: "pointer", color: "#475569", fontSize: 13 }}>Cancel</button>
                  <button type="button" onClick={saveDraft} style={{ padding: "10px 24px", background: "#3b82f6", color: "white", border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer", fontSize: 13 }}>Save</button>
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

  const renderIncentiveSection = () => {
    const incentive = form.advancedSettings.incentiveSettings;
    return (
      <>
        <SectionHeader title="Incentive" description="Set the default payout logic and approval approach before deeper incentive rules are configured." badges={[`${summary.incentives.length} live incentive rules`]} action={<Link className="secondary-button" to="/admin/incentives">Open Incentives</Link>} />
        <div className="muted" style={{ marginBottom: 12, fontSize: 12 }}>
          Saving here updates the default incentive rule that the live incentive/payroll modules can build on top of.
        </div>
        <div className="settings-panel-card">
          <div className="settings-toggle-grid">
            <ToggleRow checked={incentive.enabled} label="Enable incentives" onChange={(value) => updateAdvancedObject("incentiveSettings", { enabled: value })} />
            <ToggleRow checked={incentive.autoApprove} label="Auto-approve incentives" onChange={(value) => updateAdvancedObject("incentiveSettings", { autoApprove: value })} />
            <label className="settings-input-group">
              <span className="muted">Payout basis</span>
              <select value={incentive.payoutBasis} onChange={(event) => updateAdvancedObject("incentiveSettings", { payoutBasis: event.target.value })}>
                <option value="revenue">Revenue</option>
                <option value="services">Services</option>
                <option value="memberships">Memberships</option>
                <option value="fixed">Fixed</option>
              </select>
            </label>
            <label className="settings-input-group"><span className="muted">Default amount</span><input type="number" value={incentive.defaultAmount} onChange={(event) => updateAdvancedObject("incentiveSettings", { defaultAmount: Number(event.target.value) })} /></label>
            <label className="settings-input-group"><span className="muted">Notes</span><textarea rows="4" value={incentive.notes} onChange={(event) => updateAdvancedObject("incentiveSettings", { notes: event.target.value })} /></label>
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
      case "loyalty":
        return renderLoyaltySettingsSection();
      case "membership":
        return renderProgramSection("Membership", "membershipSettings", "Control recurring plan behavior and customer membership guardrails from settings.", [`${summary.memberships.length} live plans`], "/admin/memberships");
      case "packages":
        return renderProgramSection("Packages", "packageSettings", "Define package redemption and transfer defaults before staff manages packages live.", [`${summary.packages.length} live packages`], "/admin/packages");
      case "gift-card":
        return renderGiftCardSection();
      case "notification-settings":
        return renderNotificationsSection();
      case "sms-center":
        return renderSmsSection();
      case "crm-segment":
        return renderSegmentSection();
      case "coupons":
        return renderCouponsSection();
      case "referrals":
        return renderReferralSection();
      case "designation":
        return renderSimpleListSection("Designation", "designations", "Maintain staff titles that can be assigned across teams and branches.", [
          { key: "name", label: "Name" },
          { key: "description", label: "Description" },
          { key: "active", label: "Active", type: "checkbox" }
        ], {
          action: <Link className="secondary-button" to="/admin/users">Open Staff Users</Link>,
          helper: "Saved designations appear in the staff create/edit form and are stored against each staff profile."
        });
      case "privacy-policy":
        return renderLegalSection("Privacy Policy", "privacyPolicy");
      case "terms-and-conditions":
        return renderLegalSection("Terms & Conditions", "termsAndConditions");
      case "pnl-categories":
        return renderPnlCategoriesSection();
      case "pnl-income-taxes":
        return renderPnlIncomeTaxesSection();
      case "incentive":
        return renderIncentiveSection();
      case "footer-content":
        return renderFooterSection();
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
        <PageLoader title="Loading settings workspace" message="Bringing together generic settings, staff controls, incentives, tax mappings, and communication defaults." />
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



