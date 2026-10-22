
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../../services/api";
import "./Diagnosis.css";

function Diagnosis() {
  const [searchParams] = useSearchParams();
  const repairId = searchParams.get("repair_id") || "";

  const [diagnoses, setDiagnoses] = useState([]);
  const [selectedDiagnosis, setSelectedDiagnosis] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Run diagnosis using the ticket number shown in the Repairs UI.
  const [ticketNumber, setTicketNumber] = useState("");

  const [symptoms, setSymptoms] = useState("");
  const [previousAttempts, setPreviousAttempts] = useState("");
  const [measurements, setMeasurements] = useState("");
  const [additionalContext, setAdditionalContext] = useState("");

  const [runningDiagnosis, setRunningDiagnosis] = useState(false);
  const [runError, setRunError] = useState("");
  const [runSuccess, setRunSuccess] = useState("");

  // Technician review
  const [reviewing, setReviewing] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [reviewStatus, setReviewStatus] = useState("");
  const [suggestions, setSuggestions] = useState("");
  const [uncertaintyNotes, setUncertaintyNotes] = useState("");

  /*
   * LOAD DIAGNOSIS SESSIONS
   *
   * The optional repair_id query parameter remains supported
   * for existing links from other parts of the application.
   */
  const fetchDiagnoses = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      setError("");

      const url = repairId
        ? `/diagnoses?repair_id=${encodeURIComponent(repairId)}`
        : "/diagnoses";

      const response = await api.get(url);
      const rows = Array.isArray(response.data?.data)
        ? response.data.data
        : [];

      setDiagnoses(rows);
      return rows;
    } catch (err) {
      console.error("Fetch diagnoses error:", err);

      setError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          "Unable to load diagnosis sessions."
      );

      return [];
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiagnoses();
    // Reload when the optional repair_id URL filter changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repairId]);

  /*
   * FORMAT SUGGESTIONS FOR THE EDITOR
   */
  const formatSuggestionsForEditor = (value) => {
    if (!value) return "";

    if (typeof value === "string") {
      try {
        return JSON.stringify(JSON.parse(value), null, 2);
      } catch {
        return value;
      }
    }

    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  };

  /*
   * SELECT A SESSION
   */
  const handleSelectDiagnosis = (diagnosis) => {
    setSelectedDiagnosis(diagnosis);
    setReviewStatus("");
    setReviewError("");

    setSuggestions(
      formatSuggestionsForEditor(
        diagnosis.structured_suggestions
      )
    );

    setUncertaintyNotes(diagnosis.uncertainty_notes || "");
  };

  /*
   * RUN GEMINI DIAGNOSIS USING A TICKET NUMBER
   */
  const handleRunDiagnosis = async (event) => {
    event.preventDefault();

    const ticket = ticketNumber.trim();

    if (!ticket) {
      setRunError("Enter the repair ticket number.");
      return;
    }

    if (!symptoms.trim()) {
      setRunError("Describe the device symptoms.");
      return;
    }

    try {
      setRunningDiagnosis(true);
      setRunError("");
      setRunSuccess("");
      setReviewError("");
      setReviewStatus("");

      // The backend looks up the numeric repair_id by ticket_number.
      const response = await api.post("/ai/diagnose", {
        ticket_number: ticket,
        symptoms: symptoms.trim(),
        previous_attempts: previousAttempts.trim(),
        measurements: measurements.trim(),
        additional_context: additionalContext.trim(),
      });

      const payload = response.data;
      const data = payload?.data ?? payload;

      setRunSuccess(
        payload?.message || "AI diagnosis completed successfully."
      );

      // Refresh the list of saved diagnosis sessions.
      const rows = await fetchDiagnoses(false);

      const newSessionId =
        data?.diagnosis_session_id ??
        data?.session_id ??
        data?.diagnosis?.diagnosis_session_id;

      const matchingSession = rows.find((item) =>
        newSessionId != null
          ? String(item.diagnosis_session_id) ===
            String(newSessionId)
          : item.ticket_number === ticket
      );

      if (matchingSession) {
        handleSelectDiagnosis(matchingSession);
      } else {
        // A session may have been saved but omitted by a URL filter.
        setRunSuccess(
          "Diagnosis request completed. Refresh the session list to see the saved result."
        );
      }

      setSymptoms("");
      setPreviousAttempts("");
      setMeasurements("");
      setAdditionalContext("");
    } catch (err) {
      console.error("Run diagnosis error:", err);

      setRunError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          "Unable to run diagnosis. Check the ticket number, permissions, backend, and Gemini configuration."
      );
    } finally {
      setRunningDiagnosis(false);
    }
  };

  /*
   * REVIEW, EDIT, APPROVE, OR REJECT
   */
  const handleReview = async (status) => {
    if (!selectedDiagnosis) return;

    try {
      setReviewing(true);
      setReviewError("");
      setReviewStatus("");

      let finalSuggestions = suggestions;

      try {
        finalSuggestions = JSON.parse(suggestions);
      } catch {
        // The backend also accepts plain text.
      }

      await api.post(
        `/diagnoses/${selectedDiagnosis.diagnosis_session_id}/review`,
        {
          status,
          structured_suggestions: finalSuggestions,
          uncertainty_notes: uncertaintyNotes,
        }
      );

      const rows = await fetchDiagnoses(false);

      const updated = rows.find(
        (item) =>
          String(item.diagnosis_session_id) ===
          String(selectedDiagnosis.diagnosis_session_id)
      );

      if (updated) {
        handleSelectDiagnosis(updated);
      } else {
        setSelectedDiagnosis((previous) => ({
          ...previous,
          status,
          structured_suggestions: finalSuggestions,
          uncertainty_notes: uncertaintyNotes,
        }));
      }

      setReviewStatus(status);
    } catch (err) {
      console.error("Review diagnosis error:", err);

      setReviewError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          "Unable to review diagnosis."
      );
    } finally {
      setReviewing(false);
    }
  };

  /*
   * DISPLAY HELPERS
   */
  const getStatusClass = (status) =>
    status ? status.toLowerCase() : "unknown";

  const formatDate = (date) => {
    if (!date) return "—";

    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) return "—";

    return parsed.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const parseSuggestions = (value) => {
    if (!value) return null;
    if (typeof value === "object") return value;

    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  };

  const renderSuggestions = (value) => {
    const parsed = parseSuggestions(value);

    if (!parsed) {
      return (
        <pre className="diagnosis-raw-text">
          {value || "No suggestions available."}
        </pre>
      );
    }

    if (Array.isArray(parsed)) {
      return (
        <ul className="suggestion-list">
          {parsed.map((item, index) => (
            <li key={index}>
              {item !== null && typeof item === "object"
                ? JSON.stringify(item, null, 2)
                : String(item)}
            </li>
          ))}
        </ul>
      );
    }

    if (typeof parsed !== "object") {
      return (
        <pre className="diagnosis-raw-text">
          {String(parsed)}
        </pre>
      );
    }

    return (
      <div className="suggestion-grid">
        {Object.entries(parsed).map(([key, value]) => (
          <div className="suggestion-item" key={key}>
            <span className="suggestion-label">
              {key
                .replace(/_/g, " ")
                .replace(/\b\w/g, (letter) => letter.toUpperCase())}
            </span>

            <div className="suggestion-value">
              {value !== null && typeof value === "object"
                ? JSON.stringify(value, null, 2)
                : String(value ?? "")}
            </div>
          </div>
        ))}
      </div>
    );
  };

  /*
   * LOADING
   */
  if (loading) {
    return (
      <div className="diagnosis-page">
        <div className="diagnosis-loading">
          <div className="diagnosis-spinner" />
          <p>Loading diagnosis sessions...</p>
        </div>
      </div>
    );
  }

  /*
   * PAGE
   */
  return (
    <div className="diagnosis-page">
      <div className="diagnosis-header">
        <div>
          <h1>AI Diagnosis</h1>
          <p>
            Run Gemini diagnosis and review AI-generated
            suggestions before applying them to repair tickets.
          </p>
        </div>

        {repairId && (
          <Link
            to={`/repairs/${repairId}`}
            className="back-repair-button"
          >
            ← Back to Repair
          </Link>
        )}
      </div>

      {/* RUN DIAGNOSIS */}
      <section className="review-section">
        <div className="review-header">
          <div>
            <h3>Run AI Diagnosis</h3>
            <p>
              Use the ticket number shown in the Repairs table.
            </p>
          </div>
        </div>

        <form className="review-form" onSubmit={handleRunDiagnosis}>
          <div className="form-group">
            <label htmlFor="diagnosis-ticket-number">
              Repair Ticket Number
            </label>

            <input
              id="diagnosis-ticket-number"
              type="text"
              value={ticketNumber}
              onChange={(event) => setTicketNumber(event.target.value)}
              placeholder="RF-1792301440847-9198"
              required
            />

            <small>
              Copy the ticket number directly from the Repairs page.
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="diagnosis-symptoms">Symptoms *</label>
            <textarea
              id="diagnosis-symptoms"
              value={symptoms}
              onChange={(event) => setSymptoms(event.target.value)}
              rows={3}
              placeholder="Example: The Tecno T528 battery drains quickly."
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="diagnosis-previous-attempts">
              Previous Repair Attempts
            </label>
            <textarea
              id="diagnosis-previous-attempts"
              value={previousAttempts}
              onChange={(event) =>
                setPreviousAttempts(event.target.value)
              }
              rows={2}
              placeholder="Describe any previous tests or repairs."
            />
          </div>

          <div className="form-group">
            <label htmlFor="diagnosis-measurements">Measurements</label>
            <textarea
              id="diagnosis-measurements"
              value={measurements}
              onChange={(event) => setMeasurements(event.target.value)}
              rows={2}
              placeholder="Battery voltage, charging current, and test results."
            />
          </div>

          <div className="form-group">
            <label htmlFor="diagnosis-context">Additional Context</label>
            <textarea
              id="diagnosis-context"
              value={additionalContext}
              onChange={(event) =>
                setAdditionalContext(event.target.value)
              }
              rows={2}
              placeholder="Any other relevant information."
            />
          </div>

          {runError && (
            <div className="review-error" role="alert">
              {runError}
            </div>
          )}

          {runSuccess && (
            <div className="review-success" role="status">
              {runSuccess}
            </div>
          )}

          <div className="review-actions">
            <button
              type="submit"
              className="approve-button"
              disabled={runningDiagnosis}
            >
              {runningDiagnosis
                ? "Running AI Diagnosis..."
                : "Run AI Diagnosis"}
            </button>
          </div>
        </form>
      </section>

      {/* LIST ERROR */}
      {error && (
        <div className="diagnosis-error">
          <div>
            <strong>Unable to load diagnoses</strong>
            <span>{error}</span>
          </div>

          <button type="button" onClick={() => fetchDiagnoses()}>
            Try Again
          </button>
        </div>
      )}

      {/* MAIN LAYOUT */}
      <div className="diagnosis-layout">
        <aside className="diagnosis-list-card">
          <div className="diagnosis-list-header">
            <div>
              <h2>Diagnosis Sessions</h2>
              <p>
                {diagnoses.length} session
                {diagnoses.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>

          {diagnoses.length === 0 ? (
            <div className="diagnosis-empty">
              <div className="diagnosis-empty-icon">✦</div>
              <h3>No diagnoses found</h3>
              <p>
                Run a diagnosis above. Saved sessions will appear here.
              </p>
            </div>
          ) : (
            <div className="diagnosis-list">
              {diagnoses.map((diagnosis) => (
                <button
                  type="button"
                  key={diagnosis.diagnosis_session_id}
                  className={`diagnosis-list-item ${
                    String(selectedDiagnosis?.diagnosis_session_id) ===
                    String(diagnosis.diagnosis_session_id)
                      ? "active"
                      : ""
                  }`}
                  onClick={() => handleSelectDiagnosis(diagnosis)}
                >
                  <div className="diagnosis-list-top">
                    <strong>
                      {diagnosis.ticket_number ||
                        `Repair #${diagnosis.repair_id}`}
                    </strong>

                    <span
                      className={`diagnosis-status ${getStatusClass(
                        diagnosis.status
                      )}`}
                    >
                      {diagnosis.status || "pending"}
                    </span>
                  </div>

                  <div className="diagnosis-list-info">
                    <span>{diagnosis.provider || "AI Provider"}</span>
                    <span>{formatDate(diagnosis.created_at)}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </aside>

        <main className="diagnosis-details-card">
          {!selectedDiagnosis ? (
            <div className="diagnosis-select-state">
              <div className="select-state-icon">✦</div>
              <h2>Select a Diagnosis</h2>
              <p>
                Select a saved session to review its AI recommendations.
              </p>
            </div>
          ) : (
            <>
              <div className="details-header">
                <div>
                  <div className="details-title-row">
                    <h2>
                      {selectedDiagnosis.ticket_number ||
                        `Repair #${selectedDiagnosis.repair_id}`}
                    </h2>

                    <span
                      className={`diagnosis-status large ${getStatusClass(
                        selectedDiagnosis.status
                      )}`}
                    >
                      {selectedDiagnosis.status || "pending"}
                    </span>
                  </div>

                  <p>
                    Diagnosis Session #
                    {selectedDiagnosis.diagnosis_session_id}
                  </p>
                </div>
              </div>

              <div className="diagnosis-meta">
                <div className="meta-item">
                  <span>Provider</span>
                  <strong>{selectedDiagnosis.provider || "—"}</strong>
                </div>

                <div className="meta-item">
                  <span>Model</span>
                  <strong>{selectedDiagnosis.model_name || "—"}</strong>
                </div>

                <div className="meta-item">
                  <span>Created</span>
                  <strong>{formatDate(selectedDiagnosis.created_at)}</strong>
                </div>

                <div className="meta-item">
                  <span>Reviewed</span>
                  <strong>{formatDate(selectedDiagnosis.reviewed_at)}</strong>
                </div>
              </div>

              <section className="diagnosis-section">
                <div className="section-heading">
                  <h3>Input Summary</h3>
                  <span>AI input</span>
                </div>

                <div className="summary-box">
                  {selectedDiagnosis.input_summary ||
                    "No input summary available."}
                </div>
              </section>

              <section className="diagnosis-section">
                <div className="section-heading">
                  <h3>AI Recommendations</h3>
                  <span>Suggested diagnosis</span>
                </div>

                <div className="suggestions-box">
                  {renderSuggestions(
                    selectedDiagnosis.structured_suggestions
                  )}
                </div>
              </section>

              <section className="diagnosis-section">
                <div className="section-heading">
                  <h3>Uncertainty Notes</h3>
                </div>

                <div className="uncertainty-box">
                  {selectedDiagnosis.uncertainty_notes ||
                    "No uncertainty notes were provided."}
                </div>
              </section>

              <section className="review-section">
                <div className="review-header">
                  <div>
                    <h3>Technician Review</h3>
                    <p>
                      Review or edit the AI recommendations before
                      approving them.
                    </p>
                  </div>
                </div>

                <div className="review-form">
                  <div className="form-group">
                    <label htmlFor="review-suggestions">
                      Diagnosis Suggestions
                    </label>

                    <textarea
                      id="review-suggestions"
                      value={suggestions}
                      onChange={(event) =>
                        setSuggestions(event.target.value)
                      }
                      rows={10}
                    />

                    <small>JSON or plain text is accepted.</small>
                  </div>

                  <div className="form-group">
                    <label htmlFor="uncertainty-notes">
                      Uncertainty Notes
                    </label>

                    <textarea
                      id="uncertainty-notes"
                      value={uncertaintyNotes}
                      onChange={(event) =>
                        setUncertaintyNotes(event.target.value)
                      }
                      rows={4}
                      placeholder="Add concerns, limitations, or observations."
                    />
                  </div>

                  {reviewError && (
                    <div className="review-error" role="alert">
                      {reviewError}
                    </div>
                  )}

                  {reviewStatus && (
                    <div className="review-success" role="status">
                      Diagnosis successfully {reviewStatus}.
                    </div>
                  )}

                  <div className="review-actions">
                    <button
                      type="button"
                      className="reject-button"
                      disabled={reviewing}
                      onClick={() => handleReview("rejected")}
                    >
                      {reviewing ? "Saving..." : "Reject"}
                    </button>

                    <button
                      type="button"
                      className="edit-button"
                      disabled={reviewing}
                      onClick={() => handleReview("edited")}
                    >
                      {reviewing ? "Saving..." : "Save as Edited"}
                    </button>

                    <button
                      type="button"
                      className="approve-button"
                      disabled={reviewing}
                      onClick={() => handleReview("approved")}
                    >
                      {reviewing ? "Saving..." : "Approve Diagnosis"}
                    </button>
                  </div>
                </div>
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default Diagnosis;


