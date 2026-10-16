import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Navbar.css";

function Navbar() {
  const navigate = useNavigate();
  const [showProfile, setShowProfile] = useState(false);

  // Later you can get these values from your authentication context
  const user = {
    name: "Shop Manager",
    role: "Shop Manager",
    initials: "SM"
  };

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    navigate("/login");
  }

  return (
    <header className="navbar">

      {/* Left side */}
      <div className="navbar-left">

        <Link to="/dashboard" className="navbar-brand">
          <div className="brand-icon">
            RF
          </div>

          <div className="brand-text">
            <span className="brand-name">RepairFlow</span>
            <span className="brand-ai">AI</span>
          </div>
        </Link>

        <div className="navbar-search">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>

          <input
            type="text"
            placeholder="Search repairs, customers..."
          />

          <span className="search-shortcut">Ctrl K</span>
        </div>
      </div>

      {/* Right side */}
      <div className="navbar-right">

        {/* Notifications */}
        <Link
          to="/notifications"
          className="navbar-icon-button"
          title="Notifications"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>

          <span className="notification-dot"></span>
        </Link>

        <div className="navbar-divider"></div>

        {/* Profile */}
        <div className="profile-container">

          <button
            className="profile-button"
            onClick={() => setShowProfile(!showProfile)}
          >
            <div className="profile-avatar">
              {user.initials}
            </div>

            <div className="profile-info">
              <span className="profile-name">
                {user.name}
              </span>

              <span className="profile-role">
                {user.role}
              </span>
            </div>

            <svg
              className={`profile-chevron ${
                showProfile ? "rotate" : ""
              }`}
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>

          {showProfile && (
            <div className="profile-menu">

              <Link
                to="/profile"
                className="profile-menu-item"
                onClick={() => setShowProfile(false)}
              >
                <span>Profile</span>
              </Link>

              <Link
                to="/shop-manager"
                className="profile-menu-item"
                onClick={() => setShowProfile(false)}
              >
                <span>Settings</span>
              </Link>

              <div className="profile-menu-divider"></div>

              <button
                className="profile-menu-item logout-button"
                onClick={handleLogout}
              >
                <span>Logout</span>
              </button>

            </div>
          )}

        </div>

      </div>
    </header>
  );
}

export default Navbar;