# Phase 1 Completion Checklist

## Status

Phase 1 is fully closed for the unified-panel SRS scope, with only explicitly allowed placeholders remaining for:

- owner impersonation session-switch
- support file storage integration
- real SMS/WhatsApp provider delivery integration

## Sprint A - Super Admin Completion

- [x] Super Admin login works
- [x] Super Admin dashboard works
- [x] Salon create works
- [x] Salon edit works
- [x] Salon detail view works
- [x] Business type field supported
- [x] Tax settings basic field supported
- [x] Owner login status visible in salon detail
- [x] Internal support notes supported and only visible in Super Admin
- [x] Trial start date supported
- [x] Trial end date supported
- [x] Suspended / active / trial / expired statuses supported
- [x] Suspended salon users blocked from login
- [x] Impersonate owner placeholder route/UI/API exists safely
- [x] Plan create/edit supports limits and feature flags
- [x] Storage limit placeholder field supported
- [x] Custom plan flag supported
- [x] Subscription create works
- [x] Subscription update works
- [x] Payment status semantics supported: paid / pending / failed
- [x] Manual discount supported
- [x] Subscription history trail supported
- [x] Expiry alert UI supported
- [x] Upgrade / downgrade plan-change UX supported
- [x] Feature flags represented for premium/future modules

## Sprint B - Owner Master Data Completion

- [x] Unified Owner/Admin login works
- [x] No separate reception/staff panel created
- [x] Permission-based sidebar works
- [x] Backend permission enforcement works
- [x] Staff/user create-login flow works
- [x] Staff/user edit flow works
- [x] Staff archive flow separate from deactivate works
- [x] Inactive user cannot login
- [x] Archived user hidden from active lists
- [x] Staff profile fields supported
- [x] Phone supported
- [x] Email supported
- [x] Profile note supported
- [x] Image placeholder URL supported
- [x] Public catalog visibility toggle supported
- [x] Branch assignment supported
- [x] Service assignment to staff supported
- [x] Role assignment supported
- [x] Custom role screen/API explicit
- [x] Permissions assignment per role/user supported
- [x] Module/page/action permission handling supported
- [x] Same Owner/Admin panel used by owner/receptionist/staff/manager users
- [x] Customer CRM create works
- [x] Customer CRM edit works
- [x] Gender supported
- [x] DOB supported
- [x] Anniversary supported
- [x] Source supported
- [x] Tags supported
- [x] Notes supported
- [x] Search by name/phone supported
- [x] Duplicate phone validation per salon supported
- [x] Basic customer invoice history supported

## Sprint C - Reporting + Support Completion

- [x] Sales summary report works
- [x] Payment mode report works
- [x] Branch-wise report works
- [x] Invoice report works
- [x] Staff service report works
- [x] Customer report works
- [x] CSV export endpoint/button exists
- [x] Reports respect salon scope
- [x] Reports respect role permission
- [x] Owner can create support ticket
- [x] Owner can reply to support ticket
- [x] Super Admin can view all tickets
- [x] Super Admin can reply to tickets
- [x] Ticket thread/history visible
- [x] Status changes tracked in history trail
- [x] Closed tickets read-only unless reopened
- [x] Attachment placeholder field/UI/API exists cleanly
- [x] Assign support agent placeholder field/UI/API exists cleanly
- [x] Salon-wise ticket view supported

## Sprint D - Public Website + Global Settings Completion

- [x] Global settings load works
- [x] Global settings save works
- [x] Currency default supported
- [x] Currency list supported
- [x] Country setting supported
- [x] City setting supported
- [x] Timezone setting supported
- [x] Default notification settings supported
- [x] Backup placeholder supported
- [x] WhatsApp provider placeholder supported
- [x] SMS provider placeholder supported
- [x] Email provider placeholder supported
- [x] Maintenance mode behavior supported
- [x] Maintenance mode blocks owner access
- [x] Maintenance mode still allows Super Admin
- [x] Public home page exists
- [x] Features page exists
- [x] Pricing page exists
- [x] Platform page exists
- [x] Book-demo page exists
- [x] Responsive marketing navigation exists
- [x] Professional animated public UI exists
- [x] Demo lead submit works
- [x] Demo lead appears in Super Admin list
- [x] Demo lead approve / reject works
- [x] Approved demo auto-creates 7-day trial salon + owner
- [x] Password setup token + invite link flow works
- [x] Demo account secure email-link login enforcement works
- [x] SMTP-ready email sending is wired through backend env configuration
- [x] Trial expiry reminder flow works
- [x] Demo trial convert-to-paid flow works
- [x] Expired demo auto-disable / cleanup flow works
- [x] WhatsApp button works when number exists
- [x] Basic SEO title/description exists on main public pages

## Sprint E - Hardening + Real Validation

- [x] MySQL datasource configured
- [x] Prisma schema synced to MySQL
- [x] Prisma client generated
- [x] Seed data available
- [x] Backend starts successfully
- [x] Frontend builds successfully
- [x] Frontend lint passes
- [x] Backend automated tests pass
- [x] Super Admin login validated
- [x] Owner login validated
- [x] Owner settings save/load validated
- [x] POS feature-flag API blocking validated
- [x] Invoice receipt validated
- [x] Invoice PDF validated
- [x] Reports export validated
- [x] Support ticket create/respond/status flow validated
- [x] Demo lead round-trip validated
- [x] Demo approval + invite + password setup + first login validated
- [x] Trial reminder + demo conversion validated
- [x] Secure email-link-only demo login validated
- [x] Expired demo cleanup validated
- [x] Maintenance mode behavior validated

## Seed Credentials

- Super Admin: `superadmin@respark.local / Admin@123`
- Owner: `owner@respark.local / Owner@123`
- Demo salon ID: `cmpuzbmy40001q114m55twsxn`

## Runtime Configuration

- Backend API base: `http://127.0.0.1:5050/api/v1`
- Backend health: `http://127.0.0.1:5050/health`
- Frontend dev server: `http://127.0.0.1:5173`
- Database: MySQL / MariaDB

## Remaining Allowed Placeholders

- Owner impersonation is a safe placeholder route/UI/API, not a real session takeover flow.
- Support attachments are placeholder URL/file-reference fields, not real uploaded storage.
- SMS/WhatsApp provider fields are placeholders, not live provider delivery integrations.
- SMTP email transport is implemented, but real production credentials must still be configured in env.
