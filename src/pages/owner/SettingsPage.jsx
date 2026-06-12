import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { api } from "../../api/client";
import EmptyState from "../../components/EmptyState";
import PageLoader from "../../components/PageLoader";
import { formatApiError } from "../../utils/apiError";
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
    productListHeading: "Products For Sale"
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
    rates: [
      { id: makeId("tax"), label: "Standard Tax", code: "STD", rate: 18, active: true }
    ]
  },
  feedbackSetting: {
    enabled: true,
    sendSms: true,
    sendWhatsapp: false,
    feedbackDelayHours: 24,
    ratingPrompt: "How was your salon experience?",
    lowRatingAlertEmail: "",
    thankYouMessage: ""
  },
  accessControl: {
    approvalRequiredForRoleEdits: true,
    branchScopedDefault: true,
    allowStaffExport: true,
    allowRosterOverrides: true
  },
  loyaltySettings: {
    enabled: true,
    pointsPerCurrency: 1,
    minRedeemPoints: 100,
    maxRedeemPercent: 20,
    expiryDays: 180
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
    alertEmail: ""
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
    referrerRewardMode: "fixed",
    referrerRewardValue: 500,
    referredRewardMode: "percent",
    referredRewardValue: 10
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
    { id: makeId("taxbucket"), name: "Service Tax", rate: 18, active: true }
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

const mergeAdvancedSettings = (raw = {}) => ({
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
  notificationSettings: { ...defaultAdvancedSettings.notificationSettings, ...(raw.notificationSettings || {}) },
  crmSegments: Array.isArray(raw.crmSegments) && raw.crmSegments.length ? raw.crmSegments : defaultAdvancedSettings.crmSegments,
  couponSettings: { ...defaultAdvancedSettings.couponSettings, ...(raw.couponSettings || {}) },
  referralSettings: { ...defaultAdvancedSettings.referralSettings, ...(raw.referralSettings || {}) },
  designations: Array.isArray(raw.designations) && raw.designations.length ? raw.designations : defaultAdvancedSettings.designations,
  legalContent: { ...defaultAdvancedSettings.legalContent, ...(raw.legalContent || {}) },
  pnlCategories: Array.isArray(raw.pnlCategories) && raw.pnlCategories.length ? raw.pnlCategories : defaultAdvancedSettings.pnlCategories,
  pnlIncomeTaxes: Array.isArray(raw.pnlIncomeTaxes) && raw.pnlIncomeTaxes.length ? raw.pnlIncomeTaxes : defaultAdvancedSettings.pnlIncomeTaxes,
  incentiveSettings: { ...defaultAdvancedSettings.incentiveSettings, ...(raw.incentiveSettings || {}) },
  footerContent: { ...defaultAdvancedSettings.footerContent, ...(raw.footerContent || {}) }
});

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
  services: [],
  memberships: [],
  packages: [],
  loyaltyRules: [],
  coupons: [],
  giftCards: [],
  incentives: [],
  notifications: []
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
  const [form, setForm] = useState(initialForm);
  const [paymentModes, setPaymentModes] = useState(defaultPaymentModes);
  const [summary, setSummary] = useState(liveSummaryFallback);
  const [status, setStatus] = useState({ loading: true, error: "", success: "" });
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());

  const activeSection = useMemo(() => getSettingsSection(location.pathname), [location.pathname]);

  const filteredSections = useMemo(() => {
    if (!deferredSearch) return SETTINGS_WORKSPACE_SECTIONS;
    return SETTINGS_WORKSPACE_SECTIONS.filter((item) => `${item.label} ${item.hint}`.toLowerCase().includes(deferredSearch));
  }, [deferredSearch]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const [settingsResponse, ...summaryResponses] = await Promise.allSettled([
          api.get("/owner/settings"),
          api.get("/owner/users"),
          api.get("/owner/custom-roles"),
          api.get("/owner/staff-schedule"),
          api.get("/owner/services"),
          api.get("/owner/memberships"),
          api.get("/owner/packages"),
          api.get("/owner/loyalty/rules"),
          api.get("/owner/coupons"),
          api.get("/owner/gift-cards"),
          api.get("/owner/incentives"),
          api.get("/owner/notifications")
        ]);

        if (!active) return;

        if (settingsResponse.status === "fulfilled" && settingsResponse.value.data) {
          const row = settingsResponse.value.data;
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
        }

        const nextSummary = {
          staffRows: rowsFromResponse(summaryResponses[0]),
          customRoles: rowsFromResponse(summaryResponses[1]),
          staffSchedules: rowsFromResponse(summaryResponses[2]),
          services: rowsFromResponse(summaryResponses[3]),
          memberships: rowsFromResponse(summaryResponses[4]),
          packages: rowsFromResponse(summaryResponses[5]),
          loyaltyRules: rowsFromResponse(summaryResponses[6]),
          coupons: rowsFromResponse(summaryResponses[7]),
          giftCards: rowsFromResponse(summaryResponses[8]),
          incentives: rowsFromResponse(summaryResponses[9]),
          notifications: rowsFromResponse(summaryResponses[10])
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
  }, []);

  useEffect(() => {
    if (!summary.staffRows.length) return;
    setForm((current) => {
      if (current.advancedSettings.rosterManagement.rows.length) return current;
      return {
        ...current,
        advancedSettings: {
          ...current.advancedSettings,
          rosterManagement: {
            ...current.advancedSettings.rosterManagement,
            rows: summary.staffRows.map((row) => ({
              id: row.id,
              staffName: row.user?.name || row.phone || "Staff",
              fromTime: "09:00",
              toTime: "21:00",
              isWorking: true,
              breakLabel: ""
            }))
          }
        }
      };
    });
  }, [summary.staffRows]);

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

  const renderGenericSection = () => {
    const generic = form.advancedSettings.genericSettings;
    return (
      <>
        <SectionHeader
          title="Generic Settings"
          description="Business timing, checkout defaults, catalogue behavior, customer booking rules, and front-facing content all live here now."
          badges={["Core setup", `Tax ${form.taxLabel}`, form.paymentGatewaySettings.paymentLinkEnabled ? "Payment Links On" : "Payment Links Off"]}
        />

        <div className="settings-column-layout">
          <div className="settings-column-stack">
            <div className="settings-panel-card">
              <h3>Business Settings</h3>
              <div className="settings-form-grid">
                <ToggleRow checked={generic.businessOpen} label="Business Open" helper="Owner-facing operating status for the salon." onChange={(value) => updateGeneric("businessOpen", value)} />
                <label className="settings-input-group">
                  <span className="muted">Business start</span>
                  <input type="time" value={generic.businessStart} onChange={(event) => updateGeneric("businessStart", event.target.value)} />
                </label>
                <label className="settings-input-group">
                  <span className="muted">Business end</span>
                  <input type="time" value={generic.businessEnd} onChange={(event) => updateGeneric("businessEnd", event.target.value)} />
                </label>
                <label className="settings-input-group">
                  <span className="muted">Applicable for</span>
                  <select value={generic.applicableFor} onChange={(event) => updateGeneric("applicableFor", event.target.value)}>
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                    <option value="both">Both</option>
                  </select>
                </label>
                <label className="settings-input-group">
                  <span className="muted">WhatsApp number</span>
                  <input value={form.whatsappNumber} onChange={(event) => setForm((current) => ({ ...current, whatsappNumber: event.target.value }))} placeholder="Salon WhatsApp number" />
                </label>
                <label className="settings-input-group">
                  <span className="muted">Tax label</span>
                  <input value={form.taxLabel} onChange={(event) => setForm((current) => ({ ...current, taxLabel: event.target.value }))} placeholder="Tax label" />
                </label>
              </div>

              <div className="settings-chip-grid" style={{ marginTop: 18 }}>
                {WEEK_DAYS.map((day) => {
                  const active = generic.weeklyOff.includes(day.key);
                  return (
                    <button
                      key={day.key}
                      type="button"
                      className={`settings-chip ${active ? "active" : ""}`}
                      onClick={() => updateGeneric("weeklyOff", active ? generic.weeklyOff.filter((item) => item !== day.key) : [...generic.weeklyOff, day.key])}
                    >
                      {day.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="settings-panel-card">
              <h3>Payment Modes</h3>
              <div className="badge-row">
                {Object.entries(paymentModes).map(([key, value]) => (
                  <button key={key} type="button" className={`settings-chip ${value ? "active" : ""}`} onClick={() => togglePaymentMode(key)}>
                    {key}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="settings-column-stack">
            <div className="settings-panel-card">
              <h3>Commerce & Booking</h3>
              <div className="settings-toggle-stack">
                <ToggleRow checked={generic.onlinePaymentEnabled} label="Online Payment" helper="Allow online order and appointment payment flows." onChange={(value) => updateGeneric("onlinePaymentEnabled", value)} />
                <ToggleRow checked={generic.productOrderingEnabled} label="Product Ordering" helper="Turn on commerce ordering widgets in the catalogue." onChange={(value) => updateGeneric("productOrderingEnabled", value)} />
                <ToggleRow checked={generic.pickupOrderingEnabled} label="Pickup Ordering" helper="Allow store pickup as an order fulfilment mode." onChange={(value) => updateGeneric("pickupOrderingEnabled", value)} />
                <ToggleRow checked={generic.cashOnPickupEnabled} label="Cash on Pickup" helper="Allow cash collection on pickup orders." onChange={(value) => updateGeneric("cashOnPickupEnabled", value)} />
                <ToggleRow checked={generic.homeDeliveryEnabled} label="Home Delivery" helper="Enable home delivery orders in the public catalogue." onChange={(value) => updateGeneric("homeDeliveryEnabled", value)} />
                <ToggleRow checked={generic.cashOnDeliveryEnabled} label="Cash on Delivery" helper="Allow COD for home delivery flows." onChange={(value) => updateGeneric("cashOnDeliveryEnabled", value)} />
                <ToggleRow checked={generic.appointmentBookingEnabled} label="Appointment Booking" helper="Keep guest booking live through public and CRM flows." onChange={(value) => updateGeneric("appointmentBookingEnabled", value)} />
                <ToggleRow checked={generic.sendAppointmentSms} label="Send Appointment SMS" helper="Push SMS confirmation and reminder nudges to guests." onChange={(value) => updateGeneric("sendAppointmentSms", value)} />
              </div>
              <div className="settings-form-grid" style={{ marginTop: 18 }}>
                <label className="settings-input-group">
                  <span className="muted">Minimum order value</span>
                  <input type="number" min="0" value={generic.minimumOrderValue} onChange={(event) => updateGeneric("minimumOrderValue", Number(event.target.value))} />
                </label>
                <label className="settings-input-group">
                  <span className="muted">Invoice prefix</span>
                  <input value={form.invoicePrefix} onChange={(event) => setForm((current) => ({ ...current, invoicePrefix: event.target.value }))} />
                </label>
                <label className="settings-input-group">
                  <span className="muted">UPI handle</span>
                  <input value={form.paymentGatewaySettings.upiHandle} onChange={(event) => setForm((current) => ({ ...current, paymentGatewaySettings: { ...current.paymentGatewaySettings, upiHandle: event.target.value } }))} placeholder="upi@bank" />
                </label>
                <label className="settings-input-group">
                  <span className="muted">Gateway</span>
                  <select value={form.paymentGatewaySettings.defaultGateway} onChange={(event) => setForm((current) => ({ ...current, paymentGatewaySettings: { ...current.paymentGatewaySettings, defaultGateway: event.target.value } }))}>
                    <option value="RAZORPAY_PLACEHOLDER">Razorpay Placeholder</option>
                    <option value="CASHFREE_PLACEHOLDER">Cashfree Placeholder</option>
                    <option value="PHONEPE_PLACEHOLDER">PhonePe Placeholder</option>
                    <option value="MANUAL_UPI_PLACEHOLDER">Manual UPI Placeholder</option>
                  </select>
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="settings-panel-card">
          <h3>Catalogue Presentation</h3>
          <div className="settings-toggle-grid">
            <ToggleRow checked={generic.showProductsOnHome} label="Show products on homepage" onChange={(value) => updateGeneric("showProductsOnHome", value)} />
            <ToggleRow checked={generic.showServicePdf} label="Show service PDF" onChange={(value) => updateGeneric("showServicePdf", value)} />
            <ToggleRow checked={generic.showProductPdf} label="Show product PDF" onChange={(value) => updateGeneric("showProductPdf", value)} />
            <ToggleRow checked={generic.showProductGrid} label="Show product grid" onChange={(value) => updateGeneric("showProductGrid", value)} />
            <ToggleRow checked={generic.showProductThumbnails} label="Show product thumbnails" onChange={(value) => updateGeneric("showProductThumbnails", value)} />
            <ToggleRow checked={generic.showAddButtonOnProductCard} label="Show add button on cards" onChange={(value) => updateGeneric("showAddButtonOnProductCard", value)} />
            <ToggleRow checked={generic.showGetQuoteButton} label="Show get quote button" onChange={(value) => updateGeneric("showGetQuoteButton", value)} />
            <ToggleRow checked={generic.showAllBranchesInCatalogue} label="Show all branches in catalogue" onChange={(value) => updateGeneric("showAllBranchesInCatalogue", value)} />
            <ToggleRow checked={generic.otpValidationOnRegistration} label="OTP validation on registration" onChange={(value) => updateGeneric("otpValidationOnRegistration", value)} />
            <ToggleRow checked={Boolean(form.paymentGatewaySettings.paymentLinkEnabled)} label="Payment links" onChange={(value) => setForm((current) => ({ ...current, paymentGatewaySettings: { ...current.paymentGatewaySettings, paymentLinkEnabled: value } }))} />
          </div>
          <div className="settings-form-grid" style={{ marginTop: 18 }}>
            <label className="settings-input-group">
              <span className="muted">Service list heading</span>
              <input value={generic.serviceListHeading} onChange={(event) => updateGeneric("serviceListHeading", event.target.value)} />
            </label>
            <label className="settings-input-group">
              <span className="muted">Product list heading</span>
              <input value={generic.productListHeading} onChange={(event) => updateGeneric("productListHeading", event.target.value)} />
            </label>
            <label className="settings-input-group">
              <span className="muted">Delivery disclaimer</span>
              <textarea rows="3" value={generic.deliveryDisclaimer} onChange={(event) => updateGeneric("deliveryDisclaimer", event.target.value)} />
            </label>
            <label className="settings-input-group">
              <span className="muted">Pickup disclaimer</span>
              <textarea rows="3" value={generic.pickupDisclaimer} onChange={(event) => updateGeneric("pickupDisclaimer", event.target.value)} />
            </label>
          </div>
        </div>

      </>
    );
  };

  const renderShiftSection = () => {
    const shifts = form.advancedSettings.shiftManagement.shifts;
    const updateShift = (id, patch) => {
      updateAdvancedObject("shiftManagement", {
        shifts: shifts.map((shift) => shift.id === id ? { ...shift, ...patch } : shift)
      });
    };
    const addShift = () => updateAdvancedObject("shiftManagement", {
      shifts: [...shifts, { id: makeId("shift"), name: "", active: true, startTime: "09:00", endTime: "21:00", days: WEEK_DAYS.map((item) => item.key), breakLabel: "" }]
    });
    const removeShift = (id) => updateAdvancedObject("shiftManagement", { shifts: shifts.filter((shift) => shift.id !== id) });

    return (
      <>
        <SectionHeader title="Shift Management" description="Create reusable shift templates so roster planning stays consistent across staff, roles, and branches." badges={[`${shifts.length} shifts`, form.advancedSettings.allowRosterMgtSettings ? "Roster Enabled" : "Roster Locked"]} />
        <div className="settings-list-stack">
          {shifts.map((shift) => (
            <div key={shift.id} className="settings-panel-card">
              <div className="section-heading">
                <h3>{shift.name || "New Shift"}</h3>
                <div className="inline-actions">
                  <span className={`badge ${shift.active ? "" : "badge-cancelled"}`}>{shift.active ? "Active" : "Inactive"}</span>
                  <button type="button" className="secondary-button" onClick={() => removeShift(shift.id)}>Remove</button>
                </div>
              </div>
              <div className="settings-form-grid">
                <label className="settings-input-group">
                  <span className="muted">Shift name</span>
                  <input value={shift.name} onChange={(event) => updateShift(shift.id, { name: event.target.value })} placeholder="Enter shift name" />
                </label>
                <label className="settings-input-group">
                  <span className="muted">Start time</span>
                  <input type="time" value={shift.startTime} onChange={(event) => updateShift(shift.id, { startTime: event.target.value })} />
                </label>
                <label className="settings-input-group">
                  <span className="muted">End time</span>
                  <input type="time" value={shift.endTime} onChange={(event) => updateShift(shift.id, { endTime: event.target.value })} />
                </label>
                <label className="settings-input-group">
                  <span className="muted">Break label</span>
                  <input value={shift.breakLabel || ""} onChange={(event) => updateShift(shift.id, { breakLabel: event.target.value })} placeholder="Lunch / Tea / Prayer" />
                </label>
              </div>
              <div className="settings-chip-grid" style={{ marginTop: 16 }}>
                {WEEK_DAYS.map((day) => {
                  const active = shift.days.includes(day.key);
                  return (
                    <button
                      key={day.key}
                      type="button"
                      className={`settings-chip ${active ? "active" : ""}`}
                      onClick={() => updateShift(shift.id, { days: active ? shift.days.filter((item) => item !== day.key) : [...shift.days, day.key] })}
                    >
                      {day.label}
                    </button>
                  );
                })}
              </div>
              <div style={{ marginTop: 16 }}>
                <ToggleRow checked={shift.active} label="Shift active" helper="Inactive templates stay in history but do not appear in selection lists." onChange={(value) => updateShift(shift.id, { active: value })} />
              </div>
            </div>
          ))}
        </div>
        <button type="button" onClick={addShift}>Create New Shift</button>

        <div className="settings-panel-card">
          <div className="section-heading">
            <h3>Assigned Staff Preview</h3>
            <span className="badge">Staff {summary.staffRows.length}</span>
          </div>
          <p className="muted" style={{ marginTop: 0 }}>
            Yahan se aap dekh sakte ho ke kaun staff roster/shift assignment ke liye available hai. Actual time assignment `Roster Management` mein hoti rahegi.
          </p>
          <div className="settings-list-stack">
            {summary.staffRows.map((row) => (
              <div key={row.id} className="list-item">
                <div className="item-head">
                  <strong>{row.user?.name || row.phone || "Staff Member"}</strong>
                  <span className="badge">{row.salonRole || "Role"}</span>
                </div>
                <div className="item-meta">
                  {row.branch?.name || "All branches"}
                  {row.customRole?.name ? ` | ${row.customRole.name}` : ""}
                  {row.showInCatalog ? " | Visible in catalog" : ""}
                </div>
              </div>
            ))}
            {!summary.staffRows.length && (
              <EmptyState
                title="No staff added yet"
                message="Jab naya staff add hoga to uska preview yahin nazar aayega, aur usko roster mein assign bhi kar sakenge."
              />
            )}
          </div>
        </div>
      </>
    );
  };

  const renderRosterSection = () => {
    const roster = form.advancedSettings.rosterManagement;
    const shifts = form.advancedSettings.shiftManagement.shifts;
    const updateRow = (id, patch) => updateAdvancedObject("rosterManagement", {
      rows: roster.rows.map((row) => row.id === id ? { ...row, ...patch } : row)
    });
    const applyShiftTemplate = () => {
      const selectedShift = shifts.find((item) => item.id === roster.useShiftId);
      if (!selectedShift) return;
      updateAdvancedObject("rosterManagement", {
        rows: roster.rows.map((row) => ({
          ...row,
          fromTime: selectedShift.startTime,
          toTime: selectedShift.endTime,
          isWorking: selectedShift.active
        }))
      });
    };

    return (
      <>
        <SectionHeader title="Roster Management" description="Use saved shifts as templates and keep a quick day-wise operating roster for all staff inside settings." badges={[`${roster.rows.length} staff rows`, `${summary.staffSchedules.length} live schedule rows`]} />
        <div className="settings-panel-card">
          <div className="settings-form-grid">
            <label className="settings-input-group">
              <span className="muted">Apply for</span>
              <input value={roster.applyFor} onChange={(event) => updateAdvancedObject("rosterManagement", { applyFor: event.target.value })} />
            </label>
            <label className="settings-input-group">
              <span className="muted">Use shift</span>
              <select value={roster.useShiftId} onChange={(event) => updateAdvancedObject("rosterManagement", { useShiftId: event.target.value })}>
                <option value="">Select shift</option>
                {shifts.map((shift) => <option key={shift.id} value={shift.id}>{shift.name || "Unnamed Shift"}</option>)}
              </select>
            </label>
            <label className="settings-input-group">
              <span className="muted">Selected date</span>
              <input type="date" value={roster.selectedDate} onChange={(event) => updateAdvancedObject("rosterManagement", { selectedDate: event.target.value })} />
            </label>
            <button type="button" onClick={applyShiftTemplate}>Apply Shift to All</button>
          </div>
        </div>
        <div className="settings-table-wrap">
          <table className="settings-table">
            <thead>
              <tr>
                <th>Staff</th>
                <th>From</th>
                <th>To</th>
                <th>Working</th>
                <th>Break</th>
              </tr>
            </thead>
            <tbody>
              {roster.rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.staffName}</td>
                  <td><input type="time" value={row.fromTime || "09:00"} onChange={(event) => updateRow(row.id, { fromTime: event.target.value })} /></td>
                  <td><input type="time" value={row.toTime || "21:00"} onChange={(event) => updateRow(row.id, { toTime: event.target.value })} /></td>
                  <td><label className="mini-toggle-label"><input type="checkbox" className="premium-toggle-input" checked={Boolean(row.isWorking)} onChange={(event) => updateRow(row.id, { isWorking: event.target.checked })} /><div className="mini-toggle-switch"></div></label></td>
                  <td><input value={row.breakLabel || ""} onChange={(event) => updateRow(row.id, { breakLabel: event.target.value })} placeholder="Add break" /></td>
                </tr>
              ))}
              {roster.rows.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ textAlign: "center", color: "#64748b", padding: "48px 24px", background: "#f8fafc" }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                      <strong>No staff members found</strong>
                      <span style={{ fontSize: "12px" }}>Staff roster is dynamically populated from your Users/Staff list. Please ensure staff exists in the database.</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </>
    );
  };

  const renderTaxSection = () => {
    const taxRows = form.advancedSettings.taxMapping.rates;
    const updateRate = (id, patch) => updateAdvancedObject("taxMapping", {
      rates: taxRows.map((rate) => rate.id === id ? { ...rate, ...patch } : rate)
    });
    const addRate = () => updateAdvancedObject("taxMapping", {
      rates: [...taxRows, { id: makeId("tax"), label: "", code: "", rate: 0, active: true }]
    });

    return (
      <>
        <SectionHeader title="Tax Mapping" description="Define named tax mappings for billing, services, packages, and reporting labels." badges={[`Tax label: ${form.taxLabel}`, `${taxRows.length} tax rows`]} />
        <div className="settings-list-stack">
          {taxRows.map((row) => (
            <div key={row.id} className="settings-panel-card">
              <div className="settings-form-grid">
                <label className="settings-input-group"><span className="muted">Label</span><input value={row.label} onChange={(event) => updateRate(row.id, { label: event.target.value })} /></label>
                <label className="settings-input-group"><span className="muted">Code</span><input value={row.code} onChange={(event) => updateRate(row.id, { code: event.target.value })} /></label>
                <label className="settings-input-group"><span className="muted">Rate %</span><input type="number" value={row.rate} onChange={(event) => updateRate(row.id, { rate: Number(event.target.value) })} /></label>
                <ToggleRow checked={row.active} label="Active" onChange={(value) => updateRate(row.id, { active: value })} />
              </div>
            </div>
          ))}
        </div>
        <button type="button" onClick={addRate}>Add Tax Mapping</button>
      </>
    );
  };

  const renderFeedbackSection = () => {
    const feedback = form.advancedSettings.feedbackSetting;
    return (
      <>
        <SectionHeader title="Feedback Setting" description="Control how and when guest feedback is requested, escalated, and acknowledged." badges={[feedback.enabled ? "Feedback On" : "Feedback Off"]} action={<Link className="secondary-button" to="/admin/feedback">Open Feedback Module</Link>} />
        <div className="settings-panel-card">
          <div className="settings-toggle-grid">
            <ToggleRow checked={feedback.enabled} label="Enable feedback" onChange={(value) => updateAdvancedObject("feedbackSetting", { enabled: value })} />
            <ToggleRow checked={feedback.sendSms} label="Send SMS" onChange={(value) => updateAdvancedObject("feedbackSetting", { sendSms: value })} />
            <ToggleRow checked={feedback.sendWhatsapp} label="Send WhatsApp" onChange={(value) => updateAdvancedObject("feedbackSetting", { sendWhatsapp: value })} />
          </div>
          <div className="settings-form-grid" style={{ marginTop: 18 }}>
            <label className="settings-input-group"><span className="muted">Feedback delay (hours)</span><input type="number" value={feedback.feedbackDelayHours} onChange={(event) => updateAdvancedObject("feedbackSetting", { feedbackDelayHours: Number(event.target.value) })} /></label>
            <label className="settings-input-group"><span className="muted">Low rating alert email</span><input value={feedback.lowRatingAlertEmail} onChange={(event) => updateAdvancedObject("feedbackSetting", { lowRatingAlertEmail: event.target.value })} /></label>
            <label className="settings-input-group"><span className="muted">Rating prompt</span><textarea rows="3" value={feedback.ratingPrompt} onChange={(event) => updateAdvancedObject("feedbackSetting", { ratingPrompt: event.target.value })} /></label>
            <label className="settings-input-group"><span className="muted">Thank you message</span><textarea rows="3" value={feedback.thankYouMessage} onChange={(event) => updateAdvancedObject("feedbackSetting", { thankYouMessage: event.target.value })} /></label>
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
    return (
      <>
        <SectionHeader title="Notification Settings" description="Define how business alerts travel across email, SMS, WhatsApp, and digest windows." badges={[`${summary.notifications.filter((row) => !row.isRead).length} unread live alerts`]} action={<Link className="secondary-button" to="/admin/notifications">Open Notifications</Link>} />
        <div className="settings-panel-card">
          <div className="settings-toggle-grid">
            <ToggleRow checked={config.emailEnabled} label="Email alerts" onChange={(value) => updateAdvancedObject("notificationSettings", { emailEnabled: value })} />
            <ToggleRow checked={config.smsEnabled} label="SMS alerts" onChange={(value) => updateAdvancedObject("notificationSettings", { smsEnabled: value })} />
            <ToggleRow checked={config.whatsappEnabled} label="WhatsApp alerts" onChange={(value) => updateAdvancedObject("notificationSettings", { whatsappEnabled: value })} />
            <ToggleRow checked={config.pushEnabled} label="Push alerts" onChange={(value) => updateAdvancedObject("notificationSettings", { pushEnabled: value })} />
            <label className="settings-input-group"><span className="muted">Digest hour</span><input type="time" value={config.digestHour} onChange={(event) => updateAdvancedObject("notificationSettings", { digestHour: event.target.value })} /></label>
            <label className="settings-input-group"><span className="muted">Alert email</span><input value={config.alertEmail} onChange={(event) => updateAdvancedObject("notificationSettings", { alertEmail: event.target.value })} /></label>
          </div>
        </div>
      </>
    );
  };

  const renderSmsSection = () => (
    <>
      <SectionHeader title="SMS Center" description="Configure SMS gateway credentials, sender identity, and message-routing defaults without leaving settings." badges={[form.smsSettings.gatewayProvider.replace("_PLACEHOLDER", ""), form.smsSettings.senderId || "No Sender ID"]} action={<Link className="secondary-button" to="/admin/whatsapp">Open Messaging</Link>} />
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
          <label className="settings-input-group">
            <span className="muted">Gateway notes</span>
            <textarea rows="3" value={form.paymentGatewaySettings.gatewayNotes} onChange={(event) => setForm((current) => ({ ...current, paymentGatewaySettings: { ...current.paymentGatewaySettings, gatewayNotes: event.target.value } }))} />
          </label>
        </div>
      </div>
    </>
  );

  const renderSegmentSection = () => {
    const segments = form.advancedSettings.crmSegments;
    const updateSegment = (id, patch) => updateArrayCollection("crmSegments", segments.map((item) => item.id === id ? { ...item, ...patch } : item));
    return (
      <>
        <SectionHeader title="CRM Segment" description="Create reusable customer segments for campaigns, loyalty outreach, and targeted service pushes." badges={[`${segments.length} saved segments`]} action={<Link className="secondary-button" to="/admin/campaigns">Open Campaigns</Link>} />
        <div className="settings-list-stack">
          {segments.map((segment) => (
            <div key={segment.id} className="settings-panel-card">
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
    return (
      <>
        <SectionHeader title="Referrals" description="Control whether referrals are active and define separate benefits for the referrer and the referred guest." badges={[referral.enabled ? "Referral Enabled" : "Referral Disabled", `Limit ${referral.maxReferLimit}`]} />
        <div className="settings-panel-card">
          <div className="settings-toggle-grid">
            <ToggleRow checked={referral.enabled} label="Enable referral program" onChange={(value) => updateAdvancedObject("referralSettings", { enabled: value })} />
            <label className="settings-input-group"><span className="muted">Max refer limit</span><input type="number" value={referral.maxReferLimit} onChange={(event) => updateAdvancedObject("referralSettings", { maxReferLimit: Number(event.target.value) })} /></label>
            <label className="settings-input-group">
              <span className="muted">Referrer reward mode</span>
              <select value={referral.referrerRewardMode} onChange={(event) => updateAdvancedObject("referralSettings", { referrerRewardMode: event.target.value })}>
                <option value="fixed">Fixed</option>
                <option value="percent">Percent</option>
              </select>
            </label>
            <label className="settings-input-group"><span className="muted">Referrer reward value</span><input type="number" value={referral.referrerRewardValue} onChange={(event) => updateAdvancedObject("referralSettings", { referrerRewardValue: Number(event.target.value) })} /></label>
            <label className="settings-input-group">
              <span className="muted">Referred guest reward mode</span>
              <select value={referral.referredRewardMode} onChange={(event) => updateAdvancedObject("referralSettings", { referredRewardMode: event.target.value })}>
                <option value="fixed">Fixed</option>
                <option value="percent">Percent</option>
              </select>
            </label>
            <label className="settings-input-group"><span className="muted">Referred guest reward value</span><input type="number" value={referral.referredRewardValue} onChange={(event) => updateAdvancedObject("referralSettings", { referredRewardValue: Number(event.target.value) })} /></label>
          </div>
        </div>
      </>
    );
  };

  const renderSimpleListSection = (title, key, description, fieldDefs) => {
    const rows = form.advancedSettings[key];
    const updateRow = (id, patch) => updateArrayCollection(key, rows.map((row) => row.id === id ? { ...row, ...patch } : row));
    return (
      <>
        <SectionHeader title={title} description={description} badges={[`${rows.length} entries`]} />
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
      <SectionHeader title={title} description={`Keep ${title.toLowerCase()} editable directly from the owner settings workspace.`} badges={[form.advancedSettings.legalContent[key] ? "Configured" : "Draft"]} />
      <div className="settings-panel-card">
        <textarea rows="14" value={form.advancedSettings.legalContent[key]} onChange={(event) => updateAdvancedObject("legalContent", { [key]: event.target.value })} placeholder={`Write ${title.toLowerCase()} here`} />
      </div>
    </>
  );

  const renderIncentiveSection = () => {
    const incentive = form.advancedSettings.incentiveSettings;
    return (
      <>
        <SectionHeader title="Incentive" description="Set the default payout logic and approval approach before deeper incentive rules are configured." badges={[`${summary.incentives.length} live incentive rules`]} action={<Link className="secondary-button" to="/admin/incentives">Open Incentives</Link>} />
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
        <SectionHeader title="Footer Content" description="Manage receipt footer messaging and brand footer copy from one polished editor." badges={[form.invoiceFooter ? "Invoice Footer Ready" : "Invoice Footer Empty"]} />
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
        return renderProgramSection("Loyalty", "loyaltySettings", "Set the default loyalty engine values before running live rules and adjustments.", [`${summary.loyaltyRules.length} live rules`], "/admin/loyalty");
      case "membership":
        return renderProgramSection("Membership", "membershipSettings", "Control recurring plan behavior and customer membership guardrails from settings.", [`${summary.memberships.length} live plans`], "/admin/memberships");
      case "packages":
        return renderProgramSection("Packages", "packageSettings", "Define package redemption and transfer defaults before staff manages packages live.", [`${summary.packages.length} live packages`], "/admin/packages");
      case "gift-card":
        return renderProgramSection("Gift Card", "giftCardSettings", "Configure gift card validity, amount bands, and operational readiness.", [`${summary.giftCards.length} gift cards`], "/admin/gift-cards");
      case "notification-settings":
        return renderNotificationsSection();
      case "sms-center":
        return renderSmsSection();
      case "crm-segment":
        return renderSegmentSection();
      case "coupons":
        return renderProgramSection("Coupons", "couponSettings", "Keep coupon behavior controlled centrally while marketing and POS continue using live coupons.", [`${summary.coupons.length} live coupons`], "/admin/coupons");
      case "referrals":
        return renderReferralSection();
      case "designation":
        return renderSimpleListSection("Designation", "designations", "Maintain staff titles that can be assigned across teams and branches.", [
          { key: "name", label: "Name" },
          { key: "description", label: "Description" },
          { key: "active", label: "Active", type: "checkbox" }
        ]);
      case "privacy-policy":
        return renderLegalSection("Privacy Policy", "privacyPolicy");
      case "terms-and-conditions":
        return renderLegalSection("Terms & Conditions", "termsAndConditions");
      case "pnl-categories":
        return renderSimpleListSection("PNL Categories", "pnlCategories", "Build your own income and expense buckets for future reports and controls.", [
          { key: "name", label: "Name" },
          { key: "type", label: "Type" },
          { key: "active", label: "Active", type: "checkbox" }
        ]);
      case "pnl-income-taxes":
        return renderSimpleListSection("PNL Income Taxes", "pnlIncomeTaxes", "Track tax buckets used in PNL and financial reporting.", [
          { key: "name", label: "Name" },
          { key: "rate", label: "Rate", type: "number" },
          { key: "active", label: "Active", type: "checkbox" }
        ]);
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
      <div className="settings-page-header">
        <div className="settings-header-title">
          <h1>Skillify ERP Settings</h1>
          <p>Search, configure, and govern salon-wide behavior from one polished settings hub instead of scattering controls across the main sidebar.</p>
        </div>
        <div className="settings-header-actions">
          <div className="badge-row">
            {liveStats.slice(0, 4).map((item) => <span key={item.label} className="badge">{item.label} {item.value}</span>)}
          </div>
          <button type="button" className="secondary-button" onClick={() => navigate("/admin/dashboard")}>Back to Dashboard</button>
          <button type="button" className="btn-save-workspace" onClick={saveWorkspace} disabled={saving}>{saving ? "Saving..." : "Save Workspace"}</button>
        </div>
      </div>

      {status.error ? <div className="settings-panel-card"><p className="error-text">{status.error}</p></div> : null}
      {status.success ? <div className="settings-panel-card"><p className="success-text">{status.success}</p></div> : null}

      {status.loading ? (
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

            <div className="settings-panel-card">
              <div className="section-heading">
                <h3>Operational Notes</h3>
                <span className="badge">Global Save</span>
              </div>
              <div className="settings-form-grid">
                <label className="settings-input-group">
                  <span className="muted">Booking notes</span>
                  <textarea rows="4" value={form.bookingNotes} onChange={(event) => setForm((current) => ({ ...current, bookingNotes: event.target.value }))} />
                </label>
                <label className="settings-input-group">
                  <span className="muted">Cancellation policy</span>
                  <textarea rows="4" value={form.cancellationPolicy} onChange={(event) => setForm((current) => ({ ...current, cancellationPolicy: event.target.value }))} />
                </label>
              </div>
              <div style={{ marginTop: 18 }}>
                <ToggleRow checked={form.allowNegativeStock} label="Allow negative stock" helper="Emergency override for checkout and stock-moving edge cases." onChange={(value) => setForm((current) => ({ ...current, allowNegativeStock: value }))} />
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
