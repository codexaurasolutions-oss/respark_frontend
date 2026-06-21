SRS - ReSpark-Style Salon/Spa SaaS ERP Clone
Updated Architecture: Single Unified Owner/Admin Panel with Role-Based Page Access
1. Project Overview
We need to build a complete Salon/Spa/Beauty Clinic SaaS ERP system inspired by ReSpark. The system will manage salons, branches, services, staff, appointments, POS billing, customers, inventory, memberships, packages, loyalty, digital catalog, e-commerce, campaigns, WhatsApp marketing, feedback, enquiries, reports, subscriptions, and SaaS-level administration.
Important architecture change: the system will not create separate Reception/POS and Staff panels. There will be one unified Owner/Admin panel for every salon. The salon owner will add users such as managers, receptionists, staff, inventory managers and accountants, then assign page/module permissions. Each user will log in to the same Owner/Admin panel, but only assigned pages and actions will be visible and accessible.
2. Final Tech Stack
Frontend: React.js
Backend: Node.js + Express.js
Database: mySQL,
ORM: Prisma or Sequelize
Authentication: JWT + Refresh Token
UI: Tailwind CSS + shadcn/ui or Material UI
File Storage: Cloudinary or S3-compatible storage
Notifications: In-app first; WhatsApp/SMS/Email integrations later
Deployment: VPS / Render / Railway / AWS / DigitalOcean
Important note: SQL database must be used because this project has transactional modules like POS billing, invoices, payments, stock, memberships, packages, loyalty, reports, and multi-tenant business data. MongoDB is not recommended for this ERP-style project.
3. Final Panels / Surfaces
Total panels/surfaces: 4
1. Super Admin Panel - SaaS/company control panel for managing salons, subscriptions, plans, global settings, support and feature access.
2. Unified Owner/Admin Panel - one salon business panel used by owner, manager, receptionist, staff, inventory manager, accountant and other salon users. Access will be controlled by role and permissions.
3. Customer Portal - customer login area for bookings, orders, invoices, memberships, packages, loyalty, coupons and profile.
4. Digital Catalog / Public QR Storefront - public no-login salon link/QR page for services, packages, memberships, products, offers, booking and shop.
Public marketing website is not counted as a separate panel. It is a public website module for landing pages, book-demo form, contact page and lead capture.
4. Unified Owner/Admin Panel Access Concept
Instead of building separate panels for receptionist and staff, the system will use one Owner/Admin panel with role-based page access. The owner can add any staff member and assign exactly which pages, modules and actions they can access. The sidebar will be dynamic based on permissions.
Default Role Access Examples
Salon Owner
All modules and all reports
User/staff management
Feature settings
Financial reports
Subscription and business settings
Manager
Dashboard limited or full based on owner permission
Appointments
POS
Customers
Staff schedule
Inventory
Reports allowed by owner
Receptionist
Today appointments
New booking
POS billing
Customers
Invoices
Payments
Online orders
Feedback send
Day closing
Staff / Stylist / Therapist
My appointments
My schedule
Assigned customer notes
Mark service started/completed
My commission
My attendance
Notifications
Inventory Manager
Products
Inventory
Stock movement
Purchase/vendors
Low-stock report
Accountant
Invoices
Payments
Expenses
Payroll summary
Financial reports if allowed
Access Rules
All salon users will log in through the same Owner/Admin panel URL.
Sidebar pages will appear only if the user has permission.
Backend APIs must also enforce permissions; hiding sidebar is not enough.
Each action must have permission: view, create, edit, delete, approve, export.
Owner can create custom roles and assign modules/pages/actions.
Staff/reception users cannot access financial reports unless owner gives permission.
Every request must be scoped to the correct salon and branch.
5. Total Phases
Total phases: 5
1. Phase 1: Core SaaS + Super Admin + Owner Base + POS v1
2. Phase 2: Owner Operations + POS Complete + Appointments + Inventory + Memberships
3. Phase 3: Customer Side + Digital Catalog + E-Commerce + Campaign Basic
4. Phase 4: Advanced Automation + Loyalty + WhatsApp + Payroll + Feedback + Enquiries
5. Phase 5: Testing + Security + Deployment + Optimization
6. Total Development Modules
Total modules: 52
1. Authentication & RBAC
2. Super Admin Dashboard
3. Tenant/Salon Management
4. Subscription & Plan Management
5. Feature Access Control
6. SaaS Support Tickets
7. Global Settings
8. Public Website & Demo Lead Capture
9. Owner Dashboard
10. Branch/Outlet Management
11. Services & Categories
12. Staff/User Management
13. Staff Schedule & Availability
14. Customer CRM
15. Appointment Booking
16. Reception/POS Billing inside Unified Owner/Admin Panel
17. Payments & Split Payments
18. Invoice/Receipt Management
19. Payment Gateway, EDC & Payment Links
20. Product & Inventory Management
21. Stock Movement Ledger
22. Purchase, Vendors & Advanced Stock Control
23. Membership Management
24. Package Management
25. Loyalty Points
26. Coupons, Vouchers & Gift Cards
27. Digital Catalog / QR Menu
28. Digital Catalog Analytics
29. Customer Portal
30. E-Commerce Store
31. Online Orders
32. Campaign Creator
33. Advanced Campaigns
34. WhatsApp Marketing & Automation
35. Message Templates
36. Feedback Management
37. Enquiry/Lead Management
38. Expense Management
39. Employee Advanced / Payroll
40. Reports & Analytics
41. Notifications
42. Audit Logs
43. System Settings
44. Security
45. Testing & QA
46. Deployment & Optimization
47. Role Access Matrix & Permission Builder
48. Day Closing / Cash Register
49. Refund & Cancellation Workflow
50. Customer Self-Service Booking Rules
51. Support & Impersonation Logs
52. Performance Optimization
Phase 1 - Core SaaS + Super Admin + Owner Base + POS v1
Goal
Build the foundation of the SaaS platform. Super Admin should be operational. The unified Owner/Admin panel base should work. POS v1 should create basic invoices. Public website and demo leads should also work.
Phase 1 Surfaces
1. Super Admin Panel
2. Unified Owner/Admin Panel basic
3. Public Website basic
Module 1: Authentication & RBAC
Features
User login
User register
Forgot password
Reset password
JWT authentication
Refresh token
Secure logout
Role-based access control
Permission-based sidebar
Protected frontend routes
Protected backend APIs
Branch-level access
Module-level access
Action-level access: view, create, edit, delete, export, approve
Default roles: SUPER_ADMIN, SALON_OWNER, MANAGER, RECEPTIONIST, STAFF, CUSTOMER, INVENTORY_MANAGER, ACCOUNTANT
Custom role creation placeholder
Acceptance Criteria
User cannot access unauthorized modules.
Salon owner cannot access another salon data.
Receptionist/staff users cannot access Super Admin routes.
Disabled module should not show in sidebar.
Backend must block unauthorized API calls.
Module 2: Super Admin Dashboard
Features
Total salons
Active salons
Trial salons
Expired salons
Suspended salons
Paid salons
Monthly subscription revenue
Total subscription revenue
Demo requests count
Recent salons
Recent payments
Support ticket count
Active plans summary
Expired subscriptions summary
Quick actions: add salon, create plan, view demo leads, view support tickets
Acceptance Criteria
Dashboard data must be dynamic.
Filters should support today, this month, this year.
Super Admin should see all salons and all revenue.
Module 3: Tenant / Salon Management
Features
Create salon
Edit salon
Archive salon
Activate salon
Suspend salon
View salon detail
Assign salon owner
Business type: Salon, Spa, Beauty Clinic, Nail Studio, Tattoo Studio, Pet Grooming, Wellness Center
Salon name
Salon logo
Salon email
Salon phone
Address
City/country
Timezone
Currency
Tax settings basic
Trial start/end
Subscription status
Owner login status
Impersonate salon owner
Internal notes for support team
Acceptance Criteria
Every salon must have isolated data.
Suspended salon users cannot login.
Super Admin can activate/reactivate salon.
Super Admin can impersonate owner for support.
Module 4: Subscription & Plan Management
Features
Create subscription plan
Edit plan
Monthly/yearly pricing
Trial days
Branch limit
Staff/user limit
Customer limit
Invoice limit
Storage limit placeholder
Feature-wise access
Assign plan to salon
Renew subscription manually
Mark payment paid/pending/failed
Subscription history
Expiry alert
Plan upgrade/downgrade
Manual discount on plan
Custom plan support
Acceptance Criteria
Expired salon should show warning.
Plan limits should apply inside Owner/Admin panel.
Feature access must follow selected plan.
Module 5: Feature Access Control
Features
Enable/disable POS
Enable/disable Appointments
Enable/disable Inventory
Enable/disable CRM
Enable/disable Campaigns
Enable/disable E-commerce
Enable/disable Digital Catalog
Enable/disable Feedback
Enable/disable Reports
Enable/disable Memberships
Enable/disable Packages
Enable/disable Loyalty
Enable/disable Coupons/Gift Cards
Enable/disable WhatsApp
Enable/disable Enquiries
Enable/disable Expenses
Enable/disable Payroll
Enable/disable Customer Portal
Enable/disable advanced modules per salon
Acceptance Criteria
Disabled feature should hide from sidebar.
API should block disabled module access.
Owner should see upgrade message for disabled premium modules.
Module 6: SaaS Support Tickets
Features
Create support ticket
Ticket category
Priority
Status: open, pending, resolved, closed
Assign support agent
Add internal notes
Salon-wise ticket view
Attachment upload
Ticket history
Super Admin response
Acceptance Criteria
Salon owner can create ticket.
Super Admin can manage all tickets.
Closed ticket should be read-only unless reopened.
Module 7: Global Settings
Features
Global system name
Global logo
Currency list
Country/city settings
Tax labels
Default notification settings
Default invoice settings
Global WhatsApp/SMS/email provider placeholders
Maintenance mode
Global terms/privacy links
Backup setting placeholder
Acceptance Criteria
Settings must apply globally where required.
Maintenance mode should block owner/customer access but allow Super Admin.
Module 8: Public Website & Demo Lead Capture
Features
Home page
Features overview page
Industry pages: Hair Salon, Beauty Salon, Spa, Pet Grooming, Tattoo Parlour, Nail Studio, Beauty Clinic
Blog placeholder
Contact page
Book demo form
WhatsApp floating button
Terms and privacy pages
Demo lead submission
Demo leads visible in Super Admin
SEO meta fields
Responsive design
Acceptance Criteria
Demo form should create lead in Super Admin.
Public website should be mobile responsive.
WhatsApp button should open correct number/link.
Module 9: Owner Dashboard v1
Features
Today sales
Monthly sales
Today appointments
Upcoming appointments
Total customers
Total staff/users
Total services
Total invoices
Payment summary
Recent invoices
Recent customers
Low stock basic alert
Basic charts
Branch filter
Role-based dashboard visibility
Acceptance Criteria
Owner sees only own salon data.
Branch filter should affect dashboard values.
Dashboard cards should load fast.
Non-owner users should only see permitted dashboard cards.
Module 10: Branch/Outlet Management Basic
Features
Create branch
Edit branch
Archive branch
Branch name
Branch phone/email
Branch address
Business hours
Weekly off
Branch status
Assign staff/users to branch
Assign services to branch
Branch-wise dashboard filter
Acceptance Criteria
Branch should affect appointments, POS, inventory and reports.
Inactive branch should not appear in booking/POS selection.
Module 11: Services & Categories
Features
Add service category
Edit service category
Archive category
Add service
Edit service
Archive service
Service name
Service price
Service duration
Service description
Service image
Tax
Online booking enabled/disabled
Assign service to branch
Assign service to staff
Basic commission percentage
Featured service flag
Popular service flag
Acceptance Criteria
Service must be selectable in POS.
Service must be selectable in appointment module.
Archived service should not show in public catalog.
Module 12: Staff/User Management Basic
Features
Add staff/user
Edit staff/user
Archive staff/user
Staff role
Staff phone/email
Assign branch
Assign services
Staff active/inactive status
Basic commission percentage
Staff login optional
Staff image
Staff profile note
Show/hide staff in public catalog
Assign role permissions
Assign page access
Assign action access
Acceptance Criteria
POS can assign staff to service line item.
Staff list should filter branch-wise.
Inactive staff cannot be assigned to new appointments.
Assigned users should only see allowed pages in the same Owner/Admin panel.
Module 13: Customer CRM Basic
Features
Add customer
Edit customer
Customer phone
Customer email
Gender
Date of birth
Anniversary
Source
Notes
Customer history basic
Search by name/phone
Duplicate phone validation
Customer tags basic
Acceptance Criteria
POS can create/select customer.
Customer invoice history should update after billing.
Duplicate customer should be prevented by phone number.
Module 14: POS Billing v1 inside Unified Owner/Admin Panel
Features
Quick billing screen
Select customer
Create customer from POS
Add service item
Add product item if inventory exists
Assign staff per service
Quantity
Price
Basic discount
Tax
Subtotal
Grand total
Cash payment
Card payment
UPI payment
Mark as paid
Save invoice
Print invoice
Download invoice PDF
Accessible to owner/manager/receptionist based on permissions
Acceptance Criteria
Invoice totals must be calculated from backend.
Invoice number must auto-generate.
Paid invoice cannot be edited without permission.
Invoice should appear in reports.
Invoice should store snapshot of item name, price and tax.
Module 15: Payments v1
Features
Single payment mode
Cash
Card
UPI
Bank transfer
Paid status
Partial status
Unpaid status
Payment record linked to invoice
Payment note
Payment date
Role-based payment access
Acceptance Criteria
Payment amount cannot exceed invoice total unless overpayment setting is enabled.
Payment record must be saved separately.
Invoice payment status must update automatically.
Module 16: Invoice/Receipt Management
Features
Invoice list
Invoice detail
Invoice print
Invoice PDF
Send invoice link placeholder
Cancel invoice permission
Invoice prefix setting
Invoice footer setting
Invoice notes
Payment history inside invoice
Customer details inside invoice
Role-based invoice visibility
Acceptance Criteria
Invoice snapshot must not change if service/product price changes later.
Cancelled invoice must show cancelled status.
Cancel permission must be role-based.
Module 17: Basic Reports
Features
Daily sales report
Monthly sales report
Payment mode report
Staff service report basic
Invoice report
Customer report
Branch-wise basic report
Export CSV placeholder
Reports permission by role
Acceptance Criteria
Reports must match invoice/payment totals.
Owner should see only own salon data.
Branch filter should work.
Financial reports should not show to unauthorized users.
Phase 1 Deliverable
Super Admin can create salons and assign subscriptions.
Salon Owner can login and manage branch, services, staff/users and customers.
Owner can assign pages to receptionist/staff inside the same Owner/Admin panel.
Reception/POS user can create paid invoices only if given POS access.
Basic reports should work.
Public website and demo lead capture should work.
Phase 2 - Owner Operations + POS Complete + Appointments + Inventory + Memberships
Goal
Complete the daily salon operation system inside the unified Owner/Admin panel. POS, appointments, inventory, memberships, packages, CRM and staff access should be connected properly.
Phase 2 Surfaces
1. Unified Owner/Admin Panel complete core
2. Role-based access for Owner, Manager, Receptionist, Staff, Inventory Manager and Accountant
Module 18: Appointment Booking
Features
Calendar view
Day view
Week view
Month view
Create appointment
Walk-in appointment
Phone booking
Online booking approval placeholder
Select customer
Select branch
Select service
Select staff
Start time/end time
Multiple services in one appointment
Multiple staff in one appointment
Appointment statuses: Pending, Confirmed, Checked In, In Progress, Completed, Cancelled, No Show
Reschedule appointment
Cancel appointment
Booking notes
Customer preferences
Convert appointment to invoice
Staff availability check
Double booking prevention
Staff breaks
Manual approval/auto confirm setting
Advance payment required setting
Client self-cancel link placeholder
Client self-reschedule link placeholder
Appointment change logs
Room/resource booking placeholder for spa
Accessible to owner/manager/receptionist/staff based on permission
Acceptance Criteria
Same staff cannot be booked for overlapping time.
Completed appointment can convert to POS invoice.
Cancelled appointment must not appear as active booking.
Appointment status changes must be logged.
Module 19: POS Billing Complete
Features
Multiple services
Multiple products
Package redemption
Membership benefit apply
Loyalty points apply placeholder
Coupon apply placeholder
Gift voucher apply placeholder
Split payment
Advance payment
Balance payment
Partial payment
Refund invoice
Cancel invoice
Day closing
Cash drawer summary
Payment summary
Staff commission from invoice
Stock auto-deduct on product sale
Package session auto-deduct
Membership balance auto-update
Invoice WhatsApp share placeholder
Invoice SMS/email share placeholder
Payment reminder placeholder
POS page visible only to assigned users
Acceptance Criteria
POS billing must run in safe backend transaction.
If invoice fails, stock/package/payment should not update.
Refund should reverse payment/stock logic where applicable.
Staff commission should calculate from eligible invoice items.
Module 20: Payments & Split Payments
Features
Multiple payment modes in one invoice
Cash
Card
UPI
Bank transfer
Wallet
Online payment placeholder
Advance payment
Balance payment
Partial payment
Refund
Payment notes
Payment summary
Day closing payment totals
Acceptance Criteria
Split payment total must match invoice paid amount.
Refund should create proper negative/adjustment entry.
Partial invoice should show pending balance.
Module 21: Payment Gateway, EDC & Payment Links Basic
Features
Payment gateway settings placeholder
Razorpay/Cashfree/PhonePe placeholder
UPI payment link placeholder
Payment link generate
Payment link share on WhatsApp
Online payment status placeholder
Failed payment log placeholder
Refund placeholder
EDC terminal placeholder
Online/offline payment mode
Acceptance Criteria
Payment gateway should be configurable per salon.
Payment link should attach to invoice.
Online payment integration can be completed in advanced phase.
Module 22: Inventory Management Basic
Features
Product categories
Add product
Edit product
Archive product
Product image
SKU
Barcode field
Retail product
Consumable product
Cost price
Selling price
Current stock
Minimum stock
Low stock alert
Stock in
Stock out
Stock adjustment
Product sale through POS
Stock movement history
Accessible to owner/inventory manager/manager based on permission
Acceptance Criteria
Direct stock edit should not be allowed without stock movement.
Every stock change must create stock movement history.
Product sale must deduct stock.
Module 23: Stock Movement Ledger
Features
Stock IN
Stock OUT
Stock adjustment
POS sale stock deduction
Product return
Transfer in
Transfer out
Consumable usage
Reference type
Reference ID
Created by
Branch ID
Notes
Stock movement report
Acceptance Criteria
Current stock must match movement history.
Audit logs must store stock changes.
Stock should not go negative unless setting allows.
Module 24: Purchase, Vendors & Advanced Stock Control Basic
Features
Vendor/supplier profile
Purchase order create
Purchase order status
Goods received
Purchase cost
Branch stock transfer
Warehouse transfer placeholder
In-transit stock placeholder
Stock reconciliation basic
Physical stock count basic
Barcode receiving placeholder
Consumable usage per service placeholder
Expiry date field
Inventory variance report placeholder
Acceptance Criteria
Purchase received should increase stock.
Transfer should update source and destination stock.
Stock reconciliation should create adjustment entry.
Module 25: Membership Management
Features
Create membership plan
Edit membership plan
Plan price
Validity
Discount type
Discount value
Wallet/value membership
Service-specific membership
Group/family membership placeholder
Hourly membership placeholder
Sell membership from POS
Assign membership to customer
Membership expiry
Membership usage history
Membership renewal
Membership top-up/recharge placeholder
Membership upgrade placeholder
Membership transfer placeholder
Staff incentive on membership sale
Acceptance Criteria
Membership benefit should apply in POS.
Expired membership should not apply.
Membership usage must be visible in customer profile.
Module 26: Package Management
Features
Create package
Edit package
Add services to package
Product + service bundle placeholder
Package price
Total sessions
Validity
Sell package from POS
Assign package to customer
Redeem package session in POS
Remaining sessions
Package expiry
Package renewal
Package usage history
Staff incentive on package sale
Acceptance Criteria
Redeemed session should decrease balance.
Expired package should not redeem.
Customer profile should show package balance.
Module 27: CRM Extended
Features
Customer profile detail
Service history
Product history
Invoice history
Appointment history
Membership history
Package history
Notes
Tags
Source
Last visit
Total spend
Average spend
High spender filter
Lost customer filter
Birthday filter
Anniversary filter
Active membership filter
Active package filter
Preferred staff
Allergies/skin notes
Customer timeline
Acceptance Criteria
Customer profile must show complete timeline.
CRM filters should work branch-wise and salon-wise.
CRM data should update from POS and appointments.
Module 28: Staff Schedule & Availability
Features
Staff weekly schedule
Staff working hours
Staff breaks
Staff leave placeholder
Availability check
Branch-wise schedule
Service-wise staff availability
Appointment calendar sync
Staff off day
Staff schedule report
Acceptance Criteria
Appointment booking should check staff availability.
Staff off day should block booking.
Staff break time should block booking.
Module 29: Staff Access Pages inside Unified Owner/Admin Panel
Features
Staff login through same Owner/Admin panel
My dashboard
My appointments
View assigned customer notes
Mark appointment started
Mark appointment completed
View own services
View own commission summary
View own schedule
Notifications
Basic profile
No separate staff panel required
Acceptance Criteria
Staff cannot see other staff appointments unless permission allowed.
Staff cannot access owner financial reports unless permission allowed.
Staff actions should be logged.
Module 30: Reports Extended
Features
Appointment report
Staff performance report
Product sales report
Service sales report
Membership sales report
Package sales report
Stock report
Low stock report
Customer report
Branch-wise sales report
Payment summary report
Cancelled invoice report
Export CSV/Excel
Acceptance Criteria
Reports must match actual invoice/payment/stock values.
Reports must support date and branch filters.
Export should include filtered data.
Phase 2 Deliverable
Owner panel should be usable for daily salon operations.
Reception/POS workflow should run inside the unified Owner/Admin panel with assigned access.
Appointments should work with double-booking prevention.
Inventory, membership and package redemption should be connected with POS.
Staff users should have their own allowed pages inside the same panel, not a separate panel.
Phase 3 - Customer Side + Digital Catalog + E-Commerce + Campaign Basic
Goal
Build customer-facing surfaces and online selling/booking flow. Owner-side management for e-commerce, campaigns and online orders remains inside the unified Owner/Admin panel.
Phase 3 Surfaces
1. Customer Portal
2. Digital Catalog / QR Storefront
3. Unified Owner/Admin pages for E-Commerce, Campaigns and Online Orders
Module 31: Digital Catalog / QR Storefront
Features
Public salon page
Salon logo
Salon banner
Branch details
Services listing
Packages listing
Membership listing
Products listing
Offers listing
Staff portfolio
Before/after images placeholder
Book appointment button
Shop products button
WhatsApp button
Google review link
Social links
QR code generate
Copy catalog link
Mobile responsive design
No-login public access
Catalog preview from owner panel
Custom slug
Public routes: /salon/:slug, /salon/:slug/services, /salon/:slug/packages, /salon/:slug/memberships, /salon/:slug/shop, /salon/:slug/book, /salon/:slug/offers
Acceptance Criteria
Public catalog should open without login.
Customer can start booking from catalog.
Owner can preview catalog.
Disabled services/products should not show publicly.
Module 32: Digital Catalog Analytics
Features
QR scan count
Catalog page views
Service views
Product clicks
Booking button clicks
WhatsApp button clicks
Offer clicks
Top viewed services
Top viewed products
Branch-wise catalog analytics
Date filter
Acceptance Criteria
Analytics should track basic events.
Owner should see catalog performance.
Public page should remain fast.
Module 33: Customer Portal
Features
Customer login/register
Phone/email login
Customer profile
My appointments
My invoices
My packages
My memberships
My loyalty points
My orders
My coupons
Reschedule appointment
Cancel appointment
Submit feedback
View booking history
View order history
Notifications
Acceptance Criteria
Customer can only see own data.
Customer cannot access owner/staff data.
Customer actions should follow salon booking rules.
Module 34: E-Commerce Store
Features
Product listing
Product detail
Product images
Product price
Offer price
Add to cart
Cart
Checkout
Customer details
Pay at salon/COD
Online payment placeholder
Order success page
Order history
Coupon apply placeholder
Gift card apply placeholder
Pickup/delivery setting placeholder
Inventory sync
Acceptance Criteria
Product stock should deduct after order confirmation.
Order should show in Owner/Admin online orders page.
Out-of-stock products should not allow checkout.
Module 35: Online Orders inside Unified Owner/Admin Panel
Features
New orders
Accepted orders
Ready for pickup
Completed orders
Cancelled orders
Order detail
Customer detail
Payment status
Convert order to invoice
Print order receipt
Cancel order
Order notes
Order report
Access assignable to owner/manager/receptionist
Acceptance Criteria
Assigned users can manage online orders.
Owner can see order reports.
Completed order should reflect in sales report.
Module 36: Campaign Creator Basic
Features
Campaign list
Create campaign
Campaign name
Campaign type: WhatsApp, SMS, Email, Social banner, Catalog banner
Audience filter: All customers, Birthday customers, Anniversary customers, Lost customers, High spenders, Membership customers, Package customers, Service-based customers
Upload banner
Campaign message
Draft campaign
Schedule campaign placeholder
Manual WhatsApp share link
Campaign send log basic
Campaign history
Duplicate campaign
Acceptance Criteria
Campaign should save selected audience.
Campaign history should be visible.
Campaign should not send to customers without phone/email as required.
Module 37: Message Templates Basic
Features
Appointment confirmation template
Appointment reminder template
Invoice template
Birthday template
Anniversary template
Campaign template
Membership expiry template
Package expiry template
Feedback request template
Manual WhatsApp link generation
Variables: customer name, salon name, appointment date/time, invoice amount, membership expiry, package balance
Acceptance Criteria
System should generate message with customer data.
Missing variables should not break message.
Owner can edit templates.
Phase 3 Deliverable
Customers can open salon catalog.
Customers can view services/products/packages.
Customers can book appointments.
Customers can add products to cart and place orders.
Owner can manage basic campaigns.
Online orders are managed inside the unified Owner/Admin panel by assigned users.
Phase 4 - Advanced Automation + Loyalty + WhatsApp + Payroll + Feedback + Enquiries
Goal
Add retention, marketing automation, WhatsApp communication, loyalty, feedback, enquiries, expenses, payroll, audit logs and advanced reports.
Module 38: Loyalty Points
Features
Loyalty rules
Points on invoice
Points on product sale
Points on service sale
Bonus points
Birthday points placeholder
Referral points placeholder
Redeem points in POS
Minimum points to redeem
Points expiry
Loyalty history
Loyalty balance
Loyalty report
Customer portal loyalty view
Acceptance Criteria
Points earn/redeem should link to invoices.
Expired points should not redeem.
Customer profile should show loyalty history.
Module 39: Coupons, Vouchers & Gift Cards
Features
Coupon create
Percentage coupon
Fixed amount coupon
Service-specific coupon
Product-specific coupon
Branch-specific coupon
Usage limit
Customer usage limit
Expiry
Gift card sale
Gift card redemption
Gift card balance
Voucher code
Referral coupon
Influencer coupon basic
Birthday coupon
Festival coupon
Redemption report
Acceptance Criteria
Coupon/voucher validation must happen on backend.
Expired coupon should not apply.
Gift card balance should update after redemption.
Module 40: Feedback Management
Features
Feedback form
Rating
Comment
Staff rating
Service rating
Branch rating
Feedback link after invoice
Feedback link after appointment
Negative feedback alert
Positive feedback Google review prompt placeholder
Feedback report
Staff-wise rating
Branch-wise rating
Service-wise rating
Complaint follow-up status
Acceptance Criteria
Feedback should link with invoice/customer/staff.
Customer should submit feedback only for own visit.
Owner should see rating analytics.
Module 41: Enquiry / Lead Management
Features
Add enquiry
Source: Website, WhatsApp, Phone, Walk-in, Instagram, Facebook, Ads, Referral
Interested service
Interested branch
Budget
Priority
Assign staff
Follow-up date
Follow-up reminder
Notes
Lead status: New, Contacted, Interested, Converted, Lost
Convert to customer
Convert to appointment
Lead report
Staff response report placeholder
Acceptance Criteria
Converted lead should create customer/appointment.
Follow-up reminders should appear in notifications.
Lead status history should be tracked.
Module 42: Expense Management
Features
Expense category
Add expense
Branch expense
Staff salary expense
Vendor expense
Rent expense
Electricity expense
Product purchase expense
Payment mode
Receipt upload
Monthly expense report
Profit/loss report
Expense approval placeholder
Acceptance Criteria
Expenses should affect profit/loss report.
Expense should be branch-wise where applicable.
Receipt upload should support image/PDF.
Module 43: Employee Advanced / Payroll
Features
Staff attendance
Manual check-in/check-out
Leave request
Leave approval
Salary
Commission
Incentive rules
Service target
Product target
Membership target
Package target
Shared service incentive placeholder
Payroll summary
Staff performance report
Staff calendar
Attendance report
Leave report
Acceptance Criteria
Payroll should calculate salary + commission + incentives.
Attendance should affect payroll where enabled.
Staff should only view own payroll summary.
Module 44: Advanced Campaigns
Features
Banner template library
Free templates
Premium templates placeholder
Monthly template library placeholder
Banner template editor
Edit text
Edit background
Upload logo
Upload product/service image
Add offer text
Download banner
Upload banner to digital catalog
Share to Instagram/Facebook placeholder
Campaign conversion tracking
Campaign revenue tracking
Campaign ROI report
Campaign click tracking placeholder
Redemption tracking
Campaign audience analytics
Acceptance Criteria
Campaign conversion should link to invoice/order.
Owner should see ROI based on sales generated.
Banner should be reusable.
Module 45: WhatsApp Marketing & Automation
Features
WhatsApp API settings placeholder
WhatsApp template management
Appointment confirmation
Appointment reminder
Appointment cancellation alert
Appointment reschedule alert
Invoice share
Payment link share
Birthday wish
Anniversary wish
Membership expiry reminder
Package expiry reminder
Loyalty points update
Feedback request
Bulk WhatsApp campaign
Segment-based campaign
Rich media/banner message placeholder
Delivery status placeholder
Read/open status placeholder
Two-way reply actions placeholder: confirm, cancel, reschedule
Acceptance Criteria
Manual WhatsApp share should work in MVP.
API-based WhatsApp can be activated later.
Message logs should be saved.
Module 46: Notifications
Features
In-app notifications
Appointment reminder
Staff reminder
Low stock alert
Expiry alert
Membership expiry alert
Package expiry alert
Birthday alert
Anniversary alert
Enquiry follow-up alert
Payment due alert
Campaign sent alert
Feedback received alert
Support ticket update alert
Acceptance Criteria
Notifications should be user-specific.
Read/unread status should work.
Critical alerts should show in dashboard.
Module 47: Audit Logs
Features
Login logs
Create/update/delete logs
Invoice action logs
Payment action logs
Stock movement logs
Appointment change logs
User permission logs
Subscription change logs
Feature access change logs
Super Admin impersonation logs
Acceptance Criteria
Important actions must be logged.
Logs should include user, date/time and action.
Logs should be read-only.
Module 48: System Settings
Features
Business profile
Branch settings
Working hours
Tax/GST settings
Currency settings
Invoice prefix
Invoice footer
Payment modes
Cancellation policy
Booking policy
Staff permissions
Notification templates
WhatsApp templates
Email templates
Digital catalog branding
E-commerce settings
Backup/export placeholder
Acceptance Criteria
Settings should apply to relevant modules.
Owner should not edit disabled module settings.
Settings should be branch-wise where needed.
Module 49: Reports & Analytics Advanced
Features
Sales report
Appointment report
Staff report
Customer report
Inventory report
Product sales report
Service sales report
Membership sales report
Package sales report
Loyalty redemption report
Gift card report
Coupon report
Campaign report
Feedback report
Enquiry conversion report
Expense report
Profit/loss report
Branch report
Payment mode report
Tax report
Export PDF placeholder
Export Excel/CSV
Acceptance Criteria
Reports should match actual business records.
Reports should support date, branch and staff filters.
Financial reports should not show to unauthorized roles.
Phase 4 Deliverable
Loyalty, coupons, vouchers and gift cards should work.
Feedback and enquiry modules should work.
Payroll, attendance and incentives should work.
WhatsApp automation foundation should work.
Advanced reports should be usable.
Campaign ROI tracking should be available.
All these pages remain inside the unified Owner/Admin panel with role-based access.
Phase 5 - Testing + Security + Deployment + Optimization
Module 50: Security
Features
API validation
SQL injection protection
Rate limiting
Role permission testing
Tenant isolation testing
Password hashing
Refresh token rotation
File upload validation
Error logging
Audit logs
Secure headers
CORS settings
Environment variable security
Payment webhook verification placeholder
Acceptance Criteria
Unauthorized access must be blocked.
One salon must never access another salon data.
API errors should not expose sensitive data.
Module 51: Testing & QA
Features
Login role tests
Salon isolation tests
Super Admin access tests
Owner access tests
Reception access tests inside Owner/Admin panel
Staff access tests inside Owner/Admin panel
Customer portal tests
POS invoice tests
Payment tests
Split payment tests
Refund tests
Stock deduction tests
Appointment double booking tests
Membership redemption tests
Package redemption tests
Loyalty redemption tests
Coupon validation tests
Reports total matching tests
E-commerce order tests
Campaign audience tests
Feedback submission tests
Enquiry conversion tests
Payroll calculation tests
Mobile responsiveness tests
Acceptance Criteria
Critical flows should pass before production deployment.
No role should access unauthorized pages.
Reports should match actual transaction totals.
Module 52: Deployment & Optimization
Features
Production build
Environment variables setup
Database migration setup
Seed roles/permissions
Backup setup
Error monitoring
Logs
HTTPS
Domain setup
Admin credentials
UAT checklist
Performance optimization
Image optimization
API response optimization
Frontend lazy loading
Basic caching
Acceptance Criteria
Production deployment should work on selected server.
System should load fast on desktop and mobile.
Backup and logs should be configured.
Phase 5 Deliverable
Stable production version should be deployed.
Security testing should be complete.
Core business workflows should be tested.
Super Admin, unified Owner/Admin, Customer Portal and Digital Catalog flows should be working.
UAT build should be ready for client review.
Final Sidebar Structure
Super Admin Sidebar
Dashboard
Salons
Subscriptions
Plans
Feature Control
Demo Requests
Payments
Support Tickets
Global Templates
Global Settings
Audit Logs
Unified Owner/Admin Sidebar - Dynamic by Permission
This is one single panel. Owner, manager, receptionist, staff, inventory manager and accountant will use the same panel. Only assigned pages will appear for each user.
Dashboard
Branches
Services
Staff / Users
Roles & Permissions
Customers / CRM
Appointments
POS / Billing
Invoices
Payments
Inventory
Purchases / Vendors
Memberships
Packages
Loyalty
Coupons / Gift Cards
Digital Catalog
E-Commerce
Online Orders
Campaigns
WhatsApp
Feedback
Enquiries
Expenses
Payroll
Reports
Settings
Recommended Permission Presets inside Owner/Admin Panel
Owner Full Access
All modules
All reports
All settings
All users and permissions
Receptionist Access
Today appointments
New booking
POS billing
Customers
Invoices
Payments
Online orders
Day closing
Feedback send
Staff Access
My dashboard
My appointments
My customers/notes
My schedule
My attendance
My commission
My payroll summary
Notifications
Manager Access
Appointments
POS
Customers
Staff schedule
Inventory
Reports assigned by owner
Campaigns if allowed
Inventory Manager Access
Products
Inventory
Stock movement
Purchase/vendors
Stock reports
Accountant Access
Invoices
Payments
Expenses
Payroll summary
Financial reports if allowed
Customer Portal Bottom Navigation
Home
Bookings
Shop
Memberships
Packages
Loyalty
Orders
Profile
Digital Catalog / Public QR Storefront Navigation
Home
Services
Packages
Memberships
Shop Products
Offers
Book Appointment
WhatsApp
Reviews
API Structure
Base API: /api/v1
Auth APIs
POST /auth/login
POST /auth/register
POST /auth/refresh
POST /auth/logout
POST /auth/forgot-password
POST /auth/reset-password
Super Admin APIs
GET /super-admin/dashboard
CRUD /super-admin/salons
CRUD /super-admin/plans
CRUD /super-admin/subscriptions
PATCH /super-admin/salons/:id/status
PATCH /super-admin/salons/:id/features
CRUD /super-admin/support-tickets
GET /super-admin/demo-leads
GET /super-admin/audit-logs
Unified Owner/Admin APIs
GET /owner/dashboard
CRUD /branches
CRUD /services
CRUD /service-categories
CRUD /staff-users
CRUD /roles-permissions
CRUD /customers
CRUD /appointments
CRUD /invoices
CRUD /payments
CRUD /products
CRUD /inventory
CRUD /purchases-vendors
CRUD /memberships
CRUD /packages
CRUD /loyalty
CRUD /coupons
CRUD /gift-cards
CRUD /catalog
CRUD /orders
CRUD /campaigns
CRUD /whatsapp
CRUD /feedback
CRUD /enquiries
CRUD /expenses
CRUD /payroll
GET /reports
Public / Customer APIs
GET /public/salon/:slug
GET /public/salon/:slug/services
GET /public/salon/:slug/products
GET /public/salon/:slug/packages
POST /public/salon/:slug/book
POST /customer/register
POST /customer/login
GET /customer/profile
GET /customer/bookings
GET /customer/orders
GET /customer/invoices
POST /customer/orders
POST /customer/feedback
Critical Backend Rules
1. Every business request must be scoped to the correct salon.
2. Owner must never access another salon data.
3. One unified Owner/Admin panel must serve owner, manager, receptionist, staff and other salon users through permissions.
4. Frontend sidebar must be permission-based, but backend API must also enforce permissions.
5. Invoice calculation must happen on backend, not frontend.
6. POS invoice creation must use transaction-safe backend logic.
7. Stock must not be edited directly; stock movement history is required.
8. Appointment double booking must be blocked on backend.
9. Membership/package redemption must be transaction-safe.
10. Reports must calculate from real business records.
11. Disabled features must be blocked from frontend and backend.
12. Soft delete should be used for important business records.
13. Paid invoices should not be editable without permission.
14. Refunds/cancellations must maintain proper history.
15. Staff permissions must be enforced from backend.
16. Customer portal must only show the logged-in customer data.
17. Public catalog must only show active and enabled services/products.
Recommended 1-Month MVP Plan
Important: Full ReSpark-level product cannot be completed perfectly in 1 month. For one month, Phase 1 must be completed properly and selected Phase 2 modules can be started. The correct target is MVP v1.
Week 1
Project setup
React layout
Express setup
SQL setup
Auth
RBAC
Super Admin layout
Salon management
Subscription plans
Feature flags
Public website basic
Demo leads
Week 2
Unified Owner/Admin panel layout
Owner dashboard
Branch management
Services/categories
Staff/user management basic
Role/page access assignment
Customer basic
Settings basic
Week 3
POS v1
Invoice create
Payment create
Invoice PDF/print
Invoice list/detail
Basic reports
Staff assignment in invoice
Receptionist access preset
Week 4
Appointment basic
Inventory basic
Membership/package basic
POS integration with stock/package/membership
Bug fixing
UAT testing
Deployment
Final MVP Scope for First Month
1. Auth & RBAC
2. Super Admin Panel
3. Salon/Tenant Management
4. Subscription Plans
5. Feature Flags
6. Public Website + Demo Leads
7. Unified Owner/Admin Panel
8. Owner Dashboard
9. Branches
10. Services
11. Staff/User Management
12. Role/Page Access Assignment
13. Customers
14. POS v1
15. Invoices
16. Payments
17. Basic Reports
18. Appointment basic
19. Inventory basic
20. Membership/package basic
Do not try to complete advanced campaign, official WhatsApp API, full e-commerce, payroll, biometric attendance, advanced analytics, EDC, and full automation in month 1. Keep these for later phases.
Final Development Order
1. Project setup
2. Auth/RBAC
3. Super Admin
4. Salon/Subscription/Feature flags
5. Public website/demo leads
6. Unified Owner/Admin layout
7. Roles and page access builder
8. Branches
9. Services
10. Staff/users
11. Customers
12. POS invoice
13. Payments
14. Reports
15. Appointments
16. Inventory
17. Memberships/packages
18. Digital catalog
19. Customer portal
20. E-commerce
21. Campaigns
22. WhatsApp templates
23. Feedback/enquiries
24. Expenses/payroll
25. Advanced reports and automation
26. Security/testing/deployment
Final Delivery Summary
This project will be delivered in 5 phases.
Phase 1 will deliver the core SaaS foundation, complete Super Admin operations, unified Owner/Admin base, role-based page access and POS v1.
Phase 2 will complete owner operations, appointments, POS complete, inventory, memberships, packages, CRM extension, staff access pages and reports inside the unified Owner/Admin panel.
Phase 3 will deliver customer portal, digital catalog, QR storefront, e-commerce store, online orders and campaign basic.
Phase 4 will deliver loyalty, coupons, vouchers, gift cards, WhatsApp automation, feedback, enquiries, expenses, payroll, advanced campaigns and advanced reports.
Phase 5 will deliver security, testing, optimization and production deployment.
Final architecture: only 4 panels/surfaces will be built - Super Admin Panel, Unified Owner/Admin Panel, Customer Portal, and Digital Catalog/Public QR Storefront. Receptionist and staff will not have separate panels; they will use the same Owner/Admin panel with assigned page access.
