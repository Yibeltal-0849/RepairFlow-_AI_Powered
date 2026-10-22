
import { useEffect, useState } from "react";
import "./Workflow.css";

const API_BASE = "http://localhost:3777/api";

// Default values for the Create Task form.
const EMPTY_NEW_TASK = {
  ticket_number: "",
  task_type: "manual_follow_up",
  reason: "",
  priority: "medium",
  due_at: "",
};

function Workflow() {
  // Stores the workflow tasks returned by the backend.
  const [tasks, setTasks] = useState([]);

  // Controls whether Open or Resolved tasks are displayed.
  const [status, setStatus] = useState("open");

  // Loading states.
  const [loading, setLoading] = useState(true);
  const [checkingWorkflow, setCheckingWorkflow] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [creatingTask, setCreatingTask] = useState(false);

  // Error and success messages.
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // State for resolving an existing task.
  const [selectedTask, setSelectedTask] = useState(null);
  const [note, setNote] = useState("");

  // State for creating a new task.
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTask, setNewTask] = useState(EMPTY_NEW_TASK);

  // Load tasks when the page opens or the selected tab changes.
  useEffect(() => {
    fetchTasks(status);
  }, [status]);

  // Read the JWT token saved during login.
  function getToken() {
    return localStorage.getItem("token");
  }

  // Read an API response and display backend error messages.
  async function readResponse(response) {
    let result;

    try {
      result = await response.json();
    } catch {
      throw new Error("The server returned an invalid response.");
    }

    if (!response.ok || !result.success) {
      throw new Error(
        result.message || "The request could not be completed."
      );
    }

    return result;
  }

  // GET: Fetch tasks by status.
  async function fetchTasks(requestedStatus = status) {
    try {
      setLoading(true);
      setError("");

      const token = getToken();

      if (!token) {
        throw new Error("Please log in to view workflow tasks.");
      }

      const response = await fetch(
        `${API_BASE}/workflow/actionable?status=${requestedStatus}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const result = await readResponse(response);

      setTasks(result.data || []);
    } catch (err) {
      console.error("Workflow fetch error:", err);
      setTasks([]);
      setError(err.message || "Unable to load workflow tasks.");
    } finally {
      setLoading(false);
    }
  }

  // POST: Run automatic workflow checks.
  async function handleRunWorkflowCheck() {
    try {
      setCheckingWorkflow(true);
      setError("");
      setSuccess("");

      const token = getToken();

      if (!token) {
        throw new Error("Please log in to run workflow checks.");
      }

      const response = await fetch(`${API_BASE}/workflow/check`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const result = await readResponse(response);
      const workflowResult = result.data || {};

      // Refresh whichever tab the user is currently viewing.
      await fetchTasks(status);

      setSuccess(
        `Workflow check completed. New tasks created: ${
          workflowResult.created ?? 0
        }.`
      );
    } catch (err) {
      console.error("Workflow check error:", err);
      setError(err.message || "Unable to run workflow checks.");
    } finally {
      setCheckingWorkflow(false);
    }
  }

  // Update the Create Task form whenever a field changes.
  function handleNewTaskChange(event) {
    const { name, value } = event.target;

    setNewTask((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  // POST: Create an open task using its repair ticket number.
  async function handleCreateTask(event) {
    event.preventDefault();

    try {
      setCreatingTask(true);
      setError("");
      setSuccess("");

      const token = getToken();

      if (!token) {
        throw new Error("Please log in to create a workflow task.");
      }

      // Validate the ticket number.
      const ticketNumber = newTask.ticket_number.trim();

      if (!ticketNumber) {
        throw new Error("Please enter the repair ticket number.");
      }

      // Validate the task type.
      const taskType = newTask.task_type.trim();

      if (!taskType) {
        throw new Error("Please enter a task type.");
      }

      // Validate the reason.
      const reason = newTask.reason.trim();

      if (!reason) {
        throw new Error("Please enter a reason for the task.");
      }

      // Send ticket_number instead of repair_id.
      // The backend will find the corresponding repair_id.
      const payload = {
        ticket_number: ticketNumber,
        task_type: taskType,
        reason,
        priority: newTask.priority,

        // Convert the datetime-local value to MySQL datetime format.
        // Example: 2026-10-20T14:30 becomes 2026-10-20 14:30:00.
        due_at: newTask.due_at
          ? `${newTask.due_at.replace("T", " ")}:00`
          : null,
      };

      const response = await fetch(`${API_BASE}/workflow/tasks`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await readResponse(response);

      // Close the form and clear its values.
      setShowCreateModal(false);
      setNewTask({ ...EMPTY_NEW_TASK });

      // Display a success message.
      setSuccess(
        result.message ||
          `Task created successfully for ${ticketNumber}.`
      );

      // Switch to the Open tab and load the new task.
      setStatus("open");
      await fetchTasks("open");
    } catch (err) {
      console.error("Create workflow task error:", err);
      setError(err.message || "Unable to create workflow task.");
    } finally {
      setCreatingTask(false);
    }
  }

  // POST: Resolve the selected task.
  async function handleResolve() {
    if (!selectedTask) return;

    try {
      setResolving(true);
      setError("");
      setSuccess("");

      const token = getToken();

      if (!token) {
        throw new Error("Please log in to resolve workflow tasks.");
      }

      const response = await fetch(
        `${API_BASE}/workflow/tasks/${selectedTask.workflow_task_id}/resolve`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ note }),
        }
      );

      await readResponse(response);

      setSelectedTask(null);
      setNote("");
      setSuccess("Task marked as resolved successfully.");

      // Refresh the currently selected tab.
      await fetchTasks(status);
    } catch (err) {
      console.error("Resolve task error:", err);
      setError(err.message || "Unable to resolve task.");
    } finally {
      setResolving(false);
    }
  }

  // Choose a CSS class according to task priority.
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

  // Choose a CSS class according to task status.
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

  // Convert manual_follow_up into Manual Follow Up.
  function formatTaskType(type) {
    if (!type) return "—";

    return type
      .replace(/_/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  // Format dates for display.
  function formatDate(date) {
    if (!date) return "—";

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return date;
    }

    return parsedDate.toLocaleString();
  }

  // Check whether an unresolved task is past its due date.
  function isOverdue(date, taskStatus) {
    if (!date || taskStatus === "resolved") return false;

    const dueDate = new Date(date);

    return (
      !Number.isNaN(dueDate.getTime()) &&
      dueDate < new Date()
    );
  }

  return (
    <div className="workflow-page">
      {/* Page title and action buttons */}
      <div className="workflow-header">
        <div>
          <h1>Workflow</h1>
          <p>
            Manage actionable repair workflow tasks and pending actions.
          </p>
        </div>

        <div className="workflow-header-actions">
          <button
            type="button"
            className="create-task-button"
            onClick={() => {
              setError("");
              setSuccess("");
              setNewTask({ ...EMPTY_NEW_TASK });
              setShowCreateModal(true);
            }}
            disabled={creatingTask}
          >
            + Create Task
          </button>

          <button
            type="button"
            className="run-workflow-button"
            onClick={handleRunWorkflowCheck}
            disabled={checkingWorkflow || loading}
          >
            {checkingWorkflow
              ? "Checking Repairs..."
              : "Workflow Check"}
          </button>

          <button
            type="button"
            className="refresh-button"
            onClick={() => fetchTasks(status)}
            disabled={loading || checkingWorkflow}
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {/* Open and Resolved tabs */}
      <div className="workflow-toolbar">
        <div className="status-tabs">
          <button
            type="button"
            className={status === "open" ? "active" : ""}
            onClick={() => setStatus("open")}
          >
            Open
          </button>

          <button
            type="button"
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

      {/* Display error messages */}
      {error && (
        <div className="workflow-error">
          <span>{error}</span>

          <button
            type="button"
            onClick={() => fetchTasks(status)}
          >
            Try Again
          </button>
        </div>
      )}

      {/* Display success messages */}
      {success && (
        <div className="workflow-success">
          {success}
        </div>
      )}

      {/* Loading state, empty state, or task table */}
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
              ? "There are currently no open tasks. Create a task or run a workflow check."
              : "No workflow tasks have been resolved yet."}
          </p>
        </div>
      ) : (
        <div className="workflow-table-wrapper">
          <table className="workflow-table">
            <thead>
              <tr>
                <th>Task</th>
                <th>Repair Ticket</th>
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
                    {task.ticket_number ? (
                      <div className="repair-info">
                        <strong>{task.ticket_number}</strong>

                        <span>
                          Repair #{task.repair_id}
                        </span>
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>

                  <td>
                    <span
                      className={getPriorityClass(task.priority)}
                    >
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
                        isOverdue(task.due_at, task.status)
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
                        type="button"
                        className="resolve-button"
                        onClick={() => {
                          setSelectedTask(task);
                          setNote("");
                          setError("");
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

      {/* Create Task modal */}
      {showCreateModal && (
        <div className="modal-overlay">
          <form
            className="resolve-modal create-task-modal"
            onSubmit={handleCreateTask}
          >
            <div className="modal-header">
              <div>
                <h2>Create Workflow Task</h2>
                <p>
                  Enter a repair ticket number to create an open task.
                </p>
              </div>

              <button
                type="button"
                className="close-button"
                onClick={() => setShowCreateModal(false)}
                disabled={creatingTask}
                aria-label="Close create task form"
              >
                ×
              </button>
            </div>

            <div className="create-task-form">
              {/* Ticket number replaces the Repair ID field */}
              <div className="note-field">
                <label htmlFor="ticket_number">
                  Repair Ticket Number *
                </label>

                <input
                  id="ticket_number"
                  name="ticket_number"
                  type="text"
                  value={newTask.ticket_number}
                  onChange={handleNewTaskChange}
                  placeholder="e.g. RF-1792301440847-9198"
                  required
                  disabled={creatingTask}
                />

                <small>
                  Enter the ticket number shown on the Repairs page.
                  You do not need to know the database Repair ID.
                </small>
              </div>

              <div className="note-field">
                <label htmlFor="task_type">Task Type *</label>

                <input
                  id="task_type"
                  name="task_type"
                  type="text"
                  value={newTask.task_type}
                  onChange={handleNewTaskChange}
                  placeholder="e.g. manual_follow_up"
                  required
                  disabled={creatingTask}
                />
              </div>

              <div className="note-field">
                <label htmlFor="reason">Reason *</label>

                <textarea
                  id="reason"
                  name="reason"
                  value={newTask.reason}
                  onChange={handleNewTaskChange}
                  placeholder="Explain what needs to be done..."
                  rows="3"
                  required
                  disabled={creatingTask}
                />
              </div>

              <div className="note-field">
                <label htmlFor="priority">Priority *</label>

                <select
                  id="priority"
                  name="priority"
                  value={newTask.priority}
                  onChange={handleNewTaskChange}
                  required
                  disabled={creatingTask}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <div className="note-field">
                <label htmlFor="due_at">
                  Due Date (optional)
                </label>

                <input
                  id="due_at"
                  name="due_at"
                  type="datetime-local"
                  value={newTask.due_at}
                  onChange={handleNewTaskChange}
                  disabled={creatingTask}
                />
              </div>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="cancel-button"
                onClick={() => setShowCreateModal(false)}
                disabled={creatingTask}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="confirm-resolve-button"
                disabled={creatingTask}
              >
                {creatingTask
                  ? "Creating Task..."
                  : "Create Open Task"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Resolve Task modal */}
      {selectedTask && (
        <div className="modal-overlay">
          <div className="resolve-modal">
            <div className="modal-header">
              <div>
                <h2>Resolve Workflow Task</h2>
                <p>Task #{selectedTask.workflow_task_id}</p>
              </div>

              <button
                type="button"
                className="close-button"
                onClick={() => setSelectedTask(null)}
                disabled={resolving}
                aria-label="Close resolve form"
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
                <span>Repair Ticket</span>

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
                onChange={(event) => setNote(event.target.value)}
                placeholder="Explain how this task was resolved..."
                rows="4"
                disabled={resolving}
              />
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="cancel-button"
                onClick={() => setSelectedTask(null)}
                disabled={resolving}
              >
                Cancel
              </button>

              <button
                type="button"
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
