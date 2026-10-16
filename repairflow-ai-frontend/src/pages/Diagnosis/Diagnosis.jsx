import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../../services/api";
import "./Diagnosis.css";

function Diagnosis() {
  const [searchParams] = useSearchParams();

  const repairId = searchParams.get("repair_id");

  const [diagnoses, setDiagnoses] = useState([]);
  const [selectedDiagnosis, setSelectedDiagnosis] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [reviewing, setReviewing] = useState(false);
  const [reviewError, setReviewError] = useState("");

  const [reviewStatus, setReviewStatus] = useState("");
  const [suggestions, setSuggestions] = useState("");
  const [uncertaintyNotes, setUncertaintyNotes] = useState("");

  /*
   * =====================================================
   * LOAD DIAGNOSES
   * =====================================================
   */

  const fetchDiagnoses = async () => {
    try {
      setLoading(true);
      setError("");

      const url = repairId
        ? `/diagnoses?repair_id=${repairId}`
        : "/diagnoses";

      const response = await api.get(url);

      const result = response.data;

      if (Array.isArray(result?.data)) {
        setDiagnoses(result.data);
      } else {
        setDiagnoses([]);
      }
    } catch (err) {
      console.error("Fetch diagnoses error:", err);

      setError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          "Unable to load diagnosis sessions."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiagnoses();
  }, [repairId]);

  /*
   * =====================================================
   * SELECT DIAGNOSIS
   * =====================================================
   */

  const handleSelectDiagnosis = (diagnosis) => {
    setSelectedDiagnosis(diagnosis);

    setReviewStatus("");

    setSuggestions(
      formatSuggestionsForEditor(
        diagnosis.structured_suggestions
      )
    );

    setUncertaintyNotes(
      diagnosis.uncertainty_notes || ""
    );

    setReviewError("");
  };

  /*
   * =====================================================
   * FORMAT JSON / STRING
   * =====================================================
   */

  const formatSuggestionsForEditor = (value) => {
    if (!value) {
      return "";
    }

    if (typeof value === "string") {
      try {
        return JSON.stringify(
          JSON.parse(value),
          null,
          2
        );
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
   * =====================================================
   * FORMAT JSON FOR DISPLAY
   * =====================================================
   */

  const parseSuggestions = (value) => {
    if (!value) {
      return null;
    }

    if (typeof value === "object") {
      return value;
    }

    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  };

  /*
   * =====================================================
   * REVIEW DIAGNOSIS
   * =====================================================
   */

  const handleReview = async (status) => {
    if (!selectedDiagnosis) {
      return;
    }

    try {
      setReviewing(true);
      setReviewError("");

      let finalSuggestions = suggestions;

      try {
        finalSuggestions = JSON.parse(suggestions);
      } catch {
        /*
         * If the technician entered plain text,
         * send it as a string.
         */
        finalSuggestions = suggestions;
      }

      await api.post(
        `/diagnoses/${selectedDiagnosis.diagnosis_session_id}/review`,
        {
          status,
          structured_suggestions: finalSuggestions,
          uncertainty_notes: uncertaintyNotes,
        }
      );

      /*
       * Refresh diagnosis list
       */
      await fetchDiagnoses();

      /*
       * Update selected diagnosis locally
       */
      setSelectedDiagnosis((previous) => {
        if (!previous) {
          return previous;
        }

        return {
          ...previous,
          status,
          structured_suggestions:
            finalSuggestions,
          uncertainty_notes:
            uncertaintyNotes,
        };
      });

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
   * =====================================================
   * STATUS CLASS
   * =====================================================
   */

  const getStatusClass = (status) => {
    if (!status) {
      return "unknown";
    }

    return status.toLowerCase();
  };

  /*
   * =====================================================
   * DATE FORMAT
   * =====================================================
   */

  const formatDate = (date) => {
    if (!date) {
      return "—";
    }

    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) {
      return "—";
    }

    return parsed.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  /*
   * =====================================================
   * RENDER STRUCTURED SUGGESTIONS
   * =====================================================
   */

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
              {typeof item === "object"
                ? JSON.stringify(item, null, 2)
                : String(item)}
            </li>
          ))}
        </ul>
      );
    }

    return (
      <div className="suggestion-grid">
        {Object.entries(parsed).map(
          ([key, value]) => (
            <div
              className="suggestion-item"
              key={key}
            >
              <span className="suggestion-label">
                {key
                  .replace(/_/g, " ")
                  .replace(/\b\w/g, (letter) =>
                    letter.toUpperCase()
                  )}
              </span>

              <div className="suggestion-value">
                {typeof value === "object"
                  ? JSON.stringify(
                      value,
                      null,
                      2
                    )
                  : String(value)}
              </div>
            </div>
          )
        )}
      </div>
    );
  };

  /*
   * =====================================================
   * LOADING
   * =====================================================
   */

  if (loading) {
    return (
      <div className="diagnosis-page">
        <div className="diagnosis-loading">
          <div className="diagnosis-spinner"></div>

          <p>
            Loading diagnosis sessions...
          </p>
        </div>
      </div>
    );
  }

  /*
   * =====================================================
   * PAGE
   * =====================================================
   */

  return (
    <div className="diagnosis-page">

      {/* =================================================
          HEADER
          ================================================= */}

      <div className="diagnosis-header">

        <div>
          <h1>AI Diagnosis</h1>

          <p>
            Review AI-generated diagnosis
            suggestions before applying them
            to repair tickets.
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


      {/* =================================================
          ERROR
          ================================================= */}

      {error && (
        <div className="diagnosis-error">

          <div>
            <strong>
              Unable to load diagnoses
            </strong>

            <span>{error}</span>
          </div>

          <button
            type="button"
            onClick={fetchDiagnoses}
          >
            Try Again
          </button>

        </div>
      )}


      {/* =================================================
          MAIN LAYOUT
          ================================================= */}

      <div className="diagnosis-layout">

        {/* =================================================
            LEFT - DIAGNOSIS LIST
            ================================================= */}

        <aside className="diagnosis-list-card">

          <div className="diagnosis-list-header">

            <div>
              <h2>Diagnosis Sessions</h2>

              <p>
                {diagnoses.length} session
                {diagnoses.length !== 1
                  ? "s"
                  : ""}
              </p>
            </div>

          </div>


          {diagnoses.length === 0 ? (

            <div className="diagnosis-empty">

              <div className="diagnosis-empty-icon">
                ✦
              </div>

              <h3>
                No diagnoses found
              </h3>

              <p>
                AI diagnosis sessions will
                appear here.
              </p>

            </div>

          ) : (

            <div className="diagnosis-list">

              {diagnoses.map((diagnosis) => (

                <button
                  type="button"
                  key={
                    diagnosis.diagnosis_session_id
                  }
                  className={`diagnosis-list-item ${
                    selectedDiagnosis
                      ?.diagnosis_session_id ===
                    diagnosis.diagnosis_session_id
                      ? "active"
                      : ""
                  }`}
                  onClick={() =>
                    handleSelectDiagnosis(
                      diagnosis
                    )
                  }
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
                      {diagnosis.status ||
                        "pending"}
                    </span>

                  </div>

                  <div className="diagnosis-list-info">

                    <span>
                      {diagnosis.provider ||
                        "AI Provider"}
                    </span>

                    <span>
                      {formatDate(
                        diagnosis.created_at
                      )}
                    </span>

                  </div>

                </button>

              ))}

            </div>

          )}

        </aside>


        {/* =================================================
            RIGHT - DETAILS
            ================================================= */}

        <main className="diagnosis-details-card">

          {!selectedDiagnosis ? (

            <div className="diagnosis-select-state">

              <div className="select-state-icon">
                ✦
              </div>

              <h2>
                Select a Diagnosis
              </h2>

              <p>
                Select a diagnosis session from
                the list to review the AI
                recommendations.
              </p>

            </div>

          ) : (

            <>

              {/* ==========================================
                  DETAILS HEADER
                  ========================================== */}

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
                      {selectedDiagnosis.status ||
                        "pending"}
                    </span>

                  </div>

                  <p>
                    Diagnosis Session #
                    {
                      selectedDiagnosis.diagnosis_session_id
                    }
                  </p>

                </div>

              </div>


              {/* ==========================================
                  META
                  ========================================== */}

              <div className="diagnosis-meta">

                <div className="meta-item">

                  <span>Provider</span>

                  <strong>
                    {selectedDiagnosis.provider ||
                      "—"}
                  </strong>

                </div>

                <div className="meta-item">

                  <span>Model</span>

                  <strong>
                    {selectedDiagnosis.model_name ||
                      "—"}
                  </strong>

                </div>

                <div className="meta-item">

                  <span>Created</span>

                  <strong>
                    {formatDate(
                      selectedDiagnosis.created_at
                    )}
                  </strong>

                </div>

                <div className="meta-item">

                  <span>Reviewed</span>

                  <strong>
                    {formatDate(
                      selectedDiagnosis.reviewed_at
                    )}
                  </strong>

                </div>

              </div>


              {/* ==========================================
                  INPUT SUMMARY
                  ========================================== */}

              <section className="diagnosis-section">

                <div className="section-heading">

                  <h3>
                    Input Summary
                  </h3>

                  <span>
                    AI input
                  </span>

                </div>

                <div className="summary-box">

                  {selectedDiagnosis.input_summary ||
                    "No input summary available."}

                </div>

              </section>


              {/* ==========================================
                  AI SUGGESTIONS
                  ========================================== */}

              <section className="diagnosis-section">

                <div className="section-heading">

                  <h3>
                    AI Recommendations
                  </h3>

                  <span>
                    Suggested diagnosis
                  </span>

                </div>

                <div className="suggestions-box">

                  {renderSuggestions(
                    selectedDiagnosis.structured_suggestions
                  )}

                </div>

              </section>


              {/* ==========================================
                  UNCERTAINTY
                  ========================================== */}

              <section className="diagnosis-section">

                <div className="section-heading">

                  <h3>
                    Uncertainty Notes
                  </h3>

                </div>

                <div className="uncertainty-box">

                  {selectedDiagnosis.uncertainty_notes ||
                    "No uncertainty notes were provided."}

                </div>

              </section>


              {/* ==========================================
                  REVIEW
                  ========================================== */}

              <section className="review-section">

                <div className="review-header">

                  <div>

                    <h3>
                      Technician Review
                    </h3>

                    <p>
                      Review or edit the AI
                      recommendations before
                      approving them.
                    </p>

                  </div>

                </div>


                <div className="review-form">

                  <div className="form-group">

                    <label htmlFor="diagnosis-suggestions">
                      Diagnosis Suggestions
                    </label>

                    <textarea
                      id="diagnosis-suggestions"
                      value={suggestions}
                      onChange={(e) =>
                        setSuggestions(
                          e.target.value
                        )
                      }
                      rows={10}
                    />

                    <small>
                      JSON or plain text is
                      accepted.
                    </small>

                  </div>


                  <div className="form-group">

                    <label htmlFor="uncertainty-notes">
                      Uncertainty Notes
                    </label>

                    <textarea
                      id="uncertainty-notes"
                      value={uncertaintyNotes}
                      onChange={(e) =>
                        setUncertaintyNotes(
                          e.target.value
                        )
                      }
                      rows={4}
                      placeholder="Add any concerns, limitations, or additional observations..."
                    />

                  </div>


                  {/* REVIEW ERROR */}

                  {reviewError && (
                    <div className="review-error">
                      {reviewError}
                    </div>
                  )}


                  {/* REVIEW SUCCESS */}

                  {reviewStatus && (
                    <div className="review-success">
                      Diagnosis successfully{" "}
                      {reviewStatus}.
                    </div>
                  )}


                  {/* BUTTONS */}

                  <div className="review-actions">

                    <button
                      type="button"
                      className="reject-button"
                      disabled={reviewing}
                      onClick={() =>
                        handleReview("rejected")
                      }
                    >
                      {reviewing &&
                      reviewStatus ===
                        "rejected"
                        ? "Rejecting..."
                        : "Reject"}
                    </button>

                    <button
                      type="button"
                      className="edit-button"
                      disabled={reviewing}
                      onClick={() =>
                        handleReview("edited")
                      }
                    >
                      {reviewing &&
                      reviewStatus ===
                        "edited"
                        ? "Saving..."
                        : "Save as Edited"}
                    </button>

                    <button
                      type="button"
                      className="approve-button"
                      disabled={reviewing}
                      onClick={() =>
                        handleReview("approved")
                      }
                    >
                      {reviewing &&
                      reviewStatus ===
                        "approved"
                        ? "Approving..."
                        : "Approve Diagnosis"}
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