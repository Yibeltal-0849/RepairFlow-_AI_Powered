
import { useEffect, useState } from "react";
import api from "../../services/api"
import "./Integrations.css";

function Integrations() {
  const [telegramMessage, setTelegramMessage] = useState(
    "RepairFlow AI Telegram integration test."
  );

  const [telegramLoading, setTelegramLoading] = useState(false);
  const [sheetsTesting, setSheetsTesting] = useState(false);
  const [sheetsSyncing, setSheetsSyncing] = useState(false);
  const [logsLoading, setLogsLoading] = useState(true);

  const [telegramResult, setTelegramResult] = useState(null);
  const [sheetsResult, setSheetsResult] = useState(null);
  const [syncResult, setSyncResult] = useState(null);

  const [logs, setLogs] = useState([]);

  const [error, setError] = useState("");

  async function loadLogs() {
    try {
      setLogsLoading(true);

      const response = await api.get("/integrations/logs");

      if (response.data?.success) {
        setLogs(response.data.data || []);
      } else {
        setError(
          response.data?.message ||
            "Failed to load integration logs."
        );
      }
    } catch (err) {
      console.error("Failed to load integration logs:", err);

      setError(
        err.response?.data?.message ||
          "Unable to load integration logs."
      );
    } finally {
      setLogsLoading(false);
    }
  }

  useEffect(() => {
    loadLogs();
  }, []);

  async function handleTelegramTest(e) {
    e.preventDefault();

    if (!telegramMessage.trim()) {
      setError("Please enter a Telegram test message.");
      return;
    }

    try {
      setTelegramLoading(true);
      setError("");
      setTelegramResult(null);

      const response = await api.post(
        "/integrations/telegram/test",
        {
          message: telegramMessage.trim()
        }
      );

      if (response.data?.success) {
        setTelegramResult({
          success: true,
          message:
            response.data.message ||
            "Telegram test message sent successfully."
        });

        await loadLogs();
      } else {
        setTelegramResult({
          success: false,
          message:
            response.data?.message ||
            "Telegram test failed."
        });

        if (response.data?.error) {
          setError(response.data.error);
        }

        await loadLogs();
      }
    } catch (err) {
      console.error("Telegram test failed:", err);

      setTelegramResult({
        success: false,
        message:
          err.response?.data?.message ||
          "Telegram test failed."
      });

      setError(
        err.response?.data?.error ||
          err.response?.data?.message ||
          "Unable to test Telegram integration."
      );

      await loadLogs();
    } finally {
      setTelegramLoading(false);
    }
  }

  async function handleSheetsTest() {
    try {
      setSheetsTesting(true);
      setError("");
      setSheetsResult(null);

      const response = await api.get(
        "/integrations/sheets/test"
      );

      if (response.data?.success) {
        setSheetsResult({
          success: true,
          message:
            response.data.message ||
            "Google Sheets connection successful.",
          data: response.data.data || null
        });
      } else {
        setSheetsResult({
          success: false,
          message:
            response.data?.message ||
            "Google Sheets connection test failed."
        });
      }

      await loadLogs();
    } catch (err) {
      console.error(
        "Google Sheets connection test failed:",
        err
      );

      setSheetsResult({
        success: false,
        message:
          err.response?.data?.message ||
          "Google Sheets connection test failed."
      });

      setError(
        err.response?.data?.message ||
          "Unable to test Google Sheets connection."
      );
    } finally {
      setSheetsTesting(false);
    }
  }

  async function handleSheetsSync() {
    try {
      setSheetsSyncing(true);
      setError("");
      setSyncResult(null);

      const response = await api.post(
        "/integrations/sheets/sync"
      );

      if (response.data?.success) {
        setSyncResult({
          success: true,
          message:
            response.data.message ||
            "Repairs synchronized successfully.",
          data: response.data.data || null
        });
      } else {
        setSyncResult({
          success: false,
          message:
            response.data?.message ||
            "Google Sheets synchronization failed."
        });
      }

      await loadLogs();
    } catch (err) {
      console.error(
        "Google Sheets synchronization failed:",
        err
      );

      setSyncResult({
        success: false,
        message:
          err.response?.data?.message ||
          "Google Sheets synchronization failed."
      });

      setError(
        err.response?.data?.message ||
          "Unable to synchronize repairs to Google Sheets."
      );
    } finally {
      setSheetsSyncing(false);
    }
  }

  function formatDate(date) {
    if (!date) {
      return "—";
    }

    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) {
      return date;
    }

    return parsed.toLocaleString();
  }

  function getStatusClass(status) {
    switch (status) {
      case "success":
        return "integration-status status-success";

      case "failed":
        return "integration-status status-failed";

      case "pending":
        return "integration-status status-pending";

      default:
        return "integration-status";
    }
  }

  function getIntegrationLabel(name) {
    switch (name) {
      case "telegram":
        return "Telegram";

      case "google_sheets":
        return "Google Sheets";

      default:
        return name || "Unknown";
    }
  }

  return (
    <div className="integrations-page">
      <div className="integrations-header">
        <div>
          <h1>Integrations</h1>
          <p>
            Manage external services connected to RepairFlow AI.
          </p>
        </div>

        <button
          type="button"
          className="secondary-button"
          onClick={loadLogs}
          disabled={logsLoading}
        >
          {logsLoading ? "Refreshing..." : "↻ Refresh Logs"}
        </button>
      </div>

      {error && (
        <div className="integration-alert integration-alert-error">
          <span className="alert-symbol">!</span>

          <span>{error}</span>

          <button
            type="button"
            onClick={() => setError("")}
          >
            ×
          </button>
        </div>
      )}

      <div className="integration-grid">
        {/* Telegram */}

        <section className="integration-card">
          <div className="integration-card-header">
            <div className="integration-icon telegram-icon">
              T
            </div>

            <div>
              <h2>Telegram</h2>
              <p>
                Send a test message through your Telegram bot.
              </p>
            </div>

            <span className="integration-label">
              Messaging
            </span>
          </div>

          <form onSubmit={handleTelegramTest}>
            <div className="integration-form-group">
              <label htmlFor="telegram-message">
                Test Message
              </label>

              <textarea
                id="telegram-message"
                value={telegramMessage}
                onChange={(e) =>
                  setTelegramMessage(e.target.value)
                }
                rows="4"
                disabled={telegramLoading}
                placeholder="Enter a Telegram test message..."
              />
            </div>

            <div className="integration-actions">
              <button
                type="submit"
                className="primary-button"
                disabled={
                  telegramLoading ||
                  !telegramMessage.trim()
                }
              >
                {telegramLoading ? (
                  <>
                    <span className="button-spinner"></span>
                    Sending...
                  </>
                ) : (
                  "Send Test Message"
                )}
              </button>
            </div>
          </form>

          {telegramResult && (
            <div
              className={
                telegramResult.success
                  ? "integration-result result-success"
                  : "integration-result result-failed"
              }
            >
              <strong>
                {telegramResult.success
                  ? "Success"
                  : "Failed"}
              </strong>

              <span>{telegramResult.message}</span>
            </div>
          )}
        </section>

        {/* Google Sheets */}

        <section className="integration-card">
          <div className="integration-card-header">
            <div className="integration-icon sheets-icon">
              S
            </div>

            <div>
              <h2>Google Sheets</h2>
              <p>
                Test and synchronize your repair data with
                Google Sheets.
              </p>
            </div>

            <span className="integration-label">
              Data Sync
            </span>
          </div>

          <div className="sheets-actions">
            <button
              type="button"
              className="secondary-button full-button"
              onClick={handleSheetsTest}
              disabled={sheetsTesting || sheetsSyncing}
            >
              {sheetsTesting ? (
                <>
                  <span className="dark-spinner"></span>
                  Testing Connection...
                </>
              ) : (
                "Test Connection"
              )}
            </button>

            <button
              type="button"
              className="primary-button full-button"
              onClick={handleSheetsSync}
              disabled={sheetsTesting || sheetsSyncing}
            >
              {sheetsSyncing ? (
                <>
                  <span className="button-spinner"></span>
                  Synchronizing...
                </>
              ) : (
                "Sync Repairs"
              )}
            </button>
          </div>

          {sheetsResult && (
            <div
              className={
                sheetsResult.success
                  ? "integration-result result-success"
                  : "integration-result result-failed"
              }
            >
              <strong>
                {sheetsResult.success
                  ? "Connection Successful"
                  : "Connection Failed"}
              </strong>

              <span>{sheetsResult.message}</span>

              {sheetsResult.data && (
                <div className="result-details">
                  {Object.entries(sheetsResult.data).map(
                    ([key, value]) => (
                      <div
                        className="result-detail"
                        key={key}
                      >
                        <span>
                          {key.replaceAll("_", " ")}
                        </span>

                        <strong>
                          {String(value)}
                        </strong>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          )}

          {syncResult && (
            <div
              className={
                syncResult.success
                  ? "integration-result result-success"
                  : "integration-result result-failed"
              }
            >
              <strong>
                {syncResult.success
                  ? "Synchronization Successful"
                  : "Synchronization Failed"}
              </strong>

              <span>{syncResult.message}</span>

              {syncResult.data && (
                <div className="result-details">
                  {syncResult.data.spreadsheet_id && (
                    <div className="result-detail">
                      <span>Spreadsheet ID</span>

                      <strong>
                        {syncResult.data.spreadsheet_id}
                      </strong>
                    </div>
                  )}

                  {syncResult.data.range && (
                    <div className="result-detail">
                      <span>Range</span>

                      <strong>
                        {syncResult.data.range}
                      </strong>
                    </div>
                  )}

                  {syncResult.data.records !== undefined && (
                    <div className="result-detail">
                      <span>Records</span>

                      <strong>
                        {syncResult.data.records}
                      </strong>
                    </div>
                  )}

                  {syncResult.data.status && (
                    <div className="result-detail">
                      <span>Status</span>

                      <strong>
                        {syncResult.data.status}
                      </strong>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </section>
      </div>

      {/* Integration Logs */}

      <section className="logs-card">
        <div className="logs-header">
          <div>
            <h2>Integration Logs</h2>
            <p>
              Recent Telegram and Google Sheets integration
              activity.
            </p>
          </div>

          <span className="log-count">
            {logs.length} records
          </span>
        </div>

        <div className="logs-table-wrapper">
          {logsLoading ? (
            <div className="logs-loading">
              <div className="large-spinner"></div>
              <p>Loading integration logs...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="logs-empty">
              <div className="empty-icon">◌</div>

              <h3>No integration activity</h3>

              <p>
                Integration activity will appear here after
                you test or synchronize an integration.
              </p>
            </div>
          ) : (
            <table className="logs-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Integration</th>
                  <th>Event</th>
                  <th>Entity</th>
                  <th>Status</th>
                  <th>Attempts</th>
                  <th>Error</th>
                  <th>Created</th>
                  <th>Updated</th>
                </tr>
              </thead>

              <tbody>
                {logs.map((log) => (
                  <tr
                    key={
                      log.integration_sync_log_id
                    }
                  >
                    <td>
                      <strong>
                        #{log.integration_sync_log_id}
                      </strong>
                    </td>

                    <td>
                      <span className="integration-name">
                        {getIntegrationLabel(
                          log.integration_name
                        )}
                      </span>
                    </td>

                    <td>
                      <span className="event-name">
                        {log.event_type || "—"}
                      </span>
                    </td>

                    <td>
                      <div className="entity-cell">
                        <strong>
                          {log.entity_type || "—"}
                        </strong>

                        {log.entity_id && (
                          <span>
                            ID: {log.entity_id}
                          </span>
                        )}
                      </div>
                    </td>

                    <td>
                      <span
                        className={getStatusClass(
                          log.status
                        )}
                      >
                        {log.status || "unknown"}
                      </span>
                    </td>

                    <td>
                      {log.attempts ?? 0}
                    </td>

                    <td className="error-cell">
                      {log.last_error || "—"}
                    </td>

                    <td>
                      {formatDate(log.created_at)}
                    </td>

                    <td>
                      {formatDate(log.updated_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}

export default Integrations;
