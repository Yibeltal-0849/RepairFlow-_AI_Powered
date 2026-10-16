
import { useState } from "react";
import api from "../../services/api";
import "./ShopManager.css";

function ShopManager() {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const exampleQuestions = [
    "What should I prioritize today?",
    "Which repairs are overdue?",
    "Are there any urgent workflow tasks?",
    "What notifications need attention?",
    "Give me a summary of the shop's current situation."
  ];

  async function handleSubmit(e) {
    e.preventDefault();

    const trimmedQuestion = question.trim();

    if (!trimmedQuestion) {
      setError("Please enter a question.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setResult(null);

      const response = await api.post("/ai/shop-query", {
        question: trimmedQuestion
      });

      if (response.data?.success) {
        setResult(response.data.data);
      } else {
        setError(
          response.data?.message ||
            "Failed to get a response from AI Shop Manager."
        );
      }
    } catch (err) {
      console.error("Shop Manager request failed:", err);

      setError(
        err.response?.data?.message ||
          "Unable to contact AI Shop Manager. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  function handleExampleClick(example) {
    setQuestion(example);
    setError("");
  }

  function clearConversation() {
    setQuestion("");
    setResult(null);
    setError("");
  }

  return (
    <div className="shop-manager-page">
      <div className="shop-manager-header">
        <div>
          <h1>AI Shop Manager</h1>
          <p>
            Ask AI about repairs, workflow tasks, notifications,
            priorities, and shop performance.
          </p>
        </div>

        {result && (
          <button
            type="button"
            className="secondary-button"
            onClick={clearConversation}
          >
            New Question
          </button>
        )}
      </div>

      {error && (
        <div className="shop-alert shop-alert-error">
          <span className="alert-icon">!</span>
          <span>{error}</span>
        </div>
      )}

      <div className="shop-manager-layout">
        <div className="shop-query-card">
          <div className="query-card-header">
            <div className="ai-icon">
              AI
            </div>

            <div>
              <h2>Ask Shop Manager</h2>
              <p>
                Get operational insights based on your current
                repair shop data.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="question-input-wrapper">
              <label htmlFor="shop-question">
                Your question
              </label>

              <textarea
                id="shop-question"
                value={question}
                onChange={(e) => {
                  setQuestion(e.target.value);
                  setError("");
                }}
                placeholder="Example: What should I prioritize today?"
                rows="5"
                disabled={loading}
              />
            </div>

            <div className="query-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  setQuestion("");
                  setError("");
                }}
                disabled={loading || !question}
              >
                Clear
              </button>

              <button
                type="submit"
                className="primary-button"
                disabled={loading || !question.trim()}
              >
                {loading ? (
                  <>
                    <span className="button-spinner"></span>
                    Analyzing...
                  </>
                ) : (
                  <>
                    Ask AI
                    <span className="button-arrow">→</span>
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="examples-section">
            <h3>Try asking</h3>

            <div className="example-list">
              {exampleQuestions.map((example) => (
                <button
                  key={example}
                  type="button"
                  className="example-button"
                  onClick={() =>
                    handleExampleClick(example)
                  }
                  disabled={loading}
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        </div>

        {!result && !loading && (
          <div className="shop-info-card">
            <div className="info-icon">✦</div>

            <h2>Smart Shop Insights</h2>

            <p>
              AI Shop Manager analyzes your repair shop's
              operational data to help you make better decisions.
            </p>

            <div className="info-features">
              <div className="info-feature">
                <span>✓</span>
                <div>
                  <strong>Repair Overview</strong>
                  <p>
                    Understand your current repair workload.
                  </p>
                </div>
              </div>

              <div className="info-feature">
                <span>✓</span>
                <div>
                  <strong>Priority Detection</strong>
                  <p>
                    Identify urgent repairs and workflow tasks.
                  </p>
                </div>
              </div>

              <div className="info-feature">
                <span>✓</span>
                <div>
                  <strong>Notifications</strong>
                  <p>
                    Find pending and failed notifications.
                  </p>
                </div>
              </div>

              <div className="info-feature">
                <span>✓</span>
                <div>
                  <strong>Recommendations</strong>
                  <p>
                    Receive actionable shop management advice.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {loading && (
        <div className="loading-card">
          <div className="large-spinner"></div>

          <h3>AI Shop Manager is analyzing your shop...</h3>

          <p>
            Reviewing repairs, workflow tasks, and notifications.
          </p>
        </div>
      )}

      {result && !loading && (
        <div className="shop-results">
          <div className="result-header">
            <div>
              <span className="result-label">
                AI RESPONSE
              </span>

              <h2>Shop Manager Analysis</h2>
            </div>
          </div>

          <div className="question-display">
            <span>You asked:</span>
            <strong>{result.question}</strong>
          </div>

          {result.answer && (
            <section className="result-section answer-section">
              <div className="section-heading">
                <span className="section-icon">AI</span>

                <div>
                  <h3>Answer</h3>
                  <p>AI Shop Manager's response</p>
                </div>
              </div>

              <div className="answer-content">
                {result.answer}
              </div>
            </section>
          )}

          {result.summary && (
            <section className="result-section">
              <div className="section-heading">
                <span className="section-icon">Σ</span>

                <div>
                  <h3>Summary</h3>
                  <p>Current shop situation</p>
                </div>
              </div>

              <div className="summary-content">
                {result.summary}
              </div>
            </section>
          )}

          <div className="results-grid">
            {Array.isArray(result.priorities) &&
              result.priorities.length > 0 && (
                <section className="result-section priority-section">
                  <div className="section-heading">
                    <span className="section-icon priority-icon">
                      !
                    </span>

                    <div>
                      <h3>Priorities</h3>
                      <p>What needs attention first</p>
                    </div>
                  </div>

                  <div className="result-list">
                    {result.priorities.map(
                      (item, index) => (
                        <div
                          className="result-list-item"
                          key={`priority-${index}`}
                        >
                          <span className="list-number">
                            {index + 1}
                          </span>

                          <span>
                            {typeof item === "string"
                              ? item
                              : item?.title ||
                                item?.description ||
                                JSON.stringify(item)}
                          </span>
                        </div>
                      )
                    )}
                  </div>
                </section>
              )}

            {Array.isArray(result.warnings) &&
              result.warnings.length > 0 && (
                <section className="result-section warning-section">
                  <div className="section-heading">
                    <span className="section-icon warning-icon">
                      !
                    </span>

                    <div>
                      <h3>Warnings</h3>
                      <p>Things requiring attention</p>
                    </div>
                  </div>

                  <div className="result-list">
                    {result.warnings.map(
                      (item, index) => (
                        <div
                          className="result-list-item warning-item"
                          key={`warning-${index}`}
                        >
                          <span className="warning-dot"></span>

                          <span>
                            {typeof item === "string"
                              ? item
                              : item?.title ||
                                item?.description ||
                                JSON.stringify(item)}
                          </span>
                        </div>
                      )
                    )}
                  </div>
                </section>
              )}

            {Array.isArray(result.insights) &&
              result.insights.length > 0 && (
                <section className="result-section">
                  <div className="section-heading">
                    <span className="section-icon insight-icon">
                      ◈
                    </span>

                    <div>
                      <h3>Insights</h3>
                      <p>What the data tells you</p>
                    </div>
                  </div>

                  <div className="result-list">
                    {result.insights.map(
                      (item, index) => (
                        <div
                          className="result-list-item"
                          key={`insight-${index}`}
                        >
                          <span className="bullet">
                            •
                          </span>

                          <span>
                            {typeof item === "string"
                              ? item
                              : item?.title ||
                                item?.description ||
                                JSON.stringify(item)}
                          </span>
                        </div>
                      )
                    )}
                  </div>
                </section>
              )}

            {Array.isArray(result.recommendations) &&
              result.recommendations.length > 0 && (
                <section className="result-section recommendation-section">
                  <div className="section-heading">
                    <span className="section-icon recommendation-icon">
                      ✓
                    </span>

                    <div>
                      <h3>Recommendations</h3>
                      <p>Suggested actions</p>
                    </div>
                  </div>

                  <div className="result-list">
                    {result.recommendations.map(
                      (item, index) => (
                        <div
                          className="result-list-item"
                          key={`recommendation-${index}`}
                        >
                          <span className="check-icon">
                            ✓
                          </span>

                          <span>
                            {typeof item === "string"
                              ? item
                              : item?.title ||
                                item?.description ||
                                JSON.stringify(item)}
                          </span>
                        </div>
                      )
                    )}
                  </div>
                </section>
              )}
          </div>

          {!result.answer &&
            !result.summary &&
            (!result.priorities ||
              result.priorities.length === 0) &&
            (!result.insights ||
              result.insights.length === 0) &&
            (!result.recommendations ||
              result.recommendations.length === 0) &&
            (!result.warnings ||
              result.warnings.length === 0) && (
              <div className="no-results">
                <h3>No analysis returned</h3>
                <p>
                  AI Shop Manager did not return any analysis
                  for this question.
                </p>
              </div>
            )}
        </div>
      )}
    </div>
  );
}

export default ShopManager;
