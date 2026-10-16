
import { useEffect, useState } from "react";
import api from "../../services/api";
import "./Notifications.css";

function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    returned: 0
  });

  const [filters, setFilters] = useState({
    status: "",
    channel: "",
    repair_id: ""
  });

  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    repair_id: "",
    channel: "email",
    recipient: "",
    message: ""
  });

  async function fetchNotifications() {
    try {
      setLoading(true);
      setError("");

      const params = {
        page,
        limit: 20
      };

      if (filters.status) {
        params.status = filters.status;
      }

      if (filters.channel) {
        params.channel = filters.channel;
      }

      if (filters.repair_id) {
        params.repair_id = filters.repair_id;
      }

      const response = await api.get("/notifications", { params });

      if (response.data?.success) {
        setNotifications(response.data.data || []);
        setPagination(
          response.data.pagination || {
            page,
            limit: 20,
            returned: 0
          }
        );
      } else {
        setError(
          response.data?.message || "Failed to load notifications."
        );
      }
    } catch (err) {
      console.error("Failed to load notifications:", err);

      setError(
        err.response?.data?.message ||
          "Unable to load notifications. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchNotifications();
  }, [page, filters]);

  function handleFilterChange(e) {
    const { name, value } = e.target;

    setPage(1);

    setFilters((previous) => ({
      ...previous,
      [name]: value
    }));
  }

  function handleFormChange(e) {
    const { name, value } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: value
    }));
  }

  function resetForm() {
    setForm({
      repair_id: "",
      channel: "email",
      recipient: "",
      message: ""
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        channel: form.channel,
        recipient: form.recipient.trim(),
        message: form.message.trim()
      };

      if (form.repair_id.trim()) {
        payload.repair_id = Number(form.repair_id);
      }

      const response = await api.post("/notifications", payload);

      if (response.data?.success) {
        setSuccess("Notification created successfully.");

        resetForm();
        setShowForm(false);

        setPage(1);
        await fetchNotifications();
      } else {
        setError(
          response.data?.message ||
            "Failed to create notification."
        );
      }
    } catch (err) {
      console.error("Failed to create notification:", err);

      setError(
        err.response?.data?.message ||
          "Unable to create notification. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  function clearFilters() {
    setFilters({
      status: "",
      channel: "",
      repair_id: ""
    });

    setPage(1);
  }

  function getStatusClass(status) {
    switch (status) {
      case "sent":
        return "status-badge status-sent";

      case "pending":
        return "status-badge status-pending";

      case "failed":
        return "status-badge status-failed";

      default:
        return "status-badge";
    }
  }

  function formatDate(date) {
    if (!date) {
      return "—";
    }

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return date;
    }

    return parsedDate.toLocaleString();
  }

  return (
    <div className="notifications-page">
      <div className="notifications-header">
        <div>
          <h1>Notifications</h1>
          <p>
            View and manage repair-related notifications.
          </p>
        </div>

        <button
          type="button"
          className="primary-button"
          onClick={() => {
            setShowForm((previous) => !previous);
            setError("");
            setSuccess("");
          }}
        >
          {showForm ? "Close Form" : "+ New Notification"}
        </button>
      </div>

      {success && (
        <div className="alert alert-success">
          {success}
        </div>
      )}

      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      {showForm && (
        <div className="notification-form-card">
          <div className="card-header">
            <div>
              <h2>Create Notification</h2>
              <p>
                Create a notification that can be processed by the system.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="repair_id">
                  Repair ID
                </label>

                <input
                  id="repair_id"
                  name="repair_id"
                  type="number"
                  min="1"
                  value={form.repair_id}
                  onChange={handleFormChange}
                  placeholder="Optional"
                />

                <small>
                  Leave empty if this notification is not linked to a repair.
                </small>
              </div>

              <div className="form-group">
                <label htmlFor="channel">
                  Channel <span>*</span>
                </label>

                <select
                  id="channel"
                  name="channel"
                  value={form.channel}
                  onChange={handleFormChange}
                  required
                >
                  <option value="email">Email</option>
                  <option value="telegram">Telegram</option>
                  <option value="sms">SMS</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="form-group form-group-full">
                <label htmlFor="recipient">
                  Recipient <span>*</span>
                </label>

                <input
                  id="recipient"
                  name="recipient"
                  type="text"
                  value={form.recipient}
                  onChange={handleFormChange}
                  placeholder="Email address, phone number, Telegram ID..."
                  required
                />
              </div>

              <div className="form-group form-group-full">
                <label htmlFor="message">
                  Message <span>*</span>
                </label>

                <textarea
                  id="message"
                  name="message"
                  rows="5"
                  value={form.message}
                  onChange={handleFormChange}
                  placeholder="Enter notification message..."
                  required
                />
              </div>
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  resetForm();
                  setShowForm(false);
                }}
                disabled={submitting}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="primary-button"
                disabled={submitting}
              >
                {submitting
                  ? "Creating..."
                  : "Create Notification"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="notifications-card">
        <div className="filters">
          <div className="filter-group">
            <label htmlFor="status">Status</label>

            <select
              id="status"
              name="status"
              value={filters.status}
              onChange={handleFilterChange}
            >
              <option value="">All statuses</option>
              <option value="pending">Pending</option>
              <option value="sent">Sent</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="channel-filter">Channel</label>

            <select
              id="channel-filter"
              name="channel"
              value={filters.channel}
              onChange={handleFilterChange}
            >
              <option value="">All channels</option>
              <option value="email">Email</option>
              <option value="telegram">Telegram</option>
              <option value="sms">SMS</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="repair-filter">Repair ID</label>

            <input
              id="repair-filter"
              name="repair_id"
              type="number"
              min="1"
              value={filters.repair_id}
              onChange={handleFilterChange}
              placeholder="Repair ID"
            />
          </div>

          <button
            type="button"
            className="clear-button"
            onClick={clearFilters}
          >
            Clear Filters
          </button>
        </div>

        <div className="table-wrapper">
          {loading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Loading notifications...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🔔</div>

              <h3>No notifications found</h3>

              <p>
                There are no notifications matching your current filters.
              </p>
            </div>
          ) : (
            <table className="notifications-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Repair</th>
                  <th>Channel</th>
                  <th>Recipient</th>
                  <th>Message</th>
                  <th>Status</th>
                  <th>Attempts</th>
                  <th>Sent At</th>
                  <th>Created</th>
                </tr>
              </thead>

              <tbody>
                {notifications.map((notification) => (
                  <tr
                    key={notification.notification_id}
                  >
                    <td>
                      <strong>
                        #{notification.notification_id}
                      </strong>
                    </td>

                    <td>
                      {notification.ticket_number ? (
                        <div className="repair-cell">
                          <strong>
                            {notification.ticket_number}
                          </strong>

                          <span>
                            ID: {notification.repair_id}
                          </span>
                        </div>
                      ) : (
                        <span className="muted">
                          Not linked
                        </span>
                      )}
                    </td>

                    <td>
                      <span className="channel-badge">
                        {notification.channel}
                      </span>
                    </td>

                    <td className="recipient-cell">
                      {notification.recipient}
                    </td>

                    <td className="message-cell">
                      {notification.message}
                    </td>

                    <td>
                      <span
                        className={getStatusClass(
                          notification.status
                        )}
                      >
                        {notification.status}
                      </span>
                    </td>

                    <td>
                      {notification.attempts ?? 0}
                    </td>

                    <td>
                      {formatDate(notification.sent_at)}
                    </td>

                    <td>
                      {formatDate(notification.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {!loading && notifications.length > 0 && (
          <div className="pagination">
            <button
              type="button"
              className="pagination-button"
              disabled={page <= 1}
              onClick={() =>
                setPage((previous) =>
                  Math.max(1, previous - 1)
                )
              }
            >
              ← Previous
            </button>

            <span className="pagination-info">
              Page {pagination.page}
            </span>

            <button
              type="button"
              className="pagination-button"
              disabled={pagination.returned < pagination.limit}
              onClick={() =>
                setPage((previous) => previous + 1)
              }
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default Notifications;
