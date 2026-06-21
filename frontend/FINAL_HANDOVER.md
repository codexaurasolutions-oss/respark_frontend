# Final Handover

## Project

ReSpark is a multi-tenant salon ERP SaaS platform built with a unified internal panel approach.

- Frontend: React + Vite
- Backend: Node.js + Express
- Database: MySQL / MariaDB
- ORM: Prisma
- Auth: JWT access/refresh flow
- Access control: RBAC + salon scoping + feature flags

## Phase 1 Scope Status

Phase 1 is complete for the agreed unified-panel SRS scope.

Completed public website pages:

- Home
- Features
- Pricing
- Platform
- Request Demo

Completed internal product areas:

- Super Admin dashboard, salons, plans, subscriptions, demo leads, support, settings
- Unified Owner/Admin dashboard, branches, services, users, roles, customers, POS, invoices, payments, reports, support, settings
- Public marketing website and demo request capture

## Architecture Summary

### Frontend

- Public marketing and demo pages
- Super Admin application routes
- Unified Owner/Admin application routes
- Permission-aware route guards
- Responsive component styling

### Backend

- Auth module
- Super Admin module
- Owner module
- Reports module
- Public module
- Middleware for auth, salon scope, role checks, feature flags, maintenance mode

### Database

Primary entities include:

- User
- Salon
- SalonMembership
- Branch
- ServiceCategory
- Service
- CustomRole
- Customer
- Invoice
- InvoiceItem
- Payment
- Plan
- Subscription
- SubscriptionHistory
- DemoLead
- SupportTicket
- SupportTicketMessage
- SupportTicketEvent
- GlobalSetting

## Runtime Configuration

- Frontend dev URL: `http://127.0.0.1:5173`
- Backend API base: `http://127.0.0.1:5050/api/v1`
- Backend health: `http://127.0.0.1:5050/health`
- Database URL pattern: `mysql://root@localhost:3306/respark`

## Local Run Steps

### Backend

```powershell
cd C:\Users\Ahmed Bilal Khan\Desktop\Respark_Clone\backend
npm install
npx prisma generate
npx prisma db push
npm run prisma:seed
npm run dev
```

### Frontend

```powershell
cd C:\Users\Ahmed Bilal Khan\Desktop\Respark_Clone\frontend
npm install
npm run dev
```

## Seed Credentials

- Super Admin: `superadmin@respark.local / Admin@123`
- Owner: `owner@respark.local / Owner@123`
- Demo salon id: `cmpuzbmy40001q114m55twsxn`

## Verified Phase 1 Behaviors

- Super Admin login works
- Owner login works
- Salon-scoped RBAC works
- Feature-flag blocking works
- POS invoice creation works
- Payment add flow works
- Reports and CSV export work
- Receipt HTML works
- Invoice PDF works
- Support ticket thread flow works
- Demo lead submit works
- Demo lead appears in Super Admin list
- Demo lead approve / reject works
- Approved demo creates 7-day trial salon, owner user, and subscription
- Trial expiry reminder email flow works
- Demo trial converts to paid subscription flow works
- Password setup token validation works
- First-login invite flow works
- Demo accounts require secure email login link access after password setup
- Expired demo cleanup flow works
- Owner settings save/load works
- Maintenance mode enforcement works

## Branding Assets

Added for public website branding:

- `frontend/public/favicon.svg`
- `frontend/public/logo-respark.svg`

Used in:

- `frontend/index.html`
- public navigation
- demo request page
- public footer

## Current Demo Request Logic

### What is implemented right now

The current `Request Demo` flow does this:

1. Public user submits the form on `/book-demo`
2. Backend stores the record in `DemoLead`
3. Super Admin can approve or reject the lead from the admin-side demo leads screen
4. On approval, the system creates:
   - a salon
   - an owner user
   - a 7-day trial subscription
   - a password setup token
5. The system prepares and sends a password-setup email with:
   - the secure setup link
   - the salon ID
   - the panel login link
6. Owner sets password from `/reset-password`
7. Owner logs in with the assigned salon ID
8. Super Admin can later send a trial expiry reminder email
9. Super Admin can convert the demo trial to a paid subscription and notify the owner
10. Expired trial demos can be auto-disabled through cleanup logic and manual admin trigger

### SMTP behavior

- Real SMTP is supported through backend env variables:
  - `SMTP_HOST`
  - `SMTP_PORT`
  - `SMTP_SECURE`
  - `SMTP_USER`
  - `SMTP_PASS`
  - `SMTP_FROM`
- If SMTP credentials are not configured yet, the backend safely falls back to JSON transport for development/testing.
- In the live QA run for this batch, delivery mode was `json`, which means the invite flow worked end-to-end but used non-production mail transport because real SMTP credentials were not filled yet.
- The same SMTP-ready delivery path is also used for trial reminders and conversion confirmation emails.
- Demo login links now carry a secure login-access token so demo accounts can be restricted to email-link based login flow.

## Known Intentional Placeholders

- Owner impersonation is a placeholder flow, not real session takeover
- Support attachments are placeholder references, not uploaded file storage
- SMS and WhatsApp provider fields are placeholders
- SMTP email delivery is implemented, but production credentials still need to be configured in env

## Key Files To Review First

- `C:\Users\Ahmed Bilal Khan\Desktop\Respark_Clone\backend\prisma\schema.prisma`
- `C:\Users\Ahmed Bilal Khan\Desktop\Respark_Clone\backend\src\modules\auth\routes.js`
- `C:\Users\Ahmed Bilal Khan\Desktop\Respark_Clone\backend\src\modules\superAdmin\routes.js`
- `C:\Users\Ahmed Bilal Khan\Desktop\Respark_Clone\backend\src\modules\owner\routes.js`
- `C:\Users\Ahmed Bilal Khan\Desktop\Respark_Clone\backend\src\modules\public\routes.js`
- `C:\Users\Ahmed Bilal Khan\Desktop\Respark_Clone\frontend\src\App.jsx`
- `C:\Users\Ahmed Bilal Khan\Desktop\Respark_Clone\frontend\src\pages\public\MarketingHomePage.jsx`
- `C:\Users\Ahmed Bilal Khan\Desktop\Respark_Clone\frontend\src\pages\public\DemoLeadPage.jsx`
- `C:\Users\Ahmed Bilal Khan\Desktop\Respark_Clone\PHASE1_COMPLETION_CHECKLIST.md`

## Recommended Next Product Step

If the next priority is after this invite automation batch, the likely next areas are:

- production SMTP credential rollout
- richer sales notes / lead assignment
- automated demo cleanup after expired trials
- conversion analytics / revenue reporting for approved demos
