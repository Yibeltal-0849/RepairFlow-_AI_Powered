
import { query } from "../config/db.js";
import { runWorkflowChecks } from "../services/workflow.service.js";

/*
|--------------------------------------------------------------------------
| Run Workflow Checks
|--------------------------------------------------------------------------
| Checks for overdue repairs, repairs waiting for parts, and stale repairs.
*/
export async function runWorkflow(req, res, next) {
  try {
    const result = await runWorkflowChecks();

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

/*
|--------------------------------------------------------------------------
| List Actionable Workflow Tasks
|--------------------------------------------------------------------------
*/
export async function listActionableTasks(req, res, next) {
  try {
    const status = req.query.status || "open";
    const allowedStatuses = ["open", "resolved", "in_progress"];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid workflow task status.",
      });
    }

    const rows = await query(
      `SELECT
         t.workflow_task_id,
         t.repair_id,
         r.ticket_number,
         t.task_type,
         t.reason,
         t.priority,
         t.assigned_to,
         t.due_at,
         t.status,
         t.deduplication_key,
         t.resolved_at,
         t.created_at
       FROM workflow_tasks t
       LEFT JOIN repairs r
         ON r.repair_id = t.repair_id
       WHERE t.status = ?
       ORDER BY
         CASE t.priority
           WHEN 'urgent' THEN 1
           WHEN 'high' THEN 2
           WHEN 'medium' THEN 3
           WHEN 'low' THEN 4
           ELSE 5
         END,
         t.due_at ASC
       LIMIT 200`,
      [status]
    );

    return res.json({
      success: true,
      data: rows,
    });
  } catch (error) {
    next(error);
  }
}

/*
|--------------------------------------------------------------------------
| Create Workflow Task Manually Using a Ticket Number
|--------------------------------------------------------------------------
| The frontend sends ticket_number instead of repair_id.
| The backend looks up repair_id from the repairs table.
| Every new manual task starts with status "open".
*/
export async function createTask(req, res, next) {
  try {
    const {
      ticket_number,
      task_type,
      reason,
      priority = "medium",
      assigned_to = null,
      due_at = null,
    } = req.body || {};

    // Validate the repair ticket number.
    if (
      typeof ticket_number !== "string" ||
      !ticket_number.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide a repair ticket number.",
      });
    }

    // Validate task type and reason.
    if (
      typeof task_type !== "string" ||
      !task_type.trim() ||
      typeof reason !== "string" ||
      !reason.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Task type and reason are required.",
      });
    }

    // Validate priority.
    const allowedPriorities = ["low", "medium", "high", "urgent"];

    if (
      typeof priority !== "string" ||
      !allowedPriorities.includes(priority)
    ) {
      return res.status(400).json({
        success: false,
        message: "Priority must be low, medium, high, or urgent.",
      });
    }

    // Look up the repair using its ticket number.
    const repairs = await query(
      `SELECT repair_id, ticket_number
       FROM repairs
       WHERE ticket_number = ?
       LIMIT 1`,
      [ticket_number.trim()]
    );

    if (!repairs.length) {
      return res.status(404).json({
        success: false,
        message: `No repair was found with ticket number "${ticket_number.trim()}".`,
      });
    }

    // Use the actual repair ID from the database.
    const repairId = repairs[0].repair_id;
    const savedTicketNumber = repairs[0].ticket_number;

    // Validate the optional assigned user ID.
    let assignedTo = null;

    if (
      assigned_to !== null &&
      assigned_to !== undefined &&
      assigned_to !== ""
    ) {
      assignedTo = Number(assigned_to);

      if (!Number.isInteger(assignedTo) || assignedTo <= 0) {
        return res.status(400).json({
          success: false,
          message: "Assigned user ID must be a positive integer.",
        });
      }
    }

    // Validate and normalize the optional due date.
    let dueAt = null;

    if (due_at !== null && due_at !== undefined && due_at !== "") {
      if (typeof due_at !== "string") {
        return res.status(400).json({
          success: false,
          message: "Due date must be a valid date and time.",
        });
      }

      const normalizedDate = due_at.trim().replace("T", " ");

      if (
        !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/.test(
          normalizedDate
        ) ||
        Number.isNaN(Date.parse(normalizedDate.replace(" ", "T")))
      ) {
        return res.status(400).json({
          success: false,
          message: "Due date must be a valid date and time.",
        });
      }

      dueAt =
        normalizedDate.length === 16
          ? `${normalizedDate}:00`
          : normalizedDate;
    }

    // Generate a unique key for the manually created task.
    const deduplicationKey =
      `manual:${Date.now()}:${repairId}:${req.user.user_id}`;

    // Insert the task. The status is always "open".
    const result = await query(
      `INSERT INTO workflow_tasks (
         repair_id,
         task_type,
         reason,
         priority,
         assigned_to,
         due_at,
         status,
         deduplication_key
       )
       VALUES (?, ?, ?, ?, ?, ?, 'open', ?)`,
      [
        repairId,
        task_type.trim(),
        reason.trim(),
        priority,
        assignedTo,
        dueAt,
        deduplicationKey,
      ]
    );

    // Record the creation in the audit log.
    await query(
      `INSERT INTO audit_events (
         actor_id,
         entity_type,
         entity_id,
         action,
         metadata
       )
       VALUES (?, 'workflow_task', ?, 'workflow_task.created', ?)`,
      [
        req.user.user_id,
        result.insertId,
        JSON.stringify({
          repair_id: repairId,
          ticket_number: savedTicketNumber,
          task_type: task_type.trim(),
          priority,
          source: "manual",
        }),
      ]
    );

    return res.status(201).json({
      success: true,
      message: "Workflow task created successfully.",
      data: {
        workflow_task_id: result.insertId,
        repair_id: repairId,
        ticket_number: savedTicketNumber,
        task_type: task_type.trim(),
        reason: reason.trim(),
        priority,
        assigned_to: assignedTo,
        due_at: dueAt,
        status: "open",
      },
    });
  } catch (error) {
    next(error);
  }
}

/*
|--------------------------------------------------------------------------
| Resolve Workflow Task
|--------------------------------------------------------------------------
*/
export async function resolveTask(req, res, next) {
  try {
    const { id } = req.params;
    const { note = "" } = req.body || {};

    const taskId = Number(id);

    if (!Number.isInteger(taskId) || taskId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid workflow task ID.",
      });
    }

    const tasks = await query(
      `SELECT
         workflow_task_id,
         repair_id,
         task_type,
         reason,
         status
       FROM workflow_tasks
       WHERE workflow_task_id = ?
       LIMIT 1`,
      [taskId]
    );

    if (!tasks.length) {
      return res.status(404).json({
        success: false,
        message: "Workflow task not found.",
      });
    }

    const task = tasks[0];

    if (task.status === "resolved") {
      return res.status(400).json({
        success: false,
        message: "Workflow task is already resolved.",
      });
    }

    await query(
      `UPDATE workflow_tasks
       SET status = 'resolved', resolved_at = NOW()
       WHERE workflow_task_id = ?`,
      [taskId]
    );

    await query(
      `INSERT INTO audit_events (
         actor_id,
         entity_type,
         entity_id,
         action,
         metadata
       )
       VALUES (?, 'workflow_task', ?, 'workflow_task.resolved', ?)`,
      [
        req.user.user_id,
        taskId,
        JSON.stringify({
          repair_id: task.repair_id,
          note,
        }),
      ]
    );

    return res.json({
      success: true,
      data: {
        workflow_task_id: taskId,
        status: "resolved",
        resolved_by: req.user.user_id,
      },
    });
  } catch (error) {
    next(error);
  }
}
