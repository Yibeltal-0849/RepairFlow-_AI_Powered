
import { useEffect, useState } from "react";
import api from "../../services/api";
import "./Customers.css";

function Customer() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    email: "",
    telegram_chat_id: "",
    notification_consent: false
  });

  /* ---------------------------------------------
     Load Customers
  --------------------------------------------- */
  async function fetchCustomers() {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/customers", {
        params: {
          search: search.trim()
        }
      });

      setCustomers(response.data?.data || []);
    } catch (err) {
      console.error(err);

      setError(
        err.response?.data?.message ||
          "Unable to load customers."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCustomers();
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  /* ---------------------------------------------
     Form
  --------------------------------------------- */
  function handleChange(event) {
    const { name, value, type, checked } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value
    }));
  }

  function resetForm() {
    setForm({
      full_name: "",
      phone: "",
      email: "",
      telegram_chat_id: "",
      notification_consent: false
    });

    setEditingCustomer(null);
  }

  function openAddModal() {
    resetForm();
    setError("");
    setSuccess("");
    setShowModal(true);
  }

  function openEditModal(customer) {
    setEditingCustomer(customer);

    setForm({
      full_name: customer.full_name || "",
      phone: customer.phone || "",
      email: customer.email || "",
      telegram_chat_id: customer.telegram_chat_id || "",
      notification_consent: Boolean(
        customer.notification_consent
      )
    });

    setError("");
    setSuccess("");
    setShowModal(true);
  }

  function closeModal() {
    if (saving) return;

    setShowModal(false);
    resetForm();
  }

  /* ---------------------------------------------
     Save Customer
  --------------------------------------------- */
  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setSuccess("");

    const name = form.full_name.trim();

    if (!name) {
      setError("Full name is required.");
      return;
    }

    if (name.length < 2) {
      setError(
        "Full name must contain at least 2 characters."
      );
      return;
    }

    try {
      setSaving(true);

      const payload = {
        full_name: name,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        telegram_chat_id:
          form.telegram_chat_id.trim() || null,
        notification_consent:
          form.notification_consent
      };

      if (editingCustomer) {
        await api.put(
          `/customers/${editingCustomer.customer_id}`,
          payload
        );

        setSuccess("Customer updated successfully.");
      } else {
        await api.post("/customers", payload);

        setSuccess("Customer created successfully.");
      }

      setShowModal(false);
      resetForm();

      await fetchCustomers();
    } catch (err) {
      console.error(err);

      setError(
        err.response?.data?.message ||
          "Unable to save customer."
      );
    } finally {
      setSaving(false);
    }
  }

  /* ---------------------------------------------
     Helpers
  --------------------------------------------- */
  function formatDate(date) {
    if (!date) return "-";

    return new Date(date).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  }

  return (
    <div className="customer-page">

      {/* Page Header */}
      <div className="customer-page-header">
        <div>
          <h1>Customers</h1>
          <p>
            Manage your customers and their notification
            preferences.
          </p>
        </div>

        <button
          className="btn btn-primary"
          onClick={openAddModal}
        >
          + Add Customer
        </button>
      </div>

      {/* Alerts */}
      {error && !showModal && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      {success && !showModal && (
        <div className="alert alert-success">
          {success}
        </div>
      )}

      {/* Search */}
      <div className="customer-toolbar">
        <div className="search-box">
          <span className="search-icon">⌕</span>

          <input
            type="text"
            placeholder="Search customers..."
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
          />

          {search && (
            <button
              className="clear-search"
              onClick={() => setSearch("")}
              type="button"
            >
              ×
            </button>
          )}
        </div>

        <span className="customer-count">
          {customers.length} customer
          {customers.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Customer Table */}
      <div className="customer-card">
        {loading ? (
          <div className="table-state">
            <div className="spinner"></div>
            <p>Loading customers...</p>
          </div>
        ) : customers.length === 0 ? (
          <div className="table-state">
            <div className="empty-icon">👥</div>
            <h3>No customers found</h3>
            <p>
              {search
                ? "Try a different search."
                : "There are no customers yet."}
            </p>

            {!search && (
              <button
                className="btn btn-primary"
                onClick={openAddModal}
              >
                + Add Customer
              </button>
            )}
          </div>
        ) : (
          <div className="table-container">
            <table className="customer-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th>Telegram</th>
                  <th>Notifications</th>
                  <th>Created</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {customers.map((customer) => (
                  <tr key={customer.customer_id}>

                    {/* Customer */}
                    <td>
                      <div className="customer-info">
                        <div className="customer-avatar">
                          {customer.full_name
                            ?.charAt(0)
                            ?.toUpperCase()}
                        </div>

                        <div>
                          <strong>
                            {customer.full_name}
                          </strong>

                          <small>
                            #{customer.customer_id}
                          </small>
                        </div>
                      </div>
                    </td>

                    {/* Phone */}
                    <td>
                      {customer.phone || "-"}
                    </td>

                    {/* Email */}
                    <td>
                      {customer.email || "-"}
                    </td>

                    {/* Telegram */}
                    <td>
                      {customer.telegram_chat_id ? (
                        <span className="badge badge-blue">
                          Connected
                        </span>
                      ) : (
                        <span className="text-muted">
                          Not connected
                        </span>
                      )}
                    </td>

                    {/* Notifications */}
                    <td>
                      {Boolean(
                        customer.notification_consent
                      ) ? (
                        <span className="badge badge-green">
                          Enabled
                        </span>
                      ) : (
                        <span className="badge badge-gray">
                          Disabled
                        </span>
                      )}
                    </td>

                    {/* Created */}
                    <td>
                      {formatDate(customer.created_at)}
                    </td>

                    {/* Action */}
                    <td>
                      <button
                        className="btn-edit"
                        onClick={() =>
                          openEditModal(customer)
                        }
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div
          className="modal-overlay"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget
            ) {
              closeModal();
            }
          }}
        >
          <div className="modal">

            {/* Modal Header */}
            <div className="modal-header">
              <div>
                <h2>
                  {editingCustomer
                    ? "Edit Customer"
                    : "Add Customer"}
                </h2>

                <p>
                  {editingCustomer
                    ? "Update customer information."
                    : "Enter customer information below."}
                </p>
              </div>

              <button
                className="modal-close"
                onClick={closeModal}
                type="button"
              >
                ×
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit}>

              {error && (
                <div className="alert alert-error modal-alert">
                  {error}
                </div>
              )}

              <div className="form-body">

                {/* Full Name */}
                <div className="form-group full-width">
                  <label>
                    Full Name
                    <span>*</span>
                  </label>

                  <input
                    type="text"
                    name="full_name"
                    value={form.full_name}
                    onChange={handleChange}
                    placeholder="Enter full name"
                    disabled={saving}
                  />
                </div>

                {/* Phone */}
                <div className="form-group">
                  <label>Phone</label>

                  <input
                    type="tel"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="+251..."
                    disabled={saving}
                  />
                </div>

                {/* Email */}
                <div className="form-group">
                  <label>Email</label>

                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="customer@example.com"
                    disabled={saving}
                  />
                </div>

                {/* Telegram */}
                <div className="form-group full-width">
                  <label>
                    Telegram Chat ID
                  </label>

                  <input
                    type="text"
                    name="telegram_chat_id"
                    value={form.telegram_chat_id}
                    onChange={handleChange}
                    placeholder="Telegram chat ID"
                    disabled={saving}
                  />
                </div>

                {/* Consent */}
                <div className="consent-box full-width">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      name="notification_consent"
                      checked={
                        form.notification_consent
                      }
                      onChange={handleChange}
                      disabled={saving}
                    />

                    <span>
                      <strong>
                        Notification consent
                      </strong>

                      <small>
                        Customer has agreed to receive
                        notifications.
                      </small>
                    </span>
                  </label>
                </div>
              </div>

              {/* Footer */}
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={closeModal}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editingCustomer
                    ? "Update Customer"
                    : "Create Customer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Customer;
