const fs = require('fs');

function replaceInFile(file, replacements) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;
    for (const { find, replace } of replacements) {
      // Using split/join to replace all occurrences of exact string
      content = content.split(find).join(replace);
    }
    if (content !== original) {
      fs.writeFileSync(file, content, 'utf8');
      console.log(`Updated ${file}`);
    }
  }
}

// 1. AppointmentsPage Filters
replaceInFile('frontend/src/pages/owner/AppointmentsPage.jsx', [
  {
    find: '<input type="datetime-local" value={filters.from} onChange={(event) => setFilters((current) => ({ ...current, from: event.target.value }))} />',
    replace: '<label><span className="muted">Filter From</span><input type="datetime-local" value={filters.from} onChange={(event) => setFilters((current) => ({ ...current, from: event.target.value }))} /></label>'
  },
  {
    find: '<input type="datetime-local" value={filters.to} onChange={(event) => setFilters((current) => ({ ...current, to: event.target.value }))} />',
    replace: '<label><span className="muted">Filter To</span><input type="datetime-local" value={filters.to} onChange={(event) => setFilters((current) => ({ ...current, to: event.target.value }))} /></label>'
  }
]);

// 2. AppointmentEditPage
replaceInFile('frontend/src/pages/owner/AppointmentEditPage.jsx', [
  {
    find: '<input type="datetime-local" value={form.startAt} onChange={(event) => setForm((current) => ({ ...current, startAt: event.target.value }))} />',
    replace: '<label><span className="muted">Appointment start</span><input type="datetime-local" value={form.startAt} onChange={(event) => setForm((current) => ({ ...current, startAt: event.target.value }))} /></label>'
  },
  {
    find: '<input type="datetime-local" value={form.endAt} onChange={(event) => setForm((current) => ({ ...current, endAt: event.target.value }))} />',
    replace: '<label><span className="muted">Appointment end</span><input type="datetime-local" value={form.endAt} onChange={(event) => setForm((current) => ({ ...current, endAt: event.target.value }))} /></label>'
  },
  {
    find: '<input type="datetime-local" value={item.startAt} onChange={(event) => updateItem(index, { startAt: event.target.value })} />',
    replace: '<label><span className="muted">Service start time</span><input type="datetime-local" value={item.startAt} onChange={(event) => updateItem(index, { startAt: event.target.value })} /></label>'
  },
  {
    find: '<input type="datetime-local" value={item.endAt} onChange={(event) => updateItem(index, { endAt: event.target.value })} />',
    replace: '<label><span className="muted">Service end time</span><input type="datetime-local" value={item.endAt} onChange={(event) => updateItem(index, { endAt: event.target.value })} /></label>'
  }
]);

// 3. PosPage
replaceInFile('frontend/src/pages/owner/PosPage.jsx', [
  {
    find: '<input type="datetime-local" value={paymentLinkForm.expiresAt} onChange={(event) => setPaymentLinkForm((current) => ({ ...current, expiresAt: event.target.value }))} />',
    replace: '<label><span className="muted">Link Expiry Time</span><input type="datetime-local" value={paymentLinkForm.expiresAt} onChange={(event) => setPaymentLinkForm((current) => ({ ...current, expiresAt: event.target.value }))} /></label>'
  }
]);

// 4. CampaignsPage
replaceInFile('frontend/src/pages/owner/CampaignsPage.jsx', [
  {
    find: '<input type="datetime-local" value={form.scheduledFor} onChange={(event) => setForm((current) => ({ ...current, scheduledFor: event.target.value }))} />',
    replace: '<label><span className="muted">Scheduled For</span><input type="datetime-local" value={form.scheduledFor} onChange={(event) => setForm((current) => ({ ...current, scheduledFor: event.target.value }))} /></label>'
  }
]);

// 5. CustomerPortalPage
replaceInFile('frontend/src/pages/customer/CustomerPortalPage.jsx', [
  {
    find: '<input type="datetime-local" value={rescheduleForm.startAt} onChange={(event) => setRescheduleForm((current) => ({ ...current, startAt: event.target.value }))} />',
    replace: '<label><span className="muted">New start time</span><input type="datetime-local" value={rescheduleForm.startAt} onChange={(event) => setRescheduleForm((current) => ({ ...current, startAt: event.target.value }))} /></label>'
  },
  {
    find: '<input type="datetime-local" value={rescheduleForm.endAt} onChange={(event) => setRescheduleForm((current) => ({ ...current, endAt: event.target.value }))} />',
    replace: '<label><span className="muted">New end time</span><input type="datetime-local" value={rescheduleForm.endAt} onChange={(event) => setRescheduleForm((current) => ({ ...current, endAt: event.target.value }))} /></label>'
  }
]);
