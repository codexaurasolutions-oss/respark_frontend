# Phase 1 Panel-Wise Checklist

This checklist is arranged by panel/surface so testing is easier.

## 1. Public Website / Public Pages

### Core Pages
- [ ] Home page opens
- [ ] Features page opens
- [ ] Pricing page opens
- [ ] Platform page opens
- [ ] Book Demo page opens
- [ ] Public navigation works
- [ ] Mobile menu works
- [ ] Basic SEO title/description exists on main pages

### Demo Lead Flow
- [ ] Demo form submits successfully
- [ ] Submitted demo lead appears in Super Admin panel
- [ ] Demo lead can be approved
- [ ] Demo lead can be rejected
- [ ] Approved demo creates trial salon + owner

### Public Settings Effects
- [ ] WhatsApp button works when number exists
- [ ] Maintenance mode notice/behavior can be verified if enabled

## 2. Super Admin Panel

### Login / Access
- [ ] Super Admin login works
- [ ] Super Admin can access dashboard
- [ ] Super Admin remains allowed during maintenance mode

### Dashboard
- [ ] Total salons visible
- [ ] Subscription/trial/expired/suspended overview visible
- [ ] High-level business widgets visible

### Salon Management
- [ ] Salons list opens
- [ ] Salon create works
- [ ] Salon edit works
- [ ] Salon detail view works
- [ ] Business type field works
- [ ] Tax settings/basic financial fields work
- [ ] Internal support note visible only in Super Admin
- [ ] Trial start date works
- [ ] Trial end date works
- [ ] Owner info visible on salon detail
- [ ] Salon status can be changed
- [ ] Salon archive works

### Subscription & Plans
- [ ] Plans list opens
- [ ] Plan create works
- [ ] Plan edit works
- [ ] Plan feature flags save correctly
- [ ] Plan limits save correctly
- [ ] Custom plan flag works
- [ ] Storage limit placeholder field works
- [ ] Subscriptions list opens
- [ ] Subscription create works
- [ ] Subscription edit works
- [ ] Payment status field works
- [ ] Manual discount works
- [ ] Subscription history/lifecycle visible

### Feature Access Control
- [ ] Feature flags can be enabled/disabled per salon
- [ ] Disabled modules are blocked/hidden correctly
- [ ] Feature readback shows updated state

### Demo Leads
- [ ] Demo leads list opens
- [ ] Submitted leads appear in list
- [ ] Approve action works
- [ ] Reject action works
- [ ] Approved lead cannot be rejected directly

### SaaS Support Tickets
- [ ] Super Admin can see all support tickets
- [ ] Super Admin can reply to tickets
- [ ] Super Admin can close tickets
- [ ] Super Admin can reopen tickets
- [ ] Ticket history/thread visible

### Global Settings
- [ ] Global settings page opens
- [ ] Currency default works
- [ ] Currency list works
- [ ] Country/city/timezone fields work
- [ ] Notification defaults work
- [ ] Backup placeholder field visible
- [ ] WhatsApp/SMS/email provider placeholder fields visible
- [ ] Save works
- [ ] Readback works after refresh

## 3. Salon Owner / Unified Owner-Admin Panel

### Login / Access
- [ ] Owner login works
- [ ] Owner dashboard opens
- [ ] Owner is blocked during maintenance mode
- [ ] Suspended salon owner is blocked from login

### Dashboard
- [ ] Today sales visible
- [ ] Customer/invoice/payment summary visible
- [ ] Operational widgets visible

### Branch / Outlet Management
- [ ] Branches page opens
- [ ] Branch create works
- [ ] Branch edit works
- [ ] Contact fields work
- [ ] Business hours field works
- [ ] Weekly off field works
- [ ] Branch archive works
- [ ] Archived branch disappears from active list

### Services & Categories
- [ ] Service categories page opens
- [ ] Service category create works
- [ ] Service category edit works
- [ ] Service category archive works
- [ ] Archived category disappears from active list
- [ ] Services page opens
- [ ] Service create works
- [ ] Service edit works
- [ ] Service price works
- [ ] Service duration works
- [ ] Branch assignment works
- [ ] Description works
- [ ] Tax field works
- [ ] Online booking toggle works
- [ ] Commission field works
- [ ] Service archive works
- [ ] Archived service disappears from active list

### Staff / User Management
- [ ] Users page opens
- [ ] User create works
- [ ] User edit works
- [ ] Phone field works
- [ ] Email field works
- [ ] Profile note works
- [ ] Avatar/image placeholder URL works
- [ ] Branch assignment works
- [ ] Role assignment works
- [ ] Custom role page opens
- [ ] Custom role create/edit works
- [ ] Permission assignment works
- [ ] User deactivate works
- [ ] Inactive user cannot log in
- [ ] User archive works
- [ ] Archived user disappears from active list

### Customer CRM
- [ ] Customers page opens
- [ ] Customer create works
- [ ] Customer edit works
- [ ] Gender field works
- [ ] DOB field works
- [ ] Anniversary field works
- [ ] Source field works
- [ ] Tags work
- [ ] Notes work
- [ ] Search by name works
- [ ] Search by phone works
- [ ] Duplicate phone validation works
- [ ] Customer history/detail opens
- [ ] Invoice history visible for customer

### POS Billing v1
- [ ] POS/New Sale page opens
- [ ] Quick bill can be created
- [ ] Customer can be selected
- [ ] Service line can be added
- [ ] Invoice total calculates correctly
- [ ] Invoice saves successfully

### Payments v1
- [ ] Payments page opens
- [ ] Payment can be added against invoice
- [ ] Payment mode works
- [ ] Paid/due updates after payment

### Invoice / Receipt Management
- [ ] Invoices list opens
- [ ] Invoice detail opens
- [ ] Receipt/print view works
- [ ] PDF option works
- [ ] Invoice balance/status visible

### Basic Reports
- [ ] Reports page opens
- [ ] Daily sales report works
- [ ] Payment mode report works
- [ ] Branch-wise report works
- [ ] Invoice report works
- [ ] Staff service report works
- [ ] Customer report works
- [ ] Branch/date filters work
- [ ] CSV export works

### Owner Support Tickets
- [ ] Owner can create support ticket
- [ ] Owner can reply to support ticket
- [ ] Closed tickets become read-only
- [ ] Reopened ticket allows reply again

### Owner Settings / Runtime Readback
- [ ] Owner settings page opens
- [ ] Save works
- [ ] Readback works after refresh

## 4. Staff / Restricted Salon User Side

Note: this is still the same unified Owner/Admin panel, but with restricted sidebar and permissions.

### Access Model
- [ ] Staff user logs into same Owner/Admin panel
- [ ] Sidebar shows only allowed pages
- [ ] Restricted module is hidden
- [ ] Direct access to unauthorized module is blocked

### Restricted User Checks
- [ ] Receptionist/Staff cannot access Super Admin routes
- [ ] Restricted user cannot access blocked financial/report module unless permission is granted
- [ ] Inactive restricted user cannot log in

## 5. Cross-Cutting Validation

### RBAC / Security Rules
- [ ] Unauthorized module access blocked
- [ ] API permission checks enforced
- [ ] Salon data isolation works
- [ ] Feature-disabled module access blocked

### Maintenance / Status Rules
- [ ] Maintenance mode blocks owner access
- [ ] Maintenance mode allows Super Admin
- [ ] Suspended salon blocks salon users

### Archive / Lifecycle Rules
- [ ] Archived user hidden from active list
- [ ] Archived branch hidden from active list
- [ ] Archived category hidden from active list
- [ ] Archived service hidden from active list
- [ ] Approved demo lead reject is blocked

## 6. Allowed Placeholders To Mention Honestly

- [ ] Owner impersonation is placeholder-only
- [ ] Support attachment storage is placeholder-only unless storage provider is configured
- [ ] SMS/WhatsApp delivery is placeholder-only unless provider creds are configured
- [ ] SMTP needs real production credentials for live email delivery

## 7. Suggested Demo Order For Recording

- [ ] Public website first
- [ ] Super Admin panel second
- [ ] Owner/Admin panel third
- [ ] Restricted staff checks fourth
- [ ] Final validation/rules fifth
