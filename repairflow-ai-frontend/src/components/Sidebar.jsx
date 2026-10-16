import { NavLink } from "react-router-dom";
import "./Sidebar.css";

function Sidebar() {

  const navigation = [
    {
      section: "MAIN",
      items: [
        {
          label: "Dashboard",
          path: "/dashboard",
          icon: "dashboard"
        },
        {
          label: "Repairs",
          path: "/repairs",
          icon: "repair"
        },
        {
          label: "AI Diagnosis",
          path: "/diagnosis",
          icon: "ai"
        },
        {
          label: "Workflow",
          path: "/workflow",
          icon: "workflow"
        }
      ]
    },

    {
      section: "MANAGEMENT",
      items: [
        {
          label: "Customers",
          path: "/customer",
          icon: "customers"
        },
        {
          label: "Products",
          path: "/product",
          icon: "products"
        },
        {
          label: "Notifications",
          path: "/notifications",
          icon: "notifications"
        }
      ]
    },

    {
      section: "ADMINISTRATION",
      items: [
        {
          label: "Shop Manager",
          path: "/shop-manager",
          icon: "settings"
        },
        {
          label: "Integrations",
          path: "/integrations",
          icon: "integration"
        }
      ]
    }
  ];

  return (
    <aside className="sidebar">

      <div className="sidebar-content">

        {navigation.map((section) => (
          <div
            className="sidebar-section"
            key={section.section}
          >

            <div className="sidebar-section-title">
              {section.section}
            </div>

            <nav className="sidebar-nav">

              {section.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `sidebar-link ${
                      isActive ? "active" : ""
                    }`
                  }
                >

                  <SidebarIcon type={item.icon} />

                  <span>{item.label}</span>

                </NavLink>
              ))}

            </nav>

          </div>
        ))}

      </div>

      {/* Sidebar bottom */}
      <div className="sidebar-bottom">

        <div className="system-status">
          <span className="status-indicator"></span>

          <div>
            <span className="status-title">
              System Status
            </span>

            <span className="status-text">
              All systems operational
            </span>
          </div>
        </div>

      </div>

    </aside>
  );
}


/* =================================
   SIDEBAR ICONS
================================= */

function SidebarIcon({ type }) {

  const icons = {

    dashboard: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </>
    ),

    repair: (
      <>
        <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 0 0 5.4-5.4l-3 3-2-2 3-3Z" />
      </>
    ),

    ai: (
      <>
        <path d="M12 3v2" />
        <path d="M12 19v2" />
        <path d="m5.64 5.64 1.42 1.42" />
        <path d="m16.94 16.94 1.42 1.42" />
        <path d="M3 12h2" />
        <path d="M19 12h2" />
        <path d="m5.64 18.36 1.42-1.42" />
        <path d="m16.94 7.06 1.42-1.42" />
        <circle cx="12" cy="12" r="4" />
      </>
    ),

    workflow: (
      <>
        <rect x="3" y="3" width="6" height="6" rx="1" />
        <rect x="15" y="15" width="6" height="6" rx="1" />
        <path d="M9 6h5a3 3 0 0 1 3 3v6" />
        <path d="m14 13 3 3 3-3" />
      </>
    ),

    customers: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),

    products: (
      <>
        <path d="m21 16-9 5-9-5" />
        <path d="m3 8 9 5 9-5" />
        <path d="m3 8 9-5 9 5" />
        <path d="M12 13v8" />
      </>
    ),

    notifications: (
      <>
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </>
    ),

    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06-1.41 1.41-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21h-2v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06-1.41-1.41.06-.06A1.65 1.65 0 0 0 9.6 15a1.65 1.65 0 0 0-1.51-1H8v-2h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06 1.41-1.41.06.06A1.65 1.65 0 0 0 12.5 8.4a1.65 1.65 0 0 0 1-1.51V7h2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06 1.41 1.41-.06.06a1.65 1.65 0 0 0-.33 1.82 1.65 1.65 0 0 0 1.51 1H21v2h-.09a1.65 1.65 0 0 0-1.51 1Z" />
      </>
    ),

    integration: (
      <>
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </>
    )
  };

  return (
    <svg
      className="sidebar-icon"
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {icons[type]}
    </svg>
  );
}

export default Sidebar;