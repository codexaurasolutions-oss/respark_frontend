# Phase 3 and Phase 4 SRS Checklist

Source: PROJECT_SRS_COMPLETE.md

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

