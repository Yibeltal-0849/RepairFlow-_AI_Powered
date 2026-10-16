import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../services/api";
import "./Repairs.css";

const STATUS_OPTIONS = [
  "All",
  "Received",
  "Diagnosing",
  "Waiting for Part",
  "Waiting for Customer",
  "In Repair",
  "Ready for Pickup",
  "Completed",
  "Cancelled",
];

function Repairs() {
  const [repairs, setRepairs] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const [form, setForm] = useState({
    customer_id: "",
    device_brand: "",
    device_model: "",
    reported_issue: "",
    estimated_cost: "",
    promised_at: "",
  });

  /*
   * ==========================================
   * GET REPAIRS
   * ==========================================
   */

  const fetchRepairs = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/repairs");

      const result = response.data;

      /*
       * Supports:
       *
       * {
       *   success: true,
       *   data: [...]
       * }
       *
       * or:
       *
       * {
       *   success: true,
       *   data: {
       *     repairs: [...]
       *   }
       * }
       */

      if (Array.isArray(result?.data)) {
        setRepairs(result.data);
      } else if (Array.isArray(result?.data?.repairs)) {
        setRepairs(result.data.repairs);
      } else if (Array.isArray(result?.repairs)) {
        setRepairs(result.repairs);
      } else {
        setRepairs([]);
      }
    } catch (err) {
      console.error("Fetch repairs error:", err);

      setError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          "Unable to load repairs."
      );
    } finally {
      setLoading(false);
    }
  };

  /*
   * ==========================================
   * INITIAL LOAD
   * ==========================================
   */

  useEffect(() => {
    fetchRepairs();
  }, []);

  /*
   * ==========================================
   * FORM CHANGE
   * ==========================================
   */

  const handleFormChange = (e) => {
    const { name, value } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  /*
   * ==========================================
   * CREATE REPAIR
   * ==========================================
   */

  const handleCreateRepair = async (e) => {
    e.preventDefault();

    try {
      setCreating(true);
      setCreateError("");

      const payload = {
        customer_id: Number(form.customer_id),
        device_brand: form.device_brand.trim(),
        device_model: form.device_model.trim(),
        reported_issue: form.reported_issue.trim(),
      };

      if (form.estimated_cost !== "") {
        payload.estimated_cost = Number(form.estimated_cost);
      }

      if (form.promised_at !== "") {
        payload.promised_at = form.promised_at;
      }

      await api.post("/repairs", payload);

      setShowCreateModal(false);

      setForm({
        customer_id: "",
        device_brand: "",
        device_model: "",
        reported_issue: "",
        estimated_cost: "",
        promised_at: "",
      });

      await fetchRepairs();
    } catch (err) {
      console.error("Create repair error:", err);

      setCreateError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          "Unable to create repair."
      );
    } finally {
      setCreating(false);
    }
  };

  /*
   * ==========================================
   * FILTER
   * ==========================================
   */

  const filteredRepairs = repairs.filter((repair) => {
    const query = search.toLowerCase().trim();

    const matchesSearch =
      !query ||
      String(repair.ticket_number || "")
        .toLowerCase()
        .includes(query) ||
      String(repair.device_brand || "")
        .toLowerCase()
        .includes(query) ||
      String(repair.device_model || "")
        .toLowerCase()
        .includes(query) ||
      String(repair.reported_issue || "")
        .toLowerCase()
        .includes(query);

    const matchesStatus =
      statusFilter === "All" ||
      repair.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  /*
   * ==========================================
   * STATUS CLASS
   * ==========================================
   */

  const getStatusClass = (status) => {
    if (!status) {
      return "unknown";
    }

    return status.toLowerCase().replace(/\s+/g, "-");
  };

  /*
   * ==========================================
   * DATE FORMAT
   * ==========================================
   */

  const formatDate = (date) => {
    if (!date) {
      return "—";
    }

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return "—";
    }

    return parsedDate.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  /*
   * ==========================================
   * MONEY FORMAT
   * ==========================================
   */

  const formatMoney = (value) => {
    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {
      return "—";
    }

    return `$${Number(value).toFixed(2)}`;
  };

  /*
   * ==========================================
   * SUMMARY COUNTS
   * ==========================================
   */

  const totalRepairs = repairs.length;

  const activeRepairs = repairs.filter(
    (repair) =>
      repair.status !== "Completed" &&
      repair.status !== "Cancelled"
  ).length;

  const diagnosingRepairs = repairs.filter(
    (repair) => repair.status === "Diagnosing"
  ).length;

  const readyRepairs = repairs.filter(
    (repair) => repair.status === "Ready for Pickup"
  ).length;

  return (
    <div className="repairs-page">

      {/* ======================================
          PAGE HEADER
      ====================================== */}

      <div className="repairs-header">

        <div>
          <h1>Repairs</h1>

          <p>
            Manage repair tickets and track their progress.
          </p>
        </div>

        <button
          type="button"
          className="create-repair-button"
          onClick={() => {
            setCreateError("");
            setShowCreateModal(true);
          }}
        >
          <span className="plus-icon">+</span>
          New Repair
        </button>

      </div>


      {/* ======================================
          SUMMARY CARDS
      ====================================== */}

      <div className="repair-summary">

        <div className="summary-card">
          <span className="summary-label">
            Total Repairs
          </span>

          <strong>{totalRepairs}</strong>
        </div>

        <div className="summary-card">
          <span className="summary-label">
            Active Repairs
          </span>

          <strong>{activeRepairs}</strong>
        </div>

        <div className="summary-card">
          <span className="summary-label">
            Diagnosing
          </span>

          <strong>{diagnosingRepairs}</strong>
        </div>

        <div className="summary-card">
          <span className="summary-label">
            Ready for Pickup
          </span>

          <strong>{readyRepairs}</strong>
        </div>

      </div>


      {/* ======================================
          FILTER BAR
      ====================================== */}

      <div className="repairs-toolbar">

        <div className="repair-search">

          <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>

          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search ticket, device, or issue..."
          />

        </div>


        <div className="status-filter">

          <label htmlFor="repair-status">
            Status
          </label>

          <select
            id="repair-status"
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value)
            }
          >
            {STATUS_OPTIONS.map((status) => (
              <option
                key={status}
                value={status}
              >
                {status}
              </option>
            ))}
          </select>

        </div>

      </div>


      {/* ======================================
          ERROR
      ====================================== */}

      {error && (
        <div className="repair-error">

          <div>
            <strong>
              Unable to load repairs
            </strong>

            <span>{error}</span>
          </div>

          <button
            type="button"
            onClick={fetchRepairs}
          >
            Try again
          </button>

        </div>
      )}


      {/* ======================================
          REPAIR TABLE
      ====================================== */}

      <div className="repairs-card">

        <div className="repairs-card-header">

          <div>
            <h2>Repair Tickets</h2>

            <p>
              {filteredRepairs.length} repair
              {filteredRepairs.length !== 1
                ? "s"
                : ""}{" "}
              found
            </p>
          </div>

        </div>


        {/* Loading */}

        {loading ? (

          <div className="repairs-state">

            <div className="loading-spinner"></div>

            <p>
              Loading repairs...
            </p>

          </div>

        ) : filteredRepairs.length === 0 ? (

          /* Empty */

          <div className="repairs-state">

            <div className="empty-icon">
              🔧
            </div>

            <h3>
              No repairs found
            </h3>

            <p>
              There are no repair tickets matching
              your current filters.
            </p>

            <button
              type="button"
              className="empty-create-button"
              onClick={() => {
                setCreateError("");
                setShowCreateModal(true);
              }}
            >
              Create Repair
            </button>

          </div>

        ) : (

          <div className="repairs-table-container">

            <table className="repairs-page-table">

              <thead>

                <tr>
                  <th>Ticket</th>
                  <th>Device</th>
                  <th>Issue</th>
                  <th>Status</th>
                  <th>Estimated Cost</th>
                  <th>Promised Date</th>
                  <th>Created</th>
                  <th>Action</th>
                </tr>

              </thead>

              <tbody>

                {filteredRepairs.map((repair) => (

                  <tr
                    key={repair.repair_id}
                  >

                    {/* Ticket */}

                    <td>
                      <Link
                        to={`/repairs/${repair.repair_id}`}
                        className="repair-ticket-link"
                      >
                        {repair.ticket_number ||
                          `#${repair.repair_id}`}
                      </Link>
                    </td>


                    {/* Device */}

                    <td>

                      <div className="repair-device">

                        <strong>
                          {repair.device_brand ||
                            "Unknown"}
                        </strong>

                        <span>
                          {repair.device_model ||
                            "Unknown model"}
                        </span>

                      </div>

                    </td>


                    {/* Issue */}

                    <td>

                      <div className="repair-issue">

                        {repair.reported_issue ||
                          "No issue description"}

                      </div>

                    </td>


                    {/* Status */}

                    <td>

                      <span
                        className={`repair-status ${getStatusClass(
                          repair.status
                        )}`}
                      >
                        <span className="status-dot"></span>

                        {repair.status || "Unknown"}

                      </span>

                    </td>


                    {/* Cost */}

                    <td className="repair-cost">

                      {formatMoney(
                        repair.estimated_cost
                      )}

                    </td>


                    {/* Promised Date */}

                    <td className="repair-date">

                      {formatDate(
                        repair.promised_at
                      )}

                    </td>


                    {/* Created */}

                    <td className="repair-date">

                      {formatDate(
                        repair.created_at
                      )}

                    </td>


                    {/* Action */}

                    <td>

                      <Link
                        to={`/repairs/${repair.repair_id}`}
                        className="view-repair-button"
                      >
                        View
                      </Link>

                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

        )}

      </div>


      {/* ======================================
          CREATE REPAIR MODAL
      ====================================== */}

      {showCreateModal && (

        <div
          className="modal-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setShowCreateModal(false);
            }
          }}
        >

          <div className="repair-modal">

            {/* Modal Header */}

            <div className="modal-header">

              <div>
                <h2>
                  Create New Repair
                </h2>

                <p>
                  Create a new repair ticket.
                </p>
              </div>

              <button
                type="button"
                className="modal-close"
                onClick={() =>
                  setShowCreateModal(false)
                }
              >
                ×
              </button>

            </div>


            {/* Form */}

            <form
              className="repair-form"
              onSubmit={handleCreateRepair}
            >

              {/* Customer ID */}

              <div className="form-group">

                <label htmlFor="customer_id">
                  Customer ID
                </label>

                <input
                  id="customer_id"
                  name="customer_id"
                  type="number"
                  min="1"
                  required
                  value={form.customer_id}
                  onChange={handleFormChange}
                  placeholder="Enter customer ID"
                />

              </div>


              {/* Device */}

              <div className="form-row">

                <div className="form-group">

                  <label htmlFor="device_brand">
                    Device Brand
                  </label>

                  <input
                    id="device_brand"
                    name="device_brand"
                    type="text"
                    required
                    value={form.device_brand}
                    onChange={handleFormChange}
                    placeholder="e.g. Samsung"
                  />

                </div>


                <div className="form-group">

                  <label htmlFor="device_model">
                    Device Model
                  </label>

                  <input
                    id="device_model"
                    name="device_model"
                    type="text"
                    required
                    value={form.device_model}
                    onChange={handleFormChange}
                    placeholder="e.g. Galaxy S23"
                  />

                </div>

              </div>


              {/* Issue */}

              <div className="form-group">

                <label htmlFor="reported_issue">
                  Reported Issue
                </label>

                <textarea
                  id="reported_issue"
                  name="reported_issue"
                  required
                  rows="4"
                  value={form.reported_issue}
                  onChange={handleFormChange}
                  placeholder="Describe the customer's reported problem..."
                />

              </div>


              {/* Cost + Promised Date */}

              <div className="form-row">

                <div className="form-group">

                  <label htmlFor="estimated_cost">
                    Estimated Cost
                  </label>

                  <input
                    id="estimated_cost"
                    name="estimated_cost"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.estimated_cost}
                    onChange={handleFormChange}
                    placeholder="0.00"
                  />

                </div>


                <div className="form-group">

                  <label htmlFor="promised_at">
                    Promised Date
                  </label>

                  <input
                    id="promised_at"
                    name="promised_at"
                    type="datetime-local"
                    value={form.promised_at}
                    onChange={handleFormChange}
                  />

                </div>

              </div>


              {/* Error */}

              {createError && (
                <div className="form-error">
                  {createError}
                </div>
              )}


              {/* Actions */}

              <div className="modal-actions">

                <button
                  type="button"
                  className="cancel-button"
                  disabled={creating}
                  onClick={() =>
                    setShowCreateModal(false)
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="submit-repair-button"
                  disabled={creating}
                >
                  {creating
                    ? "Creating..."
                    : "Create Repair"}
                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </div>
  );
}

export default Repairs;