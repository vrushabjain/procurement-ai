
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Boxes } from "lucide-react";

type NavigationItem = {
  label: string;
  href?: string;
};

const navigationGroups: {
  label: string;
  items: NavigationItem[];
}[] = [
  {
    label: "WORKSPACE",
    items: [
      { label: "Control Tower", href: "/" },
      { label: "Procurement Requests", href: "/purchase-requests" },
      { label: "Procurement", href: "/procurement" },
      { label: "RFQs & Quotations", href: "/rfqs" },
      { label: "Suppliers", href: "/suppliers" },
      { label: "Purchase Orders", href: "/purchase-orders" },
      { label: "Deliveries", href: "/deliveries" },
    ],
  },
  {
    label: "INTELLIGENCE",
    items: [
      { label: "AI Recommendations" },
      { label: "Exceptions & Risks" },
      { label: "Approvals" },
      { label: "AI Procurement Agent" },
      { label: "Analytics" },
    ],
  },
];

function isActiveRoute(pathname: string, item: NavigationItem) {
  if (!item.href) return false;

  if (item.href === "/") {
    return pathname === "/";
  }

  if (item.href === "/procurement") {
    // Request 360 and its sub-pages belong to the Procurement workspace.
    // Do not mark Procurement active on the separate Requests register.
    return (
      pathname === "/procurement" ||
      pathname.startsWith("/procurement/")
    );
  }

  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export default function ProcurementSidebar() {
  const pathname = usePathname();

  return (
    <aside className="app-sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand-mark">
          <Boxes size={25} strokeWidth={1.8} />
        </div>

        <div className="sidebar-brand-copy">
          <div className="sidebar-brand-name">Procurement AI</div>
          <div className="sidebar-brand-subtitle">
            INTELLIGENCE PLATFORM
          </div>
        </div>
      </div>

      <nav
        className="sidebar-navigation"
        aria-label="Procurement navigation"
      >
        {navigationGroups.map((group) => (
          <div className="navigation-group" key={group.label}>
            <div className="navigation-group-label">{group.label}</div>

            <div className="navigation-items">
              {group.items.map((item) => {
                const active = isActiveRoute(pathname, item);

                if (item.href) {
                  return (
                    <Link
                      key={item.label}
                      href={item.href}
                      className={`navigation-item ${
                        active ? "active" : ""
                      }`}
                      aria-current={active ? "page" : undefined}
                    >
                      {item.label}
                    </Link>
                  );
                }

                // Preserve the existing intelligence navigation entries
                // without guessing routes that may not exist yet.
                return (
                  <button
                    key={item.label}
                    type="button"
                    className="navigation-item"
                    onClick={() => {
                      // Route can be connected when its page is implemented.
                    }}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <div className="sidebar-environment">
          <span className="environment-dot" />

          <div>
            <strong>Production</strong>
            <span>Procurement Engine</span>
          </div>
        </div>

        <div className="sidebar-user">
          <div className="sidebar-user-avatar">VJ</div>

          <div className="sidebar-user-info">
            <strong>Vrushab Jain</strong>
            <span>Procurement Admin</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
