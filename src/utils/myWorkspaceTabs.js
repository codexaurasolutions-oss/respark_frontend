export const getMyWorkspaceTabs = (permissions = {}) => {
  const can = (key, action = "view") =>
    Array.isArray(permissions?.[key]) && permissions[key].includes(action);

  return [
    can("myDashboard") && { label: "My Dashboard", to: "/admin/my-dashboard" },
    can("myAppointments") && { label: "My Appointments", to: "/admin/my-appointments" },
    can("mySchedule") && { label: "My Schedule", to: "/admin/my-schedule" },
    can("myProfile") && { label: "My Profile", to: "/admin/my-profile" }
  ].filter(Boolean);
};
