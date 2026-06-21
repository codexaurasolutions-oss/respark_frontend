import { Link } from "react-router-dom";
import { Layers3, Scissors, Users, CalendarDays, Boxes, BadgeCheck, Sparkles, CreditCard, NotebookPen, Globe, Megaphone, ReceiptText, Smartphone, Store, MessagesSquare } from "lucide-react";
import ModuleTabs from "../../components/ModuleTabs";

const manageCards = [
  { title: "Branches", description: "Locations, outlets, and salon identity.", to: "/admin/branches", icon: Layers3 },
  { title: "Services", description: "Service catalog and categories.", to: "/admin/services", icon: Scissors },
  { title: "Staff & Roles", description: "Users, experts, and access rules.", to: "/admin/users", icon: Users },
  { title: "Staff Schedule", description: "Availability, shifts, and roster.", to: "/admin/staff-schedule", icon: CalendarDays },
  { title: "Inventory", description: "Products, stock, and movements.", to: "/admin/inventory", icon: Boxes },
  { title: "Memberships / Packages", description: "Plans, packages, and lifecycle.", to: "/admin/memberships", icon: BadgeCheck },
  { title: "Loyalty / Coupons", description: "Offers, gift cards, and points.", to: "/admin/coupons", icon: Sparkles },
  { title: "Payments", description: "Payment modes and settlement view.", to: "/admin/payments", icon: CreditCard },
  { title: "Website Editor", description: "Homepage text, sections, and banners.", to: "/admin/website-editor", icon: NotebookPen },
  { title: "Digital Catalog", description: "Storefront products and public pages.", to: "/site/demo", icon: Globe },
  { title: "Ecommerce / Orders", description: "Card-based order board and bill flow.", to: "/admin/order-dashboard", icon: Store },
  { title: "Customer Portal", description: "Customer links, portal rules, and access.", to: "/admin/customer-portal-settings", icon: Smartphone },
  { title: "WhatsApp / Notifications", description: "Messaging rules, alerts, and logs.", to: "/admin/whatsapp", icon: MessagesSquare },
  { title: "Campaigns", description: "Templates, broadcasts, and promos.", to: "/admin/campaigns", icon: Megaphone },
  { title: "Reports Hub", description: "Operational and revenue summaries.", to: "/admin/reports", icon: ReceiptText }
];

export default function ManagePage() {
  return (
    <div className="page-shell">
      <ModuleTabs
        title="Manage Workspace"
        description="A clean hub for the core operational modules used to run the salon day-to-day."
        tabs={[{ label: "Manage", to: "/admin/manage", hint: "Hub" }]}
      />

      <div className="panel-card" style={{ padding: 18, marginBottom: 20 }}>
        <div className="item-head" style={{ marginBottom: 8 }}>
          <div>
            <h3 style={{ margin: 0 }}>Management shortcuts</h3>
            <p className="muted" style={{ margin: "4px 0 0", fontSize: "0.9rem" }}>
              This page is meant to keep the sidebar in a management-only context and reduce clutter for the owner.
            </p>
          </div>
          <span className="badge">Manage Mode</span>
        </div>

        <div className="orders-card-grid">
          {manageCards.map((card) => {
            const Icon = card.icon;
            return (
              <Link key={card.to} to={card.to} className="order-card" style={{ textDecoration: "none", color: "inherit", minHeight: 160 }}>
                <div className="order-card-top">
                  <div>
                    <strong className="order-number" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Icon size={16} color="var(--accent)" />
                      {card.title}
                    </strong>
                    <div className="order-subline">{card.description}</div>
                  </div>
                </div>
                <div className="order-items-preview" style={{ minHeight: 28 }}>
                  <span className="badge" style={{ width: "fit-content" }}>Open module</span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
