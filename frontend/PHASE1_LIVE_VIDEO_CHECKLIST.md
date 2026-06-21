# Phase 1 Live Video Checklist

Use this checklist to record a clean client demo for Phase 1 of the ReSpark clone SRS.

## Demo Setup

- [ ] Start backend on `http://127.0.0.1:5050`
- [ ] Start frontend on `http://127.0.0.1:5173`
- [ ] Confirm backend health opens:
  - `http://127.0.0.1:5050/health`
- [ ] Keep these credentials ready:
  - Super Admin: `superadmin@respark.local / Admin@123`
  - Owner: `owner@respark.local / Owner@123`

## Suggested Recording Order

- [ ] Public website
- [ ] Super Admin panel
- [ ] Owner/Admin panel
- [ ] Validation and rule checks
- [ ] Reports and exports

## Module 1: Authentication & RBAC

- [ ] Show Super Admin login
- [ ] Show Owner login
- [ ] Show same unified Owner/Admin panel for salon users
- [ ] Show permission-based sidebar behavior
- [ ] Show one restricted user cannot see unauthorized modules
- [ ] Show inactive user cannot log in
- [ ] Show suspended salon user cannot log in
- [ ] Show maintenance mode blocks owner login but still allows Super Admin

## Module 2: Super Admin Dashboard

- [ ] Open Super Admin dashboard
- [ ] Show total salons
- [ ] Show active subscriptions
- [ ] Show trial/expired/suspended visibility
- [ ] Show quick operational overview widgets

## Module 3: Tenant / Salon Management

- [ ] Open salons list
- [ ] Create a salon
- [ ] Edit a salon
- [ ] Open salon detail
- [ ] Show salon status values:
  - `TRIAL`
  - `ACTIVE`
  - `SUSPENDED`
  - `EXPIRED`
- [ ] Show owner info on salon detail
- [ ] Show internal support/admin note field
- [ ] Show trial start and end dates
- [ ] Show salon archive/status update behavior

## Module 4: Subscription & Plan Management

- [ ] Open plans list
- [ ] Create a plan
- [ ] Edit a plan
- [ ] Show plan feature flags
- [ ] Show plan limits:
  - branch limit
  - user limit
  - customer limit
  - invoice limit
  - storage limit
- [ ] Open subscriptions list
- [ ] Create a subscription
- [ ] Edit a subscription
- [ ] Show payment status field
- [ ] Show manual discount support
- [ ] Show subscription history or lifecycle trail

## Module 5: Feature Access Control

- [ ] Open salon feature flag controls
- [ ] Disable one feature for a salon
- [ ] Show disabled module hides or blocks correctly
- [ ] Re-enable the feature
- [ ] Show feature readback updated correctly

## Module 6: SaaS Support Tickets

- [ ] Create a support ticket from Owner side
- [ ] Open support tickets in Super Admin
- [ ] Reply from Super Admin
- [ ] Show ticket thread/history
- [ ] Close the ticket
- [ ] Show closed ticket is read-only
- [ ] Reopen the ticket
- [ ] Reply again after reopen
- [ ] Show placeholder attachment/agent fields if visible

## Module 7: Global Settings

- [ ] Open Super Admin global settings
- [ ] Show currency default
- [ ] Show currency list
- [ ] Show country/city/timezone fields
- [ ] Show notification default settings
- [ ] Show backup placeholder
- [ ] Show WhatsApp/SMS/email provider placeholder fields
- [ ] Save global settings
- [ ] Refresh or read back saved settings
- [ ] Turn maintenance mode on
- [ ] Prove owner login is blocked
- [ ] Prove Super Admin still logs in
- [ ] Turn maintenance mode off

## Module 8: Public Website & Demo Lead Capture

- [ ] Open public home page
- [ ] Open features page
- [ ] Open pricing page
- [ ] Open platform page
- [ ] Open book-demo page
- [ ] Show responsive public navigation
- [ ] Submit a demo lead
- [ ] Open Super Admin demo leads list
- [ ] Show submitted lead appears
- [ ] Reject one demo lead
- [ ] Approve one demo lead
- [ ] Show approved demo creates salon + owner trial account
- [ ] Show WhatsApp button if number exists
- [ ] Mention SEO title/description exists on public pages

## Module 9: Owner Dashboard v1

- [ ] Log in as Owner
- [ ] Open Owner dashboard
- [ ] Show today sales
- [ ] Show invoice/order/customer summary cards
- [ ] Show recent activity/overview widgets

## Module 10: Branch / Outlet Management Basic

- [ ] Open branches page
- [ ] Create a branch
- [ ] Edit a branch
- [ ] Show branch contact fields
- [ ] Show business hours / weekly off fields
- [ ] Archive the branch
- [ ] Show archived branch disappears from active list

## Module 11: Services & Categories

- [ ] Open service categories page
- [ ] Create a service category
- [ ] Edit a service category
- [ ] Archive a category
- [ ] Open services page
- [ ] Create a service
- [ ] Edit a service
- [ ] Show service fields:
  - name
  - price
  - duration
  - branch assignment
  - description
  - tax
  - online booking toggle
  - commission
- [ ] Archive a service
- [ ] Show archived service disappears from active list

## Module 12: Staff / User Management Basic

- [ ] Open users/staff page
- [ ] Create a user
- [ ] Edit a user
- [ ] Show supported fields:
  - phone
  - email
  - profile note
  - avatar/image URL placeholder
  - branch assignment
  - role assignment
- [ ] Show custom role screen
- [ ] Create or edit a custom role
- [ ] Show permission assignment
- [ ] Deactivate a user
- [ ] Show inactive user login blocked
- [ ] Archive a user
- [ ] Show archived user hidden from active list

## Module 13: Customer CRM Basic

- [ ] Open customers page
- [ ] Create a customer
- [ ] Edit a customer
- [ ] Show supported fields:
  - gender
  - DOB
  - anniversary
  - source
  - tags
  - notes
- [ ] Search by customer name
- [ ] Search by phone
- [ ] Show duplicate phone validation per salon
- [ ] Open customer detail/history
- [ ] Show basic invoice history

## Module 14: POS Billing v1

- [ ] Open POS / New Sale page
- [ ] Create a quick invoice/bill
- [ ] Add customer
- [ ] Add service line
- [ ] Confirm total is calculated
- [ ] Save invoice
- [ ] Show invoice generated successfully

## Module 15: Payments v1

- [ ] Open payments page
- [ ] Add a payment against an invoice
- [ ] Show payment mode
- [ ] Show invoice balance update
- [ ] Show paid vs due change after payment

## Module 16: Invoice / Receipt Management

- [ ] Open invoices list
- [ ] Open invoice detail
- [ ] Show invoice print or receipt view
- [ ] Show invoice PDF option
- [ ] Show invoice status/balance
- [ ] Mention cancellation/status controls if visible

## Module 17: Basic Reports

- [ ] Open reports page
- [ ] Show daily sales report
- [ ] Show payment mode report
- [ ] Show branch-wise report
- [ ] Show invoice report
- [ ] Show staff service report
- [ ] Show customer report
- [ ] Apply branch/date filters
- [ ] Export CSV
- [ ] Show export downloaded successfully

## Final Validation Block

- [ ] Show one feature-disabled module is blocked
- [ ] Show one unauthorized user cannot access restricted page
- [ ] Show one suspended or inactive login block
- [ ] Show one maintenance mode block flow
- [ ] Show one archive flow
- [ ] Show one report export

## Optional Closing Slide

- [ ] State: `Phase 1 complete`
- [ ] State: `All 17 Phase 1 modules covered`
- [ ] State: `Only allowed placeholders remain`

## Allowed Placeholders To Mention Honestly

- [ ] Owner impersonation is placeholder-only, not full session takeover
- [ ] Support attachment storage is placeholder-only unless storage provider is configured
- [ ] SMS/WhatsApp provider delivery is placeholder-only unless live provider creds are configured
- [ ] SMTP requires real production env credentials for live email delivery
