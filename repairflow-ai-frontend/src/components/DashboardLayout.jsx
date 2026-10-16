import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import "./DashboardLayout.css";

function DashboardLayout() {
  return (
    <div className="dashboard-layout">

      <Navbar />

      <Sidebar />

      <main className="dashboard-main">
        <Outlet />
      </main>

    </div>
  );
}

export default DashboardLayout;