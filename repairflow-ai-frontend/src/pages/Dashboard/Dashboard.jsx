import "./Dashboard.css";

function Dashboard() {
  // Demo data for now.
  // Later these values will come from your backend API.
  const stats = [
    {
      title: "Total Repairs",
      value: "128",
      change: "+12%",
      description: "from last month",
      type: "blue",
      icon: "repair"
    },
    {
      title: "In Progress",
      value: "34",
      change: "+5%",
      description: "from last week",
      type: "orange",
      icon: "progress"
    },
    {
      title: "AI Diagnosis",
      value: "12",
      change: "3 new",
      description: "pending review",
      type: "purple",
      icon: "ai"
    },
    {
      title: "Completed",
      value: "82",
      change: "+18%",
      description: "this month",
      type: "green",
      icon: "check"
    }
  ];

  const repairStatus = [
    {
      label: "Received",
      count: 18,
      percentage: 43
    },
    {
      label: "Diagnosing",
      count: 12,
      percentage: 29
    },
    {
      label: "In Repair",
      count: 24,
      percentage: 57
    },
    {
      label: "Waiting Parts",
      count: 8,
      percentage: 19
    },
    {
      label: "Completed",
      count: 42,
      percentage: 100
    }
  ];

  const recentRepairs = [
    {
      ticket: "RF-179208",
      device: "Samsung Galaxy S23",
      customer: "Abel Tesfaye",
      status: "Diagnosing",
      statusType: "diagnosing",
      time: "10 min ago"
    },
    {
      ticket: "RF-179207",
      device: "iPhone 14",
      customer: "Sara Ahmed",
      status: "In Repair",
      statusType: "repairing",
      time: "25 min ago"
    },
    {
      ticket: "RF-179206",
      device: "Dell Latitude 5420",
      customer: "Michael Brown",
      status: "Received",
      statusType: "received",
      time: "40 min ago"
    },
    {
      ticket: "RF-179205",
      device: "iPhone 12",
      customer: "Hana Ali",
      status: "Completed",
      statusType: "completed",
      time: "1 hour ago"
    }
  ];

  const diagnosisQueue = [
    {
      ticket: "RF-179208",
      device: "Samsung Galaxy S23",
      issue: "Screen is broken",
      confidence: "94%"
    },
    {
      ticket: "RF-179201",
      device: "iPhone 14",
      issue: "Device won't charge",
      confidence: "87%"
    },
    {
      ticket: "RF-179197",
      device: "Dell Latitude",
      issue: "Laptop overheating",
      confidence: "91%"
    }
  ];

  const inventoryAlerts = [
    {
      name: "Samsung S23 Screen",
      stock: 2,
      level: "Low"
    },
    {
      name: "USB-C Charging Port",
      stock: 3,
      level: "Low"
    },
    {
      name: "iPhone 14 Battery",
      stock: 1,
      level: "Critical"
    }
  ];

  const activities = [
    {
      text: "AI diagnosis completed",
      detail: "RF-179208",
      time: "10 minutes ago",
      type: "ai"
    },
    {
      text: "Repair status changed",
      detail: "RF-179207 → In Repair",
      time: "25 minutes ago",
      type: "repair"
    },
    {
      text: "New repair ticket created",
      detail: "RF-179206",
      time: "40 minutes ago",
      type: "new"
    },
    {
      text: "Customer notification sent",
      detail: "RF-179205",
      time: "1 hour ago",
      type: "notification"
    }
  ];

  return (
    <div className="dashboard-page">

      {/* =====================================
          PAGE HEADER
      ===================================== */}

      <div className="dashboard-header">

        <div>
          <h1>Dashboard</h1>

          <p>
            Overview of your repair shop
          </p>
        </div>

        <div className="dashboard-date">
          <span className="date-label">
            Today
          </span>

          <strong>
            October 16, 2026
          </strong>
        </div>

      </div>


      {/* =====================================
          STAT CARDS
      ===================================== */}

      <div className="stats-grid">

        {stats.map((stat) => (
          <div
            className="stat-card"
            key={stat.title}
          >

            <div className="stat-card-top">

              <div className={`stat-icon ${stat.type}`}>
                <DashboardIcon type={stat.icon} />
              </div>

              <span className="stat-title">
                {stat.title}
              </span>

            </div>

            <div className="stat-value">
              {stat.value}
            </div>

            <div className="stat-footer">

              <span className={`stat-change ${stat.type}`}>
                {stat.change}
              </span>

              <span className="stat-description">
                {stat.description}
              </span>

            </div>

          </div>
        ))}

      </div>


      {/* =====================================
          MIDDLE SECTION
      ===================================== */}

      <div className="dashboard-two-column">

        {/* Repair Overview */}

        <section className="dashboard-card repair-overview">

          <div className="card-header">

            <div>
              <h2>Repair Overview</h2>

              <p>
                Current repair status
              </p>
            </div>

            <button className="card-action">
              View all
            </button>

          </div>

          <div className="repair-status-list">

            {repairStatus.map((item) => (
              <div
                className="repair-status-item"
                key={item.label}
              >

                <div className="repair-status-info">

                  <span>
                    {item.label}
                  </span>

                  <strong>
                    {item.count}
                  </strong>

                </div>

                <div className="status-bar">

                  <div
                    className="status-bar-fill"
                    style={{
                      width: `${item.percentage}%`
                    }}
                  ></div>

                </div>

              </div>
            ))}

          </div>

        </section>


        {/* AI Diagnosis */}

        <section className="dashboard-card diagnosis-card">

          <div className="card-header">

            <div>
              <h2>AI Diagnosis Queue</h2>

              <p>
                Repairs waiting for review
              </p>
            </div>

            <div className="ai-badge">
              AI
            </div>

          </div>

          <div className="diagnosis-list">

            {diagnosisQueue.map((item) => (
              <div
                className="diagnosis-item"
                key={item.ticket}
              >

                <div className="diagnosis-main">

                  <div className="diagnosis-ticket">
                    {item.ticket}
                  </div>

                  <strong>
                    {item.device}
                  </strong>

                  <span>
                    {item.issue}
                  </span>

                </div>

                <div className="diagnosis-right">

                  <div className="confidence">
                    {item.confidence}
                  </div>

                  <button className="review-button">
                    Review
                  </button>

                </div>

              </div>
            ))}

          </div>

        </section>

      </div>


      {/* =====================================
          RECENT REPAIRS + INVENTORY
      ===================================== */}

      <div className="dashboard-two-column bottom-section">

        {/* Recent Repairs */}

        <section className="dashboard-card recent-repairs">

          <div className="card-header">

            <div>
              <h2>Recent Repairs</h2>

              <p>
                Latest repair activity
              </p>
            </div>

            <button className="card-action">
              View all
            </button>

          </div>

          <div className="repairs-table-wrapper">

            <table className="repairs-table">

              <thead>
                <tr>
                  <th>Ticket</th>
                  <th>Device</th>
                  <th>Status</th>
                  <th>Updated</th>
                </tr>
              </thead>

              <tbody>

                {recentRepairs.map((repair) => (
                  <tr key={repair.ticket}>

                    <td>
                      <strong className="ticket-number">
                        {repair.ticket}
                      </strong>
                    </td>

                    <td>
                      <div className="device-info">
                        <strong>
                          {repair.device}
                        </strong>

                        <span>
                          {repair.customer}
                        </span>
                      </div>
                    </td>

                    <td>
                      <span
                        className={`repair-status-badge ${repair.statusType}`}
                      >
                        <span className="badge-dot"></span>

                        {repair.status}
                      </span>
                    </td>

                    <td className="repair-time">
                      {repair.time}
                    </td>

                  </tr>
                ))}

              </tbody>

            </table>

          </div>

        </section>


        {/* Inventory Alerts */}

        <section className="dashboard-card inventory-card">

          <div className="card-header">

            <div>
              <h2>Inventory Alerts</h2>

              <p>
                Parts that need attention
              </p>
            </div>

            <button className="card-action">
              Inventory
            </button>

          </div>

          <div className="inventory-list">

            {inventoryAlerts.map((item) => (
              <div
                className="inventory-item"
                key={item.name}
              >

                <div className="inventory-warning">
                  <DashboardIcon type="warning" />
                </div>

                <div className="inventory-info">

                  <strong>
                    {item.name}
                  </strong>

                  <span>
                    Only {item.stock} remaining
                  </span>

                </div>

                <span
                  className={
                    item.level === "Critical"
                      ? "inventory-level critical"
                      : "inventory-level"
                  }
                >
                  {item.level}
                </span>

              </div>
            ))}

          </div>

        </section>

      </div>


      {/* =====================================
          RECENT ACTIVITY
      ===================================== */}

      <section className="dashboard-card activity-card">

        <div className="card-header">

          <div>
            <h2>Recent Activity</h2>

            <p>
              Latest activity in your repair shop
            </p>
          </div>

        </div>

        <div className="activity-list">

          {activities.map((activity, index) => (
            <div
              className="activity-item"
              key={index}
            >

              <div className={`activity-icon ${activity.type}`}>
                <DashboardIcon type={activity.type} />
              </div>

              <div className="activity-content">

                <strong>
                  {activity.text}
                </strong>

                <span>
                  {activity.detail}
                </span>

              </div>

              <span className="activity-time">
                {activity.time}
              </span>

            </div>
          ))}

        </div>

      </section>

    </div>
  );
}


/* ==========================================
   ICON COMPONENT
========================================== */

function DashboardIcon({ type }) {

  const icons = {

    repair: (
      <>
        <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 0 0 5.4-5.4l-3 3-2-2 3-3Z" />
      </>
    ),

    progress: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
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

    check: (
      <>
        <path d="M20 6 9 17l-5-5" />
      </>
    ),

    warning: (
      <>
        <path d="M10.3 3.3 2.5 17a2 2 0 0 0 1.7 3h15.6a2 2 0 0 0 1.7-3L13.7 3.3a2 2 0 0 0-3.4 0Z" />
        <path d="M12 9v4" />
        <path d="M12 17h.01" />
      </>
    ),

    notification: (
      <>
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </>
    ),

    new: (
      <>
        <path d="M12 5v14" />
        <path d="M5 12h14" />
      </>
    )
  };

  return (
    <svg
      width="18"
      height="18"
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

export default Dashboard;