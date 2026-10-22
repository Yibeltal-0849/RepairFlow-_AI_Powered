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

  /*
  |--------------------------------------------------------------------------
  | Filters
  |--------------------------------------------------------------------------
  */
  const [filters, setFilters] = useState({
    status: "",
    channel: "",
    ticket_number: ""
  });

  /*
  |--------------------------------------------------------------------------
  | Form visibility
  |--------------------------------------------------------------------------
  */
  const [showForm, setShowForm] = useState(false);

  /*
  |--------------------------------------------------------------------------
  | Notification form
  |--------------------------------------------------------------------------
  |
  | Telegram:
  | - ticket_number is required
  | - recipient is automatically resolved by backend
  |
  | Email/SMS/Other:
  | - recipient must be entered manually
  |
  |--------------------------------------------------------------------------
  */
  const [form, setForm] = useState({
    ticket_number: "",
    channel: "email",
    recipient: "",
    message: ""
  });

  /*
  |--------------------------------------------------------------------------
  | Fetch notifications
  |--------------------------------------------------------------------------
  */
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

      if (filters.ticket_number.trim()) {
        params.ticket_number =
          filters.ticket_number.trim();
      }

      const response = await api.get("/notifications", {
        params
      });

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
          response.data?.message ||
            "Failed to load notifications."
        );
      }
    } catch (err) {
      console.error(
        "Failed to load notifications:",
        err
      );

      setError(
        err.response?.data?.message ||
          "Unable to load notifications. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Reload notifications when page or filters change
  |--------------------------------------------------------------------------
  */
  useEffect(() => {
    fetchNotifications();
  }, [page, filters]);

  /*
  |--------------------------------------------------------------------------
  | Handle filters
  |--------------------------------------------------------------------------
  */
  function handleFilterChange(e) {
    const { name, value } = e.target;

    setPage(1);

    setFilters((previous) => ({
      ...previous,
      [name]: value
    }));
  }

  /*
  |--------------------------------------------------------------------------
  | Handle form changes
  |--------------------------------------------------------------------------
  */
  function handleFormChange(e) {
    const { name, value } = e.target;

    /*
    |--------------------------------------------------------------------------
    | When switching to Telegram
    |--------------------------------------------------------------------------
    |
    | Remove any manually entered recipient because Telegram recipient
    | is automatically resolved from the customer's ticket.
    |
    |--------------------------------------------------------------------------
    */
    if (name === "channel" && value === "telegram") {
      setForm((previous) => ({
        ...previous,
        channel: value,
        recipient: ""
      }));

      setError("");
      setSuccess("");

      return;
    }

    /*
    |--------------------------------------------------------------------------
    | When switching away from Telegram
    |--------------------------------------------------------------------------
    */
    if (
      name === "channel" &&
      value !== "telegram"
    ) {
      setForm((previous) => ({
        ...previous,
        channel: value,
        recipient: ""
      }));

      setError("");
      setSuccess("");

      return;
    }

    /*
    |--------------------------------------------------------------------------
    | Normal field update
    |--------------------------------------------------------------------------
    */
    setForm((previous) => ({
      ...previous,
      [name]: value
    }));
  }

  /*
  |--------------------------------------------------------------------------
  | Reset form
  |--------------------------------------------------------------------------
  */
  function resetForm() {
    setForm({
      ticket_number: "",
      channel: "email",
      recipient: "",
      message: ""
    });
  }

  /*
  |--------------------------------------------------------------------------
  | Open form
  |--------------------------------------------------------------------------
  */
  function openForm() {
    setShowForm(true);
    setError("");
    setSuccess("");
  }

  /*
  |--------------------------------------------------------------------------
  | Close form
  |--------------------------------------------------------------------------
  */
  function closeForm() {
    if (submitting) {
      return;
    }

    resetForm();
    setShowForm(false);
    setError("");
  }

  /*
  |--------------------------------------------------------------------------
  | Create notification
  |--------------------------------------------------------------------------
  */
  async function handleSubmit(e) {
    e.preventDefault();

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const ticketNumber =
        form.ticket_number.trim();

      const message =
        form.message.trim();

      /*
      |--------------------------------------------------------------------------
      | Validate message
      |--------------------------------------------------------------------------
      */
      if (!message) {
        setError("Please enter a notification message.");
        setSubmitting(false);
        return;
      }

      /*
      |--------------------------------------------------------------------------
      | Telegram validation
      |--------------------------------------------------------------------------
      |
      | Telegram notifications require a ticket number because the backend
      | uses it to find:
      |
      | ticket → repair → customer → telegram_chat_id
      |
      |--------------------------------------------------------------------------
      */
      if (
        form.channel === "telegram" &&
        !ticketNumber
      ) {
        setError(
          "Ticket number is required for Telegram notifications."
        );

        setSubmitting(false);
        return;
      }

      /*
      |--------------------------------------------------------------------------
      | Email/SMS/Other recipient validation
      |--------------------------------------------------------------------------
      */
      if (
        form.channel !== "telegram" &&
        !form.recipient.trim()
      ) {
        setError(
          "Recipient is required for this notification channel."
        );

        setSubmitting(false);
        return;
      }

      /*
      |--------------------------------------------------------------------------
      | Build request payload
      |--------------------------------------------------------------------------
      |
      | IMPORTANT:
      |
      | For Telegram we intentionally DO NOT send recipient.
      |
      | The backend gets the customer's Telegram chat ID from the database.
      |--------------------------------------------------------------------------
      */
      const payload = {
        channel: form.channel,
        message
      };

      /*
      |--------------------------------------------------------------------------
      | Ticket number
      |--------------------------------------------------------------------------
      */
      if (ticketNumber) {
        payload.ticket_number = ticketNumber;
      }

      /*
      |--------------------------------------------------------------------------
      | Recipient
      |--------------------------------------------------------------------------
      |
      | Only send recipient for channels that need manual recipient input.
      |--------------------------------------------------------------------------
      */
      if (form.channel !== "telegram") {
        payload.recipient =
          form.recipient.trim();
      }

      /*
      |--------------------------------------------------------------------------
      | Send notification request
      |--------------------------------------------------------------------------
      */
      const response = await api.post(
        "/notifications",
        payload
      );

      /*
      |--------------------------------------------------------------------------
      | Successful response
      |--------------------------------------------------------------------------
      */
      if (response.data?.success) {
        /*
        |--------------------------------------------------------------------------
        | Telegram has actually been sent when backend returns success.
        |--------------------------------------------------------------------------
        */
        if (form.channel === "telegram") {
          setSuccess(
            "Telegram notification sent successfully to the customer."
          );
        } else {
          setSuccess(
            response.data?.message ||
              "Notification created successfully."
          );
        }

        /*
        |--------------------------------------------------------------------------
        | Reset form
        |--------------------------------------------------------------------------
        */
        resetForm();
        setShowForm(false);

        /*
        |--------------------------------------------------------------------------
        | Return to page 1
        |--------------------------------------------------------------------------
        */
        setPage(1);

        /*
        |--------------------------------------------------------------------------
        | Reload list
        |--------------------------------------------------------------------------
        |
        | The useEffect will also reload because page changes to 1.
        |--------------------------------------------------------------------------
        */
        await fetchNotifications();
      } else {
        setError(
          response.data?.message ||
            "Failed to create notification."
        );
      }
    } catch (err) {
      console.error(
        "Failed to create notification:",
        err
      );

      /*
      |--------------------------------------------------------------------------
      | Extract backend error
      |--------------------------------------------------------------------------
      */
      const backendMessage =
        err.response?.data?.message;

      const backendError =
        err.response?.data?.data?.error_message;

      /*
      |--------------------------------------------------------------------------
      | Telegram-specific error
      |--------------------------------------------------------------------------
      */
      if (form.channel === "telegram") {
        setError(
          backendError ||
            backendMessage ||
            "Telegram notification failed. Please check the customer's Telegram connection."
        );
      } else {
        setError(
          backendMessage ||
            "Unable to create notification. Please try again."
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Clear filters
  |--------------------------------------------------------------------------
  */
  function clearFilters() {
    setFilters({
      status: "",
      channel: "",
      ticket_number: ""
    });

    setPage(1);
  }

  /*
  |--------------------------------------------------------------------------
  | Status CSS class
  |--------------------------------------------------------------------------
  */
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

  /*
  |--------------------------------------------------------------------------
  | Format dates
  |--------------------------------------------------------------------------
  */
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

  /*
  |--------------------------------------------------------------------------
  | Render
  |--------------------------------------------------------------------------
  */
  return (
    <div className="notifications-page">
      {/* ------------------------------------------------------------------ */}
      {/* PAGE HEADER                                                        */}
      {/* ------------------------------------------------------------------ */}

      <div className="notifications-header">
        <div>
          <h1>Notifications</h1>

          <p>
            View and manage repair-related
            notifications.
          </p>
        </div>

        <button
          type="button"
          className="primary-button"
          onClick={() => {
            if (showForm) {
              closeForm();
            } else {
              openForm();
            }
          }}
          disabled={submitting}
        >
          {showForm
            ? "Close Form"
            : "+ New Notification"}
        </button>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* SUCCESS MESSAGE                                                    */}
      {/* ------------------------------------------------------------------ */}

      {success && (
        <div className="alert alert-success">
          {success}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* ERROR MESSAGE                                                      */}
      {/* ------------------------------------------------------------------ */}

      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* CREATE NOTIFICATION FORM                                           */}
      {/* ------------------------------------------------------------------ */}

      {showForm && (
        <div className="notification-form-card">
          <div className="card-header">
            <div>
              <h2>Create Notification</h2>

              <p>
                Send a repair notification to a
                customer.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              {/* ---------------------------------------------------------- */}
              {/* TICKET NUMBER                                               */}
              {/* ---------------------------------------------------------- */}

              <div className="form-group">
                <label htmlFor="ticket_number">
                  Ticket Number
                  {form.channel === "telegram" && (
                    <span> *</span>
                  )}
                </label>

                <input
                  id="ticket_number"
                  name="ticket_number"
                  type="text"
                  value={form.ticket_number}
                  onChange={handleFormChange}
                  placeholder="e.g. RF-1792301440847-9198"
                  required={
                    form.channel === "telegram"
                  }
                />

                <small>
                  {form.channel === "telegram"
                    ? "Required. Used to find the customer's Telegram account."
                    : "Optional. Enter the repair ticket number to link this notification to a repair."}
                </small>
              </div>

              {/* ---------------------------------------------------------- */}
              {/* CHANNEL                                                     */}
              {/* ---------------------------------------------------------- */}

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
                  <option value="email">
                    Email
                  </option>

                  <option value="telegram">
                    Telegram
                  </option>

                  <option value="sms">
                    SMS
                  </option>

                  <option value="other">
                    Other
                  </option>
                </select>
              </div>

              {/* ---------------------------------------------------------- */}
              {/* TELEGRAM RECIPIENT                                          */}
              {/* ---------------------------------------------------------- */}

              {form.channel === "telegram" ? (
                <div className="form-group form-group-full">
                  <label htmlFor="telegram-recipient">
                    Recipient
                  </label>

                  <input
                    id="telegram-recipient"
                    type="text"
                    value="Automatically selected from customer"
                    disabled
                    readOnly
                  />

                  <small>
                    The customer's Telegram chat ID will
                    be retrieved automatically from the
                    customer linked to this ticket.
                  </small>
                </div>
              ) : (
                /* ---------------------------------------------------------- */
                /* EMAIL / SMS / OTHER RECIPIENT                              */
                /* ---------------------------------------------------------- */

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
                    placeholder={
                      form.channel === "email"
                        ? "customer@example.com"
                        : form.channel === "sms"
                        ? "+251..."
                        : "Enter recipient..."
                    }
                    required
                  />

                  <small>
                    Enter the recipient for this
                    notification channel.
                  </small>
                </div>
              )}

              {/* ---------------------------------------------------------- */}
              {/* MESSAGE                                                     */}
              {/* ---------------------------------------------------------- */}

              <div className="form-group form-group-full">
                <label htmlFor="message">
                  Message <span>*</span>
                </label>

                <textarea
                  id="message"
                  name="message"
                  rows="6"
                  value={form.message}
                  onChange={handleFormChange}
                  placeholder={
                    form.channel === "telegram"
                      ? "e.g. Hello! Your repair is ready for pickup."
                      : "Enter notification message..."
                  }
                  required
                />

                <small>
                  Write the message that will be sent to
                  the customer.
                </small>
              </div>
            </div>

            {/* -------------------------------------------------------------- */}
            {/* TELEGRAM INFORMATION                                           */}
            {/* -------------------------------------------------------------- */}

            {form.channel === "telegram" && (
              <div className="notification-info">
                <strong>
                  Telegram delivery
                </strong>

                <p>
                  The system will use the ticket number
                  to find the customer and send the
                  message to their registered Telegram
                  account.
                </p>
              </div>
            )}

            {/* -------------------------------------------------------------- */}
            {/* FORM ACTIONS                                                   */}
            {/* -------------------------------------------------------------- */}

            <div className="form-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={closeForm}
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
                  ? form.channel === "telegram"
                    ? "Sending..."
                    : "Creating..."
                  : form.channel === "telegram"
                  ? "Send Telegram"
                  : "Create Notification"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* NOTIFICATIONS LIST                                                 */}
      {/* ------------------------------------------------------------------ */}

      <div className="notifications-card">
        {/* ---------------------------------------------------------------- */}
        {/* FILTERS                                                          */}
        {/* ---------------------------------------------------------------- */}

        <div className="filters">
          <div className="filter-group">
            <label htmlFor="status">
              Status
            </label>

            <select
              id="status"
              name="status"
              value={filters.status}
              onChange={handleFilterChange}
            >
              <option value="">
                All statuses
              </option>

              <option value="pending">
                Pending
              </option>

              <option value="sent">
                Sent
              </option>

              <option value="failed">
                Failed
              </option>
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="channel-filter">
              Channel
            </label>

            <select
              id="channel-filter"
              name="channel"
              value={filters.channel}
              onChange={handleFilterChange}
            >
              <option value="">
                All channels
              </option>

              <option value="email">
                Email
              </option>

              <option value="telegram">
                Telegram
              </option>

              <option value="sms">
                SMS
              </option>

              <option value="other">
                Other
              </option>
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="ticket-filter">
              Ticket Number
            </label>

            <input
              id="ticket-filter"
              name="ticket_number"
              type="text"
              value={filters.ticket_number}
              onChange={handleFilterChange}
              placeholder="Search ticket number"
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

        {/* ---------------------------------------------------------------- */}
        {/* TABLE / LOADING / EMPTY                                          */}
        {/* ---------------------------------------------------------------- */}

        <div className="table-wrapper">
          {loading ? (
            <div className="loading-state">
              <div className="spinner"></div>

              <p>
                Loading notifications...
              </p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                🔔
              </div>

              <h3>
                No notifications found
              </h3>

              <p>
                There are no notifications matching
                your current filters.
              </p>
            </div>
          ) : (
            <table className="notifications-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Ticket Number</th>
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
                {notifications.map(
                  (notification) => (
                    <tr
                      key={
                        notification.notification_id
                      }
                    >
                      {/* -------------------------------------------------- */}
                      {/* ID                                                   */}
                      {/* -------------------------------------------------- */}

                      <td>
                        <strong>
                          #
                          {
                            notification.notification_id
                          }
                        </strong>
                      </td>

                      {/* -------------------------------------------------- */}
                      {/* TICKET NUMBER                                        */}
                      {/* -------------------------------------------------- */}

                      <td>
                        {notification.ticket_number ? (
                          <div className="repair-cell">
                            <strong>
                              {
                                notification.ticket_number
                              }
                            </strong>
                          </div>
                        ) : (
                          <span className="muted">
                            Not linked
                          </span>
                        )}
                      </td>

                      {/* -------------------------------------------------- */}
                      {/* CHANNEL                                              */}
                      {/* -------------------------------------------------- */}

                      <td>
                        <span className="channel-badge">
                          {notification.channel}
                        </span>
                      </td>

                      {/* -------------------------------------------------- */}
                      {/* RECIPIENT                                            */}
                      {/* -------------------------------------------------- */}

                      <td className="recipient-cell">
                        {notification.recipient}
                      </td>

                      {/* -------------------------------------------------- */}
                      {/* MESSAGE                                              */}
                      {/* -------------------------------------------------- */}

                      <td className="message-cell">
                        {notification.message}
                      </td>

                      {/* -------------------------------------------------- */}
                      {/* STATUS                                               */}
                      {/* -------------------------------------------------- */}

                      <td>
                        <span
                          className={getStatusClass(
                            notification.status
                          )}
                        >
                          {notification.status}
                        </span>
                      </td>

                      {/* -------------------------------------------------- */}
                      {/* ATTEMPTS                                             */}
                      {/* -------------------------------------------------- */}

                      <td>
                        {notification.attempts ??
                          0}
                      </td>

                      {/* -------------------------------------------------- */}
                      {/* SENT AT                                              */}
                      {/* -------------------------------------------------- */}

                      <td>
                        {formatDate(
                          notification.sent_at
                        )}
                      </td>

                      {/* -------------------------------------------------- */}
                      {/* CREATED                                              */}
                      {/* -------------------------------------------------- */}

                      <td>
                        {formatDate(
                          notification.created_at
                        )}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* PAGINATION                                                        */}
        {/* ---------------------------------------------------------------- */}

        {!loading &&
          notifications.length > 0 && (
            <div className="pagination">
              <button
                type="button"
                className="pagination-button"
                disabled={page <= 1}
                onClick={() =>
                  setPage((previous) =>
                    Math.max(
                      1,
                      previous - 1
                    )
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
                disabled={
                  pagination.returned <
                  pagination.limit
                }
                onClick={() =>
                  setPage(
                    (previous) =>
                      previous + 1
                  )
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