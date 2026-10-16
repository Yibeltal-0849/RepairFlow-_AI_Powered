import {
  BrowserRouter,
  Routes,
  Route,
  Navigate
} from "react-router-dom";

import Login from "./pages/Login/Login";
import Register from "./pages/Register/Register";

import Dashboard from "./pages/Dashboard/Dashboard";

// These can be uncommented when the pages are ready
import Repairs from "./pages/Repairs/Repairs";
// import RepairDetails from "./pages/RepairDetails/RepairDetails";
import Diagnosis from "./pages/Diagnosis/Diagnosis";
import Workflow from "./pages/Workflow/Workflow";
import Customers from "./pages/Customer/Customers";
import Products from "./pages/Product/Product";
import Notifications from "./pages/Notifications/Notifications";
import Integrations from "./pages/Integrations/Integrations";
import ShopManager from "./pages/ShopManager/ShopManager";

import DashboardLayout from "./components/DashboardLayout";

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* =====================================
            AUTHENTICATION
        ===================================== */}

        <Route
          path="/login"
          element={<Login />}
        />

        <Route
          path="/register"
          element={<Register />}
        />


        {/* =====================================
            APPLICATION / DASHBOARD
        ===================================== */}

        <Route element={<DashboardLayout />}>

          {/* Dashboard */}
          <Route
            path="/dashboard"
            element={<Dashboard />}
          />

          {/* =====================================
              REPAIRS
          ===================================== */}

          
          <Route
            path="/repairs"
            element={<Repairs />}
          />

          {/* <Route
            path="/repairs/:id"
            element={<RepairDetails />}
          /> */}
         


          {/* =====================================
              AI DIAGNOSIS
          ===================================== */}

          
          <Route
            path="/diagnosis"
            element={<Diagnosis />}
          />
         


          {/* =====================================
              WORKFLOW
          ===================================== */}

          
          <Route
            path="/workflow"
            element={<Workflow />}
          />
         


          {/* =====================================
              CUSTOMERS
          ===================================== */}

          
          <Route
            path="/customer"
            element={<Customers />}
          />
         


          {/* =====================================
              Products
          ===================================== */}

          
           <Route
           path="/product"
            element={<Products />}
          />
          


          {/* =====================================
              NOTIFICATIONS
          ===================================== */}

          
          <Route
            path="/notifications"
            element={<Notifications />}
          />
         


          {/* =====================================
              INTEGRATIONS
          ===================================== */}

          
          <Route
            path="/integrations"
            element={<Integrations />}
          />
         


          {/* =====================================
              SHOP MANAGER
          ===================================== */}

          
          <Route
            path="/shop-manager"
            element={<ShopManager />}
          />
         

        </Route>


        {/* =====================================
            DEFAULT
        ===================================== */}

        <Route
          path="/"
          element={<Navigate to="/login" replace />}
        />


        {/* =====================================
            UNKNOWN PAGE
        ===================================== */}

        <Route
          path="*"
          element={<Navigate to="/dashboard" replace />}
        />

      </Routes>
    </BrowserRouter>
  );
}

export default App;