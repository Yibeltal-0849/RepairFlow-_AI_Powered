import { useEffect, useState } from "react";
import "./Workflow.css";

const API_BASE = "http://localhost:3777/api";

function Workflow() {
  const [tasks, setTasks] = useState([]);
  const [status, setStatus] = useState("open");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedTask, setSelectedTask] = useState(null);
  const [note, setNote] = useState("");
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    fetchTasks();
  }, [status]);

  async function fetchTasks() {
    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("token");

      const response = await fetch(
        `${API_BASE}/workflow/actionable?status=${status}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          }
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Failed to load workflow tasks."
        );
      }

      setTasks(result.data || []);
    } catch (err) {
      console.error("Workflow fetch error:", err);
      setError(err.message || "Unable to load workflow tasks.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResolve() {
    if (!selectedTask) return;

    try {
      setResolving(true);
      setError("");

      const token = localStorage.getItem("token");

      const response = await fetch(
        `${API_BASE}/workflow/actionable/${selectedTask.workflow_task_id}/resolve`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            note
          })
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Failed to resolve workflow task."
        );
      }

      setSelectedTask(null);
      setNote("");

      await fetchTasks();
    } catch (err) {
      console.error("Resolve task error:", err);
      setError(err.message || "Unable to resolve task.");
    } finally {
      setResolving(false);
    }
  }

  function getPriorityClass(priority) {
    switch (priority?.toLowerCase()) {
      case "urgent":
        return "priority urgent";
      case "high":
        return "priority high";
      case "medium":
        return "priority medium";
      case "low":
        return "priority low";
      default:
        return "priority";
    }
  }

  function getStatusClass(taskStatus) {
    switch (taskStatus?.toLowerCase()) {
      case "open":
        return "task-status open";
      case "resolved":
        return "task-status resolved";
      case "in_progress":
        return "task-status progress";
      default:
        return "task-status";
    }
  }

  function formatTaskType(type) {
    if (!type) return "—";

    return type
      .replace(/_/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  function formatDate(date) {
    if (!date) return "—";

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return date;
    }

    return parsedDate.toLocaleString();
  }

  function isOverdue(date) {
    if (!date) return false;

    const dueDate = new Date(date);

    return !Number.isNaN(dueDate.getTime()) &&
      dueDate < new Date() &&
      status !== "resolved";
  }

  return (
    <div className="workflow-page">

      <div className="workflow-header">
        <div>
          <h1>Workflow</h1>
          <p>
            Manage actionable repair workflow tasks and pending actions.
          </p>
        </div>

        <button
          className="refresh-button"
          onClick={fetchTasks}
          disabled={loading}
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      <div className="workflow-toolbar">

        <div className="status-tabs">
          <button
            className={status === "open" ? "active" : ""}
            onClick={() => setStatus("open")}
          >
            Open
          </button>

          <button
            className={status === "resolved" ? "active" : ""}
            onClick={() => setStatus("resolved")}
          >
            Resolved
          </button>
        </div>

        <div className="task-count">
          {tasks.length} task{tasks.length !== 1 ? "s" : ""}
        </div>
      </div>

      {error && (
        <div className="workflow-error">
          <span>{error}</span>

          <button onClick={fetchTasks}>
            Try Again
          </button>
        </div>
      )}

      {loading ? (
        <div className="workflow-loading">
          <div className="spinner"></div>
          <p>Loading workflow tasks...</p>
        </div>
      ) : tasks.length === 0 ? (
        <div className="empty-workflow">
          <div className="empty-icon">✓</div>

          <h2>
            {status === "open"
              ? "No open tasks"
              : "No resolved tasks"}
          </h2>

          <p>
            {status === "open"
              ? "There are currently no actionable workflow tasks."
              : "No workflow tasks have been resolved yet."}
          </p>
        </div>
      ) : (
        <div className="workflow-table-wrapper">
          <table className="workflow-table">
            <thead>
              <tr>
                <th>Task</th>
                <th>Repair</th>
                <th>Priority</th>
                <th>Reason</th>
                <th>Assigned To</th>
                <th>Due</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {tasks.map((task) => (
                <tr key={task.workflow_task_id}>

                  <td>
                    <div className="task-info">
                      <strong>
                        {formatTaskType(task.task_type)}
                      </strong>

                      <span className="task-id">
                        #{task.workflow_task_id}
                      </span>
                    </div>
                  </td>

                  <td>
                    {task.repair_id ? (
                      <div className="repair-info">
                        <strong>
                          {task.ticket_number || "Repair"}
                        </strong>

                        <span>
                          Repair #{task.repair_id}
                        </span>
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>

                  <td>
                    <span className={getPriorityClass(task.priority)}>
                      {task.priority || "normal"}
                    </span>
                  </td>

                  <td>
                    <div className="reason">
                      {task.reason || "No reason provided"}
                    </div>
                  </td>

                  <td>
                    {task.assigned_to ? (
                      <span className="assignee">
                        User #{task.assigned_to}
                      </span>
                    ) : (
                      <span className="unassigned">
                        Unassigned
                      </span>
                    )}
                  </td>

                  <td>
                    <span
                      className={
                        isOverdue(task.due_at)
                          ? "due-date overdue"
                          : "due-date"
                      }
                    >
                      {formatDate(task.due_at)}
                    </span>
                  </td>

                  <td>
                    <span className={getStatusClass(task.status)}>
                      {task.status?.replace(/_/g, " ") || "—"}
                    </span>
                  </td>

                  <td>
                    {task.status === "open" ? (
                      <button
                        className="resolve-button"
                        onClick={() => {
                          setSelectedTask(task);
                          setNote("");
                        }}
                      >
                        Resolve
                      </button>
                    ) : (
                      <span className="resolved-label">
                        Resolved
                      </span>
                    )}
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedTask && (
        <div className="modal-overlay">
          <div className="resolve-modal">

            <div className="modal-header">
              <div>
                <h2>Resolve Workflow Task</h2>

                <p>
                  Task #{selectedTask.workflow_task_id}
                </p>
              </div>

              <button
                className="close-button"
                onClick={() => setSelectedTask(null)}
              >
                ×
              </button>
            </div>

            <div className="modal-task-details">

              <div className="detail-item">
                <span>Task</span>
                <strong>
                  {formatTaskType(selectedTask.task_type)}
                </strong>
              </div>

              <div className="detail-item">
                <span>Repair</span>
                <strong>
                  {selectedTask.ticket_number ||
                    `Repair #${selectedTask.repair_id}`}
                </strong>
              </div>

              <div className="detail-item full">
                <span>Reason</span>
                <strong>
                  {selectedTask.reason || "No reason provided"}
                </strong>
              </div>

            </div>

            <div className="note-field">
              <label htmlFor="resolution-note">
                Resolution Note
              </label>

              <textarea
                id="resolution-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add a note about how this task was resolved..."
                rows="4"
              />
            </div>

            <div className="modal-actions">

              <button
                className="cancel-button"
                onClick={() => setSelectedTask(null)}
                disabled={resolving}
              >
                Cancel
              </button>

              <button
                className="confirm-resolve-button"
                onClick={handleResolve}
                disabled={resolving}
              >
                {resolving
                  ? "Resolving..."
                  : "Mark as Resolved"}
              </button>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}

export default Workflow;